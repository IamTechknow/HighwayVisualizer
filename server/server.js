/**
 * @fileOverview Factory method to create server instance and provide API endpoints
 *
 * @module highwayvisualizer
 * @requires NPM:compression
 * @requires NPM:express
 * @requires NPM:express-validator
 * @requires fs
 * @requires https
 * @requires NPM:morgan
 * @requires path
 * 
 * @requires /server/middleware.js:highwayvisualizer/middleware
 * @requires /server/routes.js:highwayvisualizer/routes
 * @requires /db/routeEnum.js:highwayvisualizer/routeEnum
 */

const compression = require('compression');
const express = require('express');
const { check } = require('express-validator');
const morgan = require('morgan');
const path = require('path');

const Middleware = require('./middleware');
const Routes = require('./routes');
const TYPE_ENUM = require('../db/routeEnum.js');

/** @constant {number} */
const PORT = 3000;
/** @constant {object} */
const ROUTE_NUM_LENGTH_SPEC = {
  min: 1,
  max: 4,
};
/** @constant {object} */
const ROUTE_DIR_LENGTH_SPEC = {
  min: 1,
  max: 1,
};
/** @constant {object} */
const USER_LENGTH_SPEC = {
  min: 3,
  max: 16,
};

/**
 * Create the application server. This allows dependency injection
 * of the DB and redis client for normal use or mocking during tests.
 *
 * @memberof module:highwayvisualizer
 * @param {mysql2.Connection} db
 * @param {redis.RedisClient} redisClient
 * @return {Server} The application server
 */
const createServer = (db, redisClient) => {
  let app = express();
  app.use(compression({ threshold: 8192 }));
  app.use(express.static(path.resolve(__dirname, '../public')));
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  if (process.env.NODE_ENV === 'development') {
    app.use(morgan('dev'));
  }

  app.use(Middleware.headerMiddleware);
  app.get('/users/:user', Routes.userPageRouter);
  app.get('/api/states',
    Middleware.getRedisMiddleware(redisClient),
    Routes.statesAPIRouter(db, redisClient),
  );
  app.get('/api/users', Routes.usersAPIRouter(db, redisClient));
  app.get(
    '/api/route_segments/:stateId',
    Middleware.getRedisMiddleware(redisClient),
    getGTZeroValidator('stateId'),
    Routes.routeSegmentsPerStateAPIRouter(db, redisClient)
  );
  app.get(
    '/api/points/:routeSegmentId',
    Middleware.getRedisMiddleware(redisClient),
    getGTZeroValidator('routeSegmentId'),
    Routes.pointsPerRouteSegmentAPIRouter(db, redisClient)
  );
  app.get(
    '/api/points/:type/:routeNum',
    Middleware.getRedisMiddleware(redisClient),
    getGTZeroValidator('stateId'),
    check('type').isInt({
      min: TYPE_ENUM.INTERSTATE,
      max: TYPE_ENUM.STATE,
    }),
    check('routeNum').isString().isLength(ROUTE_NUM_LENGTH_SPEC).custom(routeNumValidator),
    check('dir').isString().isLength(ROUTE_DIR_LENGTH_SPEC),
    Routes.pointsPerRouteAPIRouter(db, redisClient),
  );
  app.get(
    '/api/concurrencies/:routeNum',
    Middleware.getRedisMiddleware(redisClient),
    getGTZeroValidator('stateId'),
    check('routeNum').isString().isLength(ROUTE_NUM_LENGTH_SPEC).custom(routeNumValidator),
    check('dir').isString().isLength(ROUTE_DIR_LENGTH_SPEC),
    Routes.concurrenciesPerRouteAPIRouter(db, redisClient),
  );
  app.get(
    '/api/travel_segments/:user',
    check('user').isString().isLength(USER_LENGTH_SPEC),
    Routes.travelSegmentsAPIRouter(db, redisClient),
  );
  app.post('/api/newUser', Routes.newUserAPIRouter(db, redisClient));
  app.post('/api/travel_segments/new', Routes.newTravelSegmentAPIRouter(db, redisClient));
  return app.listen(PORT, () => console.log(`Listening at Port ${PORT}`));
};

const getGTZeroValidator = (field) => check(field).isInt({ gt: 0 });

const routeNumValidator = (routeNum) => {
  if (!isNaN(routeNum)) {
    return true;
  }
  if (routeNum.length <= 1) {
    return false;
  }
  const lastChar = routeNum[routeNum.length - 1];
  const secToLastChar = routeNum[routeNum.length - 2];
  // English letters will return true below
  return (lastChar.toLowerCase() !== lastChar.toUpperCase()) && !isNaN(secToLastChar);
};

module.exports = { createServer };
