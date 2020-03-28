const {getRouteConcurrenciesForState} = require('./routeConcurrencies.js');
const TYPE_ENUM = require('./routeEnum.js');
const routePrefixes = require('./routePrefixes.js');
const shapefile = require('shapefile');
const Utils = require('./Utils.js');

const CA_DATA = 'db/SHN_Lines.shp', CA_DB = 'db/SHN_Lines.dbf';
const STATES = 'states', SEGMENTS = 'segments', POINTS = 'points';

const seedData = async (db) => {
  const features = await shapefile.read(CA_DATA, CA_DB).then(collection => collection.features);
  let basePointID = 0;
  await db.startTransaction();
  const stateID = await db.query('INSERT INTO states (name, initials) VALUES (?, ?)', ['California', 'CA']).then(res => res[0].insertId);

  // Can't use Promise.all as we need to insert synchronously
  for (let feature of features) {
    const routeNum = feature.properties.ROUTE;
    const dir = feature.properties.DIR;
    const type = routePrefixes['California'][feature.properties.ROUTE] || TYPE_ENUM.STATE;
    const insertStatement = 'INSERT INTO segments (route_num, type, segment_num, direction, state_key, len, base) VALUES (?);';
    // The curve is either in a single array or multiple arrays
    if (feature.geometry.type !== 'LineString') {
      for (let i = 0; i < feature.geometry.coordinates.length; i += 1) {
        const len = feature.geometry.coordinates[i].length;
        const queryArgs = [routeNum, type, i, dir, stateID, len, basePointID];
        const segmentID = await db.query(insertStatement, [queryArgs]).then(res => res[0].insertId);
        await Utils.insertSegment(db, segmentID, feature.geometry.coordinates[i]);
        basePointID += len;
      }
    } else {
      const len = feature.geometry.coordinates.length;
      const queryArgs = [routeNum, type, 0, dir, stateID, len, basePointID];
      const segmentID = await db.query(insertStatement, [queryArgs]).then(res => res[0].insertId);
      await Utils.insertSegment(db, segmentID, feature.geometry.coordinates);
      basePointID += len;
    }
  }
  console.log('Creating indices...');
  const indexQueries = [
    'CREATE INDEX POINT_IDX ON points (segment_key);',
    'CREATE INDEX STATE_IDX on segments (state_key);',
    'CREATE INDEX SEGMENT_IDX on segments (route_num(3), direction(1));',
  ];
  await db.query(indexQueries.join(' '));
  console.log('Creating concurrencies...');
  const concurrencyArrays = await getRouteConcurrenciesForState(db, 'California')
    .then((concurrencies) => concurrencies.filter(obj => obj.success).map(data => {
      const { route1, route2, route1FirstID, route1SecondID, route2segmentID, start, end } = data;
      return [route1, route2, route1FirstID, route1SecondID, route2segmentID, start, end];
    }));
  await db.query(
    'INSERT INTO concurrencies (route_num1, route_num2, first_seg, last_seg, rte2_seg, start_pt, end_pt) VALUES ?;',
    [concurrencyArrays],
  );
  return db.endTransaction();
};

// Check if the database is empty before populating it with mock data.
// Remember that the results will be a 2D array, first element has actual results
module.exports = db => db.query('SELECT * FROM states')
  .then(results => (results[0].length === 0 ? seedData(db) : undefined));
