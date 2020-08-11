/**
 * @fileOverview Express router to configure server instance and provide API endpoints
 *
 * @module routers/highwayvisualizer
 * @requires NPM:compression
 * @requires NPM:express
 * @requires NPM:morgan
 * @requires path
 * @requires /db/routeEnum.js:routeEnum
 * @requires /db/models.js:highwayDAO
 * @requires /db/index.js:DB
 */

const compression = require('compression');
const express = require('express');
const morgan = require('morgan');
const path = require('path');
const redis = require('redis');
const TYPE_ENUM = require('../db/routeEnum.js');
const Models = require('../db/models.js');
const DB = require('../db');

/** @constant {number} */
const PORT = process.env.NODE_ENV === 'production' ? 443 : 80;

/**
 * Express router to mount API endpoints.
 * @type {object}
 * @const
 * @memberof module:highwayvisualizer
 */
const app = express();
let db;
let redisClient;

app.use(compression({threshold: 8192}));
app.use(express.static(path.resolve(__dirname, '../public')));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

/**
 * Middleware function used by all endpoints which enables CORS and caching in prod environment.
 * @memberof module:highwayvisualizer
 * @param {express.Request} req
 * @param {express.Response} res
 * @param {express.NextFunction} next
 */
const headerMiddleware = (req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  if (process.env.NODE_ENV === 'production' && req.method === 'GET') {
    res.header("Cache-Control", "public, max-age=86400");
  }
  next();
};

/**
 * Middleware function used by most GET endpoints to cache API requests with Redis. If the request
 * is not cached, the next middleware function runs and will cache the response JSON and code.
 *
 * @memberof module:highwayvisualizer
 * @param {express.Request} req
 * @param {express.Response} res
 * @param {express.NextFunction} next
 */
const redisMiddleware = (req, res, next) => {
  const keySuffix = req.originalUrl || req.url;
  redisClient.get('__express__' + keySuffix, (err, reply) => {
    if (reply) {
      redisClient.get('__express_status__' + keySuffix, (err, code) => {
        res.status(Number(code)).type('application/json').send(reply);
      });
    } else {
      next();
    }
  });
};

/**
 * Middleware function which directs users to the index page. Client sided routing renders the
 * given user's highway statistics.
 *
 * @memberof module:highwayvisualizer
 * @param {express.Request} req
 * @param {express.Response} res
 */
const usersRouter = (req, res) => res.sendFile(path.join(__dirname, '../public/index.html'));

/**
 * Middleware function which provides all available state highway systems to visualize.
 * @memberof module:highwayvisualizer
 * @param {express.Request} req
 * @param {express.Response} res
 */
const statesAPIRouter = (req, res) =>
  Models.getStates(db)
    .then((result) => _sendOkJSON(result, req, res))
    .catch((err) => _catchError(err, res));

/**
 * Middleware function which provides all created users.
 * @memberof module:highwayvisualizer
 * @param {express.Request} req
 * @param {express.Response} res
 */
const usersAPIRouter = (req, res) =>
  Models.getUsers(db)
    .then((result) => _sendOkJSON(result, req, res))
    .catch((err) => _catchError(err, res));

/**
 * Middleware function which provides all segments for a given state ID.
 * @memberof module:highwayvisualizer
 * @param {express.Request} req
 * @param {string} req.params.stateId - The ID representing the state's highway system.
 * @param {express.Response} res
 */
const segmentsPerStateAPIRouter = (req, res) =>
  Models.getSegmentsBy(db, req.params.stateId)
    .then((result) => _sendOkJSON(result, req, res))
    .catch((err) => _catchError(err, res));

/**
 * Middleware function which provides all coordinates for a given segment ID.
 * @memberof module:highwayvisualizer
 * @param {express.Request} req
 * @param {string} req.params.segmentId - The ID presenting the segment.
 * @param {express.Response} res
 */
const pointsPerSegmentAPIRouter = (req, res) => {
  let segmentInteger = req.params.segmentId ?
    Number.parseInt(req.params.segmentId, 10) : undefined;

  if (!segmentInteger) {
    _sendErrorJSON('Segment ID is invalid', req, res);
  } else {
    Models.getPointsForSegment(db, segmentInteger)
      .then((result) => _sendOkJSON(result, req, res))
      .catch((err) => _catchError(err, res));
  }
};

/**
 * Middleware function which provides all coordinates for a given route in a state.
 * @memberof module:highwayvisualizer
 * @param {express.Request} req
 * @param {string} req.query.dir - The letter direction of the route.
 * @param {string} req.query.stateId - The ID representing the state's highway system.
 * @param {string} req.params.routeNum - The route's number, can be alphanumeric.
 * @param {string} req.params.type - The HPMS route signing type.
 * @param {express.Response} res
 */
const pointsPerRouteAPIRouter = (req, res) => {
  const stateId = req.query.stateId ?
    Number.parseInt(req.query.stateId, 10) : undefined;
  const type = req.params.type ?
    Number.parseInt(req.params.type, 10) : undefined;
  // Route numbers are strings that can have suffixes
  const routeNum = req.params.routeNum;

  if (!stateId) {
    _sendErrorJSON('State ID must be provided', req, res);
  } else if (!type) {
    _sendErrorJSON('Route type must be provided', req, res);
  } else if (type < TYPE_ENUM.INTERSTATE || type > TYPE_ENUM.STATE) {
    _sendErrorJSON('Route type is invalid', req, res);
  } else if (!routeNum) {
    _sendErrorJSON('Route number is invalid', req, res);
  } else {
    Models.getPointsForRoute(db, stateId, type, routeNum, req.query.dir)
      .then((result) => _sendOkJSON(result, req, res))
      .catch((err) => _catchError(err, res));
  }
};

