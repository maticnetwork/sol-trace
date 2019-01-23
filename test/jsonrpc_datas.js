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

const callPayload = {
  jsonrpc: '2.0',
  id: 43,
  method: 'eth_call',
  params:
    [{
      from: '0x627306090abab3a6e1400e9345bc60c78a8bef57',
      gas: '0x6691b7',
      gasPrice: '0x174876e800',
      to: '0x2c2b9c9a4a25e24b174f26114e8926a9f2128fe4',
      data: '0x4552e5c80000000000000000000000000000000000000000000000000000000000000014'
    }]
}

const createContractPayload = {
  jsonrpc: '2.0',
  id: 28,
  method: 'eth_sendTransaction',
  params: [
    {
      from: '0x627306090abab3a6e1400e9345bc60c78a8bef57',
      gas: '0x6691b7',
      gasPrice: '0x174876e800',
      data: '0x608060405234801561001057600080fd5b506003600111151561008a576040517f0'
    }
  ]
}

const revertResponseOfCreation = {
  id: 28,
  jsonrpc: '2.0',
  result: '0xed1e09446747429b5a06e84a3ff65b9e1c8a09b03e060b1fbd6168f141992198',
  error: {
    message: 'VM Exception while processing transaction: revert',
    code: -32000,
    data: {
      '0xed1e09446747429b5a06e84a3ff65b9e1c8a09b03e060b1fbd6168f141992198': {
        error: 'revert',
        program_counter: 138
      },
      stack: 'c: VM Exception while processing transaction: revert\n    at Function.c.fromResults ... (timers.js:745:5)',
      name: 'c'
    }
  }
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

const invalidResponseForSnedTransaction = {
  id: 44,
  jsonrpc: '2.0',
  result: '0x3fc7e54d66f0c5cf6e5ca2c4f15bb452358f81b3b7be41cb1a80e47c2b6e502e',
  error: {
    message: 'VM Exception while processing transaction: invalid opcode',
    code: -32000,
    data: {
      '0x3fc7e54d66f0c5cf6e5ca2c4f15bb452358f81b3b7be41cb1a80e47c2b6e502e': {
        error: 'invalid opcode',
        program_counter: 447
      },
      stack: 'c: VM Exception while processing transaction: invalid opcode\n    at Function.c.fromResults ... (timers.js:745:5)',
      name: 'c'
    }
  }
}

const invalidResponseForEthCall = {
  id: 45,
  jsonrpc: '2.0',
  error: {
    message: 'VM Exception while processing transaction: invalid opcode',
    code: -32000,
    data: {
      '0x51fda2c5f2e3741b53e85fac9862724f7fc8f73605b60c4875a127a95a879892': {
        error: 'invalid opcode',
        program_counter: 893,
        return: '0x0'
      },
      stack: 'c: VM Exception while processing transaction: invalid opcode\n ... /build/cli.node.js:25:392',
      name: 'c'
    }
  }
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
    logsBloom: '0x00000000000',
    status: '0x0',
    to: '0xbd52e0e8edd51f5e763f7fad89027440fca2217e',
    transactionHash: '0x43cc231fac6c0b8cc341328aeb727efb77b860508c03502376cd52ec2eee75da',
    transactionIndex: '0x0'
  }
}
const gethRevertReceiptCreationResponse = {
  jsonrpc: '2.0',
  id: 21,
  result: {
    blockHash: '0xab11ce9cde710fe805e973f3d1aa335d999fb255896aecce016be563467b9b21',
    blockNumber: '0x21',
    contractAddress: '0xde75613b0f6f843b4b618eb2f9a09424a16fd46a',
    cumulativeGasUsed: '0x43b96',
    from: '0xe6e90fcdd98205bd23e0e17f6ec20ba5cab52228',
    gasUsed: '0x43b96',
    logs: [],
    logsBloom: '0x0000000000000000',
    status: '0x0',
    to: null,
    transactionHash: '0x39b37a0f46525d1c233a461e97e3df398347c93e811a64e6aad150422eb9d0d5',
    transactionIndex: '0x0'
  }
}

const gethSuccessReceiptResponse = {
  'id': 28,
  'jsonrpc': '2.0',
  'result': {
    'transactionHash': '0x7869da0b57147f4fd515577bc3659dcdc9c11ec40957004a8af4104e7b515160',
    'transactionIndex': '0x00',
    'blockHash': '0x83d3b26612e5018221f1b5a96ac98dadd494cbffe46d2f652de50a946ed42d85',
    'blockNumber': '0x06',
    'gasUsed': '0x021507',
    'cumulativeGasUsed': '0x021507',
    'contractAddress': '0x9fbda871d559710256a2502a2517b794b482db40',
    'logs': [],
    'status': '0x01',
    'logsBloom': '0x00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000'
  }
}

const educationPassRevertResult = {
  'id': 32,
  'jsonrpc': '2.0',
  'result': '0x02ced131074d99fbd576b205f8d3cfb82c4852f2327d37abd39b2d702aa78557',
  'error': {
    'message': 'VM Exception while processing transaction: revert',
    'code': -32000,
    'data': {
      '0x02ced131074d99fbd576b205f8d3cfb82c4852f2327d37abd39b2d702aa78557': {
        'error': 'revert',
        'program_counter': 3208
      },
      'stack': 'c: VM Exception while processing transaction: revert\n    at Function.c.f...',
      'name': 'c'
    }
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
  callPayload,
  createContractPayload,
  revertResponseOfCreation,
  traceErrorResponse,
  oldVerResponse,
  gethRevertResponseForEthCall,
  getReceiptPayload,
  gethRevertReceiptResponse,
  gethRevertReceiptCreationResponse,
  gethSuccessReceiptResponse,
  invalidResponseForSnedTransaction,
  invalidResponseForEthCall,
  educationPassRevertResult,
  getCodeMock
}
