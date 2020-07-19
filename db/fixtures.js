const cliProgress = require('cli-progress');
const EventEmitter = require('events');
const shapefile = require('shapefile');

const DB = require('.');
const caltransFeatureParser = require('./parsers/caltransFeatureParser.js');

const CA_DATA = 'db/SHN_Lines.shp', CA_DB = 'db/SHN_Lines.dbf';
const STATES = 'states', SEGMENTS = 'segments', POINTS = 'points';
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
  .then(collection => {
    totalFeatures = collection.features.length;
    progressBar.start(collection.features.length, 0);
    return caltransFeatureParser(db, progressEmitter, collection.features, 'California', 'CA');
  });

// Check if the database is empty before populating it with mock data.
// Remember that the results will be a 2D array, first element has actual results
module.exports = seedData;
