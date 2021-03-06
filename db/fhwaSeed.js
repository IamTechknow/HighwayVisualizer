const DB = require('.');
const cliProgress = require('cli-progress');
const EventEmitter = require('events');
const fs = require('fs').promises;
const shapefile = require('shapefile');
const fhwaFeatureParser = require('./parsers/fhwaFeatureParser.js');
const TYPE_ENUM = require('./routeEnum.js');
const {SOURCE_ENUM, getDataSourcesForState} = require('./sources.js');
const ArcGISClient = require('./ArcGISClient.js');

const printUsage = () => console.log('Usage: node <script path>/fhwaSeed.js stateIdentifier "stateTitle" stateInitials [yearStarting2000]');

const FILTERED_FEATURES_EVENT = 'filteredFeatures';
const INSERTED_FEATURE_EVENT = 'insertedFeature', FEATURES_DONE_EVENT = 'featuresDone';

let featuresInsertedCount = 0;
const progressBar = new cliProgress.SingleBar({
  format: ' {bar} {percentage}% | ETA: {eta}s | {value}/{total} features',
}, cliProgress.Presets.shades_classic);
const progressEmitter = new EventEmitter();
progressEmitter.on(INSERTED_FEATURE_EVENT, (numFeaturesInRoute) => {
  featuresInsertedCount += numFeaturesInRoute;
  progressBar.update(featuresInsertedCount);
});
progressEmitter.on(FILTERED_FEATURES_EVENT, (numFeatures) => {
  progressBar.start(numFeatures, 0);
});
progressEmitter.on(FEATURES_DONE_EVENT, () => progressBar.stop());

const seedData = async (db, args) => {
  const [stateIdentifier, stateTitle, stateInitials, year] = args.slice(2);
  if (args.length !== 6) {
    return getDataFromFeatureServer(db, stateIdentifier)
      .then(collection => fhwaFeatureParser(db, progressEmitter, collection.features, stateIdentifier, stateTitle, stateInitials, false))
      .catch(err => console.error(err));
  }

  let filesExist = true;
  let shpPath = stateIdentifier + year + '.shp', dbfPath = stateIdentifier + year + '.dbf';
  let fileBuffers;
  try {
    fileBuffers = await Promise.all([fs.readFile(shpPath), fs.readFile(dbfPath)]);
  } catch(err) {
    filesExist = false;
  }
  if (filesExist) {
    console.log(`Seeding database with shapefile...`);
    return shapefile.read(fileBuffers[0], fileBuffers[1])
      .then(collection => fhwaFeatureParser(db, progressEmitter, collection.features, stateIdentifier, stateTitle, stateInitials))
      .catch(err => console.error(err));
  }
  return getDataFromFeatureServer(db, stateIdentifier)
    .then(collection => fhwaFeatureParser(db, progressEmitter, collection.features, stateIdentifier, stateTitle, stateInitials, false))
    .catch(err => console.error(err));
};

const getDataFromFeatureServer = async (db, stateIdentifier) => {
  console.log(`Getting 2018 feature data for ${stateIdentifier}...`);
  const serverURL = getDataSourcesForState(SOURCE_ENUM.ARCGIS_FEATURE_SERVER, stateIdentifier)[0];
  const layers = await ArcGISClient.queryLayers(serverURL);
  if (!layers || layers.length < 1) {
    return {
      error: 'No layers found in feature server, aborting',
      features: [],
      type: 'FeatureCollection',
    };
  }

  const whereClauses = [
    {
      field: 'ROUTE_SIGNING',
      op: '=',
      value: `${TYPE_ENUM.INTERSTATE}`,
      esriType: 'esriFieldTypeInteger',
    },
    {
      field: 'ROUTE_SIGNING',
      op: '=',
      value: `${TYPE_ENUM.US_HIGHWAY}`,
      esriType: 'esriFieldTypeInteger',
    },
    {
      field: 'ROUTE_SIGNING',
      op: '=',
      value: `${TYPE_ENUM.STATE}`,
      esriType: 'esriFieldTypeInteger',
    },
    {
      field: 'ROUTE_NUMBER',
      op: 'IS NOT',
      value: 'null',
      esriType: 'esriFieldTypeInteger',
    },
    {
      field: 'FACILITY_TYPE',
      op: 'IS NOT',
      value: 'null',
      esriType: 'esriFieldTypeInteger',
    },
  ];
  const conjunctions = ['(', 'OR', 'OR', ')', 'AND', 'AND'];
  const ids = await ArcGISClient.queryLayerFeatureIDs(serverURL, 0, whereClauses, conjunctions);
  // Use field name not alias
  const outFields = [
    'begin_point',
    'f_system',
    'facility_type',
    'state_code',
    'route_id',
    'route_number',
    'route_name',
    'route_signing',
  ].join();
  return ArcGISClient.queryLayerFeaturesWithIDs(serverURL, 0, ids, outFields, true);
};

if (process.argv.length < 5) {
  console.log('State identifier, state title, state initials are required.');
  printUsage();
  return;
}

DB.getDB()
  .then((client) => seedData(client, process.argv).then(() => client)
    .catch(err => {
      console.error(err);
      client.end();
    })
  )
  .then((db) => db.end());
