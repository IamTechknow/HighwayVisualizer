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
  return db.createTable('segments', {
    id: {
      autoIncrement: true,
      notNull: true,
      primaryKey: true,
      type: 'int',
      unsigned: true,
    },
    route_num: {
      length: 4,
      notNull: true,
      type: 'string',
    },
    type: {
      notNull: true,
      type: 'smallint',
    },
    segment_num: {
      notNull: true,
      type: 'smallint',
    },
    direction: {
      length: 1,
      notNull: true,
      type: 'char',
    },
    state_key: {
      notNull: true,
      type: 'smallint',
    },
    len: {
      notNull: true,
      type: 'int',
    },
    len_m: {
      defaultValue: 0.0,
      notNull: true,
      type: 'double',
    },
    base: {
      notNull: true,
      type: 'int',
    },
  })
    .then(() => db.addIndex('segments', 'STATE_IDX', ['state_key']))
    .then(() => db.addIndex('segments', 'SEGMENT_IDX', ['route_num', 'direction']));
};

exports.down = function (db) {
  return db.removeIndex('segments', 'STATE_IDX')
    .then(() => db.removeIndex('segments', 'SEGMENT_IDX'))
    .then(() => db.dropTable('segments'));
};

exports._meta = {
  "version": 1
};
