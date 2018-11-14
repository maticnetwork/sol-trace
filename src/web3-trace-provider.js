import utils from 'ethereumjs-util'

import AbiFunctions from 'abi-decode-functions'
import {constants, getRevertTrace} from './trace'
import {parseSourceMap} from './source-maps'
import AssemblerInfoProvider from './assembler_info_provider'

const REVERT_MESSAGE_ID = '0x08c379a0' // first 4byte of keccak256('Error(string)').
export default class Web3TraceProvider {
  constructor(web3) {
    this.web3 = web3
    this.nextProvider = web3.currentProvider
    this.assemblerInfoProvider = new AssemblerInfoProvider()
  }

  /**
   * Should be called to make sync request
   *
   * @method send
   * @param {Object} payload
   * @return {Object} result
   */
  send(payload = {}) {
    return this.nextProvider.send(payload)
  }

  sendAsync(payload, cb) {
    if (payload.method === 'eth_sendTransaction' || payload.method === 'eth_call' || payload.method === 'eth_getTransactionReceipt') {
      const txData = payload.params[0]
      return this.nextProvider.sendAsync(payload, (err, result) => {
        if (this._isGanacheErrorResponse(result)) {
          const txHash = result.result || Object.keys(result.error.data)[0]
          if (utils.toBuffer(txHash).length === 32) {
            const toAddress = txData.to
            // record tx trace
            this.recordTxTrace(toAddress, txHash, result, this.getFunctionId(payload), this._isInvalidOpcode(result))
              .then(traceResult => {
                result.error.message += traceResult
                cb(err, result)
              })
              .catch(traceError => {
                cb(traceError, result)
              })
          } else {
            console.warn('Could not trace REVERT / invalid opcode. maybe legacy node.')
            cb(err, result)
          }
        } else if (this._isGethEthCallRevertResponse(payload.method, result)) {
          const messageBuf = this.pickUpRevertReason(utils.toBuffer(result.result))
          console.warn(`VM Exception while processing transaction: revert. reason: ${messageBuf.toString()}`)
          cb(err, result)
        } else if (this._isGethErrorReceiptResponse(payload.method, result)) {
          // record tx trace
          const toAddress = result.result.to
          const txHash = result.result.transactionHash
          this.recordTxTrace(toAddress, txHash, result, this.getFunctionId(payload))
            .then(traceResult => {
              console.warn(traceResult)
              cb(err, result)
            })
            .catch(traceError => {
              cb(traceError, result)
            })
        } else {
          cb(err, result)
        }
      })
    }

    return this.nextProvider.sendAsync(payload, cb)
  }

  /**
   * Check the response result is ganache-core response and has revert error.
   * @param  result Response data.
   * @return boolean
   */
  _isGanacheErrorResponse(result) {
    return (result.error &&
      result.error.message &&
      (result.error.message.endsWith(': revert') || result.error.message.endsWith(': invalid opcode')))
  }

  /**
   * Check is invalid opcode error.
   * @param  result Response data.
   * @return boolean
   */
  _isInvalidOpcode(result) {
    return result.error.message.endsWith(': invalid opcode')
  }

  /**
   * Check the response result is go-ethereum response and has revert reason.
   * @param  method Request JSON-RPC method
   * @param  result Response data.
   * @return boolean
   */
  _isGethEthCallRevertResponse(method, result) {
    return (method === 'eth_call' && result.result && result.result.startsWith(REVERT_MESSAGE_ID))
  }

  /**
   * Check the response result is go-ethereum transaction receipt response and it mark error.
   * @param  method Request JSON-RPC method
   * @param  result Response data.
   * @return boolean
   */
  _isGethErrorReceiptResponse(method, result) {
    return (method === 'eth_getTransactionReceipt' && result.result && result.result.status === '0x0')
  }

  /**
   * Pick up revert reason
   * @param  returndata Return data of evm that in contains eth_call response.
   * @return revert reason message
   */
  pickUpRevertReason(returndata) {
    if (returndata instanceof String) {
      returndata = utils.toBuffer(returndata, 'hex')
    } else if (!(returndata instanceof Buffer)) {
      throw new Error('returndata is MUST hex String or Buffer.')
    }
    if (returndata.length < (4 + 32 + 32 + 32)) {
      //  4: method id
      // 32: abi encode header
      // 32: string length
      // 32: string body(min)
      throw new Error('returndata.length is MUST 100+.')
    }
    const dataoffset = utils.bufferToInt(returndata.slice(4).slice(0, 32))
    const abiencodedata = returndata.slice(36)
    const stringBody = abiencodedata.slice(dataoffset)
    const length = utils.bufferToInt(abiencodedata.slice(0, 32))
    return stringBody.slice(0, length)
  }

  /**
   * Gets the contract code by address
   * @param  address Address of the contract
   * @return Code of the contract
   */
  getContractCode(address) {
    return new Promise((resolve, reject) => {
      this.nextProvider.sendAsync(
        {
          id: new Date().getTime(),
          method: 'eth_getCode',
          params: [address]
        },
        (err, result) => {
          if (err) {
            reject(err)
          } else {
            resolve(result.result)
          }
        }
      )
    })
  }

  /**
   * Gets the debug trace of a transaction
   * @param  nextId Next request ID of JSON-RPC.
   * @param  txHash Hash of the transactuon to get a trace for
   * @param  traceParams Config object allowing you to specify if you need memory/storage/stack traces.
   * @return Transaction trace
   */
  getTransactionTrace(nextId, txHash, traceParams = {}) {
    return new Promise((resolve, reject) => {
      this.nextProvider.sendAsync(
        {
          id: nextId,
          method: 'debug_traceTransaction',
          params: [txHash, traceParams]
        },
        (err, result) => {
          if (err) {
            reject(err)
          } else {
            resolve(result.result)
          }
        }
      )
    })
  }

