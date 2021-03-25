// TODO: instead of specifying callback params, migrate to TypeScript on backend
/**
 * @fileOverview Module for all supported API endpoints.
 *
 * @module highwayvisualizer/routes
 * @requires path
 * @requires /db/models.js:highwayDAO
 * @requires /db/routeEnum.js:highwayDAO
 */
const path = require('path');

const Models = require('../db/models');
const TYPE_ENUM = require('../db/routeEnum.js');

/**
 * Middleware function which directs users to the index page. Client sided routing renders the
 * given user's highway statistics.
 *
 * @memberof module:highwayvisualizer/routes
 * @param {express.Request} req
 * @param {express.Response} res
 */
const userPageRouter = (_req, res) => res.sendFile(path.join(__dirname, '../public/index.html'));

/**
 * Higher-order Middleware function which provides all available state highway systems to
 * visualize.
 * 
 * @memberof module:highwayvisualizer/routes
 * @param {mysql2.Connection} db
 * @param {redis.RedisClient} redisClient
 * @returns {function} function with DB and redis client to handle the response.
 */
const statesAPIRouter = (db, redisClient) => {
  return (req, res) => Models.getStates(db)
    .then((result) => _sendOkJSON(redisClient, result, req, res))
    .catch((err) => _catchError(err, res));
};

/**
 * Higher-order Middleware function which provides all created users.
 * @memberof module:highwayvisualizer/routes
 * @param {mysql2.Connection} db
 * @param {redis.RedisClient} redisClient
 * @returns {function} function with DB and redis client to handle the response.
 */
const usersAPIRouter = (db, redisClient) => {
  return (req, res) => Models.getUsers(db)
    .then((result) => _sendOkJSON(redisClient, result, req, res))
    .catch((err) => _catchError(err, res));
};

/**
 * Higher-order Middleware function which provides all route segments for a given state ID.
 * @memberof module:highwayvisualizer/routes
 * @param {mysql2.Connection} db
 * @param {redis.RedisClient} redisClient
 * @returns {function} function with DB and redis client to handle the response.
 */
const routeSegmentsPerStateAPIRouter = (db, redisClient) => {
  return (req, res) => Models.getRouteSegmentsBy(db, req.params.stateId)
    .then((result) => _sendOkJSON(redisClient, result, req, res))
    .catch((err) => _catchError(err, res));
}

/**
 * Higher-order Middleware function which provides all coordinates for a given route segment ID.
 * @memberof module:highwayvisualizer/routes
 * @param {mysql2.Connection} db
 * @param {redis.RedisClient} redisClient
 * @returns {function} function with DB and redis client to handle the response.
 */
const pointsPerRouteSegmentAPIRouter = (db, redisClient) => {
  return (req, res) => {
    let routeSegmentId = req.params.routeSegmentId ?
      Number.parseInt(req.params.routeSegmentId, 10) : undefined;

    if (!routeSegmentId) {
      _sendErrorJSON(redisClient, 'Route segment ID is invalid', req, res);
    } else {
      Models.getPointsForRouteSegment(db, routeSegmentId)
        .then((result) => _sendOkJSON(redisClient, result, req, res))
        .catch((err) => _catchError(err, res));
    }
  };
}

/**
 * Higher-order Middleware function which provides all coordinates for a given route in a state.
 * @memberof module:highwayvisualizer/routes
 * @param {mysql2.Connection} db
 * @param {redis.RedisClient} redisClient
 * @returns {function} function with DB and redis client to handle the response.
 */
