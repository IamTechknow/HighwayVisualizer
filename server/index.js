/**
 * @fileOverview Entry point into the application server. Accesses the DB and redis client
 *               and then creates and hosts the server.
 *
 * @requires NPM:redis
 * @requires NPM:yargs
 * @requires /db/index.js
 * @requires /server/server.js
 */

import { createClient } from 'redis';
import yargs from 'yargs';

import { getDB, logMySQLError } from '../db/index.js';
import createServer from './server.js';

const _getRedisClient = () => createClient({
  socket: { family: 4 },
}).on('error', (error) => {
  if (error.code === 'ECONNREFUSED') {
    console.error(`Failed to connect to Redis at ${error.address}, exiting...`);
    process.exit(1);
  } else {
    console.error(error);
  }
});

const _getShutdownHandler = (db, httpServer, redisClient) => async () => {
  if (db != null) {
    db.end();
  }
  httpServer.close();
  await redisClient.quit();
};

const runServer = async (redisOnly) => {
  if (redisOnly) {
    console.info('Running server in read-only mode');
  }
  let db = null;
  try {
    const redisClient = _getRedisClient();
    if (!redisOnly) {
      db = await getDB();
    }
    await redisClient.connect();
    const server = createServer(db, redisClient);
    process.on('SIGINT', _getShutdownHandler(db, server, redisClient));
  } catch (err) {
    logMySQLError(err);
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
