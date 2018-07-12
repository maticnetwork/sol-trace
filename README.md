# sol-trace-set

Trace runtime failures for solidity

This is a forked version of https://github.com/maticnetwork/sol-trace

Inspired by 0x-monorepo https://github.com/0xProject/0x-monorepo/pull/705

### Installation

```
$ npm install --save sol-trace-set # or yarn add sol-trace-set
```

### Usage

Add following code in your truffle test cases:

```js
import { injectInTruffle } from "sol-trace";
injectInTruffle(web3, artifacts);
```

### Demo

![](https://pbs.twimg.com/media/Df1eA7vWkAEg509.jpg)
