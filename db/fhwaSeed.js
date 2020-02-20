/*
  General approach to parse FHWA shapefile:

  For all features
	  decide whether to filter out
	  Push feature object into an array which is a value with route number as key

  For each key in the object
    Sort array by begin_poin then route_id with comparator? Also in the comparator record all route ids into a set

	For each route, Determine the direction and ordering of the coordinates
    Make a new object and place each feature to an array whose key is the route ID

  Convert the object to an array and Sort the arrays of the object by checking the coordinates for the first and last elements of both arrays
  (for simplicity, skip all IDs ending with A)
*/

const DB = require('.');
const shapefile = require('shapefile');
const Utils = require('./Utils.js');

const STATES = 'states', SEGMENTS = 'segments', POINTS = 'points';

// Codes defined in Chapter 4 of the HPMS Field Manual
const COUNTY_OWNER_CODE = 2, TOWN_OWNER_CODE = 3, CITY_OWNER_CODE = 4, PRIVATE_OWNER_CODE = 26;
const DC_STATE_CODE = 11, MARYLAND_STATE_CODE = 24;
const NON_INVENTORY_FACILITY_CODE = 6;

const filterOutFeature = (feature) => {
  const ownerId = feature.properties.Ownership;
  if (
    ownerId === COUNTY_OWNER_CODE || ownerId === TOWN_OWNER_CODE ||
    ownerId === CITY_OWNER_CODE || ownerId === PRIVATE_OWNER_CODE
  ) {
    return true;
  }

  // Exclude features in DC that with route IDs ending in A
  const routeId = feature.properties.Route_ID;
  if (feature.properties.State_Code === DC_STATE_CODE && routeId[routeId.length - 1] === 'A') {
    return true;
  }

  // Exclude county and gov routes in Maryland due to route duplication
  if (feature.properties.State_Code === MARYLAND_STATE_CODE) {
    if (!feature.properties.Route_Name) {
      return true;
    }

    const routeNum = feature.properties.Route_Name;
    if ((routeNum[0] === 'M' && routeNum[1] === 'U') || (routeNum[0] === 'C' && routeNum[1] === 'O')
      || (routeNum[0] === 'O' && routeNum[1] === 'P') || (routeNum[0] === 'G' && routeNum[1] === 'V')
      || (routeNum[0] === 'S' && routeNum[1] === 'R')) {
      return true;
    }

    // Exclude non-mainline routes that end with a letter
    if (routeNum[routeNum.length - 1] > '9') {
      return true;
    }
  }

  // Exclude features without points, local roads, ramps, and non-mainline facilities
  return feature.geometry.coordinates.length === 0 ||
    feature.properties.Route_Numb === 0;
};

const calcDir = (left, right) => {
  let pLeftFirst = left.geometry.coordinates[0], pRightLast = right.geometry.coordinates[0];

  // Determine whether to compare north or east based on whether the x_delta or y_delta is bigger.
  // Data has not been processed fully, remember that coordinates come as LngLat
  let xDelta = pLeftFirst[1] - pRightLast[1], yDelta = pLeftFirst[0] - pRightLast[0];

  // return whether the left element should be closer to the south/west, should be if delta is negative.
  return Math.abs(xDelta) > Math.abs(yDelta) ? { delta: xDelta, dir: 'E'} : { delta: yDelta, dir: 'N'};
};

const printUsage = () => console.log('Usage: node <script path>/fhwaSeed.js stateName stateInitials shpPath dbfPath');

const seedData = async (db, args) => {
  const [stateName, stateInitials, SHP_FILE, DBF_FILE] = args.slice(2);
  let features = await shapefile.read(SHP_FILE, DBF_FILE).then(collection => collection.features);
  let stateID = await db.queryAsync(`INSERT INTO ${STATES} (name, initials) VALUES ("${stateName}", "${stateInitials}");`).then(res => res[0].insertId);
  let allData = {};
  let basePointID = await db.queryAsync('SELECT COUNT(*) FROM points;').then(res => res[0][0]['COUNT(*)']); // get current points table count

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

    const {dir} = calcDir(finalArray[0][0], finalArray[finalArray.length - 1][0]);
    const routeNum = `'${route}'`, oppositeDir = dir === 'E' ? 'W' : 'S';
    for (let i = 0; i < finalArray.length; i += 1) {
      const routeDir = finalArray[i][0].properties.Facility_T === NON_INVENTORY_FACILITY_CODE
        ? `'${oppositeDir}'`
        : `'${dir}'`;
      const coords = finalArray[i].map(feature => feature.geometry.coordinates).flat();
      const segmentID = await db.queryAsync(`INSERT INTO ${SEGMENTS} (route_num, segment_num, direction, state_key, len, base) VALUES (${routeNum}, ${i}, ${routeDir}, ${stateID}, ${coords.length}, ${basePointID});`).then(res => res[0].insertId);
      await Utils.insertSegment(db, SEGMENTS, POINTS, segmentID, coords);
      basePointID += coords.length;
    }
  }
};

if (process.argv.length !== 6) {
  console.log('Four arguments are required.');
  printUsage();
  return;
}

if (process.argv.length === 6 && (!process.argv[4].includes('.shp') || !process.argv[5].includes('.dbf'))) {
  console.log('SHP and DBF file paths must include file extension');
  printUsage();
  return;
}

const db = DB.getDB();
DB.connectWithDB(db)
  .then(() => seedData(db, process.argv))
  .then(() => db.end())
  .catch(err => {
    console.log(err);
    db.end();
  });
