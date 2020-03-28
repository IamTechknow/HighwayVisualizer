const DB = require('.');
const seedData = require('./fixtures.js');

const database = 'highways', STATES = 'states', SEGMENTS = 'segments', POINTS = 'points',
  USERS = 'users', USER_SEGMENTS = 'user_segments', CONCURRENCIES = 'concurrencies';

const TABLE_QUERIES = [
  `DROP DATABASE IF EXISTS ${database};`,
  `CREATE DATABASE ${database};`,
  `USE ${database};`,
  `CREATE TABLE IF NOT EXISTS ${STATES} (
    id TINYINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    name TEXT NOT NULL,
    initials CHAR(2) NOT NULL);`,
  `CREATE TABLE IF NOT EXISTS ${SEGMENTS} (
    id MEDIUMINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    route_num CHAR(4) NOT NULL,
    type TINYINT UNSIGNED NOT NULL,
    segment_num TINYINT UNSIGNED NOT NULL,
    direction CHAR(1) NOT NULL,
    state_key TINYINT UNSIGNED NOT NULL,
    len MEDIUMINT UNSIGNED NOT NULL DEFAULT 0,
    len_m FLOAT NOT NULL DEFAULT 0.0,
    base INT UNSIGNED NOT NULL);`,
  `CREATE TABLE IF NOT EXISTS ${POINTS} (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    segment_key MEDIUMINT UNSIGNED NOT NULL,
    lat DOUBLE NOT NULL,
    lon DOUBLE NOT NULL);`,
  `CREATE TABLE IF NOT EXISTS ${USERS} (
    id MEDIUMINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    user TEXT NOT NULL);`,
  `CREATE TABLE IF NOT EXISTS ${USER_SEGMENTS} (
    id MEDIUMINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    user_id MEDIUMINT UNSIGNED NOT NULL,
    segment_id MEDIUMINT UNSIGNED NOT NULL,
    clinched BOOL NOT NULL,
    start_id INT UNSIGNED NOT NULL,
    end_id INT UNSIGNED NOT NULL);`,
  `CREATE TABLE IF NOT EXISTS ${CONCURRENCIES} (
    id MEDIUMINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    route_num1 CHAR(4) NOT NULL,
    route_num2 CHAR(4) NOT NULL,
    first_seg MEDIUMINT UNSIGNED NOT NULL,
    last_seg MEDIUMINT UNSIGNED NOT NULL,
    rte2_seg MEDIUMINT UNSIGNED NOT NULL,
    start_pt INT UNSIGNED NOT NULL,
    end_pt INT UNSIGNED NOT NULL);`,
];
console.log(`Seeding database...`);
DB.getDB()
  .then((client) => client.query(TABLE_QUERIES.join(' ')).then(() => client))
  .then((db) => process.argv[2] === '--seed'
    ? seedData(db).then(() => db)
      .catch(err => {
        console.error(err);
        db.end();
      })
    : db
  )
  .then((db) => db.end());
