import { SingleBar, Presets } from 'cli-progress';
import EventEmitter from 'events';
import { read } from 'shapefile';

import { getDB } from './index.js';
import caltransFeatureParser from './parsers/caltransFeatureParser.js';

const CA_DATA = 'db/SHN_Lines.shp', CA_DB = 'db/SHN_Lines.dbf';
const INSERTED_FEATURE_EVENT = 'insertedFeature', FOUND_MULTI_EVENT = 'foundMulti',
  FEATURES_DONE_EVENT = 'featuresDone';

let featuresInsertedCount = 0, totalFeatures = 0;
const progressBar = new SingleBar({
  format: ' {bar} {percentage}% | ETA: {eta}s | {value}/{total} features',
}, Presets.shades_classic);
const progressEmitter = new EventEmitter();
progressEmitter.on(INSERTED_FEATURE_EVENT, (numFeaturesInRoute) => {
  featuresInsertedCount += numFeaturesInRoute;
  progressBar.update(featuresInsertedCount);
});
progressEmitter.on(FOUND_MULTI_EVENT, (numFeaturesInMulti) => {
  totalFeatures += numFeaturesInMulti - 1;
  progressBar.setTotal(totalFeatures);
});
progressEmitter.on(FEATURES_DONE_EVENT, () => progressBar.stop());

const seedData = (db) => read(CA_DATA, CA_DB)
  .then((geoJSON) => {
    const { bbox, features } = geoJSON;
    totalFeatures = features.length;
    progressBar.start(features.length, 0);
    return caltransFeatureParser(db, progressEmitter, features, 'California', 'CA', bbox);
  });

console.log('Seeding database...');
getDB()
  .then((db) => seedData(db).then(() => db)
    .catch((err) => {
      console.error(err);
      db.end();
    }))
  .then((db) => db.end());
