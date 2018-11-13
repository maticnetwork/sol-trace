import AssemblerInfoProvider from '../src/assembler_info_provider'
import {expect} from 'chai'
import PassManagerJSON from './resources/build/PassManager'

describe('AssemlerInfoProvider', () => {
  describe('init', () => {
    it('create.', async() => {
      const aip = new AssemblerInfoProvider()
      expect(aip).to.be.ok
    })
    it('fglob default value.', async() => {
      const aip = new AssemblerInfoProvider()
      expect(aip.artifactsGlob).to.equal('build/contracts/**/*.json')
    })
    it('can change fglob.', async() => {
      const aip = new AssemblerInfoProvider('./resource')
      expect(aip.artifactsGlob).to.equal('./resource')
    })
  })
  describe('test using json files', () => {
    let aip
    beforeEach(() => {
      aip = new AssemblerInfoProvider('test/resources/build/**/*.json')
    })
    describe('contractsData', () => {
      it('sources have 2 items.', async() => {
        const datas = aip.contractsData
        expect(datas.sources).to.have.lengthOf(2)
        expect(datas.sources[0]).to.have.string('EducationPass.sol')
        expect(datas.sources[1]).to.have.string('PassManager.sol')
      })
    })
    describe('getContractDataIfExists', () => {
      it('sources have 2 items.', async() => {
        const bytecode = PassManagerJSON.deployedBytecode
        const contractData = aip.getContractDataIfExists(bytecode)
        expect(contractData).to.be.ok
        expect(contractData.artifactFileName).to.have.string('PassManager.json')
      })
    })
  })
})
