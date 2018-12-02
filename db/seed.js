const mysql = require('mysql');
const Promise = require('bluebird');
const seedData = require('./fixtures.js');

const database = 'highways', STATES = 'states', ROUTES = 'routes', POINTS = 'points';

const connection = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '',
});

// Use promisification on the MySQL database connection
const db = Promise.promisifyAll(connection, { multiArgs: true });

// Almost the same as the index script, except no exports and will exit when it finishes.
// TODO: Use Indexing and compare performance changes
db.connectAsync()
  .then(() => console.log(`Connected to ${database} database as ID ${db.threadId}, seeding database...`))
  .then(() => db.queryAsync(`DROP DATABASE IF EXISTS ${database}`))
  .then(() => db.queryAsync(`CREATE DATABASE ${database}`))
  .then(() => db.queryAsync(`USE ${database}`))
  .then(() => db.queryAsync(`CREATE TABLE IF NOT EXISTS ${STATES} (
    id INTEGER NOT NULL AUTO_INCREMENT PRIMARY KEY,
    name TEXT NOT NULL,
    initials TEXT NOT NULL)`))
   .then(() => db.queryAsync(`CREATE TABLE IF NOT EXISTS ${ROUTES} (
    id INTEGER NOT NULL AUTO_INCREMENT PRIMARY KEY,
    route TEXT NOT NULL,
    direction TEXT NOT NULL,
    state_key INTEGER NOT NULL)`))
   .then(() => db.queryAsync(`CREATE TABLE IF NOT EXISTS ${POINTS} (
    id INTEGER NOT NULL AUTO_INCREMENT PRIMARY KEY,
    route_key INTEGER NOT NULL,
    lat FLOAT NOT NULL,
    lon FLOAT NOT NULL)`))
  .then(() => seedData(db))
  .then(() => process.exit(0))
  .catch(err => {console.error(err); db.end();});
