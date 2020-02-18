const compression = require('compression');
const express = require('express');
const path = require('path');
const Models = require('../db/models.js');
const DB = require('../db');

const PORT = 80;
const app = express();
const db = DB.getDB();

app.use(compression({threshold: 8192}));
app.use(express.static(path.resolve(__dirname, '../public')));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Allow CORS and caching for endpoints
const headerMiddleware = function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  res.header("Cache-Control", "public, max-age=86400");
  next();
};

app.use(headerMiddleware);

app.get('/users/:user', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// R endpoints
app.get('/api/states', (req, res) => {
  Models.getStates(db)
  .then((result) => {
    res.status(200).type('application/json');
    res.send(JSON.stringify(result));
  }).catch((err) => {
    res.status(500).send('Sorry, an error occurred!');
  });
});

app.get('/api/users', (req, res) => {
  Models.getUsers(db)
  .then((result) => {
    res.status(200).type('application/json');
    res.send(JSON.stringify(result));
  }).catch((err) => {
    res.status(500).send('Sorry, an error occurred!');
  });
});

app.get('/api/routes/:stateId', (req, res) => {
  Models.getRoutesBy(db, req.params.stateId)
  .then((result) => {
    res.status(200).type('application/json');
    res.send(JSON.stringify(result));
  }).catch((err) => {
    res.status(500).send('Sorry, an error occurred!');
  });
});

// Expects route segment and direction. Distinguish between U (unrelinquished) and S routes
app.get('/api/points/:routeId', (req, res) => {
  const getAll = req.query.getAll === "true";
  const stateId = req.query.stateId ?
   Number.parseInt(req.query.stateId, 10) : undefined;
  let routeInteger = req.params.routeId;
  if (/^\d+$/.test(routeInteger)) {
    routeInteger = Number.parseInt(routeInteger, 10);
  }

  if (getAll && !req.query.stateId) {
    res.status(400).send('If getting points for an entire route, a state ID must be provided');
  } else {
    Models.getPointsBy(db, routeInteger, req.query.dir, getAll, stateId)
    .then((result) => {
      res.status(200).type('application/json');
      res.send(JSON.stringify(result));
    }).catch((err) => {
      res.status(500).send('Sorry, an error occurred!');
    });
  }
});

app.get('/api/user_segments/:user', (req, res) => {
  Models.getUserSegmentsBy(db, req.params.user)
  .then((result) => {
    let retval = { loaded: true, notFound: result === false };
    if (result) {
      Object.assign(retval, result);
    }

    res.status(200).type('application/json');
    res.send(JSON.stringify(retval));
  }).catch((err) => {
    res.status(500).send('Sorry, an error occurred!');
  });
});

// C endpoints
app.post('/api/newUser', (req, res) => {
  Models.createUser(db, req.body.user)
  .then((result) => {
    res.status(201).type('application/json');
    res.send(JSON.stringify(result));
  }).catch((err) => {
    res.status(500).send('Sorry, an error occurred!');
  });
});

app.post('/api/user_segments/new', (req, res) => {
  res.status(201).type('application/json');
  Models.createUserSegment(db, req.body.userId, req.body.userSegments)
  .then((result) => {
    res.send(JSON.stringify({ success: true, entries: req.body.userSegments.length }));
  }).catch((err) => {
    res.send(JSON.stringify({ success: false, entries: 0 }));
  });
});

DB.connectWithDB(db)
  .then(() => app.listen(PORT, () => { console.log(`Listening at Port ${PORT}`); }));
