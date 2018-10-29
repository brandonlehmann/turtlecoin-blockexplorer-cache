[![NPM](https://nodei.co/npm/turtlecoin-blockexplorer-cache.png?downloads=true&stars=true)](https://nodei.co/npm/turtlecoin-blockexplorer-cache/)

[![Build Status](https://travis-ci.org/brandonlehmann/turtlecoin-blockexplorer-cache.png?branch=master)](https://travis-ci.org/brandonlehmann/turtlecoin-blockexplorer-cache) [![Build Status](https://ci.appveyor.com/api/projects/status/github/brandonlehmann/turtlecoin-blockexplorer-cache?branch=master&svg=true)](https://ci.appveyor.com/project/brandonlehmann/turtlecoin-blockexplorer-cache/branch/master)


# TurtleCoin Block Explorer Cache

This library is designed to load block chain data for [TurtleCoin](https://turtlecoin.lol) into a standard SQL database that can be used to provide fast and robust access to block chain data using a service provider mentality.

## Dependencies

* [NodeJS](https://nodejs.org/) >= 8.x
* [turtle-service](https://github.com/turtlecoin/turtlecoin/releases) v0.8.4 or higher

## Installation

```bash
npm install --save turtlecoin-blockexplorer-cache
```

## Initialization

```javascript
const BlockChainCache = require('turtlecoin-blockexplorer-cache')

const cache = new BlockChainCache({
  rpcHost: '127.0.0.1', // IP address or hostname of the TurtleCoind node
  rpcPort: 11898, // Port that TurtleCoind is running on
  timeout: 20000, // How many milliseconds to wait for RPC responses. I recommend 20,000ms to be safe for older block scans
  maxDeviance: 5, // How many blocks away from the network before we stop responding to getLastBlockHeader?
  updateInterval: 5, // How long, in seconds, that we pause for before checking for new blocks when we're synced up or we finish scanning a batch
  dbEngine: 'sqlite', // What database engine to use, see below for additional detais.
  dbFolder: 'db', // What folder to use to store the database file, only valid for some database engines
  dbFile: 'turtlecoin', // The filename to use to store the database file, only valid for some database engines
  dbHost: '127.0.0.1', // The IP address of the external DB server to connect to, only valid for some database engines
  dbPort: 3306, // The port of the external DB server to connect to, only valid for some database engines
  dbUser: '', // The username to the external DB server to, only valid for some database engines
  dbPassword: '', // The password to the external DB server, only valid for some database engines
  dbDatabase: '', // The database name used on the external DB server, only valid for some database engines
  dbSocketPath: false, // The path to the nix socket for the external DB server, only valid for some database engines
  dbConnectionLimit: 10, // The maximum number of connections to open to the external DB server, only valid for some database engines
  autoStartUpdater: true, // Auto start the updater process at object creation?
  targetBlockTime: 30 // Coin target block time
})
```

### Supported Database Engines

At this time, just three database engines are supported; however, in the future support for additional database engines will be added.

|Engine|Database System|File Based|External Service Required|
|---|---|---|---|
|sqlite|[SQLite](https://sqlite.org)|Yes|No|
|mysql|[MySQL](https://www.mysql.com/)|No|Yes|
|mariadb|[mariaDB](https://mariadb.org/)|No|Yes|

## Events

### *error*

This event fires when there is an error condition that has been encountered.

```javascript
cache.on('error', (err) => {
  // do something
})
```

### *info*

This event fires when there is an info event that you may want to know about.

```javascript
cache.on('info', (info) => {
  // do something
})
```

### *ready*

This event fires when the database is connected and is ready for read/write operations.

```javascript
cache.on('ready', () => {
  // do something
})
```

### *synced*

This event fires when the block chain cache is sycnronized with the data available in the TurtleCoind daemon.

```javascript
cache.on('synced', () => {
  // do something
})
```

## Service Methods

### start()

Stards the update process if it was previously stopped.

```javascript
cache.start()
```

### stop()

Stops the update process.

```javascript
cache.stop()
```

## Data Lookup Methods

All data lookup methods will resolve the Promise if the data is in the cache; otherwise, it will reject the Promise.

### cache.getBlocks(options)

Returns information on the last 30 blocks before *height* (inclusive).

```options.height``` The height of the blockchain to start at - *required*

#### Example Data

```javascript
[
  {
    "cumul_size": 22041,
    "difficulty": 285124963,
    "hash": "62f0058453292af5e1aa070f8526f7642ab6974c6af2c17088c21b31679c813d",
    "height": 500000,
    "timestamp": 1527834137,
    "tx_count": 4
  },
  {
    "cumul_size": 384,
    "difficulty": 258237161,
    "hash": "74a45602da61b8b8ff565b1c81c854416046a23ca53f4416684ffaa60bc50796",
    "height": 499999,
    "timestamp": 1527834031,
    "tx_count": 1
  },
  {
    "cumul_size": 418,
    "difficulty": 256087255,
    "hash": "ed628ff13eacd5b99c5d7bcb3aeb29ef8fc61dbb21d48b65e0cdaf5ab21211c1",
    "height": 499998,
    "timestamp": 1527834020,
    "tx_count": 1
  }
]
```

### cache.getBlock(options)

Returns information on a single block

```options.hash``` Block hash of the block you wish to retrieve - *required*

#### Sample Data

```javascript
{
  "alreadyGeneratedCoins": "1484230931125",
  "alreadyGeneratedTransactions": 974921,
  "baseReward": 2935998,
  "blockSize": 48846,
  "depth": 0,
  "difficulty": 358164537,
  "effectiveSizeMedian": 100000,
  "hash": "f11580d74134ac34673c74f8da458080aacbe1eccea05b197e9d10bde05139f5",
  "height": 501854,
  "major_version": 4,
  "minor_version": 0,
  "nonce": 214748383,
  "orphan_status": false,
  "penalty": 0,
  "prev_hash": "674046ea53a8673c630bd34655c4723199e69fdcfd518503f4c714e16a7121b5",
  "reward": 2936608,
  "sizeMedian": 231,
  "timestamp": 1527891820,
  "totalFeeAmount": 610,
  "transactions": [
    {
      "amount_out": 2936608,
      "fee": 0,
      "hash": "61b29d7a3fe931928388f14cffb5e705a68db219e1df6b4e15aee39d1c2a16e8",
      "size": 266
    },
    {
      "amount_out": 2005890,
      "fee": 110,
      "hash": "8096a55ccd0d4a736b3176836429905f349c3de53dd4e92d34f4a2db7613dc4b",
      "size": 2288
    },
    {
      "amount_out": 3999900,
      "fee": 100,
      "hash": "304a068cbe87cd02b48f80f8831197174b133870d0c118d1fe65d07a33331c4e",
      "size": 2691
    },
    {
      "amount_out": 7862058,
      "fee": 100,
      "hash": "29c0d6708e8148eec6e02173b3bab0093768e5f486f553939495a47f883b4445",
      "size": 9638
    },
    {
      "amount_out": 6951392,
      "fee": 100,
      "hash": "fe661f11a0ba9838610c147f70813c17755ab608c7b033f6432c0b434671182c",
      "size": 10004
    },
    {
      "amount_out": 6800150,
      "fee": 100,
      "hash": "4b0366f79ec341cf60d5ef8c9dd8e65974dacb1be1d30dc0bf11d2d9d8240b46",
      "size": 11493
    },
    {
      "amount_out": 7260417,
      "fee": 100,
      "hash": "066b86268b7bb2f780ed76f452d1e6f7213dc6cae273b71fbd4ba378befaed00",
      "size": 12155
    }
  ],
  "transactionsCumulativeSize": 48535
}
```

### cache.getTransaction(options)

Gets information on the single transaction.

```options.hash``` The transaction hash - *required*

#### Sample Data

```javascript
{
  "block": {
    "cumul_size": 22041,
    "difficulty": 103205633,
    "hash": "62f0058453292af5e1aa070f8526f7642ab6974c6af2c17088c21b31679c813d",
    "height": 500000,
    "timestamp": 1527834137,
    "tx_count": 4
  },
  "status": "OK",
  "tx": {
    "extra": "019e430ecdd501714900c71cb45fd49b4fa77ebd4a68d967cc2419ccd4e72378e3020800000000956710b6",
    "unlock_time": 500040,
    "version": 1,
    "vin": [
      {
        "type": "ff",
        "value": {
          "height": 500000
        }
      }
    ],
    "vout": [
      {
        "amount": 80,
        "target": {
          "data": {
            "key": "5ce69a87940df7ae8443261ff610861d2e4207a7556ef1aa35878c0a5e7e382d"
          },
          "type": "02"
        }
      },
      {
        "amount": 200,
        "target": {
          "data": {
            "key": "7c7f316befaac16ba3782a2ce489e7c0f16c2b733ac0eaa0a72a12ee637822e9"
          },
          "type": "02"
        }
      },
      {
        "amount": 6000,
        "target": {
          "data": {
            "key": "defcb7eb6537bf0a63368ed464df10197e67d7ea8f080e885911cf9ea71abb62"
          },
          "type": "02"
        }
      },
      {
        "amount": 30000,
        "target": {
          "data": {
            "key": "9693e864dba53f308d0b59623c608b6fe16bbdc7cdc75be94f78582d547b46a4"
          },
          "type": "02"
        }
      },
      {
        "amount": 900000,
        "target": {
          "data": {
            "key": "b739e9fbaa3ee976a9ed8ad93a2731ee191c384cf136929e737786573fcd3e96"
          },
          "type": "02"
        }
      },
      {
        "amount": 2000000,
        "target": {
          "data": {
            "key": "5621667d44e7ffb87e5010a5984c188f58a799efb01569e8e42fa2415bb7d14a"
          },
          "type": "02"
        }
      }
    ]
  },
  "txDetails": {
    "amount_out": 2936280,
    "fee": 0,
    "hash": "702ad5bd04b9eff14b080d508f69a320da1909e989d6c163c18f80ae7a5ab832",
    "mixin": 0,
    "paymentId": "",
    "size": 266
  }
}
```

### cache.getTransactionHashesByPaymentId

Retrives all transaction hashes for transactions with the specified paymentId

```options.paymentId``` The paymentId to search for - *required*

#### Sample Data

```javascript
{
  "hashes": [
    "205b88ff825d83308465921511e239ccd1e05005302669ffd16577714c559bab",
    "259bf487af58574b43aea492a666a1aa29a316faf51490c460fef193f4f75636",
    "2ed24b81b0b51b86223002e8515b141b8a4b09215be2afa86de46153fa8f2167",
    "7dc8e17ef253a3805b7ae07d9e62f0311fa5098f1b1bcd9c745d7164c29ba286",
    "8bc8b7dc1881601f9b659e11557e572b78500bc9cdb911535a9a3bc79d59cc38",
    "e0a1dba9b03ca97f6ccac69bcbec6c5737cb972c0039a955b4446e4add6857fa"
  ],
  "status": "OK"
}
```

### cache.getBlockCount()

Gets the current block count

#### Sample Data

```javascript
502322
```

### cache.getBlockHash(options)

Gets a block hash by height.

```options.height``` The height of the block - *required*

#### Sample Data

```text
74a45602da61b8b8ff565b1c81c854416046a23ca53f4416684ffaa60bc50796
```

### cache.getLastBlockHeader()

#### Sample Data

```javascript
{
  "block_header": {
    "block_size": 419,
    "depth": 0,
    "difficulty": 200671816,
    "hash": "7d6db7b77232d41c19d898e81c85ecf08c4e8dfa3434f975a319f6261a695739",
    "height": 502345,
    "major_version": 4,
    "minor_version": 0,
    "nonce": 130876,
    "num_txes": 1,
    "orphan_status": false,
    "prev_hash": "5af657331edff98791720c23aacf72e8b6247ddba2a5c42c93984a46946abd14",
    "reward": 2935955,
    "timestamp": 1527907348
  },
  "status": "OK"
}
```

### cache.getBlockHeaderByHash(options)

```options.hash``` Block hash - *required*

#### Sample Data

```javascript
{
  "block_header": {
    "block_size": 419,
    "depth": 2,
    "difficulty": 200671816,
    "hash": "7d6db7b77232d41c19d898e81c85ecf08c4e8dfa3434f975a319f6261a695739",
    "height": 502345,
    "major_version": 4,
    "minor_version": 0,
    "nonce": 130876,
    "num_txes": 1,
    "orphan_status": false,
    "prev_hash": "5af657331edff98791720c23aacf72e8b6247ddba2a5c42c93984a46946abd14",
    "reward": 2935955,
    "timestamp": 1527907348
  },
  "status": "OK"
}
```

### cache.getBlockHeaderByHeight(options)

```options.height``` Block height - *required*

#### Sample Data

```javascript
{
  "block_header": {
    "block_size": 419,
    "depth": 2,
    "difficulty": 200671816,
    "hash": "7d6db7b77232d41c19d898e81c85ecf08c4e8dfa3434f975a319f6261a695739",
    "height": 502345,
    "major_version": 4,
    "minor_version": 0,
    "nonce": 130876,
    "num_txes": 1,
    "orphan_status": false,
    "prev_hash": "5af657331edff98791720c23aacf72e8b6247ddba2a5c42c93984a46946abd14",
    "reward": 2935955,
    "timestamp": 1527907348
  },
  "status": "OK"
}
```

## License

```
Copyright (C) 2018 Brandon Lehmann, The TurtleCoin Developers

Please see the included LICENSE file for more information.
```