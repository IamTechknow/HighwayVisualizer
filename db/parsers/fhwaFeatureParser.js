/*
  General approach to parse FHWA features:

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

const TYPE_ENUM = require('../routeEnum.js');
const routePrefixes = require('../routePrefixes.js');
const Utils = require('../Utils.js');

// Codes defined in Chapter 4 of the HPMS Field Manual
const DC_STATE_CODE = 11, MARYLAND_STATE_CODE = 24;
const INTERSTATE_FACILITY_SYSTEM = 1;
const RAMP_FACILITY_CODE = 4, NON_INVENTORY_FACILITY_CODE = 6;

const isNonMainlineInterstate = (feature) =>
  feature.geometry.coordinates.length !== 0 &&
  (feature.properties.Route_Name !== '' || feature.properties.Route_Numb !== 0) &&
  feature.properties.F_System === INTERSTATE_FACILITY_SYSTEM &&
  feature.properties.Facility_T === NON_INVENTORY_FACILITY_CODE;

const filterOutFeature = (feature) => {
  const { Facility_T, Ownership, Route_ID, Route_Name, Route_Numb, Route_Sign, State_Code } = feature.properties;

  if (
    Route_Sign !== TYPE_ENUM.INTERSTATE &&
    Route_Sign !== TYPE_ENUM.US_HIGHWAY &&
    Route_Sign !== TYPE_ENUM.STATE
  ) {
    return true;
  }

  // Exclude features in DC that with route IDs ending in A
  if (State_Code === DC_STATE_CODE && Route_ID[Route_ID.length - 1] === 'A') {
    return true;
  }

  // Exclude route names that end with a letter
  if (State_Code === MARYLAND_STATE_CODE) {
    if (!Route_Name || Route_Name[Route_Name.length - 1] > '9') {
      return true;
    }
  }

  // Allow Interstate routes that are non-mainline facilities
  if (isNonMainlineInterstate(feature)) {
    return false;
  }

  // Exclude features with no points, local roads, ramps
  return feature.geometry.coordinates.length === 0
    || Route_Numb === 0 || Facility_T === RAMP_FACILITY_CODE;
};

const calcDir = (left, right) => {
  let pLeftFirst = left.geometry.coordinates[0], pRightLast = right.geometry.coordinates[0];

  // Determine whether to compare north or east based on whether the x_delta or y_delta is bigger.
  // Data has not been processed fully, remember that coordinates come as LngLat
  let xDelta = pLeftFirst[1] - pRightLast[1], yDelta = pLeftFirst[0] - pRightLast[0];

  // return whether the left element should be closer to the south/west, should be if delta is negative.
  return Math.abs(xDelta) > Math.abs(yDelta) ? { delta: xDelta, dir: 'E'} : { delta: yDelta, dir: 'N'};
};

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

const seedFeatures = async (db, features, stateName, stateInitials) => {
  await db.startTransaction();
  let stateID = await db.query('INSERT INTO states (name, initials) VALUES (?, ?);', [stateName, stateInitials]).then(res => res[0].insertId);
  let allData = {
    [TYPE_ENUM.INTERSTATE]: {},
    [TYPE_ENUM.US_HIGHWAY]: {},
    [TYPE_ENUM.STATE]: {}
  };
  let basePointID = await db.query('SELECT COUNT(*) FROM points;').then(res => res[0][0]['COUNT(*)']); // get current points table count

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
      const routeNum = `${route}`, oppositeDir = dir === 'E' ? 'W' : 'S';
      for (let i = 0; i < finalArray.length; i += 1) {
        const routeDir = finalArray[i][0].properties.Facility_T === NON_INVENTORY_FACILITY_CODE
          ? `${oppositeDir}`
          : `${dir}`;
        const coords = finalArray[i].map(feature => feature.geometry.coordinates).flat();
        const queryArgs = [routeNum, type, i, routeDir, stateID, coords.length, basePointID];
        const segmentID = await db.query('INSERT INTO segments (route_num, type, segment_num, direction, state_key, len, base) VALUES (?, ?, ?, ?, ?, ?, ?);', queryArgs).then(res => res[0].insertId);
        await Utils.insertSegment(db, segmentID, coords);
        basePointID += coords.length;
      }
    }
  }
  await db.endTransaction();
};

module.exports = seedFeatures;