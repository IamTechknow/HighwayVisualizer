const TYPE_ENUM = require('./routeEnum.js');
const routePrefixes = require('./routePrefixes.js');
const Utils = require('./Utils.js');
const Models = require('./Models.js');

const CONCURRENCY_THRESHOLD = 500; // in meters

// Should be read as route "key" takes the discontinuity with routes "values"
// Concurrencies with more than one route are not supported
const concurrencies = {
  California: {
    '1': ['101', '280'],
    '2': ['210'],
    '4': ['5'],
    '10': ['5'],
    '12': ['80', '88', '99'],
    '23': ['101'],
    '26': ['12'],
    '33': ['5', '140', '150'],
    '35': ['92', '280'],
    '38': ['18'],
    '41': ['46'],
    '46': ['101'],
    '49': ['20', '140'],
    '57': ['60'],
    '58': ['33'],
    '59': ['99'],
    '63': ['198'],
    '68': ['1'],
    '79': ['74'],
    '84': ['238'],
    '89': ['50', '80'],
    '104': ['88'],
    '108': ['120'],
    '113': ['5', '80'],
    '120': ['99'],
    '121': ['29'],
    '135': ['1'],
    '139': ['299'],
    '156': ['101'],
    '162': ['99'],
    '166': ['33', '101'],
    '178': ['14'],
    '198': ['33'],
    '271': ['101'],
    '299': ['273', '395'],
    '580': ['80'],
  },
};

// North-South / North-West / East-South / West-East concurrencies
const wrongWay = {
  California: {
    '2': ['101'],
    '3': ['299'],
    '4': ['99'],
    '18': ['15'],
    '20': ['101'],
    '22': ['405'],
    '33': ['152'],
    '49': ['89', '120'],
    '58': ['43', '99'],
    '60': ['215'],
    '74': ['215'],
    '78': ['86'],
    '79': ['78'],
    '84': ['101', '880'],
    '88': ['49'],
    '89': ['36', '70', '88'],
    '95': ['40'],
    '111': ['78'],
    '115': ['78'],
    '120': ['395'],
    '128': ['29', '101'],
    '138': ['14'],
    '140': ['99'],
    '152': ['101'],
    '162': ['45'],
    '168': ['395'],
    '178': ['127'],
    '201': ['63'],
    '246': ['1'],
  },
};

const getRouteConcurrenciesForState = async (db, stateName) => {
  const stateID = await db.query('SELECT id FROM states WHERE name = ? LIMIT 1', [stateName])
    .then((result) => result[0][0].id);
  const results = await processConcurrencyMap(db, stateID, stateName, concurrencies);
  const wrongWayResults = await processConcurrencyMap(db, stateID, stateName, wrongWay, true);
  return results.concat(wrongWayResults);
};

const processConcurrencyMap = async (db, stateID, stateName, concurrencyMap, wrongWay = false) => {
  const results = [];
  if (!concurrencyMap[stateName]) {
    return results;
  }
  for (let route in concurrencyMap[stateName]) {
    // Need the segments to come in increasing order of ID
    const route1Type = routePrefixes[stateName][route] || TYPE_ENUM.STATE;
    let route1Segs = await Models.getPointsForRoute(db, stateID, route1Type, route);
    route1Segs = route1Segs.sort((left, right) => left.id - right.id);

    for (let routeTwo of concurrencyMap[stateName][route]) {
      const route2Type = routePrefixes[stateName][routeTwo] || TYPE_ENUM.STATE;
      let route2Segs = await Models.getPointsForRoute(db, stateID, route2Type, routeTwo);
      route2Segs = route2Segs.sort((left, right) => left.id - right.id);
      for (let route2Seg of route2Segs) {
        for (let i = 0; i < route1Segs.length - 1; i += 1) {
          // Skip checking if route1 segments are out of sequence or the routes have opposite directions
          const isSeg1MainlineDir = route1Segs[i].dir === 'N' || route1Segs[i].dir === 'E';
          const isSeg2MainlineDir = route1Segs[i + 1].dir === 'N' || route1Segs[i + 1].dir === 'E';
          const isSeg3MainlineDir = route2Seg.dir === 'N' || route2Seg.dir === 'E';
          if (shouldSkipSegments(isSeg1MainlineDir, isSeg2MainlineDir, isSeg3MainlineDir, wrongWay)) {
            continue;
          }
          results.push(
            getPossibleConcurrency(route, routeTwo, route1Segs[i], route1Segs[i + 1], route2Seg, wrongWay),
          );
        }
      }
    }
  }
  return results;
};

const shouldSkipSegments = (isSeg1MainlineDir, isSeg2MainlineDir, isSeg3MainlineDir, wrongWay) => {
  if (isSeg1MainlineDir ^ isSeg2MainlineDir) {
    return true;
  }
  return wrongWay ? !(isSeg1MainlineDir ^ isSeg3MainlineDir) : isSeg1MainlineDir ^ isSeg3MainlineDir;
};

const getPossibleConcurrency = (route1, route2, seg1, seg2, route2Seg, wrongWay) => {
  const startPoint = seg1.points[seg1.points.length - 1], endPoint = seg2.points[0];
  const closestToStart = Utils.findClosestSegmentPoint(route2Seg.points, startPoint);
  const closestToEnd = Utils.findClosestSegmentPoint(route2Seg.points, endPoint);
  return {
    success: closestToStart.d < CONCURRENCY_THRESHOLD && closestToEnd.d < CONCURRENCY_THRESHOLD,
    route1,
    route2,
    route1FirstID: wrongWay ? seg2.id : seg1.id,
    route1SecondID: wrongWay ? seg1.id : seg2.id,
    route2segmentID: route2Seg.id,
    start: wrongWay ? closestToEnd.idx : closestToStart.idx,
    end: wrongWay ? closestToStart.idx : closestToEnd.idx,
  };
};

module.exports = {
  getRouteConcurrenciesForState,
};
