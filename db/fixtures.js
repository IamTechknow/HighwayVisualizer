// Populate the database with GIS data.
// Parse the shapefile to GeoJSON, then extract data for the state, route, and coordinates for each route.
const fs = require('fs').promises;
const shapefile = require('shapefile');

const CA_DATA = 'db/ca.shp', CA_DB = 'db/ca.dbf';
const STATES = 'states', ROUTES = 'routes', POINTS = 'points';

const seedData = async (db) => {
  let features = await shapefile.read(CA_DATA, CA_DB).then(collection => collection.features);
  let stateKey = await db.queryAsync(`INSERT INTO ${STATES} (name, initials) VALUES ("California", "CA")`).then(res => res[0].insertId);

  for (let feature of features) {
    let route = {
      num: `'${feature.properties.ROUTE}'`,
      dir: `'${feature.properties.DIR}'`,
      seg: 0
    };

    // The curve is either in a single array or multiple arrays
    let isSingleCurve = feature.geometry.type === 'LineString';

    // Insert each array as its own route
    if (!isSingleCurve) {
      for (let i = 0; i < feature.geometry.coordinates.length; i++) {
        let num = await db.queryAsync(`INSERT INTO ${ROUTES} (route, segment, direction, state_key) VALUES (${route.num}, ${route.seg}, ${route.dir}, ${stateKey});`).then(res => res[0].insertId);

        let temp = feature.geometry.coordinates[i].map(tup => {
          return { route: num, lat: tup[1], lon: tup[0] };
        });
        temp = temp.map(obj => `(${obj.route}, ${obj.lat}, ${obj.lon})`);

        await db.queryAsync(`INSERT INTO ${POINTS} (route_key, lat, lon) VALUES ${temp.join()};`);
        route.seg += 1;
        console.log(`Seeded ${temp.length} points`);
      }
    } else {
      let num = await db.queryAsync(`INSERT INTO ${ROUTES} (route, segment, direction, state_key) VALUES (${route.num}, ${route.seg}, ${route.dir}, ${stateKey});`).then(res => res[0].insertId);
      let newPoints = feature.geometry.coordinates.map(tup => {
        return { route: num, lat: tup[1], lon: tup[0] };
      });
      newPoints = newPoints.map(obj => `(${obj.route}, ${obj.lat}, ${obj.lon})`);

      // Insert all rows by using commas
      await db.queryAsync(`INSERT INTO ${POINTS} (route_key, lat, lon) VALUES ${newPoints.join()};`);
      console.log(`Seeded ${newPoints.length} points`);
    }
  }

  console.log('Creating indices...');
  return db.queryAsync('CREATE INDEX POINT_IDX ON points (route_key); CREATE INDEX ROUTE_IDX on routes (route(4), direction(1));');
};

// Check if the database is empty before populating it with mock data.
// Remember that the results will be a 2D array, first element has actual results
module.exports = db => db.queryAsync('SELECT * FROM states')
  .then(results => (results[0].length === 0 ? seedData(db) : undefined));
