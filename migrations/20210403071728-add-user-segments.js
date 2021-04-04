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
  return db.createTable('user_segments', {
    id: {
      autoIncrement: true,
      notNull: true,
      primaryKey: true,
      type: 'int',
      unsigned: true,
    },
    user_id: {
      notNull: true,
      type: 'int',
      unsigned: true,
    },
    segment_id: {
      notNull: true,
      type: 'int',
      unsigned: true,
    },
    clinched: {
      notNull: true,
      type: 'boolean',
    },
    start_id: {
      notNull: true,
      type: 'int',
    },
    end_id: {
      notNull: true,
      type: 'int',
    },
  });
};

exports.down = function (db) {
  return db.dropTable('user_segments');
};

exports._meta = {
  "version": 1
};
