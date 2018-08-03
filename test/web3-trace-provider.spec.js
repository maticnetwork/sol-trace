import Web3TraceProvider from '../src/web3-trace-provider'
import MockProvider from './mock-provider'

const assert = require('assert')
const throwInPromise = (error) => {
  setTimeout(() => {
    throw error
  }, 0)
}
describe('Web3TraceProvider', () => {
  const revertResponseForCall = {
    id: 43,
    jsonrpc: '2.0',
    error: {
      message: 'VM Exception while processing transaction: revert',
      code: -32000,
      data: {
        '0x4edb02794d2e5d5c4c8c71bd033990158f5839bb9ab2e6f09c241aec16a0c008': {
          error: 'revert',
          program_counter: 810,
          return: '0x08c379a00000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000000e6e756d20697320746f6f20626967000000000000000000000000000000000000'
        },
        stack: 'c: VM Exception while processing transaction: revert\n    at Function.c.fromResults ... cli.node.js:25:392',
        name: 'c'
      }
    }
  }

  const revertResponseForSendTransaction = {
    id: 43,
    jsonrpc: '2.0',
    result: '0x25e2028b4459864af2f7bfeccfa387ff2d9922b2da840687a9ae7233fa2c72ba',
    error: {
      message: 'VM Exception while processing transaction: revert',
      code: -32000,
      data: {
        '0x25e2028b4459864af2f7bfeccfa387ff2d9922b2da840687a9ae7233fa2c72ba': {
          error: 'revert',
          'program_counter': 496
        },
        stack: 'c: VM Exception while processing transaction: revert\n    at Function.c.fromResults ... (timers.js:718:5)',
        name: 'c'
      }
    }
  }

  const targetProvider = (mcb) => {
    const mock = new MockProvider(mcb)
    const web3 = {
      currentProvider: mock,
      eth: {
        getCode: (address) => {
          const payload = {
            jsonrpc: '2.0',
            id: 42,
            method: 'eth_getCode',
            params: [address, 'latest']
          }
          return new Promise((resolve, reject) => {
            mock.sendAsync(payload, (err, res) => err ? reject(err) : resolve(res))
          })
        }
      }
    }
    return new Web3TraceProvider(web3)
  }
  const payload = {
    jsonrpc: '2.0',
    id: 43,
    method: 'eth_sendTransaction',
    params:
      [{
        from: '0x627306090abab3a6e1400e9345bc60c78a8bef57',
        gas: '0x6691b7',
        gasPrice: '0x174876e800',
        to: '0x2c2b9c9a4a25e24b174f26114e8926a9f2128fe4',
        data: '0x4552e5c80000000000000000000000000000000000000000000000000000000000000014'
      }]
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
    const traceErrorResponse = {
      error: {
        message: 'Unknown transaction 0x834f1e4f70dfe8fdb6cfaacbc8a4a80768946510e33ddc6b47ef09bea0c2eec8',
        code: -32000,
        data: {
          stack: 'Error: Unknown transaction 0x834f1e4f70dfe8fdb6cfaacbc8a4a80768946510e33ddc6b47ef09bea0c2eec8\n ... at FSReqWrap.readFileAfterOpen [as oncomplete] (fs.js:421:13)',
          name: 'Error'
        }
      }
    }
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
  })
})
