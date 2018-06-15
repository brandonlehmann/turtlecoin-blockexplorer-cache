'use strict'

const inherits = require('util').inherits
const EventEmitter = require('events').EventEmitter
const sqlite = require('sqlite3')
const fs = require('fs')
const os = require('os')
const path = require('path')

const Self = function (opts) {
  opts = opts || {}
  if (!(this instanceof Self)) return new Self(opts)
  this.dbFolder = opts.dbFolder || 'db'
  this.dbFile = opts.dbFile || 'database.sqlite'
  this.dbFolder = fixPath(this.dbFolder)
  this.dbFilePath = fixPath(this.dbFolder + '/' + this.dbFile)

  if (!fs.existsSync(this.dbFolder)) {
    fs.mkdirSync(this.dbFolder)
  }
  this.ready = false

  setTimeout(() => {
    this._createDatabase().then(() => {
      this.ready = true
      this.emit('ready')
    }).catch((err) => {
      this.emit('error', err)
    })
  }, 500)
}
inherits(Self, EventEmitter)

Self.prototype.getBlocks = function (opts) {
  return new Promise((resolve, reject) => {
    opts = opts || {}
    if (!opts.height) return reject(new Error('must specify height'))
    opts.height++

    this.all('SELECT * FROM `blocks` WHERE `height` <= ? ORDER BY `height` DESC LIMIT 30', [opts.height]).then((rows) => {
      var ret = []
      for (var i = 0; i < rows.length; i++) {
        var row = rows[i]
        var transactions = JSON.parse(row.transactions)
        ret.push({
          cumul_size: row.blockSize,
          difficulty: row.difficulty,
          hash: row.hash,
          height: (row.height - 1),
          timestamp: row.timestamp,
          tx_count: transactions.length
        })
      }
      return resolve({
        blocks: ret,
        status: 'OK'
      })
    }).catch((err) => {
      return reject(err)
    })
  })
}

Self.prototype.getBlock = function (opts) {
  return new Promise((resolve, reject) => {
    opts = opts || {}
    if (!opts.hash) return reject(new Error('must specify hash'))

    var height
    this.getBlockCount().then((resp) => {
      height = resp.count
      return this.get('SELECT * FROM `blocks` WHERE `hash` = ?', [opts.hash])
    }).then((row) => {
      row.transactions = JSON.parse(row.transactions)
      row.depth = (height - row.height)
      row.height = (row.height - 1)
      row.orphan_status = (row.orphan_status === 1)
      return resolve({
        block: row,
        status: 'OK'
      })
    }).catch((err) => {
      return reject(err)
    })
  })
}

Self.prototype.getTransaction = function (opts) {
  return new Promise((resolve, reject) => {
    opts = opts || {}
    if (!opts.hash) return reject(new Error('must specify hash'))

    this.get('SELECT `block`, `tx`, `txDetails` FROM `transactions` WHERE `hash` = ?', [opts.hash]).then((row) => {
      row.block = JSON.parse(row.block)
      row.tx = JSON.parse(row.tx)
      row.txDetails = JSON.parse(row.txDetails)
      row.status = 'OK'
      return resolve(row)
    }).catch((err) => {
      return reject(err)
    })
  })
}

Self.prototype.getTransactionHashesByPaymentId = function (opts) {
  return new Promise((resolve, reject) => {
    opts = opts || {}
    if (!opts.paymentId) return reject(new Error('must specify paymentId'))

    this.all('SELECT `hash` FROM `transactions` WHERE `paymentId` LIKE ?', [opts.paymentId]).then((rows) => {
      var ret = {
        hashes: [],
        status: 'OK'
      }
      for (var i = 0; i < rows.length; i++) {
        var row = rows[i]
        ret.hashes.push(row.hash)
      }
      return resolve(ret)
    }).catch((err) => {
      return reject(err)
    })
  })
}

Self.prototype.getTransactionPool = function () {
  return new Promise((resolve, reject) => {
    return reject(new Error('not implemented'))
  })
}

Self.prototype.getBlockCount = function () {
  return new Promise((resolve, reject) => {
    this.get('SELECT MAX(`height`) AS `height` FROM `blocks`', []).then((row) => {
      var height = row.height || 0
      return resolve({
        count: height,
        status: 'OK'
      })
    }).catch((err) => {
      return reject(err)
    })
  })
}

