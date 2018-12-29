import React from 'react';
import ReactDOM from 'react-dom';
import { Map as LeafletMap, TileLayer, Polyline, Marker } from 'react-leaflet';

import Collapsible from './Collapsible';
import Highways from './Highways';

const MANUAL = 0, CLINCH = 1;

export default class CreateApp extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      lat: 37.5904827,
      lon: -122.9585187,
      zoom: 7,
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
    this.onModeClick = this.onModeClick.bind(this);

    this.startMarker = undefined;
    this.endMarker = undefined;
    this.highwayData = new Highways();
    this.currMode = MANUAL;
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
      .then(res => res.json());
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
    CreateApp.getStates()
      .then(states => {
        this.setState({ states, currState: states[0] });
        this.highwayData.buildCacheFor(states[0]);
        return CreateApp.getRoutes(states[0].id);
      })
      .then(routes => {
        this.highwayData.buildStateRoutesData(routes);
        this.setState({ routes: CreateApp.parseRoutes(routes) });
        return CreateApp.getRoute(1);
      })
      .then(segments => {
        this.routePromiseDone(segments, '101', 1);
        return CreateApp.getUsers();
      })
      .then(users => {
        users.unshift();
        this.setState({ users });
      });
  }

  onClinchToggleFor(i) {
    this.highwayData.toggleUserSegment(i);
    this.setState({
      userSegments: this.highwayData.userSegments
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

  onModeClick(mode) {
    this.currMode = mode;
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
        'Content-Type': 'application/json; charset=utf-8'
      },
      body: JSON.stringify({
        userId: this.state.currUserId,
        segments: this.userSegments
      })
    }).then(res => res.json())
    .then(res => {
      this.highwayData.clearUserSegments();
      this.setState({
        success: true,
        entries: res.entries,
        userSegments: []
      });
    });
  }

  onResetSegments() {
    this.highwayData.clearUserSegments();
    this.setState({
      userSegments: []
    });
  }

  onStateClick(stateId) {
    CreateApp.getRoutes(stateId)
      .then(routes => {
        this.setState({ routes: CreateApp.parseRoutes(routes) });
      });
  }

  // Prevent events occurring twice
  onRouteClick(route, routeId, dir, getAll, event) {
    event.stopPropagation();

    CreateApp.getRoute(routeId, dir, getAll)
      .then(segments => this.routePromiseDone(segments, route, routeId));

    // Create segment if clicked and clinch mode is set
    if (this.currMode === CLINCH) {
      if (!getAll) {
        this.highwayData.addFullSegment(route, routeId);
      } else {
        this.highwayData.addAllSegments(route, dir);
      }

      this.setState({
        userSegments: this.highwayData.userSegments
      });
    }
  }

  // Keep track of clicked points
  onSegmentClick(i, routeId, event) {
    const segLatLng = this.highwayData.findSegmentPoint(event.target, event.latlng, routeId);

    if (!this.startMarker) {
      this.startMarker = segLatLng;
      this.setState({
        startMarker: this.startMarker
      });
    } else {
      this.highwayData.addNewUserSegments(this.startMarker, segLatLng, this.state.route, routeId, this.state.segments);

      this.startMarker = undefined;
      this.setState({
        startMarker: this.startMarker,
        userSegments: this.highwayData.userSegments
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
      zoom: this.highwayData.getZoomForRouteLen(segments.reduce((curr, obj) => curr += obj.points.length, 0))
    });
  }

  render() {
    const { lat, lon, zoom, states, route, routeId, 
      routes, segments, userSegments, success, entries, users, 
      currUserId, currState = '', startMarker, searchResults } = this.state;
    const liveSegs = segments ? this.highwayData.getMapForLiveIds(segments) : undefined;

    return (
      <div id="mapGrid">
        <div id="routeUi">
          <h3>
            Create Mode
            <span className="segRow">
              <button type="button" onClick={this.onModeClick.bind(this, MANUAL)}>Manual</button>
              <button type="button" onClick={this.onModeClick.bind(this, CLINCH)}>Clinch</button>
            </span>
          </h3>
          
          <Collapsible title="Users" open="true">
            <select value={currUserId} onChange={this.onUserChange} className="nameFormElement">
              <option key={-1} value={-1}>Select or create User</option>
              { users &&
                users.map((user) => (<option key={user.id} value={user.id}>{user.user}</option>)) 
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
                      {`${this.highwayData.getNameForRoute(seg.route)} ${seg.route} Segment ${seg.seg}`}
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
                  {`${this.highwayData.getNameForRoute(obj[0].route)} ${obj[0].route} ${obj[0].dir}`}
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
                    {`${this.highwayData.getNameForRoute(obj.route)} ${obj.route} ${obj.dir}`}
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
