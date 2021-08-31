/**
 * @fileOverview The Data access object for the highways database. Contains solely of
 *               static methods that accepts the database client as the first parameter,
 *               thus utilizing dependency injection. Note that all coordinate data is formatted
 *               in LatLng order. GeoJSON was considered, but there is not much value in
 *               refactoring the codebase to support LngLat coordinates in the frontend,
 *               especially when only the LineString geometry type is used.
 *
 * @requires /db/Utils.js:Utils
 */
import Utils from './Utils.js';

/** Static methods for database interactions */
class Models {
  /**
   * Queries the database for all states in sorted order.
   * @param {object} db - A database client that can perform queries from the mysql2 module.
   * @return {Promise} Returns a promise that resolves with an array of rows from the states table.
   */
  static getStates(db) {
    return db.execute('SELECT * FROM states ORDER BY title;')
      .then((result) => result[0])
      .catch((err) => { console.error(err); });
  }

  /**
   * Queries the database for all route segments with the given state ID.
   *
   * For longer column names, a shortened name is used to reduce bandwidth or for camel casing.
   * The queried rows are also sorted by the route number and ID, in that order.
   *
   * @param {object} db - A database client that can perform queries from the mysql2 module.
   * @param {number} stateId - The ID of the state to query route segments from.
   * @return {Promise} Returns a promise that resolves with an array of rows. Each row contains
   *         a route segment's ID, route number, route signing type, order in the route, direction,
   *         number of points, and total distance.
   */
  static getRouteSegmentsBy(db, stateId) {
    return db.execute('SELECT id, route_num as routeNum, type, segment_num AS segNum, direction AS dir, len, len_m FROM segments WHERE state_key = ? ORDER BY CAST(route_num as unsigned), id;', [stateId])
      .then((result) => result[0])
      .catch((err) => { console.error(err); });
  }

  /**
   * Queries all coordinates of a single route segment.
   *
   * The coordinates are truncated here because they cannot be easily truncated upon insertion.
   * This greatly reduces the size of the JSON response.
   *
   * @param {object} db - A database client that can perform queries from the mysql2 module.
   * @param {number} routeSegmentId - The ID of the route segment.
   * @return {Promise} Returns a promise that resolves with an array of coodinate objects.
   */
  static getPointsForRouteSegment(db, routeSegmentId) {
    const query = `SELECT TRUNCATE(lat, 7) as lat, TRUNCATE(lon, 7) as lon FROM points WHERE segment_key = ${routeSegmentId}`;
    return Models.processPointQueries(db, [query, ''], [{ id: routeSegmentId }]);
  }

  /**
   * Queries for all coordinates of a single route, type, and direction.
   *
   * This function supports highways in two directions and accounts for multiple routes that use
   * the same route number.
   *
   * @async
   * @param {object} db - A database client that can perform queries from the mysql2 module.
   * @param {number} stateId - The state ID for the route number.
   * @param {number} type - A routeEnum value of the HPMS route signing type.
   * @param {string} routeNum - The route number to get the points of.
            A few route numbers are alphanumeric (14U in California) so they are supported.
   * @param {string} dir - The direction of the route, either 'N', 'E', 'S', or 'W'.
   * @return {Promise} Returns a promise that resolves with an Array of objects, each containing
   *         the data and an array of coordinates for each segment.
   */
  static async getPointsForRoute(db, stateId, type, routeNum, dir) {
    const keyQuery = `SELECT id, direction as dir FROM segments WHERE route_num = ? AND state_key = ? AND type = ?${dir ? ' AND direction = ?' : ''};`;
    const args = dir ? [routeNum, stateId, type, dir] : [routeNum, stateId, type];
    const keys = await db.query(keyQuery, args).then((result) => result[0]);
    if (keys.length === 0) {
      return [];
    }
    const routeSegments = keys.map(
      (key) => (dir !== undefined ? { id: key.id } : { dir: key.dir, id: key.id }),
    );
    const combinedQuery = keys.map((key) => `SELECT TRUNCATE(lat, 7) as lat, TRUNCATE(lon, 7) as lon FROM points WHERE segment_key = ${key.id}`);
    return Models.processPointQueries(db, [...combinedQuery, ''], routeSegments);
  }