Self.prototype.getBlockHash = function (opts) {
  return new Promise((resolve, reject) => {
    opts = opts || {}
    if (!opts.height) return reject(new Error('must specify height'))
    opts.height++

    this.get('SELECT `hash` FROM `blocks` WHERE `height` = ?', [opts.height]).then((row) => {
      return resolve(row.hash)
    }).catch((err) => {
      return reject(err)
    })
  })
}

Self.prototype.getLastBlockHeader = function () {
  return new Promise((resolve, reject) => {
    this.get('SELECT * FROM `blocks` ORDER BY `height` DESC LIMIT 1', []).then((row) => {
      var transactions = JSON.parse(row.transactions)
      var ret = {
        block_size: row.blockSize,
        depth: 0,
        difficulty: row.difficulty,
        hash: row.hash,
        height: (row.height - 1),
        major_version: row.major_version,
        minor_version: row.minor_version,
        nonce: row.nonce,
        num_txes: transactions.length,
        orphan_status: (row.orphan_status === 1),
        prev_hash: row.prev_hash,
        reward: row.reward,
        timestamp: row.timestamp
      }
      return resolve({
        block_header: ret,
        status: 'OK'
      })
    }).catch((err) => {
      return reject(err)
    })
  })
}

Self.prototype.getBlockHeaderByHash = function (opts) {
  return new Promise((resolve, reject) => {
    opts = opts || {}
    if (!opts.hash) return reject(new Error('must specify hash'))

    this.get('SELECT * FROM `blocks` WHERE `hash` = ?', [opts.hash]).then((row) => {
      var transactions = JSON.parse(row.transactions)
      var ret = {
        block_size: row.blockSize,
        depth: 0,
        difficulty: row.difficulty,
        hash: row.hash,
        height: (row.height - 1),
        major_version: row.major_version,
        minor_version: row.minor_version,
        nonce: row.nonce,
        num_txes: transactions.length,
        orphan_status: (row.orphan_status === 1),
        prev_hash: row.prev_hash,
        reward: row.reward,
        timestamp: row.timestamp
      }
      return resolve({
        block_header: ret,
        status: 'OK'
      })
    }).catch((err) => {
      return reject(err)
    })
  })
}

Self.prototype.getBlockHeaderByHeight = function (opts) {
  return new Promise((resolve, reject) => {
    opts = opts || {}
    if (!opts.height) return reject(new Error('must specify height'))
    opts.height++

    this.get('SELECT * FROM `blocks` WHERE `height` = ?', [opts.height]).then((row) => {
      var transactions = JSON.parse(row.transactions)
      var ret = {
        block_size: row.blockSize,
        depth: 0,
        difficulty: row.difficulty,
        hash: row.hash,
        height: (row.height - 1),
        major_version: row.major_version,
        minor_version: row.minor_version,
        nonce: row.nonce,
        num_txes: transactions.length,
        orphan_status: (row.orphan_status === 1),
        prev_hash: row.prev_hash,
        reward: row.reward,
        timestamp: row.timestamp
      }
      return resolve({
        block_header: ret,
        status: 'OK'
      })
    }).catch((err) => {
      return reject(err)
    })
  })
}

Self.prototype.saveBlock = function (block) {
  return new Promise((resolve, reject) => {
    delete block.depth
    this.db.run(
      'REPLACE INTO `blocks` VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)', [
        block.alreadyGeneratedCoins,
        block.alreadyGeneratedTransactions,
        block.baseReward,
        block.blockSize,
        block.difficulty,
        block.effectiveSizeMedian,
        block.hash,
        block.height,
        block.major_version,
        block.minor_version,
        block.nonce,
        block.orphan_status,
        block.penalty,
        block.prev_hash,
        block.reward,
        block.sizeMedian,
        block.timestamp,
        block.totalFeeAmount,
        JSON.stringify(block.transactions),
        block.transactionsCumulativeSize
      ], (err) => {
        if (err) {
          return reject(err)
        }
        return resolve()
      })
  })
}

Self.prototype.saveTransaction = function (transaction) {
  return new Promise((resolve, reject) => {
    if (!transaction.txDetails) return resolve()
    this.db.run(
      'REPLACE INTO `transactions` VALUES (?,?,?,?,?,?,?,?,?,?)', [
        JSON.stringify(transaction.block),
        JSON.stringify(transaction.tx),
        JSON.stringify(transaction.txDetails),
        transaction.txDetails.hash,
        transaction.txDetails.paymentId,
        transaction.txDetails.mixin,
        transaction.txDetails.size,
        transaction.txDetails.fee,
        transaction.txDetails.amount_out,
        transaction.block.hash
      ], (err) => {
        if (err) {
          return reject(err)
        }
        return resolve()
      })
  })
}

