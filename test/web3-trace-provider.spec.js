import Web3TraceProvider from '../src/web3-trace-provider'
import MockProvider from './mock-provider'
import {
  callPayload,
  createContractPayload, educationPassRevertResult,
  getCodeMock,
  gethRevertReceiptCreationResponse,
  gethRevertReceiptResponse,
  gethRevertResponseForEthCall,
  getReceiptPayload,
  invalidResponseForEthCall,
  invalidResponseForSnedTransaction,
  oldVerResponse,
  payload,
  revertResponseForCall,
  revertResponseForSendTransaction,
  revertResponseOfCreation,
  successResponseForSendTransaction,
  traceErrorResponse
} from './jsonrpc_datas'
import utils from 'ethereumjs-util'
import {expect} from 'chai'
import AssemblerInfoProvider from '../src/assembler_info_provider'

const sinon = require('sinon')
const assert = require('assert')
const testContractJSON = require('./contractsData')
const evmCallStacks = require('./resources/evm_callstack')
const educationPassDebugTraceJSON = require('./resources/education_debug_trace')

const copy = (obj) => JSON.parse(JSON.stringify(obj))
const prosmify = (provider, payload) => {
  return new Promise((resolve, reject) => {
    provider.sendAsync(payload, (err, res) => err ? reject(err) : resolve(res))
  })
}
describe('Web3TraceProvider', function() {
  this.timeout(500)
  const targetProvider = (mcb) => {
    const mock = new MockProvider(mcb)
    const web3 = {
      currentProvider: mock,
      eth: {
        getCode: getCodeMock(mock)
      }
    }
    return new Web3TraceProvider(web3)
  }
  describe('pickUpRevertReason', () => {
    const abiEncodeError = (message) => {
      const prefix = utils.toBuffer('0x08c379a00000000000000000000000000000000000000000000000000000000000000020')
      const lengthBuf = Buffer.alloc(32, 0)
      lengthBuf.writeUInt32BE(message.length, 28)
      const bodyBuf = Buffer.alloc(32, 0)
      bodyBuf.write(message)
      return Buffer.concat([prefix, lengthBuf, bodyBuf])
    }
    const tp = new Web3TraceProvider({})
    it('success transaction.', async() => {
      const reason = tp.pickUpRevertReason(abiEncodeError('hoge'))
      assert.equal('hoge', reason.toString())
    })
    it('unspport data type number.', async() => {
      try {
        tp.pickUpRevertReason(1234)
        assert.fail('must be error')
      } catch (e) {
        assert.equal('returndata is MUST hex String or Buffer.', e.message)
      }
    })
    it('unspport data type array.', async() => {
      try {
        tp.pickUpRevertReason([])
        assert.fail('must be error')
      } catch (e) {
        assert.equal('returndata is MUST hex String or Buffer.', e.message)
      }
    })
    it('data too short error.', async() => {
      try {
        tp.pickUpRevertReason(Buffer.from('hoge'))
        assert.fail('must be error')
      } catch (e) {
        assert.equal('returndata.length is MUST 100+.', e.message)
      }
    })
  })
  describe('JSON-RPC', () => {
    const provider = targetProvider()
    let spy, stub, contractDataStub
    const matchMethod = (method) => {
      return sinon.match(payload => payload.method === method)
    }
    beforeEach(() => {
      spy = sinon.spy(console, 'warn')
      stub = sinon.stub(provider.nextProvider, 'sendAsync')
      contractDataStub = sinon.stub(provider.assemblerInfoProvider, 'getContractDataIfExists')
      sinon.stub(provider.assemblerInfoProvider, 'contractsData').get(() => testContractJSON)
      sinon.stub(provider.assemblerInfoProvider, 'sourceCodes').get(() => testContractJSON.sourceCodes)
      sinon.stub(provider.assemblerInfoProvider, 'sources').get(() => testContractJSON.sources)

      contractDataStub.returns(testContractJSON.contractsData[0])
      stub.withArgs(matchMethod('debug_traceTransaction'), sinon.match.func).callsFake((payload, cb) => {
        cb(null, [{}, {}])
      })
      stub.withArgs(matchMethod('eth_getCode'), sinon.match.func).callsFake((payload, cb) => cb(null, {result: '0x1234'}))
      stub.callsFake((payload, cb) => cb(null, {}))
    })
    afterEach(() => {
      stub.restore()
      contractDataStub.restore()
      spy.restore()
      sinon.restore()
    })
    describe('support ganache', () => {
      it('success transaction.', async() => {
        stub.withArgs(matchMethod('eth_sendTransaction'), sinon.match.func).callsFake((payload, cb) => cb(null, successResponseForSendTransaction))

        await prosmify(provider, payload)
        const spyCalledMethods = stub.getCalls().map(call => call.args[0].method)
        assert.equal(1, spyCalledMethods.length)
        assert.equal(JSON.stringify(['eth_sendTransaction']), JSON.stringify(spyCalledMethods))
        assert.equal('0x2c2b9c9a4a25e24b174f26114e8926a9f2128fe4', stub.firstCall.args[0].params[0].to)
        assert.equal(false, spy.calledWith('Could not trace REVERT. maybe legacy node.'))
      })
      it('eth_sendTransaction', async() => {
        stub.withArgs(matchMethod('eth_sendTransaction'), sinon.match.func).callsFake((payload, cb) => {
          cb(null, revertResponseForSendTransaction)
        })
        await prosmify(provider, payload)
        const spyCalledMethods = stub.getCalls().map(call => call.args[0].method)
        assert.equal(4, spyCalledMethods.length)
        assert.equal(JSON.stringify(['eth_sendTransaction', 'debug_traceTransaction', 'eth_getCode', 'eth_getCode'])
          , JSON.stringify(spyCalledMethods))
        assert.equal('0x25e2028b4459864af2f7bfeccfa387ff2d9922b2da840687a9ae7233fa2c72ba', stub.getCall(1).args[0].params[0])
      })
      it('eth_call', async() => {
        stub.withArgs(matchMethod('eth_call'), sinon.match.func).callsFake((payload, cb) => {
          cb(null, copy(revertResponseForCall))
        })
        const spyGetStackTranceSimple = sinon.spy(provider, 'getStackTranceSimple')
        try {
          await prosmify(provider, callPayload)
          const spyCalledMethods = stub.getCalls().map(call => call.args[0].method)
          assert.equal(4, stub.callCount)
          assert.equal(JSON.stringify(['eth_call', 'debug_traceTransaction', 'eth_getCode', 'eth_getCode'])
            , JSON.stringify(spyCalledMethods))
          assert.equal('0x4edb02794d2e5d5c4c8c71bd033990158f5839bb9ab2e6f09c241aec16a0c008', stub.getCall(1).args[0].params[0])
          assert.equal(spyGetStackTranceSimple.called, true)
          assert.equal(spyGetStackTranceSimple.firstCall.args[3], false)
        } finally {
          spyGetStackTranceSimple.restore()
        }
      })
      it('eth_call old ver response.', async() => {
        stub.withArgs(matchMethod('eth_call'), sinon.match.func).callsFake((payload, cb) => {
          cb(null, oldVerResponse)
        })
        await prosmify(provider, callPayload)
        const spyCalledMethods = stub.getCalls().map(call => call.args[0].method)
        assert.equal(1, stub.callCount)
        assert.equal(JSON.stringify(['eth_call']), JSON.stringify(spyCalledMethods))
        assert.equal(true, spy.calledWith('Could not trace REVERT / invalid opcode. maybe legacy node.'))
      })
      it('when debug_traceTransaction retrun error.', async() => {
        stub.withArgs(matchMethod('debug_traceTransaction'), sinon.match.func).callsFake((payload, cb) => {
          cb(null, traceErrorResponse)
        })
        stub.withArgs(matchMethod('eth_call'), sinon.match.func).callsFake((payload, cb) => {
          cb(null, copy(revertResponseForCall))
        })
        await prosmify(provider, callPayload)
        const spyCalledMethods = stub.getCalls().map(call => call.args[0].method)
        assert.equal(stub.callCount, 4)
        assert.equal(JSON.stringify(['eth_call', 'debug_traceTransaction', 'eth_getCode', 'eth_getCode'])
          , JSON.stringify(spyCalledMethods))
      })
      it('revert creation transaction.', async() => {
        stub.withArgs(matchMethod('eth_sendTransaction'), sinon.match.func).callsFake((payload, cb) => {
          cb(null, revertResponseOfCreation)
        })
        // TODO: This spy is work arround. wanna spy to getRevertTrace
        const spyGetStackTranceSimple = sinon.spy(provider, 'getStackTranceSimple')
        try {
          await prosmify(provider, createContractPayload)
          const spyCalledMethods = stub.getCalls().map(call => call.args[0].method)
          assert.equal(4, stub.callCount)
          assert.equal(spyGetStackTranceSimple.getCall(0).args[0], 'NEW_CONTRACT')
          assert.equal(JSON.stringify(['eth_sendTransaction', 'debug_traceTransaction', 'eth_getCode', 'eth_getCode'])
            , JSON.stringify(spyCalledMethods))
        } finally {
          spyGetStackTranceSimple.restore()
        }
      })
      it('invalid opcode.', async() => {
        stub.withArgs(matchMethod('eth_sendTransaction'), sinon.match.func).callsFake((payload, cb) => {
          cb(null, copy(invalidResponseForSnedTransaction))
        })
        const spyGetStackTranceSimple = sinon.spy(provider, 'getStackTranceSimple')
        try {
          await prosmify(provider, payload)
          const spyCalledMethods = stub.getCalls().map(call => call.args[0].method)
          assert.equal(4, stub.callCount)
          assert.equal(JSON.stringify(['eth_sendTransaction', 'debug_traceTransaction', 'eth_getCode', 'eth_getCode'])
            , JSON.stringify(spyCalledMethods))
          assert.equal(spyGetStackTranceSimple.called, true)
          assert.equal(spyGetStackTranceSimple.firstCall.args[3], true)
        } finally {
          spyGetStackTranceSimple.restore()
        }
      })
      it('invalid opcode when eth_call.', async() => {
        stub.withArgs(matchMethod('eth_call'), sinon.match.func).callsFake((payload, cb) => {
          cb(null, invalidResponseForEthCall)
        })
        const spyGetStackTranceSimple = sinon.spy(provider, 'getStackTranceSimple')
        try {
          await prosmify(provider, callPayload)
          const spyCalledMethods = stub.getCalls().map(call => call.args[0].method)
          assert.equal(4, stub.callCount)
          assert.equal(JSON.stringify(['eth_call', 'debug_traceTransaction', 'eth_getCode', 'eth_getCode'])
            , JSON.stringify(spyCalledMethods))
          assert.equal(spyGetStackTranceSimple.called, true)
          assert.equal(spyGetStackTranceSimple.firstCall.args[3], true)
        } finally {
          spyGetStackTranceSimple.restore()
        }
      })
    })

    describe('geth support', () => {
      it('geth revert response when eth_call.', async() => {
        stub.withArgs(matchMethod('eth_call'), sinon.match.func).callsFake((payload, cb) => {
          cb(null, gethRevertResponseForEthCall)
        })
        await prosmify(provider, callPayload)
        const spyCalledMethods = stub.getCalls().map(call => call.args[0].method)
        assert.equal(1, stub.callCount)
        assert.equal(JSON.stringify(['eth_call']), JSON.stringify(spyCalledMethods))
        assert.equal(true, spy.calledWith('VM Exception while processing transaction: revert. reason: num is small'))
      })
      it('geth revert response of receipt.', async() => {
        stub.withArgs(matchMethod('eth_getTransactionReceipt'), sinon.match.func).callsFake((payload, cb) => {
          cb(null, gethRevertReceiptResponse)
        })
        await prosmify(provider, getReceiptPayload)
        const spyCalledMethods = stub.getCalls().map(call => call.args[0].method)
        assert.equal(4, stub.callCount)
        assert.equal(JSON.stringify(spyCalledMethods), JSON.stringify(['eth_getTransactionReceipt', 'debug_traceTransaction', 'eth_getCode', 'eth_getCode']))
        assert.equal(stub.getCall(1).args[0].params[0], '0x43cc231fac6c0b8cc341328aeb727efb77b860508c03502376cd52ec2eee75da')
        assert.equal(stub.getCall(1).args[0].id, 179)
      })
      it('geth contract creation faild.', async() => {
        stub.withArgs(matchMethod('eth_getTransactionReceipt'), sinon.match.func).callsFake((payload, cb) => {
          cb(null, gethRevertReceiptCreationResponse)
        })
        // TODO: This spy is work arround. wanna spy to getRevertTrace
        const spyGetStackTranceSimple = sinon.spy(provider, 'getStackTranceSimple')
        try {
          await prosmify(provider, getReceiptPayload)
          const spyCalledMethods = stub.getCalls().map(call => call.args[0].method)
          assert.equal(spyGetStackTranceSimple.getCall(0).args[0], 'NEW_CONTRACT')
          assert.equal(4, stub.callCount)
          assert.equal(JSON.stringify(spyCalledMethods), JSON.stringify(['eth_getTransactionReceipt', 'debug_traceTransaction', 'eth_getCode', 'eth_getCode']))
          assert.equal(stub.getCall(1).args[0].params[0], '0x39b37a0f46525d1c233a461e97e3df398347c93e811a64e6aad150422eb9d0d5')
          assert.equal(stub.getCall(1).args[0].id, 22)
        } finally {
          spyGetStackTranceSimple.restore()
        }
      })
    })
  })

  describe('recordTxTrace', () => {
    const matchMethod = (method) => {
      return sinon.match(payload => payload.method === method)
    }
    const provider = targetProvider()
    let stub
    beforeEach(() => {
      stub = sinon.stub(provider.nextProvider, 'sendAsync')
      const datas = new AssemblerInfoProvider('test/resources/build2/**/*.json').contractsData
      sinon.stub(provider.assemblerInfoProvider, 'contractsData').get(() => datas)
      const passManagerBytecodes = datas.datas[1].runtimeBytecode
      stub.withArgs(matchMethod('eth_getCode'), sinon.match.func).callsFake((payload, cb) => cb(null, {result: passManagerBytecodes}))
      stub.withArgs(matchMethod('debug_traceTransaction'), sinon.match.func).callsFake((payload, cb) => cb(null, {result: educationPassDebugTraceJSON}))
      stub.callsFake((payload, cb) => cb(null, ''))
    })
    afterEach(() => {
      stub.restore()
      sinon.restore()
    })
    it('success.', async() => {
      const address = '0xf2beae25b23f0ccdd234410354cb42d08ed54981'
      const txHash = '0x02ced131074d99fbd576b205f8d3cfb82c4852f2327d37abd39b2d702aa78557'
      const functionId = '0x40c10f19'
      const isInvalid = false

      const trace = await provider.recordTxTrace(address, txHash, educationPassRevertResult, functionId, isInvalid)
      expect(trace).to.have.string('Stack trace for REVERT:')
      expect(trace).to.have.string('Ownable.sol:36:4')
      expect(trace).to.have.string('EducationPass.sol:23')
    })
  })

  describe('getStackTrace', () => {
    const matchMethod = (method) => {
      return sinon.match(payload => payload.method === method)
    }
    const provider = targetProvider()
    let stub
    beforeEach(() => {
      stub = sinon.stub(provider.nextProvider, 'sendAsync')
      const datas = new AssemblerInfoProvider('test/resources/build2/**/*.json').contractsData
      sinon.stub(provider.assemblerInfoProvider, 'contractsData').get(() => datas)
      const passManagerBytecodes = datas.datas[1].runtimeBytecode
      stub.withArgs(matchMethod('eth_getCode'), sinon.match.func).callsFake((payload, cb) => cb(null, {result: passManagerBytecodes}))
      stub.callsFake((payload, cb) => cb(null, ''))
    })
    afterEach(() => {
      stub.restore()
      sinon.restore()
    })
    it('success.', async() => {
      const trace = await provider.getStackTrace(evmCallStacks)
      expect(trace).to.have.string('Stack trace for REVERT:')
      expect(trace).to.have.string('Ownable.sol:36:4')
      expect(trace).to.have.string('EducationPass.sol:23')
    })
  })
})
