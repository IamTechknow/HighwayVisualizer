const DB = require('.');
const fs = require('fs').promises;
const shapefile = require('shapefile');
const fhwaFeatureParser = require('./parsers/fhwaFeatureParser.js');
const TYPE_ENUM = require('./routeEnum.js');
const {SOURCE_ENUM, getDataSourcesForState} = require('./sources.js');
const ArcGISClient = require('./ArcGISClient.js');

const printUsage = () => console.log('Usage: node <script path>/fhwaSeed.js stateName stateInitials [yearStarting2000]');

const seedData = async (db, args) => {
  const [stateName, stateInitials, year] = args.slice(2);
  if (args.length !== 5) {
    return getDataFromFeatureServer(db, stateName)
      .then(collection => fhwaFeatureParser(db, collection.features, stateName, stateInitials, false))
      .catch(err => console.error(err));
  }

  let filesExist = true;
  let shpPath = stateName + year + '.shp', dbfPath = stateName + year + '.dbf';
  let fileBuffers;
  try {
    fileBuffers = await Promise.all([fs.readFile(shpPath), fs.readFile(dbfPath)]);
  } catch(err) {
    filesExist = false;
  }
  if (filesExist) {
    console.log(`Seeding database with shapefile...`);
    return shapefile.read(fileBuffers[0], fileBuffers[1])
      .then(collection => fhwaFeatureParser(db, collection.features, stateName, stateInitials))
      .catch(err => console.error(err));
  }
  return getDataFromFeatureServer(db, stateName)
    .then(collection => fhwaFeatureParser(db, collection.features, stateName, stateInitials, false))
    .catch(err => console.error(err));
};

const getDataFromFeatureServer = async (db, stateName) => {
  console.log(`Getting 2018 feature data for ${stateName}...`);
  const serverURL = getDataSourcesForState(SOURCE_ENUM.ARCGIS_FEATURE_SERVER, stateName)[0];
  const layers = await ArcGISClient.queryLayers(serverURL);
  if (layers.length < 1) {
    console.err('No layers found in feature server, aborting');
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

if (process.argv.length < 4) {
  console.log('State name, state initials are required.');
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