Self.prototype.ready = function () {
  return this.ready
}

Self.prototype.run = function (query, args) {
  return new Promise((resolve, reject) => {
    if (!this.db) return reject(new Error('No database connection'))
    this.db.run(query, args, (err) => {
      if (err) return reject(err)
      return resolve()
    })
  })
}

Self.prototype.get = function (query, args) {
  return new Promise((resolve, reject) => {
    if (!this.db) return reject(new Error('No database connection'))
    this.db.get(query, args, (err, row) => {
      if (err || !row) return reject(err)
      return resolve(row)
    })
  })
}

Self.prototype.all = function (query, args) {
  return new Promise((resolve, reject) => {
    if (!this.db) return reject(new Error('No database connection'))
    this.db.all(query, args, (err, rows) => {
      if (err || !rows) return reject(err)
      return resolve(rows)
    })
  })
}

Self.prototype.close = function () {
  return new Promise((resolve, reject) => {
    if (!this.db) return reject(new Error('No database connection'))
    this.db.close(() => {
      this.db = null
      return resolve()
    })
  })
}

Self.prototype._createDatabase = function () {
  return new Promise((resolve, reject) => {
    this.db = new sqlite.Database('db/turtlecoin.sqlite', sqlite.OPEN_READWRITE | sqlite.OPEN_CREATE)

    this.run('CREATE TABLE IF NOT EXISTS `transactions` (' +
        '`block`  BLOB NOT NULL,' +
        '`tx` BLOB NOT NULL,' +
        '`txDetails`  BLOB NOT NULL,' +
        '`hash` TEXT NOT NULL,' +
        '`paymentId`  INTEGER,' +
        '`mixin`  INTEGER NOT NULL,' +
        '`size` INTEGER NOT NULL,' +
        '`fee`  INTEGER,' +
        '`amount_out` INTEGER,' +
        '`blockHash`  INTEGER NOT NULL,' +
        'PRIMARY KEY(`hash`,`paymentId`,`blockHash`)' +
      ')', []).then(() => {
      return this.run('CREATE TABLE IF NOT EXISTS `blocks` (' +
        '`alreadyGeneratedCoins`  TEXT NOT NULL,' +
        '`alreadyGeneratedTransactions` INTEGER NOT NULL,' +
        '`baseReward` INTEGER NOT NULL,' +
        '`blockSize`  INTEGER NOT NULL,' +
        '`difficulty` INTEGER NOT NULL,' +
        '`effectiveSizeMedian`  INTEGER NOT NULL,' +
        '`hash` TEXT NOT NULL,' +
        '`height` INTEGER NOT NULL,' +
        '`major_version`  INTEGER NOT NULL,' +
        '`minor_version`  INTEGER NOT NULL,' +
        '`nonce`  INTEGER NOT NULL,' +
        '`orphan_status`  INTEGER NOT NULL,' +
        '`penalty`  INTEGER NOT NULL,' +
        '`prev_hash`  TEXT NOT NULL,' +
        '`reward` INTEGER NOT NULL,' +
        '`sizeMedian` INTEGER NOT NULL,' +
        '`timestamp`  INTEGER NOT NULL,' +
        '`totalFeeAmount` NUMERIC NOT NULL,' +
        '`transactions` BLOB NOT NULL,' +
        '`transactionsCumulativeSize` INTEGER NOT NULL,' +
        'PRIMARY KEY(`height`,`hash`)' +
      ')', [])
    }).then(() => {
      return this.run('CREATE INDEX IF NOT EXISTS `block.timestamp` ON `blocks` (' +
        '`timestamp`' +
      ')', [])
    }).then(() => {
      return this.run('CREATE INDEX IF NOT EXISTS `transactions.paymentId` ON `transactions` (' +
        '`paymentId`' +
      ')', [])
    }).then(() => {
      return resolve()
    }).catch((err) => {
      return reject(err)
    })
  })
}

function fixPath (oldPath) {
  if (!oldPath) return false
  oldPath = oldPath.replace('~', os.homedir())
  oldPath = path.resolve(oldPath)
  return oldPath
}

module.exports = Self
