const mysql = require('mysql');
const Promise = require('bluebird');

const DATABASE = 'highways';
const AUTHENTICATION_FIX = 'https://stackoverflow.com/questions/50093144/mysql-8-0-client-does-not-support-authentication-protocol-requested-by-server';

const connection = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '',
  multipleStatements: true
});

// Use promisification on the MySQL database connection
const db = Promise.promisifyAll(connection, { multiArgs: true });

const getDB = () => db;

const connectWithDB = (db) =>
  db.connectAsync()
    .then(() => console.log(`Connected to ${DATABASE} database as ID ${db.threadId}`))
    .then(() => db.queryAsync(`USE ${DATABASE}`))
    .catch((err) => {
      console.error(err);
      if (err.code === 'ER_BAD_DB_ERROR') {
        console.error('highways DB not found. Did you run "npm run seed" yet?');
      } else if (err.code === 'ER_NOT_SUPPORTED_AUTH_MODE') {
        console.error(`NodeJS driver does not support v8.0 authentication (yet). Go to ${AUTHENTICATION_FIX} to work around`);
      } else if (err.code === ' ECONNREFUSED') {
        console.error('Failed to connect. Has "mysqld --console" been run yet?');
      }
      db.end();
      process.exit(0);
    });

module.exports = {connectWithDB, getDB};
