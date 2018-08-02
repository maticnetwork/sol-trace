import {parseSourceMap} from '../src/source-maps'
import utils from 'ethereumjs-util'
const assert = require('assert')
const contractsData = require('./contractsData.json')
const bytecode = require('./runtimeBytecodes.json').SumToLength

describe('SourceMaps', () => {
  describe('parseSourceMap', () => {
    it('selecte to SumToLength', async() => {
      const bytecodeHex = utils.stripHexPrefix(bytecode)
      const pcToSourceRange = parseSourceMap(
        contractsData.sourceCodes,
        contractsData.contractsData[3].sourceMapRuntime,
        bytecodeHex,
        contractsData.sources
      )
      assert.equal(pcToSourceRange[419].fileName, '/contracts/SumToLength.sol')
    })
  })
})
