// Copyright (c) 2018, Brandon Lehmann, The TurtleCoin Developers
//
// Please see the included LICENSE file for more information.

'use strict'

const inherits = require('util').inherits
const EventEmitter = require('events').EventEmitter
const mysql = require('mysql')

const Self = function (opts) {
  opts = opts || {}
  if (!(this instanceof Self)) return new Self(opts)
  this.host = opts.host || '127.0.0.1'
  this.port = opts.port || 3306
  this.user = opts.user || ''
  this.password = opts.password || ''
  this.database = opts.database || ''
  this.socketPath = opts.socketPath || false
  this.connectionLimit = opts.connectionLimit || 10

  this.db = mysql.createPool({
    connectionLimit: this.connectionLimit,
    host: this.host,
    port: this.port,
    user: this.user,
    password: this.password,
    database: this.database,
    socketPath: this.socketPath
  })

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
    this.db.query(
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
    this.db.query(
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
    this.db.query(query, args, (err, result, fields) => {
      if (err) return reject(err)
      return resolve()
    })
  })
}

Self.prototype.get = function (query, args) {
  return new Promise((resolve, reject) => {
    if (!this.db) return reject(new Error('No database connection'))
    this.db.query(query, args, (err, result, fields) => {
      if (err || !result) return reject(err)
      return resolve(result[0])
    })
  })
}

Self.prototype.all = function (query, args) {
  return new Promise((resolve, reject) => {
    if (!this.db) return reject(new Error('No database connection'))
    this.db.query(query, args, (err, result, fields) => {
      if (err || !result) return reject(err)
      return resolve(result)
    })
  })
}

Self.prototype.close = function () {
  return new Promise((resolve, reject) => {
    if (!this.db) return reject(new Error('No database connection'))
    this.db.destroy(() => {
      this.db = null
      return resolve()
    })
  })
}

Self.prototype._createDatabase = function () {
  return new Promise((resolve, reject) => {
    this.run('CREATE TABLE IF NOT EXISTS `transactions` (' +
        '`block`  LONGBLOB NOT NULL,' +
        '`tx` LONGBLOB NOT NULL,' +
        '`txDetails`  LONGBLOB NOT NULL,' +
        '`hash` VARCHAR(255) NOT NULL,' +
        '`paymentId`  VARCHAR(255),' +
        '`mixin`  BIGINT NOT NULL,' +
        '`size` BIGINT NOT NULL,' +
        '`fee`  BIGINT,' +
        '`amount_out` BIGINT,' +
        '`blockHash`  VARCHAR(255) NOT NULL,' +
        'PRIMARY KEY(`hash`,`paymentId`,`blockHash`)' +
      ')', []).then(() => {
      return this.run('CREATE TABLE IF NOT EXISTS `blocks` (' +
        '`alreadyGeneratedCoins`  VARCHAR(255) NOT NULL,' +
        '`alreadyGeneratedTransactions` BIGINT NOT NULL,' +
        '`baseReward` BIGINT NOT NULL,' +
        '`blockSize`  BIGINT NOT NULL,' +
        '`difficulty` BIGINT NOT NULL,' +
        '`effectiveSizeMedian`  BIGINT NOT NULL,' +
        '`hash` VARCHAR(255) NOT NULL,' +
        '`height` BIGINT NOT NULL,' +
        '`major_version`  BIGINT NOT NULL,' +
        '`minor_version`  BIGINT NOT NULL,' +
        '`nonce`  BIGINT NOT NULL,' +
        '`orphan_status`  BIGINT NOT NULL,' +
        '`penalty`  BIGINT NOT NULL,' +
        '`prev_hash`  VARCHAR(255) NOT NULL,' +
        '`reward` BIGINT NOT NULL,' +
        '`sizeMedian` BIGINT NOT NULL,' +
        '`timestamp`  BIGINT NOT NULL,' +
        '`totalFeeAmount` NUMERIC NOT NULL,' +
        '`transactions` LONGBLOB NOT NULL,' +
        '`transactionsCumulativeSize` BIGINT NOT NULL,' +
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
      return this.run('CREATE INDEX IF NOT EXISTS `transactions.blockHash` ON `transactions` (' +
        '`blockHash`' +
      ')', [])
    }).then(() => {
      return this.run('ALTER TABLE `blocks` PARTITION BY KEY (`height`,`hash`) PARTITIONS 100', [])
    }).then(() => {
      return this.run('ALTER TABLE `transactions` PARTITION BY KEY (`hash`,`paymentId`,`blockHash`) PARTITIONS 100', [])
    }).then(() => {
      return resolve()
    }).catch((err) => {
      return reject(err)
    })
  })
}

module.exports = Self
