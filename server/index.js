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

app.get('/api/points/:routeId', (req, res) => {
  allowCORS(res);
  Models.getPointsBy(db, req.params.routeId)
  .then((result) => {
    res.status(200).type('application/json');
    res.send(JSON.stringify(result));
  }).catch((err) => {
    res.status(500).type('Sorry, an error occurred!');
  });
});

app.listen(PORT, () => { console.log(`Listening at Port ${PORT}`); });

// TODO: C endpoints to create user entries