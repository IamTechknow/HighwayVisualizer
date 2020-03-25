const TYPE_ENUM = require('./routeEnum.js');
const routePrefixes = require('./routePrefixes.js');
const Utils = require('./Utils.js');
const Models = require('./Models.js');

// Should be read as route "key" takes the discontinuity with routes "values"
// Concurrencies with more than one route are not supported
const concurrencies = {
  California: {
    '1': ['101', '280'],
    '2': ['101', '210'],
    '3': ['299'],
    '4': ['5', '99'],
    '10': ['5'],
    '12': ['80', '88', '99'],
    '18': ['15'],
    '20': ['101'],
    '22': ['405'],
    '23': ['101'],
    '33': ['5', '140', '150', '152'],
    '35': ['92', '280'],
    '41': ['46'],
    '46': ['101'],
    '49': ['20', '120', '140'],
    '57': ['60'],
    '58': ['33', '43', '99'],
    '59': ['99'],
    '60': ['215'],
    '63': ['198'],
    '68': ['1'],
    '74': ['215'],
    '78': ['86'],
    '79': ['74', '78'],
    '84': ['101', '238', '880'],
    '88': ['49'],
    '89': ['36', '50', '70', '80', '88'],
    '95': ['40'],
    '104': ['88'],
    '108': ['120'],
    '111': ['78'],
    '113': ['5', '80'],
    '115': ['78'],
    '120': ['395'],
    '121': ['29'],
    '128': ['29', '101'],
    '135': ['1'],
    '138': ['14'],
    '139': ['299'],
    '140': ['99'],
    '152': ['101'],
    '156': ['101'],
    '162': ['45', '99'],
    '166': ['33', '101'],
    '168': ['395'],
    '178': ['14', '127'],
    '198': ['33'],
    '201': ['63'],
    '246': ['1'],
    '271': ['101'],
    '299': ['273', '395'],
    '580': ['80'],
  },
};

const wrongWay = {
  California: {
    '49': ['89'],
  },
};

const getRouteConcurrenciesForState = async (db, stateName) => {
  const stateID = await db.queryAsync('SELECT id FROM states WHERE name = ? LIMIT 1', [stateName])
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
            Utils.getPossibleConcurrency(route, routeTwo, route1Segs[i], route1Segs[i + 1], route2Seg),
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

module.exports = {
  getRouteConcurrenciesForState,
};
