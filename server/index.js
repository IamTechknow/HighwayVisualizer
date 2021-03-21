/**
 * @fileOverview Entry point into the application server. Accesses the DB and redis client
 *               and then creates and hosts the server.
 *
 * @requires NPM:redis
 * @requires /db/index.js
 * @requires /server/server.js
 */

const redis = require('redis');
const DB = require('../db');
const { createServer } = require('./server');

const _getRedisClient = () => {
  const redisClient = redis.createClient();
  redisClient.on("error", (error) => {
    if (error.code === 'ECONNREFUSED') {
      console.error(`Failed to connect to Redis at ${error.address}, exiting...`);
      process.exit(1);
    } else {
      console.error(error);
    }
  });
  return redisClient;
};

const _getShutdownHandler = (db, httpServer, redisClient) => {
  return () => {
    if (db != null) {
      db.end();
    }
    httpServer.close();
    redisClient.quit();
  };
};

const runServer = async () => {
  try {
    const db = await DB.getDB();
    const redisClient = _getRedisClient();
    const server = createServer(db, redisClient);
    process.on('SIGINT', _getShutdownHandler(db, server, redisClient));
  } catch (err) {
    DB.logMySQLError(err);
    console.warn('Server will now try to run with Redis only');
    const server = createServer(null, redisClient);
    process.on('SIGINT', _getShutdownHandler(null, server, redisClient));
  }
};

runServer();
