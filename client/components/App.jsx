import React from 'react';
import ReactDOM from 'react-dom';
import { Map, TileLayer, Polyline, Marker } from 'react-leaflet';

import Highways from './Highways';
import RouteDrawer from './RouteDrawer';

const MANUAL = 0, CLINCH = 1;

export default class CreateApp extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      currMode: MANUAL,
      lat: 37.5904827,
      lon: -122.9585187,
      submitData: {},
    };

    this.getRouteName = this.getRouteName.bind(this);
    this.onStateClick = this.onStateClick.bind(this);
    this.onRouteClick = this.onRouteClick.bind(this);
    this.onSegmentClick = this.onSegmentClick.bind(this);
    this.onResetSegments = this.onResetSegments.bind(this);
    this.onSendSegments = this.onSendSegments.bind(this);
    this.onFormSubmit = this.onFormSubmit.bind(this);
    this.onUserChange = this.onUserChange.bind(this);
    this.onClinchToggleFor = this.onClinchToggleFor.bind(this);
    this.onSetMode = this.onSetMode.bind(this);

    this.startMarker = undefined;
    this.endMarker = undefined;
    this.highwayData = new Highways();
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

  // If getAll, then the state and route number should be provided,
  // otherwise provide the route ID of the segment.
  // Route direction is only used for California.
  static getRoute(routeId, dir, getAll, stateId) {
    let query = dir || getAll ? '?' : '';
    if (dir && stateId === 1) {
      query += `dir=${dir}`;
    }

    if (getAll) {
      if (dir) {
        query += '&';
      }
      query += `getAll=${getAll}&stateId=${stateId}`;
    }

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
        this.setState({ states, stateId: states[0].id });
        this.highwayData.buildCacheFor(states[0].name);
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

  onSetMode(currMode) {
    this.setState({currMode});
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
        segments: this.highwayData.userSegments
      })
    }).then(res => res.json())
    .then(res => {
      this.highwayData.clearUserSegments();
      this.setState({
        submitData: {success: true, entries: res.entries},
        userSegments: []
      });
    });
  }

  onResetSegments() {
    this.highwayData.clearUserSegments();
    this.setState({ userSegments: [] });
  }

  // Prevent events occurring twice
  onRouteClick(event, route, routeId, dir, getAll) {
    const {currMode} = this.state;
    event.stopPropagation();

    CreateApp.getRoute(routeId, dir, getAll, this.state.stateId)
      .then(segments => this.routePromiseDone(segments, route, routeId));

    // Create segment if clicked and clinch mode is set
    if (currMode === CLINCH) {
      if (!getAll) {
        this.highwayData.addFullSegment(route, routeId);
      } else {
        this.highwayData.addAllSegments(route, dir);
      }
      this.setState({ userSegments: this.highwayData.userSegments });
    }
  }

  // Keep track of clicked points
  onSegmentClick(i, routeId, event) {
    const segLatLng = this.highwayData.findSegmentPoint(event.target, event.latlng, routeId);

    if (!this.startMarker) {
      this.startMarker = segLatLng;
      this.setState({ startMarker: this.startMarker });
    } else {
      this.highwayData.addNewUserSegments(this.startMarker, segLatLng, this.state.route, routeId, this.state.segments);

      this.startMarker = undefined;
      this.setState({
        startMarker: this.startMarker,
        userSegments: this.highwayData.userSegments
      });
    }
  }

  onStateClick(stateId) {
    CreateApp.getRoutes(stateId).then(routes => {
      this.highwayData.buildCacheFor(this.state.states[stateId - 1].name);
      this.highwayData.buildStateRoutesData(routes);
      this.setState({
        routes: CreateApp.parseRoutes(routes),
        stateId
      });
    });
  }

  // Change user and load user's segments if any
  onUserChange(event) {
    const currUserId = Number.parseInt(event.target.value, 10);
    this.setState({ currUserId });
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
    });
  }

  getRouteName(routeObj) {
    const {states, stateId} = this.state;

    let routeName = `${this.highwayData.getRoutePrefix(routeObj.route)} ${routeObj.route}`;
    if (states[stateId - 1].name === 'California') {
      routeName += ` ${routeObj.dir}`;
    }

    return routeName;
  }

  render() {
    const { lat, lon, states, stateId, route, routeId,
      routes, segments, userSegments, users,
      currUserId, currMode, startMarker, submitData } = this.state;
    const liveSegs = segments ? this.highwayData.getMapForLiveIds(segments) : undefined;

    if (!users) { // Don't render until all data loaded
      return null;
    }
    const routeAndDir = route + this.highwayData.routeData[segments[0].id].dir;
    const wholeRouteSelected = segments.length > 1 || this.highwayData.idCache[routeAndDir].length === 1;
    const zoom = this.highwayData.getZoomForRouteId(wholeRouteSelected ? routeAndDir : routeId, wholeRouteSelected);

    return (
      <div>
        <Map className="mapStyle" center={[lat, lon]} zoom={zoom} zoomControl={false}>
          <TileLayer
            attribution='&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
            url='http://{s}.tile.osm.org/{z}/{x}/{y}.png'
          />
          { segments &&
            segments.map((seg, i) => <Polyline key={`seg-${seg.id}`} onClick={this.onSegmentClick.bind(this, i, seg.id)} positions={seg.points} /> )
          }
          {/* Show unsubmitted user segments if selected route and segment is the same */}
          { userSegments && userSegments.map((seg, i) =>
              liveSegs && liveSegs.has(seg.routeId) &&
              <Polyline key={`userSeg-${i}`} positions={segments[liveSegs.get(seg.routeId)].points.slice(seg.startId, seg.endId + 1)} color={ seg.clinched ? "lime" : "yellow" } />
            )
          }
          { startMarker && <Marker position={startMarker} /> }
        </Map>
        <RouteDrawer
          currMode={currMode}
          currUserId={currUserId}
          getRouteName={this.getRouteName}
          highwayData={this.highwayData}
          onClinchToggleFor={this.onClinchToggleFor}
          onFormSubmit={this.onFormSubmit}
          onResetSegments={this.onResetSegments}
          onRouteClick={this.onRouteClick}
          onSendSegments={this.onSendSegments}
          onSetMode={this.onSetMode}
          onStateClick={this.onStateClick}
          onUserChange={this.onUserChange}
          routes={routes}
          stateId={stateId}
          states={states}
          submitData={submitData}
          userSegments={userSegments}
          users={users}
        />
      </div>
    );
  }
}
