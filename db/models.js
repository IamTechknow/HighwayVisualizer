// Static methods for database interactions
class Models {
  static getStates(db) {
    return db.queryAsync('SELECT * FROM states;')
      .then((result) => result[0])
      .catch((err) => { console.error(err); });
  }

  static getRoutesBy(db, stateId) {
    return db.queryAsync('SELECT * FROM routes WHERE state_key = ?;', [stateId])
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
