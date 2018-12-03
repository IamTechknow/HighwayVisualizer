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

  // Determine a good zoom level based on route complexity
  static getZoomForRouteLen(len) {
    if (len <= 50) {
      return 13;
    } else if (len <= 100) {
      return 12;
    } else if (len <= 300) {
      return 11;
    } else if (len <= 600) {
      return 10;
    } else if(len <= 1000) {
      return 9;
    } else if(len <= 2000) {
      return 8;
    } else if(len <= 5000) {
      return 7;
    }
    return 6;
  }

  static buildCache() {
    let cache = {};
    ['5', '8', '10', '15', '40', '80', '105', '110', '205', '210', '215', '238', '280', '380', '405',
    '505', '580', '605', '680', '710', '780', '805', '880', '980'].forEach(ele => { cache[ele] = "Interstate"; });

    ['6', '50', '95', '97', '101', '199', '395'].forEach(ele => { cache[ele] = "US Highway"; });

    return cache;
  }

  static getStates() {
    return fetch(`/api/states`)
      .then(res => res.json());
  }

  // Get the routes then organize them by route numbers
  // Use a set to maintain whether or not the route number and direction
  // is repeated. If it is, push to array, otherwise add to new array
  static getRoutes(stateId) {
    return fetch(`/api/routes/${stateId}`)
      .then(res => res.json())
      .then(routes => App.parseRoutes(routes));
  }

  static getRoute(routeId, dir, getAll) {
    const query = dir ? `?dir=${dir}&getAll=${getAll}` : '';
    return fetch(`/api/points/${routeId}${query}`)
      .then(res => res.json());
  }

  static parseRoutes(routes) {
    let set = new Set();
    let organized = [];
    let count = -1;

    for (let seg of routes) {
      const key = `${seg.route}${seg.dir}`;

      if (set.has(key)) {
        organized[count].push(seg);
      } else {
        set.add(key);
        organized.push([seg]);
        count += 1;
      }
    }

    return organized;
  }

  // Load all data from API endpoints
  componentDidMount() {
    this.cache = App.buildCache();
    App.getStates()
      .then(states => {
        this.setState({ states });
        return App.getRoutes(states[0].id);
      })
      .then(routes => {
        this.setState({ routes });
        return App.getRoute(1);
      })
      .then(segments => this.routePromiseDone(segments));
  }

  getNameForRoute(route) {
    return this.cache[route] ? this.cache[route] : "State Route";
  }

  onStateClick(stateId) {
    App.getRoutes(stateId)
      .then(routes => {
        this.setState({ routes });
      });
  }

  // Prevent events occurring twice
  onRouteClick(routeId, dir, getAll, event) {
    event.stopPropagation();
    App.getRoute(routeId, dir, getAll)
      .then(segments => this.routePromiseDone(segments));
  }

  // Process array of route segments. There will always be at least one
  routePromiseDone(segments) {
    this.setState({
      segments,
      lat: segments[0][0][0],
      lon: segments[0][0][1],
      zoom: App.getZoomForRouteLen(segments.reduce((curr, arr) => curr += arr.length, 0))
    });
  }

  render() {
    const { lat, lon, zoom, states, routes, segments } = this.state;
    return (
      <div id="mapGrid">
        <div id="routeUi">
          <h3>States</h3>
          <ul>
            { states && states.map(obj => (
                <li key={obj.initials} onClick={this.onStateClick.bind(this, obj.id)}>{obj.name}</li>
              ))
            }
          </ul>
          <h3>Routes</h3>
          <ul>
            {/* List each route and all route segments */}
            { routes && routes.map(obj => (
              <li key={`${obj[0].route}${obj[0].dir}`} onClick={this.onRouteClick.bind(this, obj[0].route, obj[0].dir, 'true')}>
                {`${this.getNameForRoute(obj[0].route)} ${obj[0].route} ${obj[0].dir}`}
                { obj.length > 1 && (
                  <ul>
                    {obj.map((seg, i) => (
                      <li onClick={this.onRouteClick.bind(this, seg.id, "", "false")}>{`Segment ${i + 1}`}</li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        </div>
        <Map center={[lat, lon]} zoom={zoom}>
          <TileLayer
            attribution='&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
            url='http://{s}.tile.osm.org/{z}/{x}/{y}.png'
          />
          { segments &&
            segments.map(seg => <Polyline positions={seg} /> )
          }
        </Map>
      </div>
    );
  }
}
