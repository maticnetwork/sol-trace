import Web3TraceProvider from '../src/web3-trace-provider'
import MockProvider from './mock-provider'
import {
  getCodeMock,
  oldVerResponse,
  payload,
  revertResponseForCall,
  revertResponseForSendTransaction,
  traceErrorResponse
} from './jsonrpc_datas'

const assert = require('assert')
const throwInPromise = (error) => {
  setTimeout(() => {
    throw error
  }, 0)
}
describe('Web3TraceProvider', () => {
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
  let callCounter, lastPayload
  beforeEach(() => {
    callCounter = 0
    lastPayload = ''
  })
  describe('debug_traceTransaction', () => {
    const mockCallback = (counter, payload, cb) => {
      callCounter += 1
      lastPayload = payload
      if (payload.method === 'eth_sendTransaction') {
        cb(null, revertResponseForSendTransaction)
      } else if (payload.method === 'eth_call') {
        cb(null, revertResponseForCall)
      }
    }
    it('call debug_traceTransaction if trigger by eth_sendTransaction.', async() => {
      await targetProvider(mockCallback).sendAsync(payload, (err, res) => {
        if (err) {
          assert.fail()
        }
      })
      assert.equal(2, callCounter)
      assert.equal('debug_traceTransaction', lastPayload.method)
      assert.equal('0x25e2028b4459864af2f7bfeccfa387ff2d9922b2da840687a9ae7233fa2c72ba', lastPayload.params[0])
    })
    it('call debug_traceTransaction if trigger by eth_call.', async() => {
      const callPayload = Object.assign(payload, {method: 'eth_call'})
      await targetProvider(mockCallback).sendAsync(callPayload, (err, res) => {
        if (err) {
          assert.fail()
        }
      })
      assert.equal(2, callCounter)
      assert.equal('debug_traceTransaction', lastPayload.method)
      assert.equal('0x4edb02794d2e5d5c4c8c71bd033990158f5839bb9ab2e6f09c241aec16a0c008', lastPayload.params[0])
    })
  })
  describe('getStackTraceSimple', () => {
    const debugTraceErrorMock = (responseForCall) => {
      return (counter, payload, cb) => {
        callCounter += 1
        lastPayload = payload
        if (payload.method === 'eth_sendTransaction') {
          return cb(null, revertResponseForSendTransaction)
        } else if (payload.method === 'eth_call') {
          return cb(null, responseForCall)
        } else if (payload.method === 'debug_traceTransaction') {
          return cb(null, traceErrorResponse)
        } else if (payload.method === 'eth_getCode') {
          return cb(null, '0x1234')
        }
      }
    }
    it('when debug_traceTransaction retrun error.', async() => {
      const callPayload = Object.assign(payload, {method: 'eth_call'})
      try {
        (await targetProvider(debugTraceErrorMock(revertResponseForCall)).sendAsync(callPayload, (err, res) => {
          if (err) {
            throwInPromise(err)
          }
        }))
        assert.equal(3, callCounter)
        assert.equal('eth_getCode', lastPayload.method)
      } catch (e) {
        assert.fail(e)
      }
    })
    it('eth_call old ver response.', async() => {
      const callPayload = Object.assign(payload, {method: 'eth_call'})
      try {
        await targetProvider(debugTraceErrorMock(oldVerResponse)).sendAsync(callPayload, (err, res) => {
          if (err) throwInPromise(err)
        })
        assert.equal(1, callCounter)
        assert.equal('eth_call', lastPayload.method)
      } catch (e) {
        assert.fail(e)
      }
    })
  })
})
