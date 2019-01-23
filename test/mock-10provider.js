/**
 * MockProvider for test
 */
export default class MockProvider {
  constructor(mockfunc) {
    this.mockfunc = mockfunc
  }

  send(payload, cb) {
    return this.mockfunc(this.call_counter, payload, cb)
  }
}
