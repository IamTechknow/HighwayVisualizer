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
const TYPE_ENUM = require('./routeEnum.js');
const routePrefixes = require('./routePrefixes.js');
const shapefile = require('shapefile');
const Utils = require('./Utils.js');

const STATES = 'states', SEGMENTS = 'segments', POINTS = 'points';

// Codes defined in Chapter 4 of the HPMS Field Manual
const COUNTY_OWNER_CODE = 2, TOWN_OWNER_CODE = 3, CITY_OWNER_CODE = 4, PRIVATE_OWNER_CODE = 26;
const DC_STATE_CODE = 11, MARYLAND_STATE_CODE = 24;
const INTERSTATE_FACILITY_SYSTEM = 1;
const RAMP_FACILITY_CODE = 4, NON_INVENTORY_FACILITY_CODE = 6;

const isNonMainlineInterstate = (feature) =>
  (feature.properties.Route_Name !== '' || feature.properties.Route_Numb !== 0) &&
  feature.properties.F_System === INTERSTATE_FACILITY_SYSTEM &&
  feature.properties.Facility_T === NON_INVENTORY_FACILITY_CODE;

const filterOutFeature = (feature) => {
  if (feature.geometry.coordinates.length === 0) {
    return true;
  }
  const { Facility_T, Ownership, Route_ID, Route_Name, Route_Numb, State_Code } = feature.properties;

  if (
    Ownership === COUNTY_OWNER_CODE || Ownership === TOWN_OWNER_CODE ||
    Ownership === CITY_OWNER_CODE || Ownership === PRIVATE_OWNER_CODE
  ) {
    return true;
  }

  // Exclude features in DC that with route IDs ending in A
  if (State_Code === DC_STATE_CODE && Route_ID[Route_ID.length - 1] === 'A') {
    return true;
  }

  // Exclude county and gov routes in Maryland due to route duplication
  if (State_Code === MARYLAND_STATE_CODE) {
    if (!Route_Name) {
      return true;
    }

    if ((Route_Name[0] === 'M' && Route_Name[1] === 'U') || (Route_Name[0] === 'C' && Route_Name[1] === 'O')
      || (Route_Name[0] === 'O' && Route_Name[1] === 'P') || (Route_Name[0] === 'G' && Route_Name[1] === 'V')
      || (Route_Name[0] === 'S' && Route_Name[1] === 'R')) {
      return true;
    }

    // Exclude non-mainline routes that end with a letter
    if (Route_Name[Route_Name.length - 1] > '9') {
      return true;
    }
  }

  // Allow Interstate routes that are non-mainline facilities
  if (isNonMainlineInterstate(feature)) {
    return false;
  }

  // Exclude local roads, ramps
  return Route_Numb === 0 || Facility_T === RAMP_FACILITY_CODE;
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

// Account for features with Route_Sign = 1 (unsigned)
const getTypeWithProperties = (properties, stateName) => {
  const { F_System, Route_Name, Route_Numb } = properties;
  const routeNum = Route_Numb !== 0 ? Route_Numb : Number(Route_Name.substring(2));
  const typeEnum = routePrefixes[stateName][routeNum];

  if (!typeEnum) { // Default unsigned routes to state routes
    return TYPE_ENUM.STATE;
  } else if (F_System !== INTERSTATE_FACILITY_SYSTEM && typeEnum === TYPE_ENUM.INTERSTATE) {
    return TYPE_ENUM.STATE;
  } else if (Route_Name !== null && !Route_Name.startsWith('US') && typeEnum === TYPE_ENUM.US_HIGHWAY) {
    return TYPE_ENUM.STATE;
  }

  return typeEnum;
};

const seedData = async (db, args) => {
  const [stateName, stateInitials, SHP_FILE, DBF_FILE] = args.slice(2);
  let features = await shapefile.read(SHP_FILE, DBF_FILE).then(collection => collection.features);
  let stateID = await db.queryAsync(`INSERT INTO ${STATES} (name, initials) VALUES ("${stateName}", "${stateInitials}");`).then(res => res[0].insertId);
  let allData = {
    [TYPE_ENUM.INTERSTATE]: {},
    [TYPE_ENUM.US_HIGHWAY]: {},
    [TYPE_ENUM.STATE]: {}
  };
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

    const { Route_Name, Route_Numb, Route_Sign } = feature.properties;
    const routeNum = isNonMainlineInterstate(feature) && Route_Numb === 0
      ? Number(Route_Name.substring(2))
      : Route_Numb;
    const type = Route_Sign > 1 ? 
      Route_Sign : 
      getTypeWithProperties(feature.properties, stateName);

    if (allData[type][routeNum]) {
      allData[type][routeNum].push(feature);
    } else {
      allData[type][routeNum] = [feature];
    }
  }

  // Sort first by Route ID, then to make it stable, sort by route ID and then begin_poin
  // The Route ID can be a number string, in other cases it is alphanumeric
  for (let type in allData) {
    const segmentsByType = allData[type];
    for (let route in segmentsByType) {
      segmentsByType[route] = segmentsByType[route].sort((left, right) => {
        return left.properties.Route_ID.localeCompare(right.properties.Route_ID);
      });

      segmentsByType[route] = segmentsByType[route].sort((left, right) => {
        if (left.properties.Route_ID === right.properties.Route_ID) {
          return left.properties.Begin_Poin - right.properties.Begin_Poin;
        }

        return left.properties.Route_ID.localeCompare(right.properties.Route_ID);
      });

      // Put all the route IDs into a new object. Then sort them
      let routeIds = {};
      for (let feature of segmentsByType[route]) {
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
        const segmentID = await db.queryAsync(`INSERT INTO ${SEGMENTS} (route_num, type, segment_num, direction, state_key, len, base) VALUES (${routeNum}, ${type}, ${i}, ${routeDir}, ${stateID}, ${coords.length}, ${basePointID});`).then(res => res[0].insertId);
        await Utils.insertSegment(db, SEGMENTS, POINTS, segmentID, coords);
        basePointID += coords.length;
      }
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
