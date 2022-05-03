/**
 * @fileOverview Parses a GeoJSON feature collection originating from a Caltrans SHN shapefile.
 *
 * @requires /db/routeConcurrencies.js:routeConcurrencies
 * @requires /db/routeEnum.js:routeEnum
 * @requires /db/routePrefixes.js:routePrefixes
 * @requires /db/Utils.js:Utils
 */

import getRouteConcurrenciesForState from '../routeConcurrencies.js';
import { INTERSTATE, STATE } from '../routeEnum.js';
import { California } from '../routePrefixes.js';
import Utils from '../Utils.js';

/** @constant {string} */
const INSERTED_FEATURE_EVENT = 'insertedFeature', FOUND_MULTI_EVENT = 'foundMulti',
  FEATURES_DONE_EVENT = 'featuresDone';

/** @constant {string} */
const RTE_238 = '238';

// The first two segments are for the surface portions of the route
const handleRoute238 = async (db, emitter, geometry, dir, stateID, basePointID) => {
  const [stateCoords1, stateCoords2, iCoords] = geometry.coordinates;
  emitter.emit(FOUND_MULTI_EVENT, 3);
  return await Utils.insertSegment(db, stateCoords1, RTE_238, STATE, dir, stateID, basePointID) +
    await Utils.insertSegment(db, stateCoords2, RTE_238, STATE, dir, stateID, basePointID) +
    await Utils.insertSegment(db, iCoords, RTE_238, INTERSTATE, dir, stateID, basePointID);
};

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
 * @param {string} stateName - The name of the US state the features belong to
          , presumably California.
 * @param {string} stateInitials - The state's initials, presumably CA.
 * @param {number[]} bbox - The bounding box GeoJSON value.
 */
const seedFeatures = async (db, emitter, features, stateName, stateInitials, bbox) => {
  let basePointID = 0;
  await db.startTransaction();
  const stateID = await db.query(
    'INSERT INTO states (identifier, title, initials, lonMin, latMin, lonMax, latMax) VALUES (?, ?, ?, ?, ?, ?, ?);',
    [stateName, stateName, stateInitials, ...bbox],
  ).then((res) => res[0].insertId);

  // Can't use Promise.all as we need to insert synchronously
  for (const feature of features) {
    const { geometry, properties } = feature;
    const routeNum = properties.ROUTE;
    const dir = properties.DIR;
    const type = California[routeNum] || STATE;
    const isMulti = geometry.type === 'MultiLineString';
    if (routeNum === RTE_238) {
      basePointID += await handleRoute238(db, emitter, geometry, dir, stateID, basePointID);
    } else if (isMulti) {
      const numFeatures = geometry.coordinates.length;
      emitter.emit(FOUND_MULTI_EVENT, numFeatures);
      for (let i = 0; i < numFeatures; i += 1) {
        basePointID += await Utils.insertSegment(
          db, geometry.coordinates[i], routeNum, type, dir, stateID, basePointID, i,
        );
      }
    } else {
      basePointID += await Utils.insertSegment(
        db, geometry.coordinates, routeNum, type, dir, stateID, basePointID,
      );
    }
    emitter.emit(INSERTED_FEATURE_EVENT, isMulti ? geometry.coordinates.length : 1);
  }
  emitter.emit(FEATURES_DONE_EVENT);
  console.log('Creating concurrencies...');
  const concurrencyArrays = await getRouteConcurrenciesForState(db, stateName)
    .then((concurrencies) => concurrencies.filter((obj) => obj.success).map((data) => {
      const {
        route1, route2, route1FirstID, route1SecondID, route2segmentID, start, end,
      } = data;
      return [route1, route2, route1FirstID, route1SecondID, route2segmentID, start, end];
    }));
  await db.query(
    'INSERT INTO concurrencies (route_num1, route_num2, first_seg, last_seg, rte2_seg, start_pt, end_pt) VALUES ?;',
    [concurrencyArrays],
  );
  console.log(`Seeded ${concurrencyArrays.length} concurrencies`);
  return db.endTransaction();
};

/** @module caltransFeatureParser */
export default seedFeatures;
