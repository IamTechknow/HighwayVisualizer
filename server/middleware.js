/**
 * @fileOverview Module for common middleware functions used when routing express API endpoints.
 *
 * @module highwayvisualizer/middleware
 */

/**
 * Middleware function used by all endpoints which enables CORS and caching in prod environment.
 *
 * @memberof module:highwayvisualizer/middleware
 * @param {express.Request} req
 * @param {express.Response} res
 * @param {express.NextFunction} next
 */
export const headerMiddleware = (req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  if (process.env.NODE_ENV === 'production') {
    if (req.method === 'GET') {
      res.header('Cache-Control', 'public, max-age=86400');
    }
  }
  next();
};

/**
 * Middleware function used by most GET endpoints to cache API requests with Redis. If the request
 * is not cached, the next middleware function runs and will cache the response JSON and code.
 *
 * @memberof module:highwayvisualizer/middleware
 * @param {express.Request} req
 * @param {express.Response} res
 * @param {express.NextFunction} next
 */
export const getRedisMiddleware = (redisClient) => (req, res, next) => {
  const keySuffix = req.originalUrl || req.url;
  redisClient.get(`__express__${keySuffix}`, (_err, reply) => {
    if (reply) {
      redisClient.get(`__express_status__${keySuffix}`, (_status_err, code) => {
        res.status(Number(code)).type('application/json').send(reply);
      });
    } else {
      next();
    }
  });
};
