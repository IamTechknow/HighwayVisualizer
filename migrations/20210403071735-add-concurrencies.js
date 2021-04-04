'use strict';

var dbm;
var type;
var seed;

/**
  * We receive the dbmigrate dependency from dbmigrate initially.
  * This enables us to not have to rely on NODE_PATH.
  */
exports.setup = function (options, seedLink) {
  dbm = options.dbmigrate;
  type = dbm.dataType;
  seed = seedLink;
};

exports.up = function (db) {
  return db.createTable('concurrencies', {
    id: {
      autoIncrement: true,
      notNull: true,
      primaryKey: true,
      type: 'int',
      unsigned: true,
    },
    route_num1: {
      length: 4,
      notNull: true,
      type: 'char',
    },
    route_num2: {
      length: 4,
      notNull: true,
      type: 'char',
    },
    first_seg: {
      notNull: true,
      type: 'int',
      unsigned: true,
    },
    last_seg: {
      notNull: true,
      type: 'int',
      unsigned: true,
    },
    rte2_seg: {
      notNull: true,
      type: 'int',
      unsigned: true,
    },
    start_pt: {
      notNull: true,
      type: 'int',
      unsigned: true,
    },
    end_pt: {
      notNull: true,
      type: 'int',
      unsigned: true,
    },
  });
};

exports.down = function (db) {
  return db.dropTable('concurrencies');
};

exports._meta = {
  "version": 1
};
