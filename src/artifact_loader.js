import glob from 'glob'
import fs from 'fs'

export default class ArtifactLoader {
  constructor(fglob = 'build/contracts/**/*.json') {
    this.artifactsGlob = fglob
  }

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
    return {
      contractsData,
      sourceCodes,
      sources: sources.map(s => s.sourcePath)
    }
  }
}