  /**
   * Queries for all concurrencies for a given route.
   * @async
   * @param {object} db - A database client that can perform queries from the mysql2 module.
   * @param {number} stateId - The state ID for the route number.
   * @param {string} routeNum - The route to get the points of that is concurrent with other
            routes. In some states, this is the route that gets the discontinuity.
   * @param {string} dir - The direction of the route, either 'N', 'E', 'S', or 'W'.
   * @return {Promise} Returns a promise that resolves with an Array of objects, each containing
   *         the data and an array of coordinates for each route segment.
   *         The route segments represented by the points could be from different routes.
   */
  static async getPointsForConcurrencies(db, stateId, routeNum, dir) {
    const routeSegmentQuery = 'SELECT id FROM segments WHERE route_num = ? AND state_key = ? AND direction = ?';
    const rte1Segments = await db.execute(routeSegmentQuery, [routeNum, stateId, dir])
      .then((result) => result[0].map((routeSeg) => routeSeg.id));
    if (rte1Segments.length === 0) {
      return [];
    }
    const concurrencies = await db.query('SELECT * FROM concurrencies WHERE first_seg IN (?)', [rte1Segments])
      .then((result) => result[0]);
    if (concurrencies.length === 0) {
      return [];
    }
    const rte2Segments = await db.query('SELECT id, base FROM segments WHERE id IN (?)', [concurrencies.map((con) => con.rte2_seg)])
      .then((result) => result[0]);
    const routeSegmentBaseMap = {};
    rte2Segments.forEach((routeSeg) => {
      routeSegmentBaseMap[routeSeg.id] = routeSeg.base;
    });
    const routeSegments = concurrencies.map((con) => ({ id: con.rte2_seg }));
    const combinedQuery = concurrencies.map((con) => `SELECT TRUNCATE(lat, 7) as lat, TRUNCATE(lon, 7) as lon FROM points
       WHERE segment_key = ${con.rte2_seg} AND id >= ${routeSegmentBaseMap[con.rte2_seg] + con.start_pt}
       AND id <= ${routeSegmentBaseMap[con.rte2_seg] + con.end_pt}`);
    return Models.processPointQueries(db, combinedQuery, routeSegments);
  }

  /**
   * Queries all existing users.
   * @param {object} db - A database client that can perform queries from the mysql2 module.
   * @return {Promise} A promise that resolves with all existing usernames and their IDs.
   */
  static getUsers(db) {
    return db.execute('SELECT * FROM users;')
      .then((result) => result[0])
      .catch((err) => { console.error(err); });
  }

  /**
   * Queries all travel segments by username.
   * @param {object} db - A database client that can perform queries from the mysql2 module.
   * @param {string} username - The username that the travel segments belong to.
   * @return {Promise} Returns a promise that resolves with an Array of objects, each containing
   *         the data and an array of coordinates for each travel segment.
   */
  static getTravelSegmentsBy(db, username) {
    return db.execute('SELECT * FROM users WHERE user = ?;', [username])
      .then((result) => {
        if (result[0].length < 0) {
          return [];
        }
        return db.execute('SELECT segment_id as routeSegmentId, clinched, start_id as startId, end_id as endId FROM user_segments WHERE user_id = ?;', [result[0][0].id])
          .then(
            (travelSegResult) => {
              const [travelSegmentData] = travelSegResult;
              if (travelSegmentData.length < 0) {
                return [];
              }
              return Models.getPointsByUser(db, travelSegmentData.map((travelSeg) => ({
                ...travelSeg,
                clinched: travelSeg.clinched === 1,
              })));
            },
          );
      })
      .catch((err) => { console.error(err); });
  }

  /**
   * Inserts a user into the database, if the username is not already taken.
   * @param {object} db - A database client that can perform queries from the mysql2 module.
   * @param {string} username - The username to check and insert if not already taken.
   * @return {Promise} Returns a promise that resolves with whether the user creation was
   *         successful. If so, the new user ID is also returned, otherwise the ID of
   *         an existing user is returned.
   */
  static createUser(db, username) {
    return db.execute('SELECT * FROM users WHERE user = ?;', [username])
      .then((result) => {
        if (result[0].length) {
          return { success: false, userId: result[0][0].id };
        }
        return db.query('INSERT INTO users (user) VALUES (?);', [username])
          .then((insertResult) => ({ success: true, userId: insertResult[0].insertId }));
      })
      .catch((err) => { console.error(err); });
  }

  /**
   * Inserts travel segment data to the database, and calculates and inserts any travel segments
   * due to a highway concurrency.
   *
   * @async
   * @param {object} db - A database client that can perform queries from the mysql2 module.
   * @param {number} userId - The ID of the user the new travel segments are meant for.
   * @param {object[]} travelSegments - An array of travel segment data from the client.
   * @return {Promise} A promise that resolves with the result of the insert query. Used to obtain
             the number of travel segments inserted.
   */
  static async createTravelSegment(db, userId, travelSegments) {
    const travelSegArgs = travelSegments.map(
      (travelSeg) => [
        userId,
        travelSeg.routeSegmentId,
        travelSeg.clinched ? 1 : 0,
        travelSeg.startId,
        travelSeg.endId,
      ],
    );
    const travelSegmentMap = travelSegments.reduce(
      (accum, travelSeg) => ({ ...accum, [travelSeg.routeSegmentId]: travelSeg }),
      {},
    );
    const routeSegmentDataMap = await db.query('SELECT * FROM segments WHERE id IN (?);', [Object.keys(travelSegmentMap)])
      .then((result) => result[0])
      .then((data) => data.reduce((accum, curr) => ({ ...accum, [curr.id]: curr }), {}));
    const concurrencyData = await db.query('SELECT * FROM concurrencies WHERE first_seg IN (?);', [Object.keys(travelSegmentMap)])
      .then((result) => result[0]);
    const additionalTravelSegments = [];
    for (const concurrency of concurrencyData) {
      const isMainlineWithMainline = concurrency.first_seg < concurrency.last_seg;
      const routeSegmentId = isMainlineWithMainline ? concurrency.first_seg : concurrency.last_seg;
      const secondId = isMainlineWithMainline ? concurrency.last_seg : concurrency.first_seg;
      if (
        travelSegmentMap[routeSegmentId].endId === routeSegmentDataMap[routeSegmentId].len &&
        travelSegmentMap[secondId] && travelSegmentMap[secondId].startId === 0
      ) {
        additionalTravelSegments.push(
          [userId, concurrency.rte2_seg, 0, concurrency.start_pt, concurrency.end_pt],
        );
      }
    }
    return db.query('INSERT INTO user_segments (user_id, segment_id, clinched, start_id, end_id) VALUES ?;', [travelSegArgs.concat(additionalTravelSegments)])
      .then((result) => result[0])
      .catch((err) => { console.error(err); });
  }

