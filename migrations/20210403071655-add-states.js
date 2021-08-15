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
  return db.createTable('states', {
    id: {
      autoIncrement: true,
      notNull: true,
      primaryKey: true,
      type: 'smallint',
      unsigned: true,
    },
    title: {
      notNull: true,
      type: 'string',
    },
    identifier: {
      notNull: true,
      type: 'string',
    },
    initials: {
      length: 2,
      notNull: true,
      type: 'char',
    },
    latMax: {
      notNull: true,
      type: 'double',
    },
    latMin: {
      notNull: true,
      type: 'double',
    },
    lonMax: {
      notNull: true,
      type: 'double',
    },
    lonMin: {
      notNull: true,
      type: 'double',
    },
  });
};

exports.down = function (db) {
  return db.dropTable('states');
};

exports._meta = {
  "version": 1
};
