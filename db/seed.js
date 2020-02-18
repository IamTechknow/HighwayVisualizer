const DB = require('.');
const seedData = require('./fixtures.js');

const database = 'highways', STATES = 'states', SEGMENTS = 'segments', POINTS = 'points',
  USERS = 'users', USER_SEGMENTS = 'user_segments';
const db = DB.getDB();

db.connectAsync()
  .then(() => console.log(`Connected to ${database} database as ID ${db.threadId}, seeding database...`))
  .then(() => db.queryAsync(`DROP DATABASE IF EXISTS ${database}`))
  .then(() => db.queryAsync(`CREATE DATABASE ${database}`))
  .then(() => db.queryAsync(`USE ${database}`))
  .then(() => db.queryAsync(
  `CREATE TABLE IF NOT EXISTS ${STATES} (
    id INTEGER NOT NULL AUTO_INCREMENT PRIMARY KEY,
    name TEXT NOT NULL,
    initials TEXT NOT NULL);`))
  .then(() => db.queryAsync(
  `CREATE TABLE IF NOT EXISTS ${SEGMENTS} (
    id INTEGER NOT NULL AUTO_INCREMENT PRIMARY KEY,
    route_num TEXT NOT NULL,
    segment_num INTEGER NOT NULL,
    direction TEXT NOT NULL,
    state_key INTEGER NOT NULL,
    len INTEGER NOT NULL DEFAULT 0,
    len_m DOUBLE NOT NULL DEFAULT 0.0,
    base INTEGER NOT NULL);`))
  .then(() => db.queryAsync(
  `CREATE TABLE IF NOT EXISTS ${POINTS} (
    id INTEGER NOT NULL AUTO_INCREMENT PRIMARY KEY,
    segment_key INTEGER NOT NULL,
    lat DOUBLE NOT NULL,
    lon DOUBLE NOT NULL);`))
  .then(() => db.queryAsync(
  `CREATE TABLE IF NOT EXISTS ${USERS} (
    id INTEGER NOT NULL AUTO_INCREMENT PRIMARY KEY,
    user TEXT NOT NULL);`))
  .then(() => db.queryAsync(
  `CREATE TABLE IF NOT EXISTS ${USER_SEGMENTS} (
    id INTEGER NOT NULL AUTO_INCREMENT PRIMARY KEY,
    user_id INTEGER NOT NULL,
    segment_id INTEGER NOT NULL,
    clinched INTEGER NOT NULL,
    start_id INTEGER NOT NULL,
    end_id INTEGER NOT NULL);`))
  .then(() => seedData(db))
  .then(() => db.end())
  .catch(err => {console.error(err); db.end();});