  /**
   * Helper function that executes queries on the points table and combines the result to a
   * single array.
   *
   * @async
   * @param {object} db - A database client that can perform queries from the mysql2 module.
   * @param {string[]} queries - Array that contains query strings, one for each route segment.
   * @param {object[]} routeSegments - Array of all data for each route segment being queried.
   * @return {Promise} Returns a promise that resolves with an Array of objects, each containing
   *         the data and an array of coordinates for each route segment.
   */
  static async processPointQueries(db, queries, routeSegments) {
    const pointArrays = await db.query(queries.join('; '))
      .then((result) => result[0])
      .then((result) => {
        if (Array.isArray(result[0])) { // Data Packet or array?
          return result.map((arr) => arr.map((point) => [point.lat, point.lon]));
        }
        return [result.map((point) => [point.lat, point.lon])]; // Always treat result as 2D array
      })
      .catch((err) => { console.error(err); });
    for (let i = 0; i < pointArrays.length; i += 1) {
      routeSegments[i].points = pointArrays[i];
    }
    return routeSegments;
  }

  /**
   * Helper function that queries for all travel statistics and segments created by a given user.
   * @async
   * @param {object} db - A database client that can perform queries from the mysql2 module.
   * @param {object[]} travelSegData - Array of row objects from the travel segments table.
   * @return {Promise} Returns a promise that resolves with an object with an array of statistics
   *         of a given route segment and an array of objects with segment and coordinate data.
   */
  static async getPointsByUser(db, travelSegData) {
    if (travelSegData.length === 0) {
      return {
        travelSegments: [],
        travelStats: [],
      };
    }
    const queries = [];
    for (const obj of travelSegData) {
      // Get the base point ID for the route segment, then calculate the start and end IDs
      const { endId, routeSegmentId, startId } = obj;
      const base = await db.execute('SELECT base FROM segments WHERE id = ?;', [routeSegmentId]).then((result) => result[0][0].base);
      const pointStartID = base + startId;
      const pointEndID = base + endId;
      const queryBase = `SELECT lat, lon FROM points WHERE segment_key = ${routeSegmentId}`;
      queries.push(`${queryBase} AND id >= ${pointStartID} AND id <= ${pointEndID}`);
    }
    const travelSegments = await Models.processPointQueries(db, [...queries, ''], travelSegData);
    const travelStats = await Models.calcStats(db, travelSegments);
    return { travelStats, travelSegments };
  }

  /**
   * Helper function to calculate the travel statistics from travel segments.
   * @async
   * @param {object} db - A database client that can perform queries from the mysql2 module.
   * @param {object[]} travelSegments - Array of objects, each containing the data and an
   *        array of coordinates for each route segment traveled by the user.
   * @return {Promise} Returns a promise that resolves with an array of objects representing
   *         travel statistics.
   */
  static async calcStats(db, travelSegments) {
    const stats = [];
    for (const travelSeg of travelSegments) {
      const routeSegment = await db.execute('SELECT * FROM segments WHERE id = ?', [travelSeg.routeSegmentId]).then((result) => result[0][0]);
      const {
        // eslint-disable-next-line @typescript-eslint/naming-convention
        len_m, state_key, route_num, segment_num,
      } = routeSegment;
      const state = await db.execute('SELECT * FROM states WHERE id = ?', [state_key]).then((result) => result[0][0].initials);
      let total = len_m;
      let metersTraveled = Utils.calcSegmentDistance(travelSeg.points);

      // Truncate to two decimal points
      metersTraveled = ~~(metersTraveled * 100) / 100;
      total = ~~(total * 100) / 100;
      const percentage = ~~((metersTraveled / total) * 10000) / 100;

      stats.push({
        state,
        route: route_num,
        routeSegment: segment_num + 1,
        traveled: metersTraveled,
        total,
        percentage,
      });
    }
    return stats;
  }
}

/** @module highwayDAO */
export default Models;
