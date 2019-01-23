
const METHOD_CALL = 'eth_call'
const METHOD_SEND_TRANSACTION = 'eth_sendTransaction'
const METHOD_GET_TRANSACTION_RECEIPT = 'eth_getTransactionReceipt'
const REVERT_MESSAGE_ID = '0x08c379a0' // first 4byte of keccak256('Error(string)').

/**
 * This class is parser and manager of information that is error RPC response.
 */
export default class ErrorResponseCapture {
  constructor(req) {
    this.rpcMethod = req.method
    this.response = {}
  }

  /**
   * check the RPC method is target.
   * @return {boolean}
   */
  isTargetMethod() {
    return this.rpcMethod === METHOD_SEND_TRANSACTION ||
      this.rpcMethod === METHOD_CALL ||
      this.rpcMethod === METHOD_GET_TRANSACTION_RECEIPT
  }

  isEthCallMethod() {
    return this.rpcMethod === METHOD_CALL
  }

  isGetTransactionReceipt() {
    return this.rpcMethod === METHOD_GET_TRANSACTION_RECEIPT
  }

  parseResponse(result) {
    this.response = result
    this._analyzeRPCMethod()
    this._analyzeResponseBody()
    this._classifyErrorType()
  }

  /**
   * analayze target node and is error from RPC method.
   * @private
   */
  _analyzeRPCMethod() {
    this.isGanacheError = this.rpcMethod === METHOD_CALL ||
      this.rpcMethod === METHOD_SEND_TRANSACTION

    this.isGethError = this.rpcMethod === METHOD_CALL ||
      this.rpcMethod === METHOD_GET_TRANSACTION_RECEIPT
  }

  /**
   * analyze is error from response data structure.
   * @private
   */
  _analyzeResponseBody() {
    if (this.isGanacheError) {
      this.isGanacheError = (this.response.error !== undefined && this.response.error.message !== undefined)
    }
    if (this.isGethError) {
      if (this.rpcMethod === METHOD_CALL) {
        this.isGethError = (this.response.result !== undefined) && this.response.result.startsWith(REVERT_MESSAGE_ID)
      }
      if (this.rpcMethod === METHOD_GET_TRANSACTION_RECEIPT) {
        this.isGethError = (this.response.result !== undefined) && this.response.result.status === '0x0'
      }
    }
  }

  /**
   * classify error type, revert or invalid.
   * @private
   */
  _classifyErrorType() {
    this.isReverting = false
    this.isInvaliding = false
    if (this.isGanacheError) {
      this.isReverting = this.response.error.message.endsWith(': revert')
      this.isInvaliding = this.response.error.message.endsWith(': invalid opcode')
    }
  }
}
