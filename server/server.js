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

import compression from 'compression';
import express, { static as expressStatic, json, urlencoded } from 'express';
import { check } from 'express-validator';
import morgan from 'morgan';
import { resolve } from 'path';

import { headerMiddleware, getRedisMiddleware } from './middleware.js';
import {
  userPageRouter,
  statesAPIRouter,
  usersAPIRouter,
  routeSegmentsPerStateAPIRouter,
  pointsPerRouteSegmentAPIRouter,
  pointsPerRouteAPIRouter,
  concurrenciesPerRouteAPIRouter,
  travelSegmentsAPIRouter,
  newUserAPIRouter,
  newTravelSegmentAPIRouter,
} from './routes.js';
import { INTERSTATE, STATE } from '../db/routeEnum.js';

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

const getGTZeroValidator = (field) => check(field).isInt({ gt: 0 });

const routeNumValidator = (routeNum) => {
  if (!Number.isNaN(routeNum)) {
    return true;
  }
  if (routeNum.length <= 1) {
    return false;
  }
  const lastChar = routeNum[routeNum.length - 1];
  const secToLastChar = routeNum[routeNum.length - 2];
  // English letters will return true below
  return (lastChar.toLowerCase() !== lastChar.toUpperCase()) && !Number.isNaN(secToLastChar);
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
  const app = express();
  app.disable('x-powered-by');
  app.use(compression({ threshold: 8192 }));
  app.use('/', expressStatic(resolve('./public')));
  app.use(json());
  app.use(urlencoded({ extended: true }));
  if (process.env.NODE_ENV === 'development') {
    app.use(morgan('dev'));
  }

  app.use(headerMiddleware);
  app.get('/users/:user', userPageRouter);
  app.get('/api/states',
    getRedisMiddleware(redisClient),
    statesAPIRouter(db, redisClient));
  app.get('/api/users', usersAPIRouter(db, redisClient));
  app.get(
    '/api/route_segments/:stateId',
    getRedisMiddleware(redisClient),
    getGTZeroValidator('stateId'),
    routeSegmentsPerStateAPIRouter(db, redisClient),
  );
  app.get(
    '/api/points/:routeSegmentId',
    getRedisMiddleware(redisClient),
    getGTZeroValidator('routeSegmentId'),
    pointsPerRouteSegmentAPIRouter(db, redisClient),
  );
  app.get(
    '/api/points/:type/:routeNum',
    getRedisMiddleware(redisClient),
    getGTZeroValidator('stateId'),
    check('type').isInt({
      min: INTERSTATE,
      max: STATE,
    }),
    check('routeNum').isString().isLength(ROUTE_NUM_LENGTH_SPEC).custom(routeNumValidator),
    check('dir').isString().isLength(ROUTE_DIR_LENGTH_SPEC),
    pointsPerRouteAPIRouter(db, redisClient),
  );
  app.get(
    '/api/concurrencies/:routeNum',
    getRedisMiddleware(redisClient),
    getGTZeroValidator('stateId'),
    check('routeNum').isString().isLength(ROUTE_NUM_LENGTH_SPEC).custom(routeNumValidator),
    check('dir').isString().isLength(ROUTE_DIR_LENGTH_SPEC),
    concurrenciesPerRouteAPIRouter(db, redisClient),
  );
  app.get(
    '/api/travel_segments/:user',
    check('user').isString().isLength(USER_LENGTH_SPEC),
    travelSegmentsAPIRouter(db, redisClient),
  );
  app.post('/api/newUser', newUserAPIRouter(db, redisClient));
  app.post('/api/travel_segments/new', newTravelSegmentAPIRouter(db, redisClient));
  return app.listen(PORT, () => console.log(`Listening at Port ${PORT}`));
};

export default createServer;
