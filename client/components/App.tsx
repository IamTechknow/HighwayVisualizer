import type { IHighways } from '../types/interfaces';
import type { RootState, State, Segment, SegmentPolyLine, SubmissionData, User, UserSegment, UserSubmissionData } from '../types/types';
import { ReducerActionType, RouteSignType, SegmentCreateMode } from '../types/enums';

import * as Leaflet from 'leaflet';
import React, { useEffect, useReducer, useState } from 'react';
import {
  MapContainer, TileLayer, Polyline, PolylineProps, Popup,
} from 'react-leaflet';

import APIClient from './APIClient';
import Highways from './Highways';
import * as HighwayUtils from '../utils/HighwayUtils';
import MapUpdater from './MapUpdater';
import RouteDrawer from './RouteDrawer';
import rootReducer from './reducers/rootReducer';

// TODO: Refactor to reducer and create reducer utils
const highwayData: IHighways = new Highways();

const initialRootState: RootState = {
  routeState: {},
  segmentState: {
    concurrencies: [],
    lat: 0,
    lon: 0,
    popupCoords: null,
    segmentData: [],
    segmentId: null,
    segments: [],
    zoom: 7,
  },
};

const CreateApp = (): React.ReactElement => {
  const [currMode, setCurrMode] = useState<SegmentCreateMode>(SegmentCreateMode.MANUAL);
  const [currUserId, setUserId] = useState<number>(-1);
  const [initFailed, setInitFailed] = useState<boolean>(false);
  const [stateId, setStateId] = useState<number | null>(null);
  const [states, setStates] = useState<State[]>([]);
  const [submitData, setSubmitData] = useState<SubmissionData | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [userSegments, setUserSegments] = useState<UserSegment[]>([]);

  const [rootState, dispatch] = useReducer(rootReducer, initialRootState);
  const { routeState, segmentState } = rootState;
  const {
    concurrencies, lat, lon, popupCoords, segmentData, segmentId, segments, zoom,
  } = segmentState;
  const { routeNum, routeType, dir } = routeState;

  const onClinchToggleFor = (i: number): void => {
    highwayData.toggleUserSegment(i);
    setUserSegments(highwayData.userSegments);
  };

  const onUserSubmit = (user: string): void => {
    if (!user) { // Do not allow '' as a user
      return;
    }
    APIClient.postUser(user)
      .then((res: UserSubmissionData) => {
        // If new user created, add to end of list. Otherwise just update selected user
        if (res.success) {
          users.push({ id: String(res.userId), user });
        }
        setUsers(users);
        setUserId(res.userId ?? -1);
        setSubmitData(res);
      });
  };

  const onSendUserSegments = (): void => {
    APIClient.postUserSegments(currUserId, highwayData.userSegments)
      .then((res) => {
        highwayData.clearUserSegments();
        setSubmitData(res);
        if (res.success) {
          setUserSegments([]);
        }
      });
  };

  const onResetUserSegments = (): void => {
    highwayData.clearUserSegments();
    setUserSegments([]);
  };

  const onRouteItemClick = (event: React.SyntheticEvent, segmentOfRoute: Segment): void => {
    const {
      id, routeNum: newRouteNum, type: newRouteType, dir: newDir,
    } = segmentOfRoute;
    event.stopPropagation();
    dispatch({
      routePayload: {
        type: ReducerActionType.UPDATE_ROUTE_SHOW,
        firstSegmentId: id,
        dir: newDir,
        routeNum: newRouteNum,
        routeType: newRouteType,
      },
    });
    if (currMode === SegmentCreateMode.CLINCH) {
      highwayData.addAllSegments(newRouteNum, newRouteType, newDir);
      setUserSegments(highwayData.userSegments);
    }
  };

  // Prevent events occurring twice
  const onSegmentItemClick = (event: React.SyntheticEvent, segment: Segment): void => {
    const {
      id, routeNum: newRouteNum, type: newRouteType, dir: newDir,
    } = segment;
    event.stopPropagation();
    dispatch({
      routePayload: {
        type: ReducerActionType.UPDATE_ROUTE_INFO,
        dir: newDir,
        routeNum: newRouteNum,
        routeType: newRouteType,
      },
      segmentPayload: {
        type: ReducerActionType.UPDATE_SEGMENT_ID,
        segmentId: id,
      },
    });
    if (currMode === SegmentCreateMode.CLINCH) {
      highwayData.addFullSegment(newRouteNum, id);
      setUserSegments(highwayData.userSegments);
    }
  };

  const onSegmentClick = (
    i: number,
    clickedSegmentId: number,
    event: Leaflet.LeafletMouseEvent
  ): void => {
    if (segmentData == null || routeNum == null) {
      return;
    }
    const segLatLng = HighwayUtils.findSegmentPoint(event.target, event.latlng, clickedSegmentId);
    if (!popupCoords) {
      dispatch({
        segmentPayload: {
          type: ReducerActionType.UPDATE_POPUP,
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
          type: ReducerActionType.UPDATE_POPUP,
          popupCoords: null,
        },
      });
      setUserSegments(highwayData.userSegments);
    }
  };

  // Change user and load user's segments if any
  const onUserChange = (event: React.ChangeEvent<HTMLSelectElement>): void => {
    const newUserId = Number.parseInt(event.target.value, 10);
    setUserId(newUserId);
  };

  // Process array of route segments. There will always be at least one
  const setNewSegment = (
    newSegmentData: Array<SegmentPolyLine>,
    routeStr: string,
    currType: RouteSignType,
  ): void => {
    const firstSegment = newSegmentData[0];
    const [midSegmentId, midPointIdx] = newSegmentData.length > 1
      ? highwayData.getCenterOfRoute(routeStr, currType)
      : [0, Math.floor(firstSegment.points.length / 2)];
    const [centerLat, centerLon] = newSegmentData[midSegmentId].points[midPointIdx];
    const newZoom = highwayData.getZoomLevel(routeStr, currType, newSegmentData, firstSegment.id);
    dispatch({
      segmentPayload: {
        type: ReducerActionType.UPDATE_SEGMENT,
        lat: centerLat,
        lon: centerLon,
        segmentData: newSegmentData,
        zoom: newZoom,
      },
    });
  };

  useEffect((): void => {
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
  useEffect((): void => {
    if (stateId == null) {
      return;
    }

    APIClient.getSegments(stateId)
      .then((rawSegments): void => {
        if (!rawSegments || rawSegments.length === 0) {
          return;
        }
        highwayData.buildStateSegmentsData(rawSegments);
        const {
          id, dir: firstSegmentDir, type: firstSegmentRouteType, routeNum: firstSegmentRouteNum,
        } = rawSegments[0];
        dispatch({
          segmentPayload: {
            type: ReducerActionType.UPDATE_STATE,
            segments: APIClient.parseRawSegments(rawSegments),
          },
        });
        dispatch({
          routePayload: {
            type: ReducerActionType.UPDATE_ROUTE_INFO,
            dir: firstSegmentDir,
            routeNum: firstSegmentRouteNum,
            routeType: firstSegmentRouteType,
          },
          segmentPayload: {
            type: ReducerActionType.UPDATE_SEGMENT_ID,
            segmentId: id,
          },
        });
      });
  }, [stateId]);

  // Respond to changes to route. Render the whole route if firstSegmentId is nonnull
  useEffect((): void => {
    if (
      routeNum == null
      || routeType == null
      || dir == null
      || routeState.firstSegmentId == null
      || stateId == null) {
      return;
    }

    const routePromise = APIClient.getRoute(stateId, routeNum, routeType, dir)
      .then((routeSegmentData) => setNewSegment(routeSegmentData, routeNum + dir, routeType));
    const stateTitle = highwayData.getState(stateId).title;
    if (stateTitle === 'California') {
      routePromise
        .then(() => APIClient.getConcurrenyPoints(stateId, routeNum, dir))
        .then((concurrentSegments): void => {
          dispatch({
            segmentPayload: {
              type: ReducerActionType.UPDATE_CONCURRENCIES,
              concurrencies: concurrentSegments,
            },
          });
        });
    }
  }, [routeState]);

  // Respond to changes to segment ID
  useEffect((): void => {
    if (segmentId == null || routeNum == null || dir == null || routeType == null) {
      return;
    }
    APIClient.getSegment(segmentId)
      .then((singleSegmentData) => {
        setNewSegment(singleSegmentData, routeNum + dir, routeType);
      });
  }, [segmentId]);

  // Polyline implements EventedProps for a prop of event listeners
  const createPolyLineEventMap = (
    i: number,
    segmentId: number
  ): Leaflet.LeafletEventHandlerFnMap => ({
    click: (event: Leaflet.LeafletMouseEvent) => onSegmentClick(i, segmentId, event),
  });

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
  if (
    segments == null
    || segmentData == null
    || segmentId == null
    || routeNum == null
    || dir == null
    || routeType == null
    || lat == null
    || lon == null
    || zoom == null
  ) {
    return (
      <div>
        <h3>Loading...</h3>
      </div>
    );
  }

  const popupSeg = popupCoords != null
    ? highwayData.segmentData[popupCoords.segmentId]
    : null;
  const liveSegs = segmentData != null
    ? HighwayUtils.getMapForLiveIds(segmentData)
    : null;

  return (
    <div>
      <MapContainer
        className="mapStyle"
        zoomControl={false}
      >
        <MapUpdater center={[lat, lon]} zoom={zoom} />
        <TileLayer
          attribution='&copy; <a href="https://osm.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.osm.org/{z}/{x}/{y}.png"
        />
        {segmentData && segmentData.map((seg, i: number): React.ReactElement<PolylineProps> => (
          <Polyline
            key={`seg-${seg.id}`}
            eventHandlers={createPolyLineEventMap(i, seg.id)}
            positions={seg.points}
          />
        ))}
        {concurrencies && concurrencies.map((seg, i: number): React.ReactElement<PolylineProps> => (
          <Polyline key={`concurrency-${seg.id}-${i}`} positions={seg.points} />
        ))}
        {/* Show unsubmitted user segments if selected route and segment is the same */}
        {userSegments && userSegments.map(
          (userSeg: UserSegment): React.ReactNode => liveSegs && liveSegs.has(userSeg.segmentId)
            && (
              <Polyline
                key={HighwayUtils.stringifyUserSegment(userSeg)}
                positions={
                  segmentData[liveSegs.get(userSeg.segmentId) ?? 0].points.slice(
                    userSeg.startId,
                    userSeg.endId + 1,
                  )
                }
                color={userSeg.clinched ? 'lime' : 'yellow'}
              />
            ),
        )}
        {popupCoords && popupSeg && stateId != null
          && (
            <Popup position={popupCoords}>
              <span id="startPopup">
                {
                  HighwayUtils.getRouteName(
                    highwayData.segmentData[segmentId],
                    highwayData.getState(stateId).identifier,
                  )
                }
              </span>
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
      </MapContainer>
      <RouteDrawer
        currMode={currMode}
        currUserId={currUserId}
        highwayData={highwayData}
        onClinchToggleFor={onClinchToggleFor}
        onResetUserSegments={onResetUserSegments}
        onRouteItemClick={onRouteItemClick}
        onSegmentItemClick={onSegmentItemClick}
        onSendUserSegments={onSendUserSegments}
        onSetMode={setCurrMode}
        onStateClick={setStateId}
        onUserChange={onUserChange}
        onUserSubmit={onUserSubmit}
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
