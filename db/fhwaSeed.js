import { SingleBar, Presets } from 'cli-progress';
import EventEmitter from 'events';
import { promises as fs } from 'fs';
import { read } from 'shapefile';
import yargs from 'yargs';

import {
  getLayerBBox, queryLayers, queryLayerFeatureIDs, queryLayerFeaturesWithIDs,
} from './ArcGISClient.js';
import { getDB } from './index.js';
import fhwaFeatureParser from './parsers/fhwaFeatureParser.js';
import {
  NOT_SIGNED, INTERSTATE, US_HIGHWAY, STATE,
} from './routeEnum.js';
import { SOURCE_ENUM, getDataSourcesForState } from './sources.js';

const getFiltersForState = (_stateIdentifier, stateInitials, year) => {
  if (stateInitials === 'AK' && year === '2019') {
    return [
      {
        field: 'ROUTE_SIGNING',
        op: '=',
        value: `${NOT_SIGNED}`,
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
  }

  // Default case for FHWA ArcGIS servers
  return [
    {
      field: 'ROUTE_SIGNING',
      op: '=',
      value: `${INTERSTATE}`,
      esriType: 'esriFieldTypeInteger',
    },
    {
      field: 'ROUTE_SIGNING',
      op: '=',
      value: `${US_HIGHWAY}`,
      esriType: 'esriFieldTypeInteger',
    },
    {
      field: 'ROUTE_SIGNING',
      op: '=',
      value: `${STATE}`,
      esriType: 'esriFieldTypeInteger',
    },
    {
      field: 'ROUTE_ID',
      op: 'LIKE',
      value: "'%MD00%'",
      esriType: 'esriFieldTypeString',
    },
    {
      field: 'STATE_CODE',
      op: '=',
      value: '24',
      esriType: 'esriFieldTypeSmallInteger',
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
    {
      field: 'FACILITY_TYPE',
      op: '<>',
      value: '4',
      esriType: 'esriFieldTypeInteger',
    },
  ];
};

const getConjunctionsForState = (_stateIdentifier, stateInitials, year) => {
  if (stateInitials === 'AK' && year === '2019') {
    return ['AND', 'AND'];
  }
  // Default case for FHWA ArcGIS servers
  return ['(', 'OR', 'OR', ')', 'OR', '(', 'AND', ')', 'AND', 'AND', 'AND'];
};

const getDataFromFeatureServer = async (stateIdentifier, stateInitials, chunkSize, year = '2019') => {
  console.log(`Getting ${year} feature data for ${stateIdentifier}...`);
  const serverURL = getDataSourcesForState(
    SOURCE_ENUM.ARCGIS_FEATURE_SERVER,
    stateIdentifier,
    stateInitials,
    year,
  )[0];
  if (!serverURL) {
    return {
      error: 'No ArcGIS servers found for command line arguments, aborting',
      features: [],
      type: 'FeatureCollection',
    };
  }
  const layers = await queryLayers(serverURL);
  if (!layers || layers.length < 1) {
    return {
      error: 'No layers found in feature server, aborting',
      features: [],
      type: 'FeatureCollection',
    };
  }
  const ids = await queryLayerFeatureIDs(
    serverURL,
    0,
    getFiltersForState(stateIdentifier, stateInitials, year),
    getConjunctionsForState(stateIdentifier, stateInitials, year),
  );
  const bbox = await getLayerBBox(serverURL, 0);
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
  return queryLayerFeaturesWithIDs(serverURL, 0, ids, outFields, true, 7, bbox, chunkSize);
};

const FILTERED_FEATURES_EVENT = 'filteredFeatures';
const INSERTED_FEATURE_EVENT = 'insertedFeature', FEATURES_DONE_EVENT = 'featuresDone';

let featuresInsertedCount = 0;
const progressBar = new SingleBar({
  format: ' {bar} {percentage}% | ETA: {eta}s | {value}/{total} features',
}, Presets.shades_classic);
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
  const [stateIdentifier, stateTitle, stateInitials] = args._;
  const { year, chunkSize } = args;
  if (year === null) {
    return getDataFromFeatureServer(stateIdentifier, stateInitials, chunkSize)
      .then((featureCollection) => fhwaFeatureParser(
        db, progressEmitter, featureCollection, stateIdentifier, stateTitle, stateInitials, false,
      ))
      .catch((err) => console.error(err));
  }

  let filesExist = true;
  const shpPath = `${stateIdentifier + year}.shp`, dbfPath = `${stateIdentifier + year}.dbf`;
  let fileBuffers;
  try {
    fileBuffers = await Promise.all([fs.readFile(shpPath), fs.readFile(dbfPath)]);
  } catch (err) {
    filesExist = false;
  }
  if (filesExist) {
    console.log('Seeding database with shapefile...');
    return read(fileBuffers[0], fileBuffers[1])
      .then((featureCollection) => fhwaFeatureParser(
        db, progressEmitter, featureCollection, stateIdentifier, stateTitle, stateInitials,
      ))
      .catch((err) => console.error(err));
  }
  return getDataFromFeatureServer(stateIdentifier, stateInitials, chunkSize, year)
    .then((featureCollection) => fhwaFeatureParser(
      db, progressEmitter, featureCollection, stateIdentifier, stateTitle, stateInitials, false,
    ))
    .catch((err) => console.error(err));
};

const args = yargs(process.argv.slice(2))
  .usage('Usage: node $0 stateIdentifier "stateTitle" stateInitials [year] [chunk-size]')
  .demandCommand(3)
  .option('chunkSize', {
    default: 100,
    describe: 'Max requests when downloading ArcGIS features',
    type: 'number',
  })
  .option('year', {
    default: null,
    describe: 'Year for ArcGIS data starting 2000, 2018 and 2019 are supported',
    type: 'string',
  })
  .example('node db/fhwaSeed.js District "Washington DC" DC --year 2019 --chunk-size 100')
  .argv;

getDB()
  .then((client) => seedData(client, args).then(() => client)
    .catch((err) => {
      console.error(err);
      client.end();
    }))
  .then((db) => db.end());