/**
 * Middleware function which provides all known concurrencies for a given route in a state.
 *
 * This endpoint will provide concurrencies for the route that becomes discontinuious
 * to the second route. Concurrencies involving more than two routes are not supported.
 *
 * @memberof module:highwayvisualizer
 * @param {express.Request} req
 * @param {string} req.query.dir - The letter direction of the route.
 * @param {string} req.query.stateId - The ID representing the state's highway system.
 * @param {string} req.params.routeNum - The route's number, can be alphanumeric.
 * @param {express.Response} res
 */
const concurrenciesPerRouteAPIRouter = (req, res) => {
  const stateId = req.query.stateId ?
    Number.parseInt(req.query.stateId, 10) : undefined;
  const routeNum = req.params.routeNum;

  if (!stateId) {
    _sendErrorJSON('State ID must be provided', req, res);
  } else if (!routeNum) {
    _sendErrorJSON('Route number is invalid', req, res);
  } else {
    Models.getPointsForConcurrencies(db, stateId, routeNum, req.query.dir)
      .then((result) => _sendOkJSON(result, req, res))
      .catch((err) => _catchError(err, res));
  }
};

/**
 * Middleware function which provides all user segments for a given user.
 * @memberof module:highwayvisualizer
 * @param {express.Request} req
 * @param {string} req.params.user - The name of the user to query user segments on.
 * @param {express.Response} res
 */
const userSegmentsAPIRouter = (req, res) =>
  Models.getUserSegmentsBy(db, req.params.user)
    .then((result) => {
      let retval = { loaded: true, notFound: result === false };
      if (result) {
        Object.assign(retval, result);
      }
      _sendOkJSON(retval, req, res);
    }).catch((err) => _catchError(err, res));

/**
 * Middleware function which allows a new user to be created.
 * @memberof module:highwayvisualizer
 * @param {express.Request} req
 * @param {string} req.body.user - The name for the new user.
 * @param {express.Response} res
 */
const newUserAPIRouter = (req, res) => {
  const username = req.body.user;
  if (!username.match(/^[a-z0-9_-]{3,16}$/ig)) {
    const payload = {success: false, message: username + ' is not a valid username'};
    _sendOkJSON(payload, req, res, 400); // need to send entire payload to response
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
      _sendOkJSON(payload, req, res, 201);
    })
    .catch((err) => _catchError(err, res));
};

/**
 * Middleware function which allows a new user segment to be created.
 * @memberof module:highwayvisualizer
 * @param {express.Request} req
 * @param {string} req.body.userId - The ID representing the user.
 * @param {string} req.body.userSegments - The user segment data to insert.
 * @param {express.Response} res
 */
const newUserSegmentAPIRouter = (req, res) =>
  Models.createUserSegment(db, req.body.userId, req.body.userSegments)
    .then((result) => {
      const noun = result.affectedRows > 1 ? 'segments' : 'segment';
      const payload = {
        success: true,
        message: `Successfully created ${result.affectedRows} user ${noun}!`,
      };
      _sendOkJSON(payload, req, res, 201);
    }).catch((err) => _catchError(err, res));

const _sendOkJSON = (obj, req, res, code = 200) => {
  const resJson = _cacheResponse(obj, req, res, code);
  res.status(code).type('application/json').send(resJson);
};

const _sendErrorJSON = (message, req, res, code = 400) => {
  const resJson = _cacheResponse({ message }, req, res, code);
  res.status(code).type('application/json').send(resJson);
};

const _cacheResponse = (obj, req, res, code) => {
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

app.use(headerMiddleware);

app.get('/users/:user', usersRouter);

app.get('/api/states', redisMiddleware, statesAPIRouter);
app.get('/api/users', usersAPIRouter);
app.get('/api/segments/:stateId', redisMiddleware, segmentsPerStateAPIRouter);
app.get('/api/points/:segmentId', redisMiddleware, pointsPerSegmentAPIRouter);
app.get('/api/points/:type/:routeNum', redisMiddleware, pointsPerRouteAPIRouter);
app.get('/api/concurrencies/:routeNum', redisMiddleware, concurrenciesPerRouteAPIRouter);
app.get('/api/user_segments/:user', redisMiddleware, userSegmentsAPIRouter);

app.post('/api/newUser', newUserAPIRouter);
app.post('/api/user_segments/new', newUserSegmentAPIRouter);

DB.getDB()
  .then((client) => {
    db = client;
    let server = app;
    if (process.env.NODE_ENV === 'production') {
      const sslOptions = {
        cert: fs.readFileSync(process.env.CERT_PATH),
        key: fs.readFileSync(process.env.KEY_PATH),
      };
      server = https.createServer(sslOptions, app);
    }

    const httpServer = server.listen(PORT, () => console.log(`Listening at Port ${PORT}`));

    redisClient = redis.createClient();
    redisClient.on("error", (error) => {
      if (error.code === 'ECONNREFUSED') {
        console.error(`Failed to connect to Redis at ${error.address}, exiting...`);
        httpServer.close();
        db.end();
        process.exit(1);
      } else {
        console.error(error);
      }
    });

    return httpServer;
  })
  .then((httpServer) => process.on('SIGINT', () => {
    httpServer.close();
    db.end();
    redisClient.quit();
  }));
