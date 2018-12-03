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
      dir: `'${feature.properties.DIR}'`
    };

    let num = await db.queryAsync(`INSERT INTO ${ROUTES} (route, direction, state_key) VALUES (${route.num}, ${route.dir}, ${stateKey});`).then(res => res[0].insertId);
    let isSingleCurve = feature.geometry.type === 'LineString';

    // The curve is either in a single array or multiple arrays
    let newPoints = isSingleCurve ? feature.geometry.coordinates.map(tup => { 
      return { route: num, lat: tup[1], lon: tup[0] };
    }) : [];

    // Spread multiple arrays into one
    if (!isSingleCurve) {
      let temp = feature.geometry.coordinates.map(lineArr => lineArr.map(tup => { 
        return { route: num, lat: tup[1], lon: tup[0] };
      }));

      for (let i = 0; i < temp.length; i++) {
        newPoints.push(...temp[i]);
      }
    }

    newPoints = newPoints.map(obj => `(${obj.route}, ${obj.lat}, ${obj.lon})`);

    // Insert all rows by using commas
    await db.queryAsync(`INSERT INTO ${POINTS} (route_key, lat, lon) VALUES ${newPoints.join()};`);
    console.log(`Seeded ${newPoints.length} points`);
  }
};

// Check if the database is empty before populating it with mock data.
// Remember that the results will be a 2D array, first element has actual results
module.exports = db => db.queryAsync('SELECT * FROM states')
  .then(results => (results[0].length === 0 ? seedData(db) : undefined));
