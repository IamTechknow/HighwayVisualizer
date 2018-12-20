import React from 'react';
import ReactDOM from 'react-dom';

import { Map as LeafletMap, TileLayer, Polyline, Marker } from 'react-leaflet';

const R = 6371e3; // Mean radius of Earth

export default class App extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      lat: 37.5904827,
      lon: -122.9585187,
      zoom: 7,
      users: [],
      currUserId: -1
    };

    this.onStateClick = this.onStateClick.bind(this);
    this.onRouteClick = this.onRouteClick.bind(this);
    this.onSegmentClick = this.onSegmentClick.bind(this);
    this.onResetSegments = this.onResetSegments.bind(this);
    this.onSendSegments = this.onSendSegments.bind(this);
    this.onFormSubmit = this.onFormSubmit.bind(this);
    this.onUserChange = this.onUserChange.bind(this);
    this.onClinchToggleFor = this.onClinchToggleFor.bind(this);

    this.mapRef = React.createRef();

    this.startMarker = undefined;
    this.endMarker = undefined;
    this.userSegments = [];
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
  
  static toRadians (angle) {
    return angle * (Math.PI / 180);
  }

  static findSegmentPoint(polyline, clicked) {
    // Brute force: iterate through all points, calc distance between coordinate to clicked coordinate. Return closest coordinate
    // Optimized way: Using nearest neighbour algorithm for a 2D space, or a KD tree/quadtree?
    let points = polyline.getLatLngs();
    let shortestDistance = Number.MAX_VALUE;
    let closest;

    // Apply haversine formula to calculate the 'great-circle' distance between two coordinates
    for (let i = 0; i < points.length; i++) {
      let {lat, lng} = points[i];
      let clickedLat = clicked.lat, clickedLng = clicked.lng;

      var lat1 = App.toRadians(lat);
      var lat2 = App.toRadians(clickedLat);
      var deltaLat = App.toRadians(clickedLat) - App.toRadians(lat);
      var deltaLng = App.toRadians(clickedLng) - App.toRadians(lng);

      var a = Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
        Math.cos(lat1) * Math.cos(lat2) *
        Math.sin(deltaLng / 2) * Math.sin(deltaLng / 2);
      var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

      var d = R * c;

      if (d < shortestDistance) {
        shortestDistance = d;
        closest = i;
      }
    }

    return Object.assign(points[closest], {idx: closest});
  }

  static getUsers() {
    return fetch(`/api/users`)
      .then(res => res.json());
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

  static getSegmentsFor(userId) {
    return fetch(`/api/segments/${userId}`)
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
      .then(segments => {
        this.routePromiseDone(segments, '101', 1);
        return App.getUsers();
      })
      .then(users => { this.setState({ users }); });
  }

  getNameForRoute(route) {
    return this.cache[route] ? this.cache[route] : 'State Route';
  }
  
  onClinchToggleFor(i) {
    this.userSegments[i].clinched = !this.userSegments[i].clinched;
    this.setState({
      userSegments: this.userSegments
    });
  }

  onFormSubmit(event) {
    event.preventDefault();
    const user = new FormData(event.target).get('userName');
    event.target.reset(); // clear input fields

    fetch('/api/newUser', {
      method: 'POST',
      mode: 'cors',
      headers: {
        'Content-Type': 'application/json; charset=utf-8'
      },
      body: JSON.stringify({user})
    }).then(res => res.json())
      .then(res => {
        // If new user created, add to end of list. Otherwise just update selected user
        const users = this.state.users;
        if (res.success) {
          users.push({ id: res.userId , user });
        }
        this.setState({ users, currUserId: res.userId });
      });
  }

  onSendSegments() {
    fetch('/api/newUserSegments', {
      method: 'POST',
      mode: 'cors',
      headers: {
        'Content-Type': 'application/json; charset=utf-8'
      },
      body: JSON.stringify({
        userId: this.state.currUserId,
        segments: this.userSegments
      })
    }).then(res => res.json())
    .then(res => {
      this.setState({
        success: true,
        entries: res.entries
      });
      return App.getSegmentsFor(this.state.currUserId);
    })
    .then(apiUserSegments => { //Reload segments, clear current segments to avoid duplicate submissions
      this.setState({
        userSegments: [],
        apiUserSegments
      });
    });
  }

  onResetSegments() {
    this.userSegments = [];
    this.setState({
      userSegments: this.userSegments
    });
  }

  onStateClick(stateId) {
    App.getRoutes(stateId)
      .then(routes => {
        this.setState({ routes });
      });
  }

  // Prevent events occurring twice
  onRouteClick(route, routeId, dir, getAll, event) {
    event.stopPropagation();
    App.getRoute(routeId, dir, getAll)
      .then(segments => this.routePromiseDone(segments, route, routeId));
  }

  // Keep track of clicked points
  onSegmentClick(i, routeId, event) {
    const segLatLng = App.findSegmentPoint(event.target, event.latlng);

    if (!this.startMarker) {
      this.startMarker = segLatLng;
      this.setState({
        startMarker: this.startMarker,
      });
    } else {
      this.userSegments.push({
        route: this.state.route,
        routeId,
        startId: this.startMarker.idx,
        endId: segLatLng.idx,
        clinched: false,
      });
      this.startMarker = undefined;
      this.setState({
        startMarker: this.startMarker,
        userSegments: this.userSegments
      });
    }
  }

  // Change user and load user's segments if any
  onUserChange(event) {
    const currUserId = Number.parseInt(event.target.value, 10);
    this.setState({
      currUserId
    });

    if (currUserId >= 0) {
      App.getSegmentsFor(currUserId)
        .then(apiUserSegments => {
          this.setState({
            apiUserSegments
          });
        });
    }
  }

  // Process array of route segments. There will always be at least one
  routePromiseDone(segments, route, routeId) {
    const tup = segments[0].points[0];
    this.setState({
      route,
      routeId,
      segments,
      lat: tup[0],
      lon: tup[1],
      zoom: App.getZoomForRouteLen(segments.reduce((curr, obj) => curr += obj.points.length, 0))
    });
  }

  render() {
    const { lat, lon, zoom, states, route, routeId, routes, segments, userSegments, apiUserSegments, success, entries, users, currUserId, startMarker } = this.state;
    return (
      <div id="mapGrid">
        <div id="routeUi">
          <h3>Users</h3>
          <select value={currUserId} onChange={this.onUserChange} className="nameFormElement">
            <option value="-1">Select or create a user</option>
            {
              users.map((user) => (
                <option key={user.id} value={user.id}>{user.user}</option>
              ))
            }
          </select>

          <form onSubmit={this.onFormSubmit}>
            <label htmlFor="userName" className="nameFormElement">
              Username
              <input type="text" id="userName" name="userName" className="nameFormElement" />
            </label>
            <br />
            <button type="submit">Create User</button>
          </form>

          <h3>Segments</h3>
          <ul>
            {
              userSegments &&
              userSegments.map((seg, i) => (
                <div className="segRow">
                  <li>
                    {`${this.getNameForRoute(seg.route)} ${seg.route}`}
                    <input type="checkbox" onClick={this.onClinchToggleFor.bind(this, i)}/>
                  </li>
                </div>
              ))
            }
          </ul>
          
          { currUserId >= 0 &&
            <div>
              <button type="button" onClick={this.onSendSegments}>Submit Segments</button>
              <button type="button" onClick={this.onResetSegments}>Clear Segments</button>
            </div>
          }

          {
            success &&
            <p>{`Successfully created ${entries} entries`}</p>
          }

          <h3>States</h3>
          <ul>
            { states && states.map(obj => (
                <li key={obj.initials} className="clickable" onClick={this.onStateClick.bind(this, obj.id)}>{obj.name}</li>
              ))
            }
          </ul>
          <h3>Routes</h3>
          <ul>
            {/* List each route and all route segments */}
            { routes && routes.map(obj => (
              <li key={`${obj[0].route}${obj[0].dir}`} className="clickable" onClick={this.onRouteClick.bind(this, obj[0].route, obj[0].route, obj[0].dir, 'true')}>
                {`${this.getNameForRoute(obj[0].route)} ${obj[0].route} ${obj[0].dir}`}
                { obj.length > 1 && (
                  <ul>
                    {obj.map((seg, i) => (
                      <li key={`segment-${i}`} className="clickable" onClick={this.onRouteClick.bind(this, seg.route, seg.id, "", "false")}>{`Segment ${i + 1}`}</li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        </div>
        <LeafletMap ref={this.mapRef} center={[lat, lon]} zoom={zoom}>
          <TileLayer
            attribution='&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
            url='http://{s}.tile.osm.org/{z}/{x}/{y}.png'
          />
          { segments &&
            segments.map((seg, i) => <Polyline key={`seg-${seg.id}`} onClick={this.onSegmentClick.bind(this, i, seg.id)} positions={seg.points} /> )
          }
          {/* Show unsubmitted user segments if selected route and segment is the same */}
          { userSegments &&
            userSegments.map((seg, i) => 
                seg.routeId === routeId && 
                <Polyline key={`userSeg-${i}`} positions={segments[0].points.slice(seg.startId, seg.endId)} color={ seg.clinched ? "lime" : "yellow" } />
              
            )
          }
          { apiUserSegments &&
            apiUserSegments.map((seg, i) => <Polyline key={`apiSeg-${i}`} positions={seg.points} color={ seg.clinched ? "lime" : "yellow" } /> )
          }
          { startMarker &&
            <Marker position={startMarker} />
          }
        </LeafletMap>
      </div>
    );
  }
}
