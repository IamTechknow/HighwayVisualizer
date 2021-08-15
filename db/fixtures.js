const cliProgress = require('cli-progress');
const EventEmitter = require('events');
const shapefile = require('shapefile');

const DB = require('.');
const caltransFeatureParser = require('./parsers/caltransFeatureParser.js');

const CA_DATA = 'db/SHN_Lines.shp', CA_DB = 'db/SHN_Lines.dbf';
const INSERTED_FEATURE_EVENT = 'insertedFeature', FOUND_MULTI_EVENT = 'foundMulti',
  FEATURES_DONE_EVENT = 'featuresDone';

let featuresInsertedCount = 0, totalFeatures = 0;
const progressBar = new cliProgress.SingleBar({
  format: ' {bar} {percentage}% | ETA: {eta}s | {value}/{total} features',
}, cliProgress.Presets.shades_classic);
const progressEmitter = new EventEmitter();
progressEmitter.on(INSERTED_FEATURE_EVENT, () =>
  progressBar.update(++featuresInsertedCount)
);
progressEmitter.on(FOUND_MULTI_EVENT, (numFeaturesInMulti) => {
  totalFeatures += numFeaturesInMulti - 1;
  progressBar.setTotal(totalFeatures);
});
progressEmitter.on(FEATURES_DONE_EVENT, () => progressBar.stop());

const seedData = (db) => shapefile.read(CA_DATA, CA_DB)
  .then(geoJSON => {
    const {bbox, features} = geoJSON;
    totalFeatures = features.length;
    progressBar.start(features.length, 0);
    return caltransFeatureParser(db, progressEmitter, features, 'California', 'CA', bbox);
  });

module.exports = seedData;
