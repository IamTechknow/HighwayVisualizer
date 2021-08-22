// TODO: instead of specifying callback params, migrate to TypeScript on backend
/**
 * @fileOverview Module for all supported API endpoints.
 *
 * @module highwayvisualizer/routes
 * @requires NPM:express-validator
 * @requires path
 * @requires /db/models.js:highwayDAO
 * @requires /db/routeEnum.js:highwayDAO
 */
const { validationResult } = require('express-validator');
const path = require('path');

const Models = require('../db/models');

/**
 * Middleware function which directs users to the index page. Client sided routing renders the
 * given user's highway statistics.
 *
 * @memberof module:highwayvisualizer/routes
 * @param {express.Request} req
 * @param {express.Response} res
 */
const userPageRouter = (_req, res) => res.sendFile(path.join(__dirname, '../public/index.html'));

const _cacheResponse = (redisClient, obj, req, code) => {
  const keySuffix = req.originalUrl || req.url;
  const resJson = JSON.stringify(obj);
  redisClient.set(`__express__${keySuffix}`, resJson);
  redisClient.set(`__express_status__${keySuffix}`, code);
  return resJson;
};

const _sendOkJSON = (redisClient, obj, req, res, code = 200) => {
  const resJson = _cacheResponse(redisClient, obj, req, code);
  res.status(code).type('application/json').send(resJson);
};

const _sendErrorJSON = (redisClient, message, req, res, code = 400) => {
  const resJson = _cacheResponse(redisClient, { message }, req, code);
  res.status(code).type('application/json').send(resJson);
};

const _catchError = (err, res) => {
  console.error(err);
  const payload = JSON.stringify({ message: 'Sorry, an error occurred!' });
  res.status(500).type('application/json').send(payload);
};

/**
 * Higher-order Middleware function which provides all available state highway systems to
 * visualize.
 *
 * @memberof module:highwayvisualizer/routes
 * @param {mysql2.Connection} db
 * @param {redis.RedisClient} redisClient
 * @returns {function} function with DB and redis client to handle the response.
 */
const statesAPIRouter = (db, redisClient) => (req, res) => Models.getStates(db)
  .then((result) => {
    const apiResults = result.map((record) => {
      const {
        id, title, identifier, initials, latMin, lonMin, latMax, lonMax,
      } = record;
      return {
        id,
        title,
        identifier,
        initials,
        boundingBox: [[latMin, lonMin], [latMax, lonMax]],
      };
    });
    _sendOkJSON(redisClient, apiResults, req, res);
  })
  .catch((err) => _catchError(err, res));

/**
 * Higher-order Middleware function which provides all created users.
 * @memberof module:highwayvisualizer/routes
 * @param {mysql2.Connection} db
 * @param {redis.RedisClient} redisClient
 * @returns {function} function with DB and redis client to handle the response.
 */
const usersAPIRouter = (db, redisClient) => (req, res) => Models.getUsers(db)
  .then((result) => _sendOkJSON(redisClient, result, req, res))
  .catch((err) => _catchError(err, res));

/**
 * Higher-order Middleware function which provides all route segments for a given state ID.
 * @memberof module:highwayvisualizer/routes
 * @param {mysql2.Connection} db
 * @param {redis.RedisClient} redisClient
 * @returns {function} function with DB and redis client to handle the response.
 */
const routeSegmentsPerStateAPIRouter = (db, redisClient) => (req, res) => {
  Models.getRouteSegmentsBy(db, req.params.stateId)
    .then((result) => _sendOkJSON(redisClient, result, req, res))
    .catch((err) => _catchError(err, res));
};

/**
 * Higher-order Middleware function which provides all coordinates for a given route segment ID.
 * @memberof module:highwayvisualizer/routes
 * @param {mysql2.Connection} db
 * @param {redis.RedisClient} redisClient
 * @returns {function} function with DB and redis client to handle the response.
 */
const pointsPerRouteSegmentAPIRouter = (db, redisClient) => (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ errors: errors.array() });
  }
  const routeSegmentId = Number.parseInt(req.params.routeSegmentId, 10);
  Models.getPointsForRouteSegment(db, routeSegmentId)
    .then((result) => _sendOkJSON(redisClient, result, req, res))
    .catch((err) => _catchError(err, res));
};

/**
 * Higher-order Middleware function which provides all coordinates for a given route in a state.
 * @memberof module:highwayvisualizer/routes
 * @param {mysql2.Connection} db
 * @param {redis.RedisClient} redisClient
 * @returns {function} function with DB and redis client to handle the response.
 */
