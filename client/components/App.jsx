import React from 'react';
import ReactDOM from 'react-dom';

import { Map, TileLayer } from 'react-leaflet';

export default class App extends React.Component {
  constructor(props) {
    super(props);
    
    this.state = {
      lat: 37.5904827,
      lon: -122.9585187,
      zoom: 7,
    };
  }

  render() {
    const { lat, lon, zoom } = this.state;
    return (
      <Map center={[lat, lon]} zoom={zoom}>
        <TileLayer
          attribution='&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
          url='http://{s}.tile.osm.org/{z}/{x}/{y}.png'
        />
      </Map>
    );
  }
}
