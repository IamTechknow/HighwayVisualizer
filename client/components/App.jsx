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

    this.onRouteClick = this.onRouteClick.bind(this);
  }

  static getStates() {
    return fetch(`/api/states`)
      .then(res => res.json());
  }

  static getRoutes(stateId) {
    return fetch(`/api/routes/${stateId}`)
      .then(res => res.json());
  }

  static getRoute(routeId) {
    return fetch(`/api/points/${routeId}`)
      .then(res => res.json());
  }

  // Load all data from API endpoints
  componentDidMount() {
    App.getStates()
      .then(states => {
        this.setState({ states });
        return App.getRoutes(states[0].id);
      })
      .then(routes => {
        this.setState({ routes });
        return App.getRoute(3);
      })
      .then(route => {
        this.setState({ route });
      });
  }

  onStateClick(stateId) {
    App.getRoutes(stateId)
      .then(routes => {
        this.setState({ routes });
      });
  }

  onRouteClick(routeId) {
    App.getRoute(routeId)
      .then(route => {
        this.setState({ route });
      });
  }

  render() {
    const { lat, lon, zoom, states, routes, route } = this.state;
    return (
      <div id="mapGrid">
        <div id="routeUi">
          <h3>States</h3>
          <ul>
            { states && states.map(obj => (
                <li onClick={this.onStateClick.bind(this, obj.id)}>{obj.name}</li>
              ))
            }
          </ul>
          <h3>Routes</h3>
          <ul>
            { routes && routes.map(obj => (
                <li onClick={this.onRouteClick.bind(this, obj.id)}>{`${obj.route} ${obj.dir}`}</li>
              ))
            }
          </ul>
        </div>
        <Map center={[lat, lon]} zoom={zoom}>
          <TileLayer
            attribution='&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
            url='http://{s}.tile.osm.org/{z}/{x}/{y}.png'
          />
          { route &&
            <Polyline positions={route} />
          }
        </Map>
      </div>
    );
  }
}
