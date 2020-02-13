const fs = require('fs').promises;
const shapefile = require('shapefile');
const Utils = require('./Utils.js');

const CA_DATA = 'db/SHN_Lines.shp', CA_DB = 'db/SHN_Lines.dbf';
const STATES = 'states', ROUTES = 'routes', POINTS = 'points';

const seedData = async (db) => {
  const features = await shapefile.read(CA_DATA, CA_DB).then(collection => collection.features);
  const stateID = await db.queryAsync(`INSERT INTO ${STATES} (name, initials) VALUES ("California", "CA")`).then(res => res[0].insertId);
  let basePointID = 0;

  // Can't use Promise.all as we need to insert synchronously
  for (let feature of features) {
    const routeNum = `'${feature.properties.ROUTE}'`;
    const dir = `'${feature.properties.DIR}'`;
    // The curve is either in a single array or multiple arrays
    if (feature.geometry.type !== 'LineString') {
      for (let i = 0; i < feature.geometry.coordinates.length; i += 1) {
        const len = feature.geometry.coordinates[i].length;
        const routeID = await db.queryAsync(`INSERT INTO ${ROUTES} (route, segment, direction, state_key, len, base) VALUES (${routeNum}, ${i}, ${dir}, ${stateID}, ${len}, ${basePointID});`).then(res => res[0].insertId);
        await processCoordinates(db, routeID, feature.geometry.coordinates[i]);
        basePointID += len;
      }
    } else {
      const len = feature.geometry.coordinates.length;
      const routeID = await db.queryAsync(`INSERT INTO ${ROUTES} (route, segment, direction, state_key, len, base) VALUES (${routeNum}, 0, ${dir}, ${stateID}, ${len}, ${basePointID});`).then(res => res[0].insertId);
      await processCoordinates(db, routeID, feature.geometry.coordinates);
      basePointID += len;
    }
  }

  console.log('Creating indices...');
  return db.queryAsync(`CREATE INDEX POINT_IDX ON ${POINTS} (route_key);`)
    .then(res => db.queryAsync(`CREATE INDEX ROUTE_IDX on ${ROUTES} (route(4), direction(1));`));
};

const processCoordinates = async (db, routeID, coords) => {
  const items = coords.map(tup => [routeID, tup[1], tup[0]]);
  const lenInMeters = Utils.calcSegmentDistance(coords.map(tup => [tup[1], tup[0]]));
  await db.queryAsync(`UPDATE ${ROUTES} SET len_m = ${lenInMeters} WHERE id = ${routeID};`);
  await db.queryAsync(`INSERT INTO ${POINTS} (route_key, lat, lon) VALUES ?;`, [items]);
  console.log(`Seeded route with ID ${routeID} with ${items.length} points, length = ${lenInMeters}m`);
}

// Check if the database is empty before populating it with mock data.
// Remember that the results will be a 2D array, first element has actual results
module.exports = db => db.queryAsync(`SELECT * FROM ${STATES}`)
  .then(results => (results[0].length === 0 ? seedData(db) : undefined));
