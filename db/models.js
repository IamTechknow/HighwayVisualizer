const Utils = require('./Utils.js');

// Module level caches
const stateCache = {};

// Static methods for database interactions
class Models {
  static getStates(db) {
    return db.queryAsync('SELECT * FROM states;')
      .then((result) => result[0])
      .catch((err) => { console.error(err); });
  }

  // Select by sorting the segments by route number
  static getSegmentsBy(db, stateId) {
    return db.queryAsync('SELECT id, route_num as routeNum, type, segment_num AS segNum, direction AS dir, len, len_m FROM segments WHERE state_key = ? ORDER BY CAST(route_num as unsigned);', [stateId])
      .then((result) => result[0])
      .catch((err) => { console.error(err); });
  }

  static async processPointQueries(db, queries, segments) {
    let result = await db.queryAsync(queries.join('; '))
      .then((result) => result[0])
      .then((result) => {
        if (Array.isArray(result[0])) { // Data Packet or array?
          return result.map(arr => arr.map(point => [point.lat, point.lon]));
        } else {
          return [result.map(point => [point.lat, point.lon])]; // Always treat result as 2D array
        }
      })
      .catch((err) => { console.error(err); });

    for (var i = 0; i < result.length; i++) {
      segments[i].points = result[i];
    }

    return segments;
  }

  static async getPointsForSegment(db, segmentId) {
    const query = 'SELECT TRUNCATE(lat, 7) as lat, TRUNCATE(lon, 7) as lon FROM points WHERE segment_key = ' + segmentId;
    return Models.processPointQueries(db, [query, ''], [{id: segmentId}]);
  }

  static async getPointsForRoute(db, stateId, type, routeNum, dir) {
    const keyQuery = `SELECT id, direction as dir FROM segments WHERE route_num = ? AND state_key = ? AND type = ?${dir ? ' AND direction = ?' : ''};`;
    const args = dir ? [routeNum, stateId, type, dir] : [routeNum, stateId, type];
    const keys = await db.queryAsync(keyQuery, args).then((result) => result[0]);

    const segments = keys.map(key => {
      return dir !== undefined ? {id: key.id} : {dir: key.dir, id: key.id};
    });
    const combinedQuery = keys.map(key => 'SELECT TRUNCATE(lat, 7) as lat, TRUNCATE(lon, 7) as lon FROM points WHERE segment_key = ' + key.id);
    combinedQuery.push(''); // Allow last semicolon to be added
    return Models.processPointQueries(db, combinedQuery, segments);
  }

  // Helper function to get point data from user segments
  static async getPointsByUser(db, userSegs) {
    const queries = [];

    for (let obj of userSegs) {
      // Get the base point ID for the segment, then calculate the start and end IDs
      const base = await db.queryAsync('SELECT base FROM segments WHERE id = ?;', [obj.segment_id]).then((result) => result[0][0].base);
      const start_id = base + obj.start_id, end_id = base + obj.end_id;
      const queryBase = 'SELECT lat, lon FROM points WHERE segment_key = ' + obj.segment_id;
      queries.push(queryBase + ` AND id >= ${start_id} AND id <= ${end_id}`);
    }
    queries.push('');
    const userSegments = await Models.processPointQueries(db, queries, userSegs);

    // Calculate statistics - user travelled
    const stats = await Models.calcStats(db, userSegs, userSegments);
    return {stats, userSegments};
  }

  static getUsers(db) {
    return db.queryAsync('SELECT * FROM users;')
      .then((result) => result[0])
      .catch((err) => { console.error(err); });
  }

  static getUserSegmentsBy(db, username) {
    return db.queryAsync('SELECT * FROM users WHERE user = ?;', [username])
      .then((result) => {
        if (result[0].length) {
          return db.queryAsync('SELECT * FROM user_segments WHERE user_id = ?;', [result[0][0].id])
            .then((userSegResult) => userSegResult[0].length ? Models.getPointsByUser(db, userSegResult[0]) : false)
        } else {
          return false;
        }
      })
      .catch((err) => { console.error(err); });
  }

  // Check if the user already exists
  static createUser(db, username) {
    return db.queryAsync('SELECT * FROM users WHERE user = ?;', [username])
      .then((result) => {
        if (result[0].length) {
          return { success: false, userId: result[0][0].id };
        }

        return db.queryAsync('INSERT INTO users (user) VALUES (?);', [username])
          .then((result) => { return { success: true, userId: result[0].insertId }; });
      })
      .catch((err) => { console.error(err); });
  }

  static createUserSegment(db, userId, userSegments) {
    const userSegArgs = userSegments.map(seg => [userId, seg.segmentId, seg.clinched ? 1 : 0, seg.startId, seg.endId]);
    return db.queryAsync('INSERT INTO user_segments (user_id, segment_id, clinched, start_id, end_id) VALUES ?;', [userSegArgs])
      .then((result) => result[0])
      .catch((err) => { console.error(err); });
  }

  static async calcStats(db, segData, userSegments) {
    let stats = [];

    for (let seg of userSegments) {
      let metersTraveled = Utils.calcSegmentDistance(seg.points);
      let segment = await db.queryAsync('SELECT * FROM segments WHERE id = ?', [seg.segment_id]).then((result) => result[0][0]);
      let total = segment.len_m;

      let state;
      if (!stateCache[segment.state_key]) {
        stateCache[segment.state_key] = await db.queryAsync('SELECT * FROM states WHERE id = ?', [segment.state_key]).then((result) => result[0][0].initials);
      }
      state = stateCache[segment.state_key];

      // Truncate to two decimal points
      metersTraveled = ~~(metersTraveled * 100) / 100;
      total = ~~(total * 100) / 100;
      const percentage = ~~((metersTraveled / total) * 10000) / 100

      stats.push({ state, route: segment.routeNum, segment: segment.segment_num + 1, traveled: metersTraveled, total, percentage });
    }

    return stats;
  }
}

module.exports = Models;
