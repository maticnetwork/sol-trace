const revertResponseForCall = {
  id: 43,
  jsonrpc: '2.0',
  error: {
    message: 'VM Exception while processing transaction: revert',
    code: -32000,
    data: {
      '0x4edb02794d2e5d5c4c8c71bd033990158f5839bb9ab2e6f09c241aec16a0c008': {
        error: 'revert',
        program_counter: 810,
        return: '0x08c379a00000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000000e6e756d20697320746f6f20626967000000000000000000000000000000000000'
      },
      stack: 'c: VM Exception while processing transaction: revert\n    at Function.c.fromResults ... cli.node.js:25:392',
      name: 'c'
    }
  }
}

const revertResponseForSendTransaction = {
  id: 43,
  jsonrpc: '2.0',
  result: '0x25e2028b4459864af2f7bfeccfa387ff2d9922b2da840687a9ae7233fa2c72ba',
  error: {
    message: 'VM Exception while processing transaction: revert',
    code: -32000,
    data: {
      '0x25e2028b4459864af2f7bfeccfa387ff2d9922b2da840687a9ae7233fa2c72ba': {
        error: 'revert',
        'program_counter': 496
      },
      stack: 'c: VM Exception while processing transaction: revert\n    at Function.c.fromResults ... (timers.js:718:5)',
      name: 'c'
    }
  }
}

const successResponseForSendTransaction = {
  id: 43,
  jsonrpc: '2.0',
  result: '0x25e2028b4459864af2f7bfeccfa387ff2d9922b2da840687a9ae7233fa2c72ba'
}
const payload = {
  jsonrpc: '2.0',
  id: 43,
  method: 'eth_sendTransaction',
  params:
    [{
      from: '0x627306090abab3a6e1400e9345bc60c78a8bef57',
      gas: '0x6691b7',
      gasPrice: '0x174876e800',
      to: '0x2c2b9c9a4a25e24b174f26114e8926a9f2128fe4',
      data: '0x4552e5c80000000000000000000000000000000000000000000000000000000000000014'
    }]
}

const traceErrorResponse = {
  error: {
    message: 'Unknown transaction 0x834f1e4f70dfe8fdb6cfaacbc8a4a80768946510e33ddc6b47ef09bea0c2eec8',
    code: -32000,
    data: {
      stack: 'Error: Unknown transaction 0x834f1e4f70dfe8fdb6cfaacbc8a4a80768946510e33ddc6b47ef09bea0c2eec8\n ... at FSReqWrap.readFileAfterOpen [as oncomplete] (fs.js:421:13)',
      name: 'Error'
    }
  }
}

const oldVerResponse = {
  id: 43,
  jsonrpc: '2.0',
  error: {
    message: 'VM Exception while processing transaction: revert',
    code: -32000,
    data: {
      stack: 'c: VM Exception while processing transaction: revert\n    at Function.c.fromResults ... cli.node.js:25:392',
      name: 'c'
    }
  }
}

const gethRevertResponseForEthCall = {
  jsonrpc: '2.0',
  id: 43,
  result: '0x08c379a00000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000000c6e756d20697320736d616c6c0000000000000000000000000000000000000000'
}

const getReceiptPayload = {
  jsonrpc: '2.0',
  id: 178,
  method: 'eth_getTransactionReceipt',
  params: [
    '0x43cc231fac6c0b8cc341328aeb727efb77b860508c03502376cd52ec2eee75da'
  ]
}
const gethRevertReceiptResponse = {
  jsonrpc: '2.0',
  id: 178,
  result: {
    blockHash: '0xd9f5091709c50344ee5d0f396aeddb49ea2bda0aa20b296bac4e432ee809f62f',
    blockNumber: '0x2f',
    contractAddress: null,
    cumulativeGasUsed: '0x55aa',
    from: '0xe6e90fcdd98205bd23e0e17f6ec20ba5cab52228',
    gasUsed: '0x55aa',
    logs: [],
    logsBloom: '0x00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000',
    status: '0x0',
    to: '0xbd52e0e8edd51f5e763f7fad89027440fca2217e',
    transactionHash: '0x43cc231fac6c0b8cc341328aeb727efb77b860508c03502376cd52ec2eee75da',
    transactionIndex: '0x0'
  }
}
const getCodeMock = (mock) => {
  return (address) => {
    const payload = {
      jsonrpc: '2.0',
      id: 42,
      method: 'eth_getCode',
      params: [address, 'latest']
    }
    return new Promise((resolve, reject) => {
      mock.sendAsync(payload, (err, res) => err ? reject(err) : resolve(res))
    })
  }
}

export {
  revertResponseForCall,
  revertResponseForSendTransaction,
  successResponseForSendTransaction,
  payload,
  traceErrorResponse,
  oldVerResponse,
  gethRevertResponseForEthCall,
  getReceiptPayload,
  gethRevertReceiptResponse,
  getCodeMock
}
