import * as Leaflet from 'leaflet';
import React, { useEffect, useReducer, useState } from 'react';
import {
  MapContainer, TileLayer, Polyline, PolylineProps, Popup,
} from 'react-leaflet';
import type { IHighways } from '../types/interfaces';
import type {
  PopupCoord,
  RootState,
  RouteSegment,
  RouteSegmentPolyLine,
  State,
  SubmissionData,
  TravelSegment,
  User,
  UserSubmissionData,
} from '../types/types';
import { ReducerActionType, RouteSignType, TravelSegmentCreateMode } from '../types/enums';

import APIClient from './APIClient';
import Highways from './Highways';
import * as HighwayUtils from '../utils/HighwayUtils';
import MapUpdater from './MapUpdater';
import RouteDrawer from './RouteDrawer';
import rootReducer from './reducers/rootReducer';

const SEGMENT_WEIGHT = 6;

// TODO: Refactor to reducer and create reducer utils
const highwayData: IHighways = new Highways();

const initialRootState: RootState = {
  routeState: {},
  routeSegmentState: {
    concurrencies: [],
    lat: 0,
    lon: 0,
    popupCoords: null,
    routeSegmentData: [],
    routeSegmentId: null,
    routeSegments: [],
    zoom: 7,
  },
};

const CreateApp = (): React.ReactElement => {
  const [currMode, setCurrMode] = useState<TravelSegmentCreateMode>(TravelSegmentCreateMode.MANUAL);
  const [currUserId, setUserId] = useState<number>(-1);
  const [initFailed, setInitFailed] = useState<boolean>(false);
  const [stateId, setStateId] = useState<number>(-1);
  const [states, setStates] = useState<State[]>([]);
  const [submitData, setSubmitData] = useState<SubmissionData | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [travelSegments, setTravelSegments] = useState<TravelSegment[]>([]);

  const [rootState, dispatch] = useReducer(rootReducer, initialRootState);
  const { routeState, routeSegmentState } = rootState;
  const {
    concurrencies, lat, lon, popupCoords, routeSegmentData, routeSegmentId, routeSegments, zoom,
  } = routeSegmentState;
  const { routeNum, routeType, dir } = routeState;

  const onClinchToggleFor = (i: number) => {
    highwayData.toggleTravelSegment(i);
    setTravelSegments(highwayData.travelSegments.slice());
  };

  const onUserSubmit = (user: string) => {
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

  const onSendTravelSegments = () => {
    APIClient.postTravelSegments(currUserId, highwayData.travelSegments)
      .then((res) => {
        highwayData.clearTravelSegments();
        setSubmitData(res);
        if (res.success) {
          setTravelSegments([]);
        }
      });
  };

  const onResetTravelSegments = () => {
    highwayData.clearTravelSegments();
    setTravelSegments([]);
  };

  const onRouteItemClick = (event: React.SyntheticEvent, segmentOfRoute: RouteSegment) => {
    const {
      id, routeNum: newRouteNum, type: newRouteType, dir: newDir,
    } = segmentOfRoute;
    event.stopPropagation();
    dispatch({
      routePayload: {
        type: ReducerActionType.UPDATE_ROUTE_SHOW,
        firstRouteSegmentId: id,
        dir: newDir,
        routeNum: newRouteNum,
        routeType: newRouteType,
      },
    });
    if (currMode === TravelSegmentCreateMode.CLINCH) {
      highwayData.addAllRouteSegments(newRouteNum, newRouteType, newDir);
      setTravelSegments(highwayData.travelSegments);
    }
  };

  const onRouteSegmentItemClick = (event: React.SyntheticEvent, routeSegment: RouteSegment) => {
    const {
      id, routeNum: newRouteNum, type: newRouteType, dir: newDir,
    } = routeSegment;
    event.stopPropagation();
    dispatch({
      routePayload: {
        type: ReducerActionType.UPDATE_ROUTE_INFO,
        dir: newDir,
        routeNum: newRouteNum,
        routeType: newRouteType,
      },
      routeSegmentPayload: {
        type: ReducerActionType.UPDATE_ROUTE_SEGMENT_ID,
        routeSegmentId: id,
      },
    });
    if (currMode === TravelSegmentCreateMode.CLINCH) {
      highwayData.addFullRouteSegment(newRouteNum, id);
      setTravelSegments(highwayData.travelSegments);
    }
  };

  const onRouteSegmentClick = (
    i: number,
    clickedRouteSegmentId: number,
    event: Leaflet.LeafletMouseEvent,
  ) => {
    if (routeSegmentData == null || routeNum == null) {
      return;
    }
    const routeSegLatLng = HighwayUtils.findSegmentPoint(
      event.target,
      event.latlng,
      clickedRouteSegmentId,
    );
    if (!popupCoords) {
      dispatch({
        routeSegmentPayload: {
          type: ReducerActionType.UPDATE_POPUP,
          popupCoords: routeSegLatLng,
        },
      });
    } else {
      highwayData.addNewTravelSegments(
        popupCoords,
        routeSegLatLng,
        routeNum,
        clickedRouteSegmentId,
        routeSegmentData,
      );
      dispatch({
        routeSegmentPayload: {
          type: ReducerActionType.UPDATE_POPUP,
          popupCoords: null,
        },
      });
      setTravelSegments(highwayData.travelSegments);
    }
  };

  const onUserChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const newUserId = Number.parseInt(event.target.value, 10);
    setUserId(newUserId);
  };

  // Process array of route segments. There will always be at least one
  const setNewRouteSegment = (
    newRouteSegmentData: Array<RouteSegmentPolyLine>,
    routeStr: string,
    currType: RouteSignType,
  ) => {
    const firstRouteSegment = newRouteSegmentData[0];
    const [midRouteSegmentId, midPointIdx] = newRouteSegmentData.length > 1
      ? highwayData.getCenterOfRoute(routeStr, currType)
      : [0, Math.floor(firstRouteSegment.points.length / 2)];
    const [centerLat, centerLon] = newRouteSegmentData[midRouteSegmentId].points[midPointIdx];
    const newZoom = highwayData.getZoomLevel(
      routeStr,
      currType,
      newRouteSegmentData,
      firstRouteSegment.id,
    );
    dispatch({
      routeSegmentPayload: {
        type: ReducerActionType.UPDATE_ROUTE_SEGMENT,
        lat: centerLat,
        lon: centerLon,
        routeSegmentData: newRouteSegmentData,
        zoom: newZoom,
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
    if (stateId == null || stateId === -1) {
      return;
    }

    APIClient.getRouteSegments(stateId)
      .then((rawRouteSegments) => {
        if (!rawRouteSegments || rawRouteSegments.length === 0) {
          return;
        }
        highwayData.buildStateSegmentsData(rawRouteSegments);
        const {
          id, dir: firstRouteDir, type: firstRouteType, routeNum: firstRouteNum,
        } = rawRouteSegments[0];
        dispatch({
          routeSegmentPayload: {
            type: ReducerActionType.UPDATE_STATE,
            routeSegments: APIClient.parseRawRouteSegments(rawRouteSegments),
          },
        });
        dispatch({
          routePayload: {
            type: ReducerActionType.UPDATE_ROUTE_INFO,
            dir: firstRouteDir,
            routeNum: firstRouteNum,
            routeType: firstRouteType,
          },
          routeSegmentPayload: {
            type: ReducerActionType.UPDATE_ROUTE_SEGMENT_ID,
            routeSegmentId: id,
          },
        });
      });
  }, [stateId]);

  // Respond to changes to route. Render the whole route if firstRouteSegmentId is nonnull
  useEffect(() => {
    if (
      routeNum == null ||
      routeType == null ||
      dir == null ||
      routeState.firstRouteSegmentId == null ||
      stateId == null) {
      return;
    }

    const routePromise = APIClient.getRoute(stateId, routeNum, routeType, dir)
      .then((apiRouteSegmentData) => setNewRouteSegment(
        apiRouteSegmentData,
        routeNum + dir,
        routeType,
      ));
    const stateTitle = highwayData.getState(stateId).title;
    if (stateTitle === 'California') {
      routePromise
        .then(() => APIClient.getConcurrenyPoints(stateId, routeNum, dir))
        .then((concurrentRouteSegments) => {
          dispatch({
            routeSegmentPayload: {
              type: ReducerActionType.UPDATE_CONCURRENCIES,
              concurrencies: concurrentRouteSegments,
            },
          });
        });
    }
  }, [routeState]);

  // Respond to changes to segment ID
  useEffect(() => {
    if (routeSegmentId == null || routeNum == null || dir == null || routeType == null) {
      return;
    }
    APIClient.getRouteSegment(routeSegmentId)
      .then((singleSegmentData) => {
        setNewRouteSegment(singleSegmentData, routeNum + dir, routeType);
      });
  }, [routeSegmentId]);

  // Polyline implements EventedProps for a prop of event listeners
  const createPolyLineEventMap = (
    i: number,
    polylineRouteSegmentId: number,
  ): Leaflet.LeafletEventHandlerFnMap => ({
    click: (event: Leaflet.LeafletMouseEvent) => onRouteSegmentClick(
      i,
      polylineRouteSegmentId,
      event,
    ),
  });

  const createPopup = (
    routeName: string,
    popupRouteSeg: RouteSegment,
    coord: PopupCoord,
  ): React.ReactElement<Leaflet.Popup> => (
    <Popup position={coord}>
      <span id="startPopup">
        {
          routeName
        }
      </span>
      {' '}
      <br />
      <strong>{`Segment ${popupRouteSeg.segNum + 1}, Point ${coord.idx + 1} of ${popupRouteSeg.len}`}</strong>
      {' '}
      <br />
      <span>
        (Clicking on the route segment again will create a travel segment)
      </span>
      {' '}
      <br />
      <a href={`https://www.google.com/maps/?ll=${coord.lat},${coord.lng}`}>GMaps Link</a>
    </Popup>
  );

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
    routeSegments == null ||
    routeSegmentData == null ||
    routeSegmentId == null ||
    routeNum == null ||
    dir == null ||
    routeType == null ||
    lat == null ||
    lon == null ||
    zoom == null
  ) {
    return (
      <div>
        <h3>Loading...</h3>
      </div>
    );
  }

  const popupRouteSeg = popupCoords != null
    ? highwayData.routeSegmentData[popupCoords.routeSegmentId]
    : null;
  const liveRouteSegs = routeSegmentData != null
    ? HighwayUtils.getMapForLiveSegmentIds(routeSegmentData)
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
        {routeSegmentData &&
          routeSegmentData.map((routeSeg, i: number): React.ReactElement<PolylineProps> => (
            <Polyline
              key={`routeSeg-${routeSeg.id}`}
              eventHandlers={createPolyLineEventMap(i, routeSeg.id)}
              positions={routeSeg.points}
              weight={SEGMENT_WEIGHT}
            />
          ))}
        {concurrencies && concurrencies.map(
          (routeSeg, i: number): React.ReactElement<PolylineProps> => (
            <Polyline
              key={`concurrency-${routeSeg.id}-${i}`}
              positions={routeSeg.points}
              weight={SEGMENT_WEIGHT}
            />
          ),
        )}
        {/* Show unsubmitted user segments if selected route and segment is the same */}
        {travelSegments &&
          travelSegments.map(
            (travelSeg: TravelSegment): React.ReactNode => liveRouteSegs &&
              liveRouteSegs.has(travelSeg.routeSegmentId) &&
              (
                <Polyline
                  key={HighwayUtils.stringifyTravelSegment(travelSeg)}
                  positions={
                    routeSegmentData[liveRouteSegs.get(travelSeg.routeSegmentId) ?? 0].points.slice(
                      travelSeg.startId,
                      travelSeg.endId + 1,
                    )
                  }
                  color={travelSeg.clinched ? 'lime' : 'yellow'}
                  weight={SEGMENT_WEIGHT}
                />
              ),
          )}
        {popupCoords && popupRouteSeg && stateId != null && (
          createPopup(
            HighwayUtils.getRouteName(
              popupRouteSeg,
              highwayData.getState(stateId).identifier,
            ),
            popupRouteSeg,
            popupCoords,
          )
        )}
      </MapContainer>
      <RouteDrawer
        highwayData={highwayData}
        routeData={{
          routeSegments,
          stateId,
          states,
        }}
        routeDataCallbackMap={{
          onRouteItemClick,
          onRouteSegmentItemClick,
          onUpdateState: setStateId,
        }}
        userData={{
          currMode,
          currUserId,
          submitData,
          travelSegments,
          users,
        }}
        userDataCallbackMap={{
          onClinchToggleFor,
          onResetTravelSegments,
          onSendTravelSegments,
          onSetMode: setCurrMode,
          onUserChange,
          onUserSubmit,
        }}
      />
    </div>
  );
};

export default CreateApp;
