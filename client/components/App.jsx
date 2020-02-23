import React from 'react';
import {
  Map, TileLayer, Polyline, Marker,
} from 'react-leaflet';

import APIClient from './APIClient';
import Highways from './Highways';
import RouteDrawer from './RouteDrawer';

const MANUAL = 0, CLINCH = 1;

export default class CreateApp extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      currUserId: -1,
      currMode: MANUAL,
      lat: 37.5904827,
      lon: -122.9585187,
      submitData: {},
      userSegments: [],
    };

    this.getRouteName = this.getRouteName.bind(this);
    this.onStateClick = this.onStateClick.bind(this);
    this.onRouteItemClick = this.onRouteItemClick.bind(this);
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

  // Load all data from API endpoints
  componentDidMount() {
    APIClient.getStates()
      .then((states) => {
        this.setState({ states, stateId: states[0].id });
        return APIClient.getSegments(states[0].id);
      })
      .then((rawSegments) => {
        this.highwayData.buildStateSegmentsData(rawSegments);
        this.setState({ segments: APIClient.parseRawSegments(rawSegments) });
        return APIClient.getSegment(rawSegments[0].id)
          .then((segmentData) => {
            this.segmentPromiseDone(segmentData, rawSegments[0].routeNum, rawSegments[0].id);
            return APIClient.getUsers();
          });
      })
      .then((users) => {
        this.setState({ users });
      });
  }

  onClinchToggleFor(i) {
    this.highwayData.toggleUserSegment(i);
    this.setState({
      userSegments: this.highwayData.userSegments,
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
        'Content-Type': 'application/json; charset=utf-8',
      },
      body: JSON.stringify({ user }),
    }).then((res) => res.json())
      .then((res) => {
        // If new user created, add to end of list. Otherwise just update selected user
        const { users } = this.state;
        if (res.success) {
          users.push({ id: res.userId, user });
        }
        this.setState({ users, currUserId: res.userId });
      });
  }

  onSetMode(currMode) {
    this.setState({ currMode });
  }

  onSendUserSegments() {
    const { currUserId } = this.state;
    fetch('/api/user_segments/new', {
      method: 'POST',
      mode: 'cors',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
      },
      body: JSON.stringify({
        userId: currUserId,
        userSegments: this.highwayData.userSegments,
      }),
    }).then((res) => res.json())
      .then((res) => {
        this.highwayData.clearUserSegments();
        this.setState({
          submitData: { success: true, entries: res.entries },
          userSegments: [],
        });
      });
  }

  onResetUserSegments() {
    this.highwayData.clearUserSegments();
    this.setState({ userSegments: [] });
  }

  onRouteItemClick(event, segmentOfRoute) {
    const { currMode, stateId } = this.state;
    const {
      id, routeNum, type, dir,
    } = segmentOfRoute;
    event.stopPropagation();

    APIClient.getRoute(stateId, routeNum, type, dir)
      .then((segments) => this.segmentPromiseDone(segments, routeNum, id));
    if (currMode === CLINCH) {
      this.highwayData.addAllSegments(routeNum, type, dir);
      this.setState({ userSegments: this.highwayData.userSegments });
    }
  }

  // Prevent events occurring twice
  onSegmentItemClick(event, routeStr, segmentId) {
    const { currMode } = this.state;
    event.stopPropagation();

    APIClient.getSegment(segmentId)
      .then((segments) => this.segmentPromiseDone(segments, routeStr, segmentId));
    if (currMode === CLINCH) {
      this.highwayData.addFullSegment(routeStr, segmentId);
      this.setState({ userSegments: this.highwayData.userSegments });
    }
  }

  // Keep track of clicked points
  onSegmentClick(i, segmentId, event) {
    const { routeNum, segmentData } = this.state;
    const segLatLng = this.highwayData.findSegmentPoint(event.target, event.latlng, segmentId);

    if (!this.startMarker) {
      this.startMarker = segLatLng;
      this.setState({ startMarker: this.startMarker });
    } else {
      this.highwayData.addNewUserSegments(
        this.startMarker,
        segLatLng,
        routeNum,
        segmentId,
        segmentData,
      );
      this.startMarker = undefined;
      this.setState({
        startMarker: this.startMarker,
        userSegments: this.highwayData.userSegments,
      });
    }
  }

  // Rebuild highway data for the state and change the route
  onStateClick(stateId) {
    APIClient.getSegments(stateId).then((rawSegments) => {
      this.highwayData.buildStateSegmentsData(rawSegments);
      return APIClient.getSegment(rawSegments[0].id)
        .then((segmentData) => this.segmentPromiseDone(
          segmentData, rawSegments[0].routeNum, rawSegments[0].id,
        ))
        .then(() => this.setState({
          segments: APIClient.parseRawSegments(rawSegments),
          stateId,
        }));
    });
  }

  // Change user and load user's segments if any
  onUserChange(event) {
    const currUserId = Number.parseInt(event.target.value, 10);
    this.setState({ currUserId });
  }

  getRouteName(segmentObj) {
    const { states, stateId } = this.state;

    // One exception for D.C. Route 295
    const routeName = states[stateId - 1].name === 'District' && segmentObj.type === 4
      ? `D.C. Route ${segmentObj.routeNum}`
      : `${Highways.getRoutePrefix(segmentObj.type)} ${segmentObj.routeNum}`;
    return Highways.shouldUseRouteDir(states[stateId - 1].name)
      ? `${routeName} ${segmentObj.dir}`
      : routeName;
  }

  // Process array of route segments. There will always be at least one
  segmentPromiseDone(segmentData, routeNum, segmentId) {
    const { dir, type } = this.highwayData.segmentData[segmentData[0].id];
    const [midSegmentId, midPointIdx] = segmentData.length > 1
      ? this.highwayData.getCenterOfRoute(routeNum + dir, type)
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

  render() {
    const {
      lat, lon, states, stateId, routeNum, segmentId,
      segments, segmentData, userSegments, users,
      currUserId, currMode, startMarker, submitData,
    } = this.state;
    const liveSegs = segmentData
      ? Highways.getMapForLiveIds(segmentData)
      : undefined;

    if (!users) { // Don't render until all data loaded
      return null;
    }
    const { dir, type } = this.highwayData.segmentData[segmentData[0].id];
    const wholeRouteSelected = segmentData.length > 1
      || this.highwayData.idCache[type][routeNum + dir].length === 1;
    const zoom = this.highwayData.getZoomForSegmentId(
      wholeRouteSelected ? routeNum + dir : segmentId,
      wholeRouteSelected,
    );

    return (
      <div>
        <Map className="mapStyle" center={[lat, lon]} zoom={zoom} zoomControl={false}>
          <TileLayer
            attribution='&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
            url="http://{s}.tile.osm.org/{z}/{x}/{y}.png"
          />
          { segmentData && segmentData.map((seg, i) => (
            <Polyline
              key={`seg-${seg.id}`}
              onClick={(event) => this.onSegmentClick(i, seg.id, event)}
              positions={seg.points}
            />
          ))}
          {/* Show unsubmitted user segments if selected route and segment is the same */}
          { userSegments && userSegments.map(
            (userSeg) => liveSegs && liveSegs.has(userSeg.segmentId)
              && (
              <Polyline
                key={userSeg.toString()}
                positions={
                  segmentData[liveSegs.get(userSeg.segmentId)].points.slice(
                    userSeg.startId,
                    userSeg.endId + 1,
                  )
                }
                color={userSeg.clinched ? 'lime' : 'yellow'}
              />
              ),
          )}
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
          onRouteItemClick={this.onRouteItemClick}
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
