import glob from 'glob'
import fs from 'fs'

/**
 * The AssemblerInfoProvider is manager of Contracts.json.
 * This class provide contract sourceCode, bytecodes, sourceMap and something contract info.
 */
export default class AssemblerInfoProvider {
  constructor(fglob = 'build/contracts/**/*.json') {
    this.artifactsGlob = fglob
  }

  get sourceCodes() {
    return this.contractsData.sourceCodes
  }

  get sources() {
    return this.contractsData.sources
  }

  /**
   * collect contracts anything datas.
   * @return {{contractsData: Array, sourceCodes: any[], sources: (*|string)[]}|*}
   */
  get contractsData() {
    if (!this._contractsData) {
      const artifactFileNames = glob.sync(this.artifactsGlob, {absolute: true})

      let sources = []
      let datas = []
      artifactFileNames.forEach(artifactFileName => {
        const artifact = JSON.parse(fs.readFileSync(artifactFileName).toString())

        sources.push({
          artifactFileName,
          id: artifact.ast.id,
          sourcePath: artifact.sourcePath,
          source: artifact.source
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
        datas.push(contractData)
      })
      sources = sources.sort((a, b) => parseInt(a.id, 10) - parseInt(b.id, 10))
      const sourceCodes = sources.map(source => {
        if (!source.source) {
          return fs.readFileSync(source.sourcePath).toString()
        } else {
          return source.source
        }
      })

      this._contractsData = {
        datas,
        sourceCodes,
        sources: sources.map(s => s.sourcePath)
      }
    }
    return this._contractsData
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
    return this.contractsData.datas.find(contractDataCandidate => {
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
  }

  bytecodeToBytecodeRegex(bytecode) {
    const bytecodeRegex = bytecode
    // Library linking placeholder: __ConvertLib____________________________
      .replace(/_.*_/, '.*')
      // Last 86 characters is solidity compiler metadata that's different between compilations
      .replace(/.{86}$/, '')
      // Libraries contain their own address at the beginning of the code and it's impossible to know it in advance
      .replace(
        /^0x730000000000000000000000000000000000000000/,
        '0x73........................................'
      )
    // HACK: Node regexes can't be longer that 32767 characters. Contracts bytecode can. We just truncate the regexes. It's safe in practice.
    const MAX_REGEX_LENGTH = 32767
    return bytecodeRegex.slice(0, MAX_REGEX_LENGTH)
  }
}
