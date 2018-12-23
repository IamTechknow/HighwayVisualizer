import React from 'react';
import ReactDOM from 'react-dom';

import CreateApp from './components/App';

import 'leaflet/dist/leaflet.css';
import 'leaflet-defaulticon-compatibility/dist/leaflet-defaulticon-compatibility.webpack.css';
import 'leaflet-defaulticon-compatibility';
import './app.css';

ReactDOM.render((
  <CreateApp />
), document.getElementById('app'));
