import React, { useEffect, useReducer, useState } from 'react';
import {
  Map, TileLayer, Polyline, Popup,
} from 'react-leaflet';

import APIClient from './APIClient';
import Highways from './Highways';
import RouteDrawer from './RouteDrawer';
import rootReducer from './reducers/rootReducer';

import * as ActionTypes from './actions/actionTypes';

const MANUAL = 0, CLINCH = 1;

// TODO: Refactor to reducer and create reducer utils
const highwayData = new Highways();

const initialRootState = {
  routeState: {},
  segmentState: {
    concurrencies: [],
    lat: 0,
    lon: 0,
    segmentData: [],
    segments: [],
  },
};

const CreateApp = () => {
  const [currMode, setCurrMode] = useState(MANUAL);
  const [currUserId, setUserId] = useState(-1);
  const [initFailed, setInitFailed] = useState(false);
  const [stateId, setStateId] = useState(null);
  const [states, setStates] = useState([]);
  const [submitData, setSubmitData] = useState(null);
  const [users, setUsers] = useState([]);
  const [userSegments, setUserSegments] = useState([]);

  const [rootState, dispatch] = useReducer(rootReducer, initialRootState);
  const { routeState, segmentState } = rootState;
  const {
    concurrencies, lat, lon, popupCoords, segmentData, segmentId, segments,
  } = segmentState;
  const { routeNum, routeType, dir } = routeState;

  const onClinchToggleFor = (i) => {
    highwayData.toggleUserSegment(i);
    setUserSegments(highwayData.userSegments);
  };

  const onFormSubmit = (event) => {
    event.preventDefault();
    const user = new FormData(event.target).get('userName');
    event.target.reset(); // clear input fields
    if (!user) { // Do not allow '' as a user
      return;
    }
    APIClient.postUser(user)
      .then((res) => {
        // If new user created, add to end of list. Otherwise just update selected user
        if (res.success) {
          users.push({ id: res.userId, user });
        }
        setUsers(users);
        setUserId(res.userId ?? -1);
        setSubmitData(res);
      });
  };

  const onSendUserSegments = () => {
    APIClient.postUserSegments(currUserId, highwayData.userSegments)
      .then((res) => {
        highwayData.clearUserSegments();
        setSubmitData(res);
        setUserSegments([]);
      });
  };

  const onResetUserSegments = () => {
    highwayData.clearUserSegments();
    setUserSegments([]);
  };

  const onRouteItemClick = (event, segmentOfRoute) => {
    const {
      id, routeNum: newRouteNum, type: newRouteType, dir: newDir,
    } = segmentOfRoute;
    event.stopPropagation();
    dispatch({
      routePayload: {
        type: ActionTypes.UPDATE_ROUTE_SHOW,
        firstSegmentId: id,
        dir: newDir,
        routeNum: newRouteNum,
        routeType: newRouteType,
      },
    });
    if (currMode === CLINCH) {
      highwayData.addAllSegments(newRouteNum, newRouteType, newDir);
      setUserSegments(highwayData.userSegments);
    }
  };

  // Prevent events occurring twice
  const onSegmentItemClick = (event, segment) => {
    const {
      id, routeNum: newRouteNum, type: newRouteType, dir: newDir,
    } = segment;
    event.stopPropagation();
    dispatch({
      routePayload: {
        type: ActionTypes.UPDATE_ROUTE_INFO,
        dir: newDir,
        routeNum: newRouteNum,
        routeType: newRouteType,
      },
      segmentPayload: {
        type: ActionTypes.UPDATE_SEGMENT_ID,
        segmentId: id,
      },
    });
    if (currMode === CLINCH) {
      highwayData.addFullSegment(newRouteNum, id);
      setUserSegments(highwayData.userSegments);
    }
  };

  // Keep track of clicked points
  const onSegmentClick = (i, clickedSegmentId, event) => {
    const segLatLng = Highways.findSegmentPoint(event.target, event.latlng, clickedSegmentId);
    if (!popupCoords) {
      dispatch({
        segmentPayload: {
          type: ActionTypes.UPDATE_POPUP,
          popupCoords: segLatLng,
        },
      });
    } else {
      highwayData.addNewUserSegments(
        popupCoords,
        segLatLng,
        routeNum,
        clickedSegmentId,
        segmentData,
      );
      dispatch({
        segmentPayload: {
          type: ActionTypes.UPDATE_POPUP,
          popupCoords: null,
        },
      });
      setUserSegments(highwayData.userSegments);
    }
  };

  // Change user and load user's segments if any
  const onUserChange = (event) => {
    const newUserId = Number.parseInt(event.target.value, 10);
    setUserId(newUserId);
  };

  const getRouteName = (segmentObj) => {
    const stateIdentifier = highwayData.getState(stateId).identifier;

    // One exception for D.C. Route 295
    const routeName = stateIdentifier === 'District' && segmentObj.type === 4
      ? `D.C. Route ${segmentObj.routeNum}`
      : `${Highways.getRoutePrefix(segmentObj.type)} ${segmentObj.routeNum}`;
    return highwayData.shouldUseRouteDir(stateId)
      ? `${routeName} ${segmentObj.dir}`
      : routeName;
  };

  // Process array of route segments. There will always be at least one
  const setNewSegment = (newSegmentData, routeStr, currType) => {
    const firstSegment = newSegmentData[0];
    const [midSegmentId, midPointIdx] = newSegmentData.length > 1
      ? highwayData.getCenterOfRoute(routeStr, currType)
      : [0, Math.floor(firstSegment.points.length / 2)];
    const [centerLat, centerLon] = newSegmentData[midSegmentId].points[midPointIdx];
    dispatch({
      segmentPayload: {
        type: ActionTypes.UPDATE_SEGMENT,
        lat: centerLat,
        lon: centerLon,
        segmentData: newSegmentData,
      },
    });
  };

  useEffect(() => {
    APIClient.getStates()
      .then((newStates) => {
        if (newStates.length === 0) {
          setInitFailed(true);
          return null;
        }
        const { id } = newStates[0];
        highwayData.setStates(newStates);
        setStates(newStates);
        setStateId(id);
        return APIClient.getUsers().then(setUsers);
      })
      .catch(() => {
        setInitFailed(true);
      });
  }, []);

  // Respond to changes to state ID. Rebuild highway data for the state and change the route
  useEffect(() => {
    if (stateId == null) {
      return;
    }

    APIClient.getSegments(stateId)
      .then((rawSegments) => {
        if (!rawSegments || rawSegments.length === 0) {
          return;
        }
        highwayData.buildStateSegmentsData(rawSegments);
        const {
          id, dir: firstSegmentDir, type: firstSegmentRouteType, routeNum: firstSegmentRouteNum,
        } = rawSegments[0];
        dispatch({
          segmentPayload: {
            type: ActionTypes.UPDATE_STATE,
            segments: APIClient.parseRawSegments(rawSegments),
          },
        });
        dispatch({
          routePayload: {
            type: ActionTypes.UPDATE_ROUTE_INFO,
            dir: firstSegmentDir,
            routeNum: firstSegmentRouteNum,
            routeType: firstSegmentRouteType,
          },
          segmentPayload: {
            type: ActionTypes.UPDATE_SEGMENT_ID,
            segmentId: id,
          },
        });
      });
  }, [stateId]);

  // Respond to changes to route. Render the whole route if firstSegmentId is nonnull
  useEffect(() => {
    if (routeState.routeNum == null || routeState.firstSegmentId == null) {
      return;
    }

    const routePromise = APIClient.getRoute(stateId, routeNum, routeType, dir)
      .then((routeSegmentData) => setNewSegment(routeSegmentData, routeNum + dir, routeType));
    const stateTitle = highwayData.getState(stateId).title;
    if (stateTitle === 'California') {
      routePromise
        .then(() => APIClient.getConcurrenyPoints(stateId, routeNum, dir))
        .then((concurrentSegments) => {
          dispatch({
            segmentPayload: {
              type: ActionTypes.UPDATE_CONCURRENCIES,
              concurrencies: concurrentSegments,
            },
          });
        });
    }
  }, [routeState]);

  // Respond to changes to segment ID
  useEffect(() => {
    if (segmentId == null) {
      return;
    }

    APIClient.getSegment(segmentId)
      .then((singleSegmentData) => {
        setNewSegment(singleSegmentData, routeNum + dir, routeType);
      });
  }, [segmentId]);

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

  // TODO: Remove and put loading messages
  // Don't render until all data loaded
  if (!routeNum || !segmentData.length) {
    return null;
  }

  const zoom = highwayData.getZoomLevel(routeNum + dir, routeType, segmentData, segmentId);
  const popupSeg = popupCoords != null
    ? highwayData.segmentData[popupCoords.segmentId]
    : undefined;
  const liveSegs = segmentData != null
    ? Highways.getMapForLiveIds(segmentData)
    : undefined;

  return (
    <div>
      <Map
        className="mapStyle"
        center={[lat, lon]}
        zoom={zoom}
        zoomControl={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://osm.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.osm.org/{z}/{x}/{y}.png"
        />
        { segmentData && segmentData.map((seg, i) => (
          <Polyline
            key={`seg-${seg.id}`}
            onClick={(event) => onSegmentClick(i, seg.id, event)}
            positions={seg.points}
          />
        ))}
        { concurrencies && concurrencies.map((seg, i) => (
          <Polyline key={`concurrency-${seg.id}-${i}`} positions={seg.points} />
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
            <span id="startPopup">{getRouteName(highwayData.segmentData[segmentId])}</span>
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
        getRouteName={getRouteName}
        highwayData={highwayData}
        onClinchToggleFor={onClinchToggleFor}
        onFormSubmit={onFormSubmit}
        onResetUserSegments={onResetUserSegments}
        onRouteItemClick={onRouteItemClick}
        onSegmentItemClick={onSegmentItemClick}
        onSendUserSegments={onSendUserSegments}
        onSetMode={setCurrMode}
        onStateClick={setStateId}
        onUserChange={onUserChange}
        segments={segments}
        stateId={stateId}
        states={states}
        submitData={submitData}
        userSegments={userSegments}
        users={users}
      />
    </div>
  );
};

export default CreateApp;
