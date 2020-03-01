const compression = require('compression');
const express = require('express');
const morgan = require('morgan');
const path = require('path');
const TYPE_ENUM = require('../db/routeEnum.js');
const Models = require('../db/models.js');
const DB = require('../db');

const PORT = 80;
const app = express();
const db = DB.getDB();

app.use(compression({threshold: 8192}));
app.use(express.static(path.resolve(__dirname, '../public')));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

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

app.get('/api/segments/:stateId', (req, res) => {
  Models.getSegmentsBy(db, req.params.stateId)
  .then((result) => {
    res.status(200).type('application/json');
    res.send(JSON.stringify(result));
  }).catch((err) => {
    res.status(500).send('Sorry, an error occurred!');
  });
});

// Returns all points for a specific segment
app.get('/api/points/:segmentId', (req, res) => {
  let segmentInteger = req.params.segmentId ?
    Number.parseInt(req.params.segmentId, 10) : undefined;

  if (!segmentInteger) {
    res.status(400).send('Segment ID is invalid');
  } else {
    Models.getPointsForSegment(db, segmentInteger)
    .then((result) => {
      res.status(200).type('application/json');
      res.send(JSON.stringify(result));
    }).catch((err) => {
      res.status(500).send('Sorry, an error occurred!');
    });
  }
});

// Returns all segments for a specific route
app.get('/api/points/:type/:routeNum', (req, res) => {
  const stateId = req.query.stateId ?
    Number.parseInt(req.query.stateId, 10) : undefined;
  const type = req.params.type ?
    Number.parseInt(req.params.type, 10) : undefined;
  // Route numbers are strings that can have suffixes
  const routeNum = req.params.routeNum;

  if (!stateId) {
    res.status(400).send('State ID must be provided');
  } else if (!type) {
    res.status(400).send('Route type must be provided');
  } else if (type < TYPE_ENUM.INTERSTATE || type > TYPE_ENUM.STATE) {
    res.status(400).send('Route type is invalid');
  } else if (!routeNum) {
    res.status(400).send('Route number is invalid');
  } else {
    Models.getPointsForRoute(db, stateId, type, routeNum, req.query.dir)
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
  .then(() => app.listen(PORT, () => console.log(`Listening at Port ${PORT}`)))
  .then((server) => process.on('SIGINT', () => {
    server.close();
    db.end();
  }));
