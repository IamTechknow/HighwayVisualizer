/**
 * @fileOverview Parses a GeoJSON feature collection originating from a Caltrans SHN shapefile.
 *
 * @requires /db/routeConcurrencies.js:routeConcurrencies
 * @requires /db/routeEnum.js:routeEnum
 * @requires /db/routePrefixes.js:routePrefixes
 * @requires /db/Utils.js:Utils
 */

const { getRouteConcurrenciesForState } = require('../routeConcurrencies.js');
const TYPE_ENUM = require('../routeEnum.js');
const routePrefixes = require('../routePrefixes.js');
const Utils = require('../Utils.js');

/** @constant {string} */
const INSERTED_FEATURE_EVENT = 'insertedFeature', FOUND_MULTI_EVENT = 'foundMulti',
  FEATURES_DONE_EVENT = 'featuresDone';

/**
 * Seeds the GeoJSON features to the MySQL database, creating records for California,
 * all segments, all coordinate points, and known highway concurrencies. Does not return anything,
 * rather it will use the given database client to query and insert data. As this is meant to be the
 * first dataset to be seeded, database indices will be created at the end.
 *
 * Features from a SHN shapefile indicate direction so segments of any direction are seeded.
 * Each feature represents an entire route for a given direction, and some features consist of
 * multiple polylines for a route.
 *
 * @async
 * @param {object} db - A database client that can perform queries from the mysql2 module.
 * @param {object} emitter - An EventEmitter object to emit feature insertion events.
 * @param {object[]} features - An array with all GeoJSON features to process into database
          records.
 * @param {string} stateName - The name of the US state the features belong to, presumably California.
 * @param {string} stateInitials - The state's initials.
 */
const seedFeatures = async (db, emitter, features, stateName, stateInitials) => {
  let basePointID = 0;
  await db.startTransaction();
  const stateID = await db.query(
    'INSERT INTO states (title, identifier, initials) VALUES (?, ?, ?)',
    [stateName, stateName, stateInitials],
  ).then(res => res[0].insertId);

  // Can't use Promise.all as we need to insert synchronously
  for (let feature of features) {
    const routeNum = feature.properties.ROUTE;
    const dir = feature.properties.DIR;
    const type = routePrefixes['California'][feature.properties.ROUTE] || TYPE_ENUM.STATE;
    const insertStatement = 'INSERT INTO segments (route_num, type, segment_num, direction, state_key, len, base) VALUES (?);';
    // The curve is either in a single array or multiple arrays
    if (feature.geometry.type !== 'LineString') {
      const numFeatures = feature.geometry.coordinates.length;
      emitter.emit(FOUND_MULTI_EVENT, numFeatures);
      for (let i = 0; i < numFeatures; i += 1) {
        const len = feature.geometry.coordinates[i].length;
        const queryArgs = [routeNum, type, i, dir, stateID, len, basePointID];
        const routeSegmentID = await db.query(insertStatement, [queryArgs]).then(res => res[0].insertId);
        await Utils.insertSegment(db, routeSegmentID, feature.geometry.coordinates[i]);
        emitter.emit(INSERTED_FEATURE_EVENT);
        basePointID += len;
      }
    } else {
      const len = feature.geometry.coordinates.length;
      const queryArgs = [routeNum, type, 0, dir, stateID, len, basePointID];
      const routeSegmentID = await db.query(insertStatement, [queryArgs]).then(res => res[0].insertId);
      await Utils.insertSegment(db, routeSegmentID, feature.geometry.coordinates);
      emitter.emit(INSERTED_FEATURE_EVENT);
      basePointID += len;
    }
  }
  emitter.emit(FEATURES_DONE_EVENT);
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

/** @module caltransFeatureParser */
module.exports = seedFeatures;
