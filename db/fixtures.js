const TYPE_ENUM = require('./routeEnum.js');
const routePrefixes = require('./routePrefixes.js');
const shapefile = require('shapefile');
const Utils = require('./Utils.js');

const CA_DATA = 'db/SHN_Lines.shp', CA_DB = 'db/SHN_Lines.dbf';
const STATES = 'states', SEGMENTS = 'segments', POINTS = 'points';

const seedData = async (db) => {
  const features = await shapefile.read(CA_DATA, CA_DB).then(collection => collection.features);
  const stateID = await db.queryAsync(`INSERT INTO ${STATES} (name, initials) VALUES ("California", "CA")`).then(res => res[0].insertId);
  let basePointID = 0;

  // Can't use Promise.all as we need to insert synchronously
  for (let feature of features) {
    const routeNum = `'${feature.properties.ROUTE}'`;
    const dir = `'${feature.properties.DIR}'`;
    const type = routePrefixes['California'][feature.properties.ROUTE] || TYPE_ENUM.STATE;
    // The curve is either in a single array or multiple arrays
    if (feature.geometry.type !== 'LineString') {
      for (let i = 0; i < feature.geometry.coordinates.length; i += 1) {
        const len = feature.geometry.coordinates[i].length;
        const segmentID = await db.queryAsync(`INSERT INTO ${SEGMENTS} (route_num, type, segment_num, direction, state_key, len, base) VALUES (${routeNum}, ${type}, ${i}, ${dir}, ${stateID}, ${len}, ${basePointID});`).then(res => res[0].insertId);
        await Utils.insertSegment(db, SEGMENTS, POINTS, segmentID, feature.geometry.coordinates[i]);
        basePointID += len;
      }
    } else {
      const len = feature.geometry.coordinates.length;
      const segmentID = await db.queryAsync(`INSERT INTO ${SEGMENTS} (route_num, type, segment_num, direction, state_key, len, base) VALUES (${routeNum}, ${type}, 0, ${dir}, ${stateID}, ${len}, ${basePointID});`).then(res => res[0].insertId);
      await Utils.insertSegment(db, SEGMENTS, POINTS, segmentID, feature.geometry.coordinates);
      basePointID += len;
    }
  }

  console.log('Creating indices...');
  return db.queryAsync(`CREATE INDEX POINT_IDX ON ${POINTS} (segment_key);`)
    .then(res => db.queryAsync(`CREATE INDEX SEGMENT_IDX on ${SEGMENTS} (route_num(4), direction(1));`));
};

// Check if the database is empty before populating it with mock data.
// Remember that the results will be a 2D array, first element has actual results
module.exports = db => db.queryAsync(`SELECT * FROM ${STATES}`)
  .then(results => (results[0].length === 0 ? seedData(db) : undefined));
