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
    this.onSegmentClick = this.onSegmentClick.bind(this);
    this.onSegmentItemClick = this.onSegmentItemClick.bind(this);
    this.onResetUserSegments = this.onResetUserSegments.bind(this);
    this.onSendUserSegments = this.onSendUserSegments.bind(this);
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

  // Get segments then organize them by route numbers
  // Use a set to maintain whether or not the route number and direction
  // is repeated. If it is, push to array, otherwise add to new array
  static getSegments(stateId) {
    return fetch(`/api/segments/${stateId}`)
      .then(res => res.json());
  }

  // If getAll, then the state and route number should be provided,
  // otherwise provide the route ID of the segment.
  // Route direction is only used for California.
  static getSegment(segmentId, dir, getAll, stateId) {
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

    return fetch(`/api/points/${segmentId}${query}`)
      .then(res => res.json());
  }

  static parseSegments(rawSegments) {
    let set = new Set();
    let organized = [];
    let count = -1;

    for (let seg of rawSegments) {
      const key = `${seg.routeNum}${seg.dir}`;

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
        return CreateApp.getSegments(states[0].id);
      })
      .then(rawSegments => {
        this.highwayData.buildStateSegmentsData(rawSegments);
        this.setState({ segments: CreateApp.parseSegments(rawSegments) });
        return CreateApp.getSegment(1);
      })
      .then(segment => {
        this.segmentPromiseDone(segment, '101', 1);
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

  onSendUserSegments() {
    fetch('/api/user_segments/new', {
      method: 'POST',
      mode: 'cors',
      headers: {
        'Content-Type': 'application/json; charset=utf-8'
      },
      body: JSON.stringify({
        userId: this.state.currUserId,
        userSegments: this.highwayData.userSegments
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

  onResetUserSegments() {
    this.highwayData.clearUserSegments();
    this.setState({ userSegments: [] });
  }

  // Prevent events occurring twice
  onSegmentItemClick(event, routeStr, segmentId, dir, getAll) {
    const {currMode} = this.state;
    event.stopPropagation();

    CreateApp.getSegment(segmentId, dir, getAll, this.state.stateId)
      .then(segments => this.segmentPromiseDone(segments, routeStr, segmentId));

    // Create segment if clicked and clinch mode is set
    if (currMode === CLINCH) {
      if (!getAll) {
        this.highwayData.addFullSegment(routeStr, segmentId);
      } else {
        this.highwayData.addAllSegments(routeStr, dir);
      }
      this.setState({ userSegments: this.highwayData.userSegments });
    }
  }

  // Keep track of clicked points
  onSegmentClick(i, segmentId, event) {
    const segLatLng = this.highwayData.findSegmentPoint(event.target, event.latlng, segmentId);

    if (!this.startMarker) {
      this.startMarker = segLatLng;
      this.setState({ startMarker: this.startMarker });
    } else {
      this.highwayData.addNewUserSegments(this.startMarker, segLatLng, this.state.routeNum, segmentId, this.state.segmentData);
      this.startMarker = undefined;
      this.setState({
        startMarker: this.startMarker,
        userSegments: this.highwayData.userSegments
      });
    }
  }

  // Rebuild highway data for the state and change the route
  onStateClick(stateId) {
    CreateApp.getSegments(stateId).then(rawSegments => {
      this.highwayData.buildCacheFor(this.state.states[stateId - 1].name);
      this.highwayData.buildStateSegmentsData(rawSegments);
      return CreateApp.getSegment(rawSegments[0].id, rawSegments[0].dir, false, stateId)
        .then(segmentData => this.segmentPromiseDone(segmentData, rawSegments[0].routeNum, rawSegments[0].id))
        .then(() => this.setState({
          segments: CreateApp.parseSegments(rawSegments),
          stateId
        }));
    });
  }

  // Change user and load user's segments if any
  onUserChange(event) {
    const currUserId = Number.parseInt(event.target.value, 10);
    this.setState({ currUserId });
  }

  // Process array of route segments. There will always be at least one
  segmentPromiseDone(segmentData, routeNum, segmentId) {
    const [midSegmentId, midPointIdx] = segmentData.length > 1
      ? this.highwayData.getCenterOfRoute(
        routeNum + this.highwayData.segmentData[segmentData[0].id].dir
      )
      : [0, Math.floor(segmentData[0].points.length / 2)];
    const centerTup = segmentData[midSegmentId].points[midPointIdx];
    this.startMarker = undefined;

    this.setState({
      routeNum,
      segmentId,
      segmentData,
      startMarker: this.startMarker,
      lat: centerTup[0],
      lon: centerTup[1],
    });
  }

  getRouteName(segmentObj) {
    const {states, stateId} = this.state;

    let routeName = `${this.highwayData.getRoutePrefix(segmentObj.routeNum)} ${segmentObj.routeNum}`;
    return states[stateId - 1].name === 'California'
      ? routeName + ` ${segmentObj.dir}`
      : routeName;
  }

  render() {
    const { lat, lon, states, stateId, routeNum, segmentId,
      segments, segmentData, userSegments, users,
      currUserId, currMode, startMarker, submitData } = this.state;
    const liveSegs = segmentData ? this.highwayData.getMapForLiveIds(segmentData) : undefined;

    if (!users) { // Don't render until all data loaded
      return null;
    }
    const routeAndDir = routeNum + this.highwayData.segmentData[segmentData[0].id].dir;
    const wholeRouteSelected = segmentData.length > 1 || this.highwayData.idCache[routeAndDir].length === 1;
    const zoom = this.highwayData.getZoomForSegmentId(wholeRouteSelected ? routeAndDir : segmentId, wholeRouteSelected);

    return (
      <div>
        <Map className="mapStyle" center={[lat, lon]} zoom={zoom} zoomControl={false}>
          <TileLayer
            attribution='&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
            url='http://{s}.tile.osm.org/{z}/{x}/{y}.png'
          />
          { segmentData &&
            segmentData.map((seg, i) => <Polyline key={`seg-${seg.id}`} onClick={this.onSegmentClick.bind(this, i, seg.id)} positions={seg.points} /> )
          }
          {/* Show unsubmitted user segments if selected route and segment is the same */}
          { userSegments && userSegments.map((userSeg, i) =>
              liveSegs && liveSegs.has(userSeg.segmentId) &&
              <Polyline key={`userSeg-${i}`} positions={segmentData[liveSegs.get(userSeg.segmentId)].points.slice(userSeg.startId, userSeg.endId + 1)} color={ userSeg.clinched ? "lime" : "yellow" } />
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
          onResetUserSegments={this.onResetUserSegments}
          onSegmentItemClick={this.onSegmentItemClick}
          onSendUserSegments={this.onSendUserSegments}
          onSetMode={this.onSetMode}
          onStateClick={this.onStateClick}
          onUserChange={this.onUserChange}
          segments={segments}
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
