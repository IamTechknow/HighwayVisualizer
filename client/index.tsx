import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Route, Routes } from 'react-router-dom';

import CreateApp from './components/App';
import UserApp from './components/User';

import 'leaflet/dist/leaflet.css';
import './app.css';
import 'leaflet-sidebar-v2/css/leaflet-sidebar.css';

const root = createRoot(document.getElementById('app')!);
root.render((
  <BrowserRouter>
    <Routes>
      <Route path="/*" element={<CreateApp />} />
      <Route path="/users/:user/*" element={<UserApp />} />
    </Routes>
  </BrowserRouter>
));
