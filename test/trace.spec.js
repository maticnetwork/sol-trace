import {getRevertTrace} from '../src/trace'
import {expect} from 'chai'
const traceTestData = require('./trace_test_data.json')

describe('trace.js', () => {
  describe('getRevertTrace', () => {
    it('success. capture opcall address', async() => {
      const traces = getRevertTrace(traceTestData.structLogs, traceTestData.startAddress)
      expect(traces).to.have.lengthOf(2)
      expect(traces[0].address).to.equal('0x9fbda871d559710256a2502a2517b794b482db40')
      expect(traces[1].address).to.equal('0xac5bfb2b621aacdcea78eda76e47449a4a6904e1')
    })
  })
})
