/**
 * @fileOverview Factory method to create server instance and provide API endpoints
 *
 * @module highwayvisualizer
 * @requires NPM:compression
 * @requires NPM:express
 * @requires NPM:morgan
 * @requires path
 */

const compression = require('compression');
const express = require('express');
const fs = require('fs');
const https = require('https');
const morgan = require('morgan');
const path = require('path');

const Middleware = require('./middleware');
const Routes = require('./routes');

/** @constant {number} */
const PORT = process.env.NODE_ENV === 'production' ? 443 : 80;

/**
 * Create the application server. This allows dependency injection
 * of the DB and redis client for normal use or mocking during tests. Handles SSL certificate
 * depending on environment variables NODE_ENV, CERT_PATH, and KEY_PATH.
 *
 * @memberof module:highwayvisualizer
 * @param {mysql2.Connection} db
 * @param {redis.RedisClient} redisClient
 * @return {Server} The application server
 */
const createServer = (db, redisClient) => {
  const app = express();
  app.use(compression({ threshold: 8192 }));
  app.use(express.static(path.resolve(__dirname, '../public')));
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  if (process.env.NODE_ENV === 'development') {
    app.use(morgan('dev'));
  }

  app.use(Middleware.headerMiddleware);
  app.get('/users/:user', Routes.usersRouter);
  app.get('/api/states',
    Middleware.getRedisMiddleware(redisClient),
    Routes.statesAPIRouter(db, redisClient),
  );
  app.get('/api/users', Routes.usersAPIRouter(db, redisClient));
  app.get(
    '/api/segments/:stateId',
    Middleware.getRedisMiddleware(redisClient),
    Routes.segmentsPerStateAPIRouter(db, redisClient)
  );
  app.get(
    '/api/points/:segmentId',
    Middleware.getRedisMiddleware(redisClient),
    Routes.pointsPerSegmentAPIRouter(db, redisClient)
  );
  app.get(
    '/api/points/:type/:routeNum',
    Middleware.getRedisMiddleware(redisClient),
    Routes.pointsPerRouteAPIRouter(db, redisClient),
  );
  app.get(
    '/api/concurrencies/:routeNum',
    Middleware.getRedisMiddleware(redisClient),
    Routes.concurrenciesPerRouteAPIRouter(db, redisClient),
  );
  app.get('/api/user_segments/:user', Routes.userSegmentsAPIRouter(db, redisClient));
  app.post('/api/newUser', Routes.newUserAPIRouter(db, redisClient));
  app.post('/api/user_segments/new', Routes.newUserSegmentAPIRouter(db, redisClient));

  if (process.env.NODE_ENV === 'production') {
    const sslOptions = {
      cert: fs.readFileSync(process.env.CERT_PATH),
      key: fs.readFileSync(process.env.KEY_PATH),
    };
    app = https.createServer(sslOptions, app);
  }

  return app.listen(PORT, () => console.log(`Listening at Port ${PORT}`));
};

module.exports = { createServer };
