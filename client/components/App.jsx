import React from 'react';
import ReactDOM from 'react-dom';

import { Map, TileLayer, Polyline } from 'react-leaflet';

export default class App extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      lat: 37.5904827,
      lon: -122.9585187,
      zoom: 7,
    };
  }

  static getRoute(routeId) {
    return fetch(`/api/points/${routeId}`)
      .then(res => res.json());
  }

  componentDidMount() {
    App.getRoute(317)
      .then(route => {
        this.setState({
          route
        }); 
      });
  }

  render() {
    const { lat, lon, zoom, route } = this.state;
    return (
      <Map center={[lat, lon]} zoom={zoom}>
        <TileLayer
          attribution='&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
          url='http://{s}.tile.osm.org/{z}/{x}/{y}.png'
        />
        {
          route && 
          <Polyline positions={route} />
        }
      </Map>
    );
  }
}
