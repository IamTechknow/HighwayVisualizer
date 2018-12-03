// Static methods for database interactions
class Models {
  static getStates(db) {
    return db.queryAsync('SELECT * FROM states;')
      .then((result) => result[0])
      .catch((err) => { console.error(err); });
  }

  // Select by sorting the routes, casting them as integers
  static getRoutesBy(db, stateId) {
    return db.queryAsync('SELECT id, route, direction AS dir FROM routes WHERE state_key = ? ORDER BY CAST(route as unsigned);', [stateId])
      .then((result) => result[0])
      .catch((err) => { console.error(err); });
  }

  static getPointsBy(db, routeId) {
    return db.queryAsync('SELECT lat, lon FROM points WHERE route_key = ?;', [routeId])
      .then((result) => result[0])
      .then((result => result.map(point => [point.lat, point.lon])))
      .catch((err) => { console.error(err); });
  }
}

module.exports = Models;
