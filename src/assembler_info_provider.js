import glob from 'glob'
import fs from 'fs'

/**
 * The AssemblerInfoProvider is manager of Contracts.json.
 * This class provide contract sourceCode, bytecodes, sourceMap and something contract info.
 */
export default class AssemblerInfoProvider {
  constructor(fglob = 'build/contracts/**/*.json') {
    this.artifactsGlob = fglob
    this.contractsData = []
  }

  /**
   * collect contracts anything datas.
   * @return {{contractsData: Array, sourceCodes: any[], sources: (*|string)[]}|*}
   */
  collectContractsData() {
    const artifactFileNames = glob.sync(this.artifactsGlob, {absolute: true})
    const contractsData = []
    let sources = []
    artifactFileNames.forEach(artifactFileName => {
      const artifact = JSON.parse(fs.readFileSync(artifactFileName).toString())

      const correctPath = process.env.MODULE_RELATIVE_PATH || ''
      // If the sourcePath starts with zeppelin, then prepend with the pwd and node_modules
      if (new RegExp('^(open)?zeppelin-solidity').test(artifact.sourcePath)) {
        artifact.sourcePath = process.env.PWD + '/' + correctPath + 'node_modules/' + artifact.sourcePath
      }
      sources.push({
        artifactFileName,
        id: artifact.ast.id,
        sourcePath: artifact.sourcePath
      })

      if (!artifact.bytecode) {
        console.warn(
          `${artifactFileName} doesn't contain bytecode. Skipping...`
        )
        return
      }

      const contractData = {
        artifactFileName,
        sourceCodes,
        sources,
        bytecode: artifact.bytecode,
        sourceMap: artifact.sourceMap,
        runtimeBytecode: artifact.deployedBytecode,
        sourceMapRuntime: artifact.deployedSourceMap
      }
      contractsData.push(contractData)
    })
    sources = sources.sort((a, b) => parseInt(a.id, 10) - parseInt(b.id, 10))
    const sourceCodes = sources.map(source => {
      return fs.readFileSync(source.sourcePath).toString()
    })

    this.contractsData = {
      contractsData,
      sourceCodes,
      sources: sources.map(s => s.sourcePath)
    }
    return this.contractsData
  }

  /**
   * find and return contract datas that has same bytecode.
   * @param bytecode
   * @return {*}
   */
  getContractDataIfExists(bytecode) {
    if (!bytecode.startsWith('0x')) {
      throw new Error(`0x hex prefix missing: ${bytecode}`)
    }

    const contractData = this.contractsData.find(contractDataCandidate => {
      const bytecodeRegex = this.bytecodeToBytecodeRegex(
        contractDataCandidate.bytecode
      )
      const runtimeBytecodeRegex = this.bytecodeToBytecodeRegex(
        contractDataCandidate.runtimeBytecode
      )
      if (
        contractDataCandidate.bytecode.length === 2 ||
        contractDataCandidate.runtimeBytecode.length === 2
      ) {
        return false
      }

      // We use that function to find by bytecode or runtimeBytecode. Those are quasi-random strings so
      // collisions are practically impossible and it allows us to reuse that code
      return (
        bytecode === contractDataCandidate.bytecode ||
        bytecode === contractDataCandidate.runtimeBytecode ||
        new RegExp(`${bytecodeRegex}`, 'g').test(bytecode) ||
        new RegExp(`${runtimeBytecodeRegex}`, 'g').test(bytecode)
      )
    })

    return contractData
  }
}
