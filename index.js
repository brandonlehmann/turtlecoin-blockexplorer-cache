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
  this.dbEngine = opts.dbEngine || 'sqlite'
  this.rpc = new TurtleCoind({
    host: this.host,
    port: this.port,
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
  }

  if (this.db) {
    this.db.on('ready', () => {
      this.emit('ready')
      this._update()
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

Self.prototype._update = function () {
  var blockCount, networkHeight
  if (this.db) {
    this.db.getBlockCount().then((height) => {
      blockCount = height + 1
      return this.rpc.getBlockCount()
    }).then((height) => {
      networkHeight = height
      if (networkHeight === blockCount) {
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
      this.updateCount++
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
