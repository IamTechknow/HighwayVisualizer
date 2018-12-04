const express = require('express');
const path = require('path');
const Models = require('../db/models.js');
const db = require('../db');

const PORT = 80;
const app = express();

app.use(express.static(path.resolve(__dirname, '../public')));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Allow CORS for a given endpoint
const allowCORS = function(res) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
};

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// R endpoints
app.get('/api/states', (req, res) => {
  allowCORS(res);
  Models.getStates(db)
  .then((result) => {
    res.status(200).type('application/json');
    res.send(JSON.stringify(result));
  }).catch((err) => {
    res.status(500).type('Sorry, an error occurred!');
  });
});

app.get('/api/users', (req, res) => {
  allowCORS(res);
  Models.getUsers(db)
  .then((result) => {
    res.status(200).type('application/json');
    res.send(JSON.stringify(result));
  }).catch((err) => {
    res.status(500).type('Sorry, an error occurred!');
  });
});

app.get('/api/routes/:stateId', (req, res) => {
  allowCORS(res);
  Models.getRoutesBy(db, req.params.stateId)
  .then((result) => {
    res.status(200).type('application/json');
    res.send(JSON.stringify(result));
  }).catch((err) => {
    res.status(500).type('Sorry, an error occurred!');
  });
});

// Expects route segment and direction
app.get('/api/points/:routeId', (req, res) => {
  allowCORS(res);
  const getAll = req.query.getAll === "true";
  Models.getPointsBy(db, req.params.routeId, req.query.dir, getAll)
  .then((result) => {
    res.status(200).type('application/json');
    res.send(JSON.stringify(result));
  }).catch((err) => {
    res.status(500).type('Sorry, an error occurred!');
  });
});

// C endpoints
app.post('/api/newUser', (req, res) => {
  allowCORS(res);
  Models.createUser(db, req.body.user)
  .then((result) => {
    res.status(201).type('application/json');
    res.send(JSON.stringify(result));
  }).catch((err) => {
    res.status(500).type('Sorry, an error occurred!');
  });
});

app.post('/api/newUserSegments', (req, res) => {
  allowCORS(res);
  Models.createUserSegment(db, req.body.userId, req.body.segments)
  .then((result) => {
    res.status(201).type('application/json');
    res.send(JSON.stringify({ success: true, entries: req.body.segments.length }));
  }).catch((err) => {
    res.status(500).type('Sorry, an error occurred!');
  });
});

app.listen(PORT, () => { console.log(`Listening at Port ${PORT}`); });
