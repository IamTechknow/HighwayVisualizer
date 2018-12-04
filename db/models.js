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
    combinedQuery.push('');

    let result = await db.queryAsync(combinedQuery.join('; '))
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

  static getUsers(db) {
    return db.queryAsync('SELECT * FROM users;')
      .then((result) => result[0])
      .catch((err) => { console.error(err); });
  }

  static createUser(db, username) {
    return db.queryAsync('INSERT INTO users (user) VALUES (?);', [username])
      .then((result) => result[0])
      .catch((err) => { console.error(err); });
  }

  static createUserSegment(db, userId, segments) {
    segments = segments.map(obj => `(${userId}, ${obj.routeId}, ${obj.clinched ? 1 : 0}, ${obj.points[0]}, ${obj.points[1]})`);
    return db.queryAsync(`INSERT INTO segments (user_id, route_id, clinched, start_lat, start_lon, end_lat, end_lon) VALUES ${segments.join()};`)
      .then((result) => result[0])
      .catch((err) => { console.error(err); });
  }
}

module.exports = Models;
