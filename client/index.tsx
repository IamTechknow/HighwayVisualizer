import React from 'react';
import ReactDOM from 'react-dom';
import { Route, BrowserRouter } from 'react-router-dom';

import CreateApp from './components/App';
import UserApp from './components/User';

import 'leaflet/dist/leaflet.css';
import './app.css';
import 'leaflet-sidebar-v2/css/leaflet-sidebar.css'

ReactDOM.render((
  <BrowserRouter>
    <Route exact path="/" component={CreateApp} />
    <Route path="/users/:user" component={UserApp} />
  </BrowserRouter>
), document.getElementById('app'));
