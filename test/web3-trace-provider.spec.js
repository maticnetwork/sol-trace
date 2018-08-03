import Web3TraceProvider from '../src/web3-trace-provider'
import MockProvider from './mock-provider'

const assert = require('assert')

describe('Web3TraceProvider', () => {
  describe('eth_call', () => {
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
    const revertResponseForCall = {
      id: 43,
      jsonrpc: '2.0',
      error: {
        message: 'VM Exception while processing transaction: revert',
        code: -32000,
        data: {
          '0x4edb02794d2e5d5c4c8c71bd033990158f5839bb9ab2e6f09c241aec16a0c008': {
            error: 'revert',
            'program_counter': 810,
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
    let callCounter, lastPayload
    const mock = new MockProvider((counter, payload, cb) => {
      callCounter += 1
      lastPayload = payload
      if (payload.method === 'eth_sendTransaction') {
        cb(null, revertResponseForSendTransaction)
      } else if (payload.method === 'eth_call') {
        cb(null, revertResponseForCall)
      }
    })
    const web3 = {currentProvider: mock}
    const target = new Web3TraceProvider(web3)
    beforeEach(() => {
      callCounter = 0
      lastPayload = ''
    })
    it('call debug_traceTransaction if trigger by eth_sendTransaction.', async() => {
      await target.sendAsync(payload, (err, res) => {
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
      await target.sendAsync(callPayload, (err, res) => {
        if (err) {
          assert.fail()
        }
      })
      assert.equal(2, callCounter)
      assert.equal('debug_traceTransaction', lastPayload.method)
      assert.equal('0x4edb02794d2e5d5c4c8c71bd033990158f5839bb9ab2e6f09c241aec16a0c008', lastPayload.params[0])
    })
  })
})
