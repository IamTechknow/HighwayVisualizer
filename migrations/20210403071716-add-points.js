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
  return db.createTable('points', {
    id: {
      autoIncrement: true,
      notNull: true,
      primaryKey: true,
      type: 'int',
      unsigned: true,
    },
    segment_key: {
      notNull: true,
      type: 'int',
    },
    lat: {
      notNull: true,
      type: 'decimal',
    },
    lon: {
      notNull: true,
      type: 'decimal',
    },
  })
    .then(() => db.addIndex('points', 'POINT_IDX', ['segment_key']));
};

exports.down = function (db) {
  return db.removeIndex('points', 'POINT_IDX')
    .then(() => db.dropTable('points'));
};

exports._meta = {
  "version": 1
};
