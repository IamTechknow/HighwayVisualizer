const DB = require('.');
const shapefile = require('shapefile');
const fhwaFeatureParser = require('./parsers/fhwaFeatureParser.js');

const printUsage = () => console.log('Usage: node <script path>/fhwaSeed.js stateName stateInitials shpPath dbfPath');

const seedData = (db, args) => {
  const [stateName, stateInitials, SHP_FILE, DBF_FILE] = args.slice(2);
  return shapefile.read(SHP_FILE, DBF_FILE)
    .then(collection => fhwaFeatureParser(db, collection.features, stateName, stateInitials));
};

if (process.argv.length !== 6) {
  console.log('Four arguments are required.');
  printUsage();
  return;
}

if (process.argv.length === 6 && (!process.argv[4].includes('.shp') || !process.argv[5].includes('.dbf'))) {
  console.log('SHP and DBF file paths must include file extension');
  printUsage();
  return;
}

console.log(`Seeding database...`);
DB.getDB()
  .then((client) => seedData(client, process.argv).then(() => client)
    .catch(err => {
      console.error(err);
      client.end();
    })
  )
  .then((db) => db.end());
