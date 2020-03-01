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
    .then(() => db.queryAsync(`USE ${DATABASE}`))
    .then(() => {
      if (process.env.NODE_ENV === 'development') {
        console.log(`Connected to ${DATABASE} database as ID ${db.threadId}`);
      }
    })
    .catch((err) => {
      console.error(err);
      if (err.code === 'ER_BAD_DB_ERROR') {
        console.error('highways DB not found. Did you run "npm run reset/seed" yet?');
      } else if (err.code === 'ER_NOT_SUPPORTED_AUTH_MODE') {
        console.error(`NodeJS driver does not support v8.0 authentication (yet). Go to ${AUTHENTICATION_FIX} to work around`);
      } else if (err.code === ' ECONNREFUSED') {
        console.error('Failed to connect. Has "mysqld --console" been run yet?');
      }
      db.end();
      process.exit(0);
    });

db.startTransaction = () => db.queryAsync('SET unique_checks=0;')
  .then(() => db.queryAsync('START TRANSACTION;'));

db.endTransaction = () => db.queryAsync('SET unique_checks=1;')
  .then(() => db.queryAsync('COMMIT;'));

module.exports = {connectWithDB, getDB};
