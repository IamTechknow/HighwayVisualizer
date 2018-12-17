// Static methods for database interactions
class Models {
  static getStates(db) {
    return db.queryAsync('SELECT * FROM states;')
      .then((result) => result[0])
      .catch((err) => { console.error(err); });
  }

  // Select by sorting the routes, casting them as integers
  static getRoutesBy(db, stateId) {
    return db.queryAsync('SELECT id, route, segment AS seg, direction AS dir FROM routes WHERE state_key = ? ORDER BY CAST(route as unsigned);', [stateId])
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

  // Select all points for a route. Returns a promise for a 2D array of segment arrays
  // due to async keyword
  static async getPointsBy(db, route, dir, getAll) {
    // Get all route keys. For each key, get the polyline.
    let keys = [{id: route}];
    if (getAll) { // route is route number, not a segment ID
      keys = await db.queryAsync('SELECT id FROM routes WHERE route = ? AND direction = ?;', [route, dir]).then((result) => result[0]);
    }

    // Use multiple queries to grab all the data at once!
    let combinedQuery = [], segments = [];
    for (let key of keys) { // Each Key is an object with our desired field
      segments.push({id: key.id});
      combinedQuery.push('SELECT lat, lon FROM points WHERE route_key = ' + key.id);
    }
    combinedQuery.push(''); // Allow last semicolon to be added
    return Models.processPointQueries(db, combinedQuery, segments);
  }

  // Helper function to get point data from user segments
  static async getPointsByUser(db, userSegs) {
    const queries = [];

    for (let obj of userSegs) {
      const queryBase = 'SELECT lat, lon FROM points WHERE route_key = ' + obj.route_id;
      queries.push(queryBase + ` AND id >= ${obj.start_id} AND id <= ${obj.end_id}`);
    }
    queries.push('');
    return Models.processPointQueries(db, queries, userSegs);
  }

  static getUsers(db) {
    return db.queryAsync('SELECT * FROM users;')
      .then((result) => result[0])
      .catch((err) => { console.error(err); });
  }

  static getUserSegmentsBy(db, userId) {
    return db.queryAsync('SELECT * FROM segments WHERE user_id = ?;', [userId])
      .then((result) => result[0].length ? Models.getPointsByUser(db, result[0]) : [])
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

  static createUserSegment(db, userId, segments) {
    segments = segments.map(obj => `(${userId}, ${obj.routeId}, ${obj.clinched ? 1 : 0}, ${obj.startId}, ${obj.endId})`);
    return db.queryAsync(`INSERT INTO segments (user_id, route_id, clinched, start_id, end_id) VALUES ${segments.join()};`)
      .then((result) => result[0])
      .catch((err) => { console.error(err); });
  }
}

module.exports = Models;