const pointsPerRouteAPIRouter = (db, redisClient) => (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ errors: errors.array() });
  }
  const stateId = Number.parseInt(req.query.stateId, 10);
  const type = Number.parseInt(req.params.type, 10);
  const { routeNum } = req.params;
  Models.getPointsForRoute(db, stateId, type, routeNum, req.query.dir)
    .then((result) => _sendOkJSON(redisClient, result, req, res))
    .catch((err) => _catchError(err, res));
};

/**
 * Higher-order Middleware function which provides all known concurrencies
 * for a given route in a state.
 *
 * This endpoint will provide concurrencies for the route that becomes discontinuious
 * to the second route. Concurrencies involving more than two routes are not supported.
 *
 * @memberof module:highwayvisualizer/routes
 * @param {mysql2.Connection} db
 * @param {redis.RedisClient} redisClient
 * @returns {function} function with DB and redis client to handle the response.
 */
const concurrenciesPerRouteAPIRouter = (db, redisClient) => (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ errors: errors.array() });
  }
  const stateId = Number.parseInt(req.query.stateId, 10);
  const { routeNum } = req.params;
  Models.getPointsForConcurrencies(db, stateId, routeNum, req.query.dir)
    .then((result) => _sendOkJSON(redisClient, result, req, res))
    .catch((err) => _catchError(err, res));
};

/**
 * Higher-order Middleware function which provides all travel segments for a given user.
 * @memberof module:highwayvisualizer/routes
 * @param {mysql2.Connection} db
 * @param {redis.RedisClient} redisClient
 * @returns {function} function with DB and redis client to handle the response.
 */
const travelSegmentsAPIRouter = (db, redisClient) => (req, res) => {
  Models.getTravelSegmentsBy(db, req.params.user)
    .then((result) => {
      const retval = { loaded: true, notFound: result === false };
      if (result) {
        Object.assign(retval, result);
      }
      _sendOkJSON(redisClient, retval, req, res);
    }).catch((err) => _catchError(err, res));
};

/**
 * Higher-order Middleware function which allows a new user to be created.
 * @memberof module:highwayvisualizer/routes
 * @param {mysql2.Connection} db
 * @param {redis.RedisClient} redisClient
 * @returns {function} function with DB and redis client to handle the response.
 */
const newUserAPIRouter = (db, redisClient) => (req, res) => {
  const username = req.body.user;
  if (!username.match(/^[a-z0-9_-]{3,16}$/ig)) {
    const payload = { success: false, message: `${username} is not a valid username` };
    _sendOkJSON(redisClient, payload, req, res, 400); // need to send entire payload to response
    return;
  }
  Models.createUser(db, username)
    .then((result) => {
      const message = result.success
        ? `Success! You can create user segments for '${username}'`
        : `'${username}' already exists and is now selected`;
      const payload = {
        success: result.success,
        message,
        userId: result.userId,
      };
      _sendOkJSON(redisClient, payload, req, res, 201);
    })
    .catch((err) => _catchError(err, res));
};

/**
 * Higher-order Middleware function which allows a new travel segment to be created.
 * @memberof module:highwayvisualizer/routes
 * @param {mysql2.Connection} db
 * @param {redis.RedisClient} redisClient
 * @returns {function} function with DB and redis client to handle the response.
 */
const newTravelSegmentAPIRouter = (db, redisClient) => (req, res) => {
  const { userId } = req.body;
  if (userId <= 0) {
    _sendErrorJSON(redisClient, 'No user was provided, please ensure a user was selected.', req, res);
    return;
  }
  Models.createTravelSegment(db, userId, req.body.travelSegments)
    .then((result) => {
      const noun = result.affectedRows > 1 ? 'segments' : 'segment';
      const payload = {
        success: true,
        message: `Successfully created ${result.affectedRows} travel ${noun}!`,
      };
      _sendOkJSON(redisClient, payload, req, res, 201);
    }).catch((err) => _catchError(err, res));
};

module.exports = {
  concurrenciesPerRouteAPIRouter,
  newTravelSegmentAPIRouter,
  newUserAPIRouter,
  pointsPerRouteAPIRouter,
  pointsPerRouteSegmentAPIRouter,
  routeSegmentsPerStateAPIRouter,
  statesAPIRouter,
  travelSegmentsAPIRouter,
  usersAPIRouter,
  userPageRouter,
};
