/*
  The direction of a freeway may be indicated by Facility_T. 2 means inventory direction, 6 means non-inventory

  General approach to parse FHWA shapefile:

  For all features
	  decide whether to filter out
	  Push feature object into an array which is a value with route number as key

  For each key in the object
    Sort array by begin_poin then route_id with comparator? Also in the comparator record all route ids into a set

	For each route, Determine the direction and ordering of the coordinates
    Make a new object and place each feature to an array whose key is the route ID

  Convert the object to an array and Sort the arrays of the object by checking the coordinates for the first and last elements of both arrays
  (for simplicity, skip all IDs ending with A and all Facility_T === 6)
*/

const mysql = require('mysql');
const Promise = require('bluebird');
const shapefile = require('shapefile');
const Utils = require('./Utils.js');

const STATES = 'states', ROUTES = 'routes', POINTS = 'points';

// Determine whether to exclude a feature. It's possible for a feature to not have a geometry
const filterOutFeature = (feature) => {
  // Exclude features in DC that with route IDs ending in A
  const routeId = feature.properties.Route_ID;
  if (feature.properties.State_Code === 11 && routeId[routeId.length - 1] === 'A') {
    return true;
  }

  return feature.geometry.coordinates.length === 0 ||
    feature.properties.Route_Numb === 0 || feature.properties.Facility_T === 6;
};

// FIXME: Some routes are not sorted correctly and thus look weird
const calcDir = (left, right) => {
  let pLeftFirst = left.geometry.coordinates[0], pRightLast = right.geometry.coordinates[0];

  // Determine whether to compare north or east based on whether the x_delta or y_delta is bigger.
  // Data has not been processed fully, remember that coordinates come as LngLat
  let xDelta = pLeftFirst[1] - pRightLast[1], yDelta = pLeftFirst[0] - pRightLast[0];

  // return whether the left element should be closer to the south/west, should be if delta is negative.
  return Math.abs(xDelta) > Math.abs(yDelta) ? { delta: xDelta, dir: 'E'} : { delta: yDelta, dir: 'N'};
};

const seedData = async (db, args) => {
  const [stateName, stateInitials, SHP_FILE, DBF_FILE] = args.slice(2);
  let features = await shapefile.read(SHP_FILE, DBF_FILE).then(collection => collection.features);
  let stateKey = await db.queryAsync(`INSERT INTO ${STATES} (name, initials) VALUES ("${stateName}", "${stateInitials}");`).then(res => res[0].insertId);
  let allData = {};
  let base = await db.queryAsync('SELECT COUNT(*) FROM points;').then(res => res[0][0]['COUNT(*)']); // get current points table count

  for (let feature of features) {
    if (filterOutFeature(feature)) {
      continue;
    }

    // HACK: Be wary if a multi line feature occurs. There is one in the DC shapefile even though it shouldn't be there. Sanitize it
    if (feature.geometry.type === 'MultiLineString') {
      console.log('Found multi line string, sanitizing...');
      feature.geometry.coordinates = feature.geometry.coordinates[0];
    }

    if (allData[feature.properties.Route_Numb]) {
      allData[feature.properties.Route_Numb].push(feature);
    } else {
      allData[feature.properties.Route_Numb] = [feature];
    }
  }

  // Sort first by Route ID, then to make it stable, sort by route ID and then begin_poin
  // The Route ID can be a number string, in other cases it is alphanumeric
  for (let route in allData) {
    allData[route] = allData[route].sort((left, right) => {
      return left.properties.Route_ID.localeCompare(right.properties.Route_ID);
    });

    allData[route] = allData[route].sort((left, right) => {
      if (left.properties.Route_ID === right.properties.Route_ID) {
        return left.properties.Begin_Poin - right.properties.Begin_Poin;
      }

      return left.properties.Route_ID.localeCompare(right.properties.Route_ID);
    });

    // Put all the route IDs into a new object. Then sort them
    let routeIds = {};
    for (let feature of allData[route]) {
      if (routeIds[feature.properties.Route_ID]) {
        routeIds[feature.properties.Route_ID].push(feature);
      } else {
        routeIds[feature.properties.Route_ID] = [feature];
      }
    }

    let finalArray = Object.values(routeIds).sort((left, right) => {
      return calcDir(left[0], right[right.length - 1]).delta;
    });

    // Insert into DB
    const dir = calcDir(finalArray[0][0], finalArray[finalArray.length - 1][0]).dir;
    let routeObj = {
      num: `'${route}'`,
      dir: `'${dir}'`,
      seg: 0
    };

    for (let segment of finalArray) {
      let totalLen = 0;
      let coords = [];
      let num = await db.queryAsync(`INSERT INTO ${ROUTES} (route, segment, direction, state_key, base) VALUES (${routeObj.num}, ${routeObj.seg}, ${routeObj.dir}, ${stateKey}, ${base});`).then(res => res[0].insertId);

      for (let feature of segment) {
        coords = coords.concat(feature.geometry.coordinates);
      }
      totalLen += coords.length;
      base += coords.length;

      let newPoints = coords.map(tup => {
        return { route: num, lat: tup[1], lon: tup[0] };
      });
      newPoints = newPoints.map(obj => `(${obj.route}, ${obj.lat}, ${obj.lon})`);
      const len_meters = Utils.calcSegmentDistance(coords.map(tup => [tup[1], tup[0]]));

      // Insert all rows by using commas
      await db.queryAsync(`UPDATE ${ROUTES} SET len = ${totalLen}, len_m = ${len_meters} WHERE id = ${num};`);
      await db.queryAsync(`INSERT INTO ${POINTS} (route_key, lat, lon) VALUES ${newPoints.join()};`);

      console.log(`Seeded route ${route} with ${newPoints.length} points, length = ${len_meters}`);
      routeObj.seg += 1;
    }
  }
};

const connection = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '',
});

// Use promisification on the MySQL database connection
const db = Promise.promisifyAll(connection, { multiArgs: true });
db.connectAsync()
  .then(() => db.queryAsync('USE highways;'))
  .then(() => seedData(db, process.argv))
  .then(() => db.end())
  .catch(err => {
    console.log(err);
    db.end();
  });

