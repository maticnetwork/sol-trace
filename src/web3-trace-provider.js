import utils from 'ethereumjs-util'

import AbiFunctions from 'abi-decode-functions'
import {constants, getRevertTrace} from './trace'
import {parseSourceMap} from './source-maps'
import AssemblerInfoProvider from './assembler_info_provider'
import ErrorResponseCapture from './error_response_capture'

export default class Web3TraceProvider {
  constructor(web3) {
    this.web3 = web3
    this.nextProvider = web3.currentProvider
    this.assemblerInfoProvider = new AssemblerInfoProvider()
    this.contractCodes = {}
  }

  /**
   * Should be called to make sync request
   *
   * @method send
   * @param {Object} payload
   * @return {Object} result
   */
  send(payload, cb = () => {}) {
    return this.nextProvider.send(payload, cb)
  }

  sendAsync(payload, cb) {
    const errorResCap = new ErrorResponseCapture(payload)
    if (errorResCap.isTargetMethod()) {
      const txData = payload.params[0]
      return this.nextProvider[this.nextProvider.sendAsync ? 'sendAsync' : 'send'](payload, (err, result) => {
        errorResCap.parseResponse(result)
        if (errorResCap.isGanacheError) {
          const txHash = result.result || Object.keys(result.error.data)[0]
          if (utils.toBuffer(txHash).length === 32) {
            const toAddress = txData.to
            // record tx trace
            this.recordTxTrace(toAddress, txHash, result, this.getFunctionId(payload), errorResCap.isInvaliding)
              .then(traceResult => {
                result.error.message += traceResult
                cb(err, result)
              })
              .catch(traceError => {
                cb(traceError, result)
              })
          } else {
            cb(new Error('Could not trace REVERT / invalid opcode. maybe legacy node.'), result)
          }
        } else if (errorResCap.isGethError && errorResCap.isEthCallMethod()) {
          const messageBuf = this.pickUpRevertReason(utils.toBuffer(result.result))
          console.warn(`VM Exception while processing transaction: revert. reason: ${messageBuf.toString()}`)
          cb(err, result)
        } else if (errorResCap.isGethError && errorResCap.isGetTransactionReceipt()) {
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

    return this.nextProvider[this.nextProvider.sendAsync ? 'sendAsync' : 'send'](payload, cb)
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
      if (address === constants.NEW_CONTRACT) {
        return reject(new Error('Contract Creation is not supporte.'))
      } else if (this.contractCodes[address]) {
        return resolve(this.contractCodes[address])
      }
      this.nextProvider[this.nextProvider.sendAsync ? 'sendAsync' : 'send'](
        {
          id: new Date().getTime(),
          method: 'eth_getCode',
          params: [address]
        },
        (err, result) => {
          if (err) {
            reject(err)
          } else {
            this.contractCodes[address] = result.result
            resolve(this.contractCodes[address])
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
      this.nextProvider[this.nextProvider.sendAsync ? 'sendAsync' : 'send'](
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

  extractEvmCallStack(trace, address) {
    const logs = (trace === undefined || trace.structLogs === undefined) ? [] : trace.structLogs
    return getRevertTrace(logs, address)
  }

  /**
   * recording trace that start point, call and revert opcode point from debug trace.
   * @param address
   * @param txHash
   * @param result
   * @param functionId
   * @param isInvalid
   * @return {Promise<*>}
   */
  async recordTxTrace(address, txHash, result, functionId, isInvalid = false) {
    address = !address || address === '0x0'
      ? constants.NEW_CONTRACT
      : address
    const trace = await this.getTransactionTrace(result.id + 1, txHash, {
      disableMemory: true,
      disableStack: false,
      disableStorage: true
    })

    const evmCallStack = this.extractEvmCallStack(trace, address)
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
    if (evmCallStack.length === 1) {
      // if length === 1, it did not get debug_traceTransaction, because it error happens in eth_call.
      // so that, we create callStack from RPC response that is program counter of REVERT / invalid.
      evmCallStack.push(this.createCallStackFromResponse(address, txHash, result, isInvalid))
    }
    // if getRevertTrace returns a call stack it means there was a
    // revert.
    return this.getStackTrace(evmCallStack)
  }

  /**
   * trace info convert to stack trace info that is using assembly opcodes.
   * @param address
   * @param txHash
   * @param result
   * @param isInvalid
   * @return {Promise<*>}
   */
  createCallStackFromResponse(address, txHash, result, isInvalid) {
    let pc = -1
    if (result.error && result.error.data) {
      pc = result.error.data[txHash].program_counter
      const errorStack = {
        address: address,
        structLog: {
          pc: pc,
          type: `call ${isInvalid ? 'invalid' : 'revert'} point`
        }
      }
      return errorStack
    } else {
      throw new Error('not supported data formart.')
    }
  }

  /**
   * trace info convert to stack trace info that is using call stack.
   * @param evmCallStack
   * @param functionId
   * @return {Promise<string>}
   */
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
          const msgParams = ['pc', 'op', 'type'].map((key) => `${key}: ${evmCallStackEntry.structLog[key]}`)
          console.warn(
            `could not find matching sourceRange for structLog: ${msgParams.join(', ')}`
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
