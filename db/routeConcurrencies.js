/**
 * @fileOverview Module that contains data pertaining to route concurrencies
 *               for certain states and a function to calculate them. Calculating
 *               concurrencies can enable them to be shown in the application and
 *               to be accounted for in submitted user segments.
 *
 * @requires /db/routeEnum.js:routeEnum
 * @requires /db/routePrefixes.js:routePrefixes
 * @requires /db/Utils.js:Utils
 * @requires /db/Models.js:highwayDAO
 */

import Models from './models.js';
import { STATE } from './routeEnum.js';
import routePrefixes from './routePrefixes.js';
import Utils from './Utils.js';

/** @constant {number} */
const CONCURRENCY_THRESHOLD = 500; // in meters

// Should be read as route "key" takes the discontinuity with routes "values"
// Concurrencies with more than one route are not supported
/** @constant {object} */
const concurrencies = {
  California: {
    1: ['101', '280'],
    2: ['210'],
    4: ['5'],
    10: ['5'],
    12: ['80', '88', '99'],
    23: ['101'],
    26: ['12'],
    33: ['5', '140', '150'],
    35: ['92', '280'],
    38: ['18'],
    41: ['46'],
    43: ['46'],
    46: ['101'],
    49: ['20', '140'],
    57: ['60'],
    58: ['33'],
    59: ['99'],
    63: ['198'],
    68: ['1'],
    79: ['74'],
    84: ['238'],
    89: ['50', '80'],
    104: ['88'],
    108: ['120'],
    113: ['5', '80'],
    120: ['99'],
    121: ['29'],
    135: ['1'],
    139: ['299'],
    156: ['101'],
    162: ['99'],
    166: ['33', '101'],
    178: ['14'],
    198: ['33'],
    271: ['101'],
    299: ['273', '395'],
    580: ['80'],
  },
};

// North-South / North-West / East-South / East-West concurrencies
/** @constant {object} */
const wrongWay = {
  California: {
    2: ['101'],
    3: ['299'],
    4: ['99'],
    18: ['15'],
    20: ['101'],
    22: ['405'],
    33: ['152'],
    49: ['89', '120'],
    58: ['43', '99'],
    60: ['215'],
    74: ['215'],
    78: ['86'],
    79: ['78'],
    84: ['101', '880'],
    88: ['49'],
    89: ['36', '70', '88'],
    95: ['40'],
    111: ['78'],
    115: ['78'],
    120: ['395'],
    124: ['104'],
    128: ['29', '101'],
    138: ['14'],
    140: ['99'],
    152: ['101'],
    162: ['45'],
    168: ['395'],
    175: ['29'],
    178: ['127'],
    201: ['63'],
    246: ['1'],
  },
};

const shouldSkipSegments = (
  isSeg1MainlineDir,
  isSeg2MainlineDir,
  isSeg3MainlineDir,
  isWrongWay,
) => {
  if (isSeg1MainlineDir ^ isSeg2MainlineDir) {
    return true;
  }
  return isWrongWay
    ? !(isSeg1MainlineDir ^ isSeg3MainlineDir)
    : isSeg1MainlineDir ^ isSeg3MainlineDir;
};

const getPossibleConcurrency = (route1, route2, seg1, seg2, route2Seg, isWrongWay) => {
  const startPoint = seg1.points[seg1.points.length - 1], endPoint = seg2.points[0];
  const closestToStart = Utils.findClosestRouteSegmentPoint(route2Seg.points, startPoint);
  const closestToEnd = Utils.findClosestRouteSegmentPoint(route2Seg.points, endPoint);
  return {
    success: closestToStart.d < CONCURRENCY_THRESHOLD && closestToEnd.d < CONCURRENCY_THRESHOLD,
    route1,
    route2,
    route1FirstID: isWrongWay ? seg2.id : seg1.id,
    route1SecondID: isWrongWay ? seg1.id : seg2.id,
    route2segmentID: route2Seg.id,
    start: isWrongWay ? closestToEnd.idx : closestToStart.idx,
    end: isWrongWay ? closestToStart.idx : closestToEnd.idx,
  };
};

const processConcurrencyMap = async (
  db,
  stateID,
  identifier,
  concurrencyMap,
  isWrongWay = false,
) => {
  const results = [];
  if (!concurrencyMap[identifier]) {
    return results;
  }
  const pairs = Object.entries(concurrencyMap[identifier]);
  for (const [route, routeTwos] of pairs) {
    // Need the segments to come in increasing order of ID
    const route1Type = routePrefixes[identifier][route] || STATE;
    const route1Segs = await Models.getPointsForRoute(db, stateID, route1Type, route)
      .then((segments) => segments.sort((left, right) => left.id - right.id));

    for (const routeTwo of routeTwos) {
      const route2Type = routePrefixes[identifier][routeTwo] || STATE;
      const route2Segs = await Models.getPointsForRoute(db, stateID, route2Type, routeTwo)
        .then((segments) => segments.sort((left, right) => left.id - right.id));
      for (const route2Seg of route2Segs) {
        for (let i = 0; i < route1Segs.length - 1; i += 1) {
          // Skip checking if route1 segments are out of sequence or have opposite directions
          const isSeg1MainlineDir = route1Segs[i].dir === 'N' || route1Segs[i].dir === 'E';
          const isSeg2MainlineDir = route1Segs[i + 1].dir === 'N' || route1Segs[i + 1].dir === 'E';
          const isSeg3MainlineDir = route2Seg.dir === 'N' || route2Seg.dir === 'E';
          if (shouldSkipSegments(
            isSeg1MainlineDir,
            isSeg2MainlineDir,
            isSeg3MainlineDir,
            isWrongWay,
          )) {
            continue;
          }
          results.push(
            getPossibleConcurrency(
              route,
              routeTwo,
              route1Segs[i],
              route1Segs[i + 1],
              route2Seg,
              isWrongWay,
            ),
          );
        }
      }
    }
  }
  return results;
};

/**
 * Calculates selected highway concurrencies between two routes for a given state.
 *
 * Data returned is used to seed records on the concurrencies database table. Only California
 * is supported currently until a way to calculate concurrencies from a GeoJSON feature collection
 * is developed.
 *
 * @async
 * @param {object} db - A database client that can perform queries from the mysql2 module.
 * @param {string} identifier - The FHWA identifier used to represent a state.
 * @return {Promise} Returns a promise that resolves with an array of objects that contain
 *         information on a possible concurrency between two highways.
 */
const getRouteConcurrenciesForState = async (db, identifier) => {
  const stateID = await db.query('SELECT id FROM states WHERE identifier = ? LIMIT 1', [identifier])
    .then((result) => result[0][0].id);
  const results = await processConcurrencyMap(db, stateID, identifier, concurrencies);
  const wrongWayResults = await processConcurrencyMap(db, stateID, identifier, wrongWay, true);
  return results.concat(wrongWayResults);
};

/** @module routeConcurrencies */
export default getRouteConcurrenciesForState;
