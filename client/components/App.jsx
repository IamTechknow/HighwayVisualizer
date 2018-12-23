import React from 'react';
import ReactDOM from 'react-dom';
import { Map as LeafletMap, TileLayer, Polyline, Marker } from 'react-leaflet';

import Collapsible from './Collapsible';

const R = 6371e3; // Mean radius of Earth

export default class CreateApp extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      lat: 37.5904827,
      lon: -122.9585187,
      zoom: 7,
      users: [],
      searchResults: [],
      currUserId: -1
    };

    this.onStateClick = this.onStateClick.bind(this);
    this.onRouteClick = this.onRouteClick.bind(this);
    this.onSegmentClick = this.onSegmentClick.bind(this);
    this.onResetSegments = this.onResetSegments.bind(this);
    this.onSearchRoutes = this.onSearchRoutes.bind(this);
    this.onSendSegments = this.onSendSegments.bind(this);
    this.onFormSubmit = this.onFormSubmit.bind(this);
    this.onUserChange = this.onUserChange.bind(this);
    this.onClinchToggleFor = this.onClinchToggleFor.bind(this);

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

  static findSegmentPoint(polyline, clicked, routeId) {
    // Brute force: iterate through all points, calc distance between coordinate to clicked coordinate. Return closest coordinate
    // Optimized way: Using nearest neighbour algorithm for a 2D space, or a KD tree/quadtree?
    let points = polyline.getLatLngs();
    let shortestDistance = Number.MAX_VALUE;
    let closest;

    // Apply haversine formula to calculate the 'great-circle' distance between two coordinates
    for (let i = 0; i < points.length; i++) {
      let {lat, lng} = points[i];
      let clickedLat = clicked.lat, clickedLng = clicked.lng;

      var lat1 = CreateApp.toRadians(lat);
      var lat2 = CreateApp.toRadians(clickedLat);
      var deltaLat = CreateApp.toRadians(clickedLat) - CreateApp.toRadians(lat);
      var deltaLng = CreateApp.toRadians(clickedLng) - CreateApp.toRadians(lng);

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

    return Object.assign(points[closest], {idx: closest, routeId});
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
      .then(routes => CreateApp.parseRoutes(routes));
  }

  static getRoute(routeId, dir, getAll) {
    const query = dir ? `?dir=${dir}&getAll=${getAll}` : '';
    return fetch(`/api/points/${routeId}${query}`)
      .then(res => res.json());
  }

  static getMapForLiveIds(segments) {
    return new Map(segments.map((seg, i) => [seg.id, i]));
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
    this.cache = CreateApp.buildCache();
    CreateApp.getStates()
      .then(states => {
        this.setState({ states, currState: states[0] });
        return CreateApp.getRoutes(states[0].id);
      })
      .then(routes => {
        this.setState({ routes });
        return CreateApp.getRoute(1);
      })
      .then(segments => {
        this.routePromiseDone(segments, '101', 1);
        return CreateApp.getUsers();
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

    if (!user) { // Do not allow '' as a user
      return;
    }

    fetch('/api/newUser', {
      method: 'POST',
      mode: 'cors',
      headers: {
        'Content-Type': 'CreateApplication/json; charset=utf-8'
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
  
  // Filter query based on state routes, which is a 2-D array so use reduce
  onSearchRoutes(event) {
    const results = this.state.routes.reduce((accum, curr) => accum.concat(curr.filter(obj => obj.route.indexOf(event.target.value) >= 0 && obj.seg === 0)), []);

    this.setState({ searchResults: event.target.value ? results.slice(0, 10) : [] });
  }

  onSendSegments() {
    fetch('/api/newUserSegments', {
      method: 'POST',
      mode: 'cors',
      headers: {
        'Content-Type': 'CreateApplication/json; charset=utf-8'
      },
      body: JSON.stringify({
        userId: this.state.currUserId,
        segments: this.userSegments
      })
    }).then(res => res.json())
    .then(res => {
      this.setState({
        success: true,
        entries: res.entries,
        userSegments: []
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
    CreateApp.getRoutes(stateId)
      .then(routes => {
        this.setState({ routes });
      });
  }

  // Prevent events occurring twice
  onRouteClick(route, routeId, dir, getAll, event) {
    event.stopPropagation();
    
    CreateApp.getRoute(routeId, dir, getAll)
      .then(segments => this.routePromiseDone(segments, route, routeId));
  }

  // Keep track of clicked points
  onSegmentClick(i, routeId, event) {
    const segLatLng = CreateApp.findSegmentPoint(event.target, event.latlng, routeId);

    if (!this.startMarker) {
      this.startMarker = segLatLng;
      this.setState({
        startMarker: this.startMarker
      });
    } else {
      // Check whether both points have the same route ID
      if (this.startMarker.routeId === routeId) {
        const startId = Math.min(this.startMarker.idx, segLatLng.idx),
          endId = Math.max(this.startMarker.idx, segLatLng.idx);
        this.userSegments.push({
          route: this.state.route,
          routeId,
          startId,
          endId,
          clinched: false
        });
      } else {
        // Figure out higher and lower points
        const start = this.startMarker.routeId > routeId ? segLatLng : this.startMarker;
        const end = this.startMarker.routeId < routeId ? segLatLng : this.startMarker;
        const idMap = CreateApp.getMapForLiveIds(this.state.segments);

        // Add entire user segments if needed
        if (end.routeId - start.routeId > 1) {
          for (let i = start.routeId + 1; i < end.routeId; i += 1) {
            this.userSegments.push({
              route: this.state.route,
              routeId: i,
              startId: 0,
              endId: this.state.segments[idMap.get(i)].points.length,
              clinched: false
            });
          }
        }

        // Add user segments from the two route segments
        this.userSegments.push({
          route: this.state.route,
          routeId: start.routeId,
          startId: start.idx,
          endId: this.state.segments[idMap.get(start.routeId)].points.length,
          clinched: false
        });

        this.userSegments.push({
          route: this.state.route,
          routeId: end.routeId,
          startId: 0,
          endId: end.idx,
          clinched: false
        });
      }

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
  }

  // Process array of route segments. There will always be at least one
  routePromiseDone(segments, route, routeId) {
    const tup = segments[0].points[0];
    this.startMarker = undefined;

    this.setState({
      route,
      routeId,
      segments,
      startMarker: this.startMarker,
      lat: tup[0],
      lon: tup[1],
      zoom: CreateApp.getZoomForRouteLen(segments.reduce((curr, obj) => curr += obj.points.length, 0))
    });
  }

  render() {
    const { lat, lon, zoom, states, route, routeId, 
      routes, segments, userSegments, success, entries, users, 
      currUserId, currState = '', startMarker, searchResults } = this.state;
    const liveSegs = segments ? CreateApp.getMapForLiveIds(segments) : undefined;

    return (
      <div id="mapGrid">
        <div id="routeUi">
          <Collapsible title="Users" open="true">
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
          </Collapsible>

          <Collapsible title="User Segments">
            <ul>
              {
                userSegments &&
                userSegments.map((seg, i) => (
                  <div key={`userSegItem-${i}`} className="segRow">
                    <li>
                      {`${this.getNameForRoute(seg.route)} ${seg.route}`}
                      <input type="checkbox" onClick={this.onClinchToggleFor.bind(this, i)}/>
                    </li>
                  </div>
                ))
              }
            </ul>

            { currUserId >= 0 &&
              <button type="button" onClick={this.onSendSegments}>Submit Segments</button>
            }

            <button type="button" onClick={this.onResetSegments}>Clear User Segments</button>

            {
              success &&
              <p>{`Successfully created ${entries} entries`}</p>
            }
          </Collapsible>

          <Collapsible title="States" open="true">
            <ul>
              { states && states.map(obj => (
                  <li key={obj.initials} className="clickable" onClick={this.onStateClick.bind(this, obj.id)}>{obj.name}</li>
                ))
              }
            </ul>
          </Collapsible>

          <Collapsible title="Routes">
            <ul>
              {/* List each route and all route segments */}
              { routes && routes.map(obj => (
                <li key={`${obj[0].route}${obj[0].dir}`} className="clickable" onClick={this.onRouteClick.bind(this, obj[0].route, obj[0].route, obj[0].dir, true)}>
                  {`${this.getNameForRoute(obj[0].route)} ${obj[0].route} ${obj[0].dir}`}
                  { obj.length > 1 && (
                    <ul>
                      {obj.map((seg, i) => (
                        <li key={`segment-${seg.id}`} className="clickable" onClick={this.onRouteClick.bind(this, seg.route, seg.id, "", false)}>{`Segment ${i + 1}`}</li>
                      ))}
                    </ul>
                  )}
                </li>
              ))}
            </ul>
          </Collapsible>

          <Collapsible title="Search" open="true">
            <input type="text" size="25" className="nameFormElement" placeholder={`Search ${currState.name} routes...`} onChange={this.onSearchRoutes} />
            <ul>
              {
                searchResults.map(obj => (
                  <li key={`${obj.route}${obj.dir}`} className="clickable" onClick={this.onRouteClick.bind(this, obj.route, obj.route, obj.dir, true)}>
                    {`${this.getNameForRoute(obj.route)} ${obj.route} ${obj.dir}`}
                  </li>
                ))
              }
            </ul>
          </Collapsible>
        </div>

        <LeafletMap center={[lat, lon]} zoom={zoom}>
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
              liveSegs && liveSegs.has(seg.routeId) &&
              <Polyline key={`userSeg-${i}`} positions={segments[liveSegs.get(seg.routeId)].points.slice(seg.startId, seg.endId)} color={ seg.clinched ? "lime" : "yellow" } />
            )
          }
          { startMarker &&
            <Marker position={startMarker} />
          }
        </LeafletMap>
      </div>
    );
  }
}
