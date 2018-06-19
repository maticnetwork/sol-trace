import TraceProvider from './web3-trace-provider'

export function injectInTruffle(web3, artifacts) {
  if (artifacts.require._traceProvider) {
    return artifacts.require._traceProvider
  }

  // create new trace provider
  const newProvider = new TraceProvider(web3)
  web3.setProvider(newProvider)

  // proxy artifacts
  const oldRequire = artifacts.require
  artifacts.require = path => {
    const result = oldRequire(path)
    result.web3 = web3
    result.setProvider(newProvider)
    return result
  }
  artifacts.require._traceProvider = newProvider
  return newProvider
}

// export web3 trace provider
export const Web3TraceProvider = TraceProvider
