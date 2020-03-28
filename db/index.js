const mysql = require('mysql2/promise');

const DATABASE = 'highways';
const AUTHENTICATION_FIX = 'https://stackoverflow.com/questions/50093144/mysql-8-0-client-does-not-support-authentication-protocol-requested-by-server';

const getDB = () => mysql.createConnection({
  database: DATABASE,
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
  return db;
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

module.exports = {getDB};