  async recordTxTrace(address, txHash, result, functionId, isInvalid = false) {
    address = !address || address === '0x0'
      ? constants.NEW_CONTRACT
      : address
    const trace = await this.getTransactionTrace(result.id + 1, txHash, {
      disableMemory: true,
      disableStack: false,
      disableStorage: true
    })

    const logs = (trace === undefined) ? [] : trace.structLogs
    const evmCallStack = getRevertTrace(logs, address)
    const opcodes = await this.getContractCode(address)
    const decoder = new AbiFunctions(opcodes)
    // create function call point stack
    const startPointStack = {
      address: address,
      structLog: {
        pc: decoder.findProgramCounter(functionId),
        type: 'call start point'
      }
    }
    evmCallStack.unshift(startPointStack)
    if (evmCallStack.length > 1) {
      // if getRevertTrace returns a call stack it means there was a
      // revert.
      return this.getStackTrace(evmCallStack)
    } else {
      return this.getStackTranceSimple(address, txHash, result, isInvalid)
    }
  }

  async getStackTranceSimple(address, txHash, result, isInvalid = false) {
    const bytecode = await this.getContractCode(address)
    const contractData = this.assemblerInfoProvider.getContractDataIfExists(bytecode)

    if (!contractData) {
      console.warn(`unknown contract address: ${address}.`)
      console.warn('Maybe you try to \'rm build/contracts/* && truffle compile\' for reset sourceMap.')
      return null
    }

    const bytecodeHex = utils.stripHexPrefix(bytecode)
    const sourceMap = contractData.sourceMapRuntime
    const pcToSourceRange = parseSourceMap(
      this.assemblerInfoProvider.sourceCodes,
      sourceMap,
      bytecodeHex,
      this.assemblerInfoProvider.sources
    )

    let sourceRange
    let pc = -1
    if (result.error && result.error.data) {
      pc = result.error.data[txHash].program_counter
    } else {
      const dataObj = {'message': `not supported data formart.`}
      result.error = result.error ? result.error : {}
      result.error.data = dataObj
    }
    // Sometimes there is not a mapping for this pc (e.g. if the revert
    // actually happens in assembly).
    while (!sourceRange) {
      sourceRange = pcToSourceRange[pc]
      pc -= 1
      if (pc < 0) {
        console.warn(
          `could not find matching sourceRange for structLog: ${JSON.stringify(result.error.data)}`
        )
        return null
      }
    }

    const errorType = isInvalid ? 'invalid opcode' : 'REVERT'
    if (sourceRange) {
      const traceArray = [
        sourceRange.fileName,
        sourceRange.location.start.line,
        sourceRange.location.start.column
      ].join(':')
      return `\n\nStack trace for ${errorType}:\n${traceArray}\n`
    }

    return `\n\nCould not determine stack trace for ${errorType}\n`
  }

  async getStackTrace(evmCallStack, functionId) {
    const sourceRanges = []

    for (let index = 0; index < evmCallStack.length; index++) {
      const evmCallStackEntry = evmCallStack[index]
      const isContractCreation =
        evmCallStackEntry.address === constants.NEW_CONTRACT
      if (isContractCreation) {
        console.error('Contract creation not supported')
        continue
      }

      const bytecode = await this.getContractCode(evmCallStackEntry.address)
      const contractData = this.assemblerInfoProvider.getContractDataIfExists(bytecode)

      if (!contractData) {
        const errMsg = isContractCreation
          ? `Unknown contract creation transaction`
          : `Transaction to an unknown address: ${evmCallStackEntry.address}`
        console.warn(errMsg)
        continue
      }

      const bytecodeHex = utils.stripHexPrefix(bytecode)
      const sourceMap = isContractCreation
        ? contractData.sourceMap
        : contractData.sourceMapRuntime
      const pcToSourceRange = parseSourceMap(
        this.assemblerInfoProvider.sourceCodes,
        sourceMap,
        bytecodeHex,
        this.assemblerInfoProvider.sources
      )

      let sourceRange
      let pc = evmCallStackEntry.structLog.pc
      // Sometimes there is not a mapping for this pc (e.g. if the revert
      // actually happens in assembly). In that case, we want to keep
      // searching backwards by decrementing the pc until we find a
      // mapped source range.
      while (!sourceRange) {
        sourceRange = pcToSourceRange[pc]
        pc -= 1
        if (pc <= 0) {
          console.warn(
            `could not find matching sourceRange for structLog: ${evmCallStackEntry.structLog}`
          )
          break
        }
      }
      if (sourceRange) {
        sourceRanges.push(sourceRange)
      }
    }

    if (sourceRanges.length > 0) {
      const traceArray = sourceRanges.map(sourceRange => {
        return [
          sourceRange.fileName,
          sourceRange.location.start.line,
          sourceRange.location.start.column
        ].join(':')
      })
      return `\n\nStack trace for REVERT:\n${traceArray.reverse().join('\n')}\n`
    }

    return '\n\nCould not determine stack trace for REVERT\n'
  }

  /**
   * extract function id from transaction data part.
   * @param payload
   * @return {*}
   */
  getFunctionId(payload) {
    let funcId = payload.params[0].data
    if (funcId && funcId.length > 10) {
      funcId = funcId.slice(0, 10)
    }
    return funcId
  }
}