const pointsPerRouteAPIRouter = (db, redisClient) => {
  return (req, res) => {
    const stateId = req.query.stateId ?
      Number.parseInt(req.query.stateId, 10) : undefined;
    const type = req.params.type ?
      Number.parseInt(req.params.type, 10) : undefined;
    // Route numbers are strings that can have suffixes
    const routeNum = req.params.routeNum;

    if (!stateId) {
      _sendErrorJSON(redisClient, 'State ID must be provided', req, res);
    } else if (!type) {
      _sendErrorJSON(redisClient, 'Route type must be provided', req, res);
    } else if (type < TYPE_ENUM.INTERSTATE || type > TYPE_ENUM.STATE) {
      _sendErrorJSON(redisClient, 'Route type is invalid', req, res);
    } else if (!routeNum) {
      _sendErrorJSON(redisClient, 'Route number is invalid', req, res);
    } else {
      Models.getPointsForRoute(db, stateId, type, routeNum, req.query.dir)
        .then((result) => _sendOkJSON(redisClient, result, req, res))
        .catch((err) => _catchError(err, res));
    }
  };
};

/**
 * Higher-order Middleware function which provides all known concurrencies for a given route in a state.
 *
 * This endpoint will provide concurrencies for the route that becomes discontinuious
 * to the second route. Concurrencies involving more than two routes are not supported.
 *
 * @memberof module:highwayvisualizer/routes
 * @param {mysql2.Connection} db
 * @param {redis.RedisClient} redisClient
 * @returns {function} function with DB and redis client to handle the response.
 */
const concurrenciesPerRouteAPIRouter = (db, redisClient) => {
  return (req, res) => {
    const stateId = req.query.stateId ?
      Number.parseInt(req.query.stateId, 10) : undefined;
    const routeNum = req.params.routeNum;

    if (!stateId) {
      _sendErrorJSON(redisClient, 'State ID must be provided', req, res);
    } else if (!routeNum) {
      _sendErrorJSON(redisClient, 'Route number is invalid', req, res);
    } else {
      Models.getPointsForConcurrencies(db, stateId, routeNum, req.query.dir)
        .then((result) => _sendOkJSON(redisClient, result, req, res))
        .catch((err) => _catchError(err, res));
    }
  };
};

/**
 * Higher-order Middleware function which provides all travel segments for a given user.
 * @memberof module:highwayvisualizer/routes
 * @param {mysql2.Connection} db
 * @param {redis.RedisClient} redisClient
 * @returns {function} function with DB and redis client to handle the response.
 */
const travelSegmentsAPIRouter = (db, redisClient) => {
  return (req, res) => Models.getTravelSegmentsBy(db, req.params.user)
    .then((result) => {
      let retval = { loaded: true, notFound: result === false };
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
const newUserAPIRouter = (db, redisClient) => {
  return (req, res) => {
    const username = req.body.user;
    if (!username.match(/^[a-z0-9_-]{3,16}$/ig)) {
      const payload = { success: false, message: username + ' is not a valid username' };
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
};

/**
 * Higher-order Middleware function which allows a new travel segment to be created.
 * @memberof module:highwayvisualizer/routes
 * @param {mysql2.Connection} db
 * @param {redis.RedisClient} redisClient
 * @returns {function} function with DB and redis client to handle the response.
 */
const newTravelSegmentAPIRouter = (db, redisClient) => {
  return (req, res) => {
    const userId = req.body.userId;
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
};

const _sendOkJSON = (redisClient, obj, req, res, code = 200) => {
  const resJson = _cacheResponse(redisClient, obj, req, code);
  res.status(code).type('application/json').send(resJson);
};

const _sendErrorJSON = (redisClient, message, req, res, code = 400) => {
  const resJson = _cacheResponse(redisClient, { message }, req, code);
  res.status(code).type('application/json').send(resJson);
};

const _cacheResponse = (redisClient, obj, req, code) => {
  const keySuffix = req.originalUrl || req.url;
  const resJson = JSON.stringify(obj);
  redisClient.set('__express__' + keySuffix, resJson);
  redisClient.set('__express_status__' + keySuffix, code);
  return resJson;
};

const _catchError = (err, res) => {
  console.error(err);
  let payload = JSON.stringify({ message: 'Sorry, an error occurred!' });
  res.status(500).type('application/json').send(payload);
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
