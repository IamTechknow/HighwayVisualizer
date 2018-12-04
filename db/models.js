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

    let result = [];
    for (let key of keys) { // Each Key is an object with our desired field
      let segment = {id: key.id};
      segment.points = await db.queryAsync('SELECT lat, lon FROM points WHERE route_key = ?;', [key.id])
        .then((result) => result[0])
        .then((result) => result.map(point => [point.lat, point.lon]))
        .catch((err) => { console.error(err); });
      result.push(segment);
    }
    return result;
  }

  static getUsers() {
    return db.queryAsync('SELECT * FROM users;')
      .then((result) => result[0])
      .catch((err) => { console.error(err); });
  }

  static createUser(username) {
    return db.queryAsync('INSERT INTO users (user) VALUES (?);', [username])
      .then((result) => result[0])
      .catch((err) => { console.error(err); });
  }

  static createUserSegment(db, userId, routeId, clinched, coords) {
    return db.queryAsync('INSERT INTO segments (user_id, route_id, clinched, start_lat, start_long, end_lat, end_long) VALUES (?, ?, ?, ?, ?, ?);', [userId, routeId, clinched, ...coords])
      .then((result) => result[0])
      .catch((err) => { console.error(err); });
  }
}

module.exports = Models;
