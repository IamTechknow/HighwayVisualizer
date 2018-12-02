const mysql = require('mysql');
const Promise = require('bluebird');
const seedData = require('./fixtures.js');

const database = 'highways';

const connection = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '',
});

// Use promisification on the MySQL database connection
const db = Promise.promisifyAll(connection, { multiArgs: true });

db.connectAsync()
  .then(() => console.log(`Connected to ${database} database as ID ${db.threadId}`))
  .then(() => db.queryAsync(`USE ${database}`))

module.exports = db;
