const DB = require('.');
const seedData = require('./fixtures.js');

console.log(`Seeding database...`);
DB.getDB()
  .then((db) => seedData(db).then(() => db)
    .catch(err => {
      console.error(err);
      db.end();
    })
  )
  .then((db) => db.end());
