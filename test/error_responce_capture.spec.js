import ErrorResponseCapture from '../src/error_response_capture'
import {expect} from 'chai'
import {
  gethRevertReceiptResponse,
  gethRevertResponseForEthCall,
  gethSuccessReceiptResponse,
  invalidResponseForEthCall,
  invalidResponseForSnedTransaction,
  revertResponseForCall,
  revertResponseForSendTransaction,
  successResponseForSendTransaction
} from './jsonrpc_datas'

const rpcPayload = (method) => {
  return {
    jsonrpc: '2.0',
    id: 43,
    method: method,
    params:
      [{
        from: '0x627306090abab3a6e1400e9345bc60c78a8bef57',
        gas: '0x6691b7',
        gasPrice: '0x174876e800',
        to: '0x2c2b9c9a4a25e24b174f26114e8926a9f2128fe4',
        data: '0x4552e5c80000000000000000000000000000000000000000000000000000000000000014'
      }]
  }
}

describe('ErrorResponseCapture', () => {
  describe('capture targets test', () => {
    const subject = (method) => new ErrorResponseCapture(rpcPayload(method)).isTargetMethod()
    it('eth_sendTransaction is target.', async() => {
      expect(subject('eth_sendTransaction')).to.be.true
    })
    it('eth_call is target.', async() => {
      expect(subject('eth_call')).to.be.true
    })
    it('eth_getTransactionReceipt is target.', async() => {
      expect(subject('eth_getTransactionReceipt')).to.be.true
    })
    it('eth_accounts is not a target.', async() => {
      expect(subject('eth_accounts')).to.be.false
    })
  })

  describe('analyze which error type', () => {
    const capture = (method) => new ErrorResponseCapture(rpcPayload(method))
    describe('in ganache.', () => {
      let ercap
      describe('eth_sendTransaction error.', () => {
        before(() => {
          ercap = capture('eth_sendTransaction')
          ercap.parseResponse(revertResponseForSendTransaction)
        })
        it('is ganache eth_sendTransaction error.', async() => {
          expect(ercap.isGanacheError).to.be.true
        })
        it('is not geth eth_sendTransaction error.', async() => {
          expect(ercap.isGethError).to.be.false
        })
      })

      describe('eth_call error.', () => {
        before(() => {
          ercap = capture('eth_call')
          ercap.parseResponse(revertResponseForCall)
        })
        it('is ganache eth_call error.', async() => {
          expect(ercap.isGanacheError).to.be.true
        })
        it('is not geth eth_call error.', async() => {
          expect(ercap.isGethError).to.be.false
        })
      })

      describe('success eth_sendTransaction.', () => {
        before(() => {
          ercap = capture('eth_sendTransaction')
          ercap.parseResponse(successResponseForSendTransaction)
        })
        it('is not ganache error.', async() => {
          expect(ercap.isGanacheError).to.be.false
        })
        it('is not geth error.', async() => {
          expect(ercap.isGethError).to.be.false
        })
      })

      describe('success eth_getTransactionReceipt.', () => {
        before(() => {
          ercap = capture('eth_getTransactionReceipt')
          ercap.parseResponse(gethSuccessReceiptResponse)
        })
        it('is not ganache error.', async() => {
          expect(ercap.isGanacheError).to.be.false
        })
        it('is not geth error.', async() => {
          expect(ercap.isGethError).to.be.false
        })
      })

      describe('classify error type.', () => {
        const createCapture = (method, res) => {
          const ercap = capture(method)
          ercap.parseResponse(res)
          return ercap
        }
        describe('revert when sendTransaction.', () => {
          const subject = createCapture('eth_sendTransaction', revertResponseForSendTransaction)
          it('is revert.', async() => {
            expect(subject.isReverting).to.be.true
          })
          it('is not invalid.', async() => {
            expect(subject.isInvaliding).to.be.false
          })
        })
        describe('revert when eth_call.', () => {
          const subject = createCapture('eth_call', revertResponseForSendTransaction)
          it('is revert.', async() => {
            expect(subject.isReverting).to.be.true
          })
          it('is not invalid.', async() => {
            expect(subject.isInvaliding).to.be.false
          })
        })
        describe('invalid opcode when sendTransaction.', () => {
          const subject = createCapture('eth_sendTransaction', invalidResponseForSnedTransaction)
          it('is not revert.', async() => {
            expect(subject.isReverting).to.be.false
          })
          it('is invalid.', async() => {
            expect(subject.isInvaliding).to.be.true
          })
        })
        describe('invalid opcode when eth_call.', () => {
          const subject = createCapture('eth_call', invalidResponseForEthCall)
          it('is not revert.', async() => {
            expect(subject.isReverting).to.be.false
          })
          it('is invalid.', async() => {
            expect(subject.isInvaliding).to.be.true
          })
        })
      })
    })
    describe('in geth.', () => {
      let ercap
      describe('eth_getSendtransaction error. in fact eth_getTransactionReceipt', () => {
        before(() => {
          ercap = capture('eth_getTransactionReceipt')
          ercap.parseResponse(gethRevertReceiptResponse)
        })
        it('is geth eth_getTransactionReceipt error.', async() => {
          expect(ercap.isGethError).to.be.true
        })
        it('is not ganache eth_getTransactionReceipt error.', async() => {
          expect(ercap.isGanacheError).to.be.false
        })
      })
      describe('eth_call error.', () => {
        before(() => {
          ercap = capture('eth_call')
          ercap.parseResponse(gethRevertResponseForEthCall)
        })
        it('is geth eth_call error.', async() => {
          expect(ercap.isGethError).to.be.true
        })
        it('is not ganache eth_call error.', async() => {
          expect(ercap.isGanacheError).to.be.false
        })
      })
    })
  })
})
