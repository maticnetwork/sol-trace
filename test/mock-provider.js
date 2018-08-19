/**
 * MockProvider for test
 */
export default class MockProvider {
  constructor(mockfunc) {
    this.mockfunc = mockfunc
  }

  sendAsync(payload, cb) {
    return this.mockfunc(this.call_counter, payload, cb)
  }
}
