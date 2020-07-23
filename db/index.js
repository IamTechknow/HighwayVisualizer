/**
 * @fileOverview Module which serves as a static factory for a MySQL database connection.
 *
 * @requires NPM:mysql2
 */

const mysql = require('mysql2/promise');

/** @constant {string} */
const DATABASE = 'highways';
/** @constant {string} */
const AUTHENTICATION_FIX = 'https://stackoverflow.com/questions/50093144/mysql-8-0-client-does-not-support-authentication-protocol-requested-by-server';

/**
 * Connects to the highways MySQL database.
 *
 * Enables the multiple statements flag which is used to gather queried route segments
 * into a single result array. If the connection fails for common reasons, console logs
 * will print helpful messages. When the database connection is no longer to be used, the end
 * method needs to be called to terminate the connection and the program.
 *
 * @return {Promise} Returns a Promise that resolves with a MySQL Connection object. It is
 *         connected to the highways database and contains helper methods to start and stop
 *         a transaction meant for inserting data in bulk.
 */
const getDB = () => mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '',
  multipleStatements: true
}).then((db) => {
  if (process.env.NODE_ENV === 'development') {
    console.log(`Connected to ${DATABASE} database as ID ${db.threadId}`);
  }
  // Add helper methods for bulk insertions
  db.startTransaction = () => db.query('SET unique_checks=0; START TRANSACTION;');
  db.endTransaction = () => db.query('SET unique_checks=1; COMMIT;');
  // Handle first time run
  return db.query(`CREATE DATABASE IF NOT EXISTS ${DATABASE}; use ${DATABASE};`)
    .then(() => db);
}).catch((err) => {
  if (err.code === 'ER_BAD_DB_ERROR') {
    console.error('highways DB not found. Did you run "npm run reset/seed" yet?');
  } else if (err.code === 'ER_NOT_SUPPORTED_AUTH_MODE') {
    console.error(`NodeJS driver does not support v8.0 authentication (yet). Go to ${AUTHENTICATION_FIX} to work around`);
  } else if (err.code === 'ECONNREFUSED') {
    console.error('Failed to connect. Has "mysqld --console" been run yet?');
  } else {
    console.error(err);
  }
  process.exit(0);
});

/** @module DB */
module.exports = {getDB};
