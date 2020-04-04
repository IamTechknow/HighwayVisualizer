const DB = require('.');
const shapefile = require('shapefile');
const caltransFeatureParser = require('./parsers/caltransFeatureParser.js');

const CA_DATA = 'db/SHN_Lines.shp', CA_DB = 'db/SHN_Lines.dbf';
const STATES = 'states', SEGMENTS = 'segments', POINTS = 'points';

const seedData = (db) => shapefile.read(CA_DATA, CA_DB)
  .then(collection => caltransFeatureParser(db, collection.features, 'California', 'CA'));

// Check if the database is empty before populating it with mock data.
// Remember that the results will be a 2D array, first element has actual results
module.exports = seedData;
