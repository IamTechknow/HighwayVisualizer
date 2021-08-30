/**
 * @fileOverview Entry point into the application server. Accesses the DB and redis client
 *               and then creates and hosts the server.
 *
 * @requires NPM:redis
 * @requires NPM:yargs
 * @requires /db/index.js
 * @requires /server/server.js
 */

const redis = require('redis');
const yargs = require('yargs/yargs');

const DB = require('../db');
const { createServer } = require('./server');

const _getRedisClient = () => {
  const redisClient = redis.createClient();
  redisClient.on('error', (error) => {
    if (error.code === 'ECONNREFUSED') {
      console.error(`Failed to connect to Redis at ${error.address}, exiting...`);
      process.exit(1);
    } else {
      console.error(error);
    }
  });
  return redisClient;
};

const _getShutdownHandler = (db, httpServer, redisClient) => () => {
  if (db != null) {
    db.end();
  }
  httpServer.close();
  redisClient.quit();
};

const runServer = async (redisOnly) => {
  if (redisOnly) {
    console.info('Running server in read-only mode');
  }
  let db = null;
  try {
    const redisClient = _getRedisClient();
    if (!redisOnly) {
      db = await DB.getDB();
    }
    const server = createServer(db, redisClient);
    process.on('SIGINT', _getShutdownHandler(db, server, redisClient));
  } catch (err) {
    DB.logMySQLError(err);
    console.warn(
      'Server could not communicate with DB, use --redis-only switch to run server in read-only mode',
    );
  }
};

const args = yargs(process.argv.slice(2))
  .option('redisOnly', {
    default: false,
    describe: 'Allow server to run in read-only mode',
    type: 'boolean',
  })
  .parse();
runServer(args.redisOnly);
