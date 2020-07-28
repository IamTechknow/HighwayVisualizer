import React from 'react';
import {
  Map, TileLayer, Polyline, Popup,
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
      initFailed: false,
      submitData: null,
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

    this.popupCoords = undefined;
    this.highwayData = new Highways();
  }

  // Load all data from API endpoints
  componentDidMount() {
    APIClient.getStates()
      .then((states) => {
        if (states.length === 0) {
          this.setState({ initFailed: true });
          return null;
        }
        const { id } = states[0];
        this.setState({ states, stateId: id });
        this.highwayData.setStates(states);
        return APIClient.getSegments(id);
      })
      .then((rawSegments) => {
        if (!rawSegments || rawSegments.length === 0) {
          this.setState({ initFailed: true });
          return null;
        }
        this.highwayData.buildStateSegmentsData(rawSegments);
        this.setState({ segments: APIClient.parseRawSegments(rawSegments) });
        const { id, routeNum } = rawSegments[0];
        return APIClient.getSegment(id)
          .then((segmentData) => {
            this.segmentPromiseDone(segmentData, routeNum, id);
            return APIClient.getUsers();
          });
      })
      .then((users) => {
        this.setState({ users });
      })
      .catch(() => {
        this.setState({ initFailed: true });
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
    APIClient.postUser(user)
      .then((res) => {
        // If new user created, add to end of list. Otherwise just update selected user
        const { users } = this.state;
        if (res.success) {
          users.push({ id: res.userId, user });
        }
        this.setState({ users, currUserId: res.userId ?? -1, submitData: res });
      });
  }

  onSetMode(currMode) {
    this.setState({ currMode });
  }

  onSendUserSegments() {
    const { currUserId } = this.state;
    APIClient.postUserSegments(currUserId, this.highwayData.userSegments)
      .then((res) => {
        this.highwayData.clearUserSegments();
        this.setState({
          submitData: res,
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

    const routePromise = APIClient.getRoute(stateId, routeNum, type, dir)
      .then((segments) => this.segmentPromiseDone(segments, routeNum, id));
    const stateTitle = this.highwayData.getState(stateId).title;
    if (stateTitle === 'California') {
      routePromise.then(() => APIClient.getConcurrenyPoints(stateId, routeNum, dir))
        .then((concurrentSegments) => this.setState({ concurrentSegments }));
    }
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
    const segLatLng = Highways.findSegmentPoint(event.target, event.latlng, segmentId);

    if (!this.popupCoords) {
      this.popupCoords = segLatLng;
      this.setState({ popupCoords: this.popupCoords });
    } else {
      this.highwayData.addNewUserSegments(
        this.popupCoords,
        segLatLng,
        routeNum,
        segmentId,
        segmentData,
      );
      this.popupCoords = undefined;
      this.setState({
        popupCoords: this.popupCoords,
        userSegments: this.highwayData.userSegments,
      });
    }
  }

  // Rebuild highway data for the state and change the route
  onStateClick(stateId) {
    APIClient.getSegments(stateId).then((rawSegments) => {
      const { id, routeNum } = rawSegments[0];
      this.highwayData.buildStateSegmentsData(rawSegments);
      return APIClient.getSegment(id)
        .then((segmentData) => this.segmentPromiseDone(
          segmentData, routeNum, id,
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
    const { stateId } = this.state;
    const stateIdentifier = this.highwayData.getState(stateId).identifier;

    // One exception for D.C. Route 295
    const routeName = stateIdentifier === 'District' && segmentObj.type === 4
      ? `D.C. Route ${segmentObj.routeNum}`
      : `${Highways.getRoutePrefix(segmentObj.type)} ${segmentObj.routeNum}`;
    return this.highwayData.shouldUseRouteDir(stateId)
      ? `${routeName} ${segmentObj.dir}`
      : routeName;
  }

  // Process array of route segments. There will always be at least one
  segmentPromiseDone(segmentData, routeNum, segmentId) {
    const firstSegment = segmentData[0];
    const { dir, type } = this.highwayData.segmentData[firstSegment.id];
    const [midSegmentId, midPointIdx] = segmentData.length > 1
      ? this.highwayData.getCenterOfRoute(routeNum + dir, type)
      : [0, Math.floor(firstSegment.points.length / 2)];
    const [centerLat, centerLon] = segmentData[midSegmentId].points[midPointIdx];
    this.popupCoords = undefined;

    this.setState({
      concurrentSegments: [],
      routeNum,
      segmentId,
      segmentData,
      popupCoords: this.popupCoords,
      lat: centerLat,
      lon: centerLon,
    });
  }

  render() {
    const {
      initFailed, lat, lon, states, stateId, routeNum, segmentId,
      segments, segmentData, concurrentSegments, userSegments, users,
      currUserId, currMode, popupCoords, submitData,
    } = this.state;
    if (initFailed) {
      return (
        <div>
          <h3>
            It appears the backend service is offline or data has not been loaded.
            Please try again later.
          </h3>
        </div>
      );
    }

    if (!users) { // Don't render until all data loaded
      return null;
    }

    const firstSegment = segmentData[0];
    const { dir, type } = this.highwayData.segmentData[firstSegment.id];
    const wholeRouteSelected = segmentData.length > 1
      || this.highwayData.getSegmentIds(type, routeNum + dir).length === 1;
    const zoom = this.highwayData.getZoomForSegmentId(
      wholeRouteSelected ? routeNum + dir : segmentId,
      wholeRouteSelected,
    );
    const popupSeg = popupCoords !== undefined
      ? this.highwayData.segmentData[popupCoords.segmentId]
      : undefined;
    const liveSegs = segmentData
      ? Highways.getMapForLiveIds(segmentData)
      : undefined;

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
          { concurrentSegments && concurrentSegments.map((seg) => (
            <Polyline key={`concurrency-${seg.id}`} positions={seg.points} />
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
          { popupCoords
            && (
            <Popup position={popupCoords}>
              <span id="startPopup">{this.getRouteName(this.highwayData.segmentData[firstSegment.id])}</span>
              {' '}
              <br />
              <strong>{`Segment ${popupSeg.segNum}, Point ${popupCoords.idx + 1} of ${popupSeg.len}`}</strong>
              {' '}
              <br />
              <span>
                (Clicking on the segment again will create a user segment for travel stats)
              </span>
              {' '}
              <br />
              <a href={`https://www.google.com/maps/?ll=${popupCoords.lat},${popupCoords.lng}`}>GMaps Link</a>
            </Popup>
            )}
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
