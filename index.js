// Copyright (c) 2018, Brandon Lehmann, The TurtleCoin Developers
// 
// Please see the included LICENSE file for more information.

'use strict'

const TurtleCoind = require('turtlecoin-rpc').TurtleCoind
const inherits = require('util').inherits
const EventEmitter = require('events').EventEmitter
const SQLite = require('./lib/sqlite.js')

const Self = function (opts) {
  opts = opts || {}
  if (!(this instanceof Self)) return new Self(opts)
  this.rpcHost = opts.rpcHost || '127.0.0.1'
  this.rpcPort = opts.rpcPort || 11898
  this.timeout = opts.timeout || 20000
  this.updateInterval = opts.updateInterval || 5
  this.maxDeviance = opts.maxDeviance || 5
  this.autoStartUpdater = (opts.autoStartUpdater !== undefined) ? opts.autoStartUpdater : true
  this.dbEngine = opts.dbEngine || 'sqlite'
  this.targetBlockTime = opts.targetBlockTime || 30
  this.rpc = new TurtleCoind({
    host: this.rpcHost,
    port: this.rpcPort,
    timeout: this.timeout
  })
  this.dbFolder = opts.dbFolder || 'db'
  this.dbFile = opts.dbFile || 'turtlecoin'
  this.blockBatchSize = opts.blockBatchSize || 1000
  this.db = false

  this.updateCount = 0
  if (this.dbEngine === 'sqlite') {
    this.dbFile = this.dbFile + '.sqlite'
    this.db = new SQLite({
      dbFolder: this.dbFolder,
      dbFile: this.dbFile
    })
  } else {
    throw new Error('Must specify a supported database engine')
  }

  if (this.db) {
    this.db.on('ready', () => {
      this.emit('ready')
      if (this.autoStartUpdater) {
        this.start()
      }
    })

    this.db.on('info', (info) => {
      this.emit('info', info)
    })

    this.db.on('error', (err) => {
      this.emit('error', err)
    })
  }
}
inherits(Self, EventEmitter)

Self.prototype.start = function () {
  if (!this.run) {
    this.run = true
    this._update()
  }
}

Self.prototype.stop = function () {
  this.run = false
}

Self.prototype.getBlocks = function (opts) {
  return this.db.getBlocks(opts)
}

Self.prototype.getBlock = function (opts) {
  return this.db.getBlock(opts)
}

Self.prototype.getTransaction = function (opts) {
  return this.db.getTransaction(opts)
}

Self.prototype.getTransactionHashesByPaymentId = function (opts) {
  return this.db.getTransactionHashesByPaymentId(opts)
}

Self.prototype.getBlockCount = function () {
  return this.db.getBlockCount()
}

Self.prototype.getBlockHash = function (opts) {
  return this.db.getBlockHash(opts)
}

Self.prototype.getLastBlockHeader = function () {
  return new Promise((resolve, reject) => {
    var networkHeight
    this.rpc.getHeight().then((height) => {
      networkHeight = height
      return this.db.getLastBlockHeader()
    }).then((header) => {
      if (Math.abs(networkHeight - header.height) > this.maxDeviance) {
        return reject(new Error('Difference between the network and our cache exceeds our threshold'))
      }
      return resolve(header)
    }).catch((err) => {
      return reject(err)
    })
  })
}

Self.prototype.getBlockHeaderByHash = function (opts) {
  return this.db.getBlockHeaderByHash(opts)
}

Self.prototype.getBlockHeaderByHeight = function (opts) {
  return this.db.getBlockHeaderByHeight(opts)
}

Self.prototype._update = function () {
  if (!this.run) return

  var blockCount, networkHeight
  if (this.db) {
    this.db.getBlockCount().then((resp) => {
      blockCount = resp.count + 1
      return this.rpc.getBlockCount()
    }).then((height) => {
      networkHeight = height
      if (networkHeight === blockCount) {
        this.emit('synced')
        throw new Error('No blocks to read')
      }
      // var diff = networkHeight - blockCount
      var updates = []
      updates = this._buildUpdateArray(blockCount, 1)
      return Promise.all(updates)
    }).then(() => {
      if (this.updateCount % this.blockBatchSize === 0) {
        this._delayedUpdate()
      } else {
        this._update()
      }
    }).catch(() => {
      this._delayedUpdate()
    })
  }
}

Self.prototype._delayedUpdate = function () {
  setTimeout(() => {
    this._update()
  }, (1000 * this.updateInterval))
}

Self.prototype._buildUpdateArray = function (height, cnt) {
  var ret = []
  for (var i = height; i < (height + cnt); i++) {
    ret.push(this._updateHeight(i))
  }
  return ret
}

Self.prototype._updateHeight = function (height) {
  return new Promise((resolve, reject) => {
    this.emit('info', 'Blockchain Cache collecting block ' + height + '...')
    var block
    this.rpc.getBlockHash({
      height: height
    }).then((blockHash) => {
      return this.rpc.getBlock({
        hash: blockHash
      })
    }).then((blk) => {
      block = blk
      block.height = height
      var txnPromises = []
      for (var i = 0; i < block.transactions.length; i++) {
        txnPromises.push(this._getTransaction({
          hash: block.transactions[i].hash
        }))
      }
      return Promise.all(txnPromises)
    }).then((transactions) => {
      return this._saveData(block, transactions)
    }).then((saveHeight) => {
      this.updateCount++
      return resolve(saveHeight)
    }).catch((err) => {
      return reject(err)
    })
  })
}

Self.prototype._saveData = function (block, transactions) {
  return new Promise((resolve, reject) => {
    var txns = []
    for (var i = 0; i < transactions.length; i++) {
      txns.push(this.db.saveTransaction(transactions[i]))
    }

    Promise.all(txns).then(() => {
      return this.db.saveBlock(block)
    }).then(() => {
      return resolve(block.height)
    }).catch((err) => {
      return reject(err)
    })
  })
}

Self.prototype._getTransaction = function (opts) {
  return new Promise((resolve, reject) => {
    this.rpc.getTransaction(opts).then((result) => {
      return resolve(result)
    }).catch(() => {
      return resolve({})
    })
  })
}

module.exports = Self
