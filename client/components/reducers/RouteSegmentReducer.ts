import type { RouteSegmentReducerPayload, RouteSegmentState } from '../../types/types';

import { ReducerActionType } from '../../types/enums';

export default (
  routeSegmentState: RouteSegmentState,
  payload: RouteSegmentReducerPayload,
): RouteSegmentState => {
  switch (payload.type) {
    case ReducerActionType.UPDATE_STATE:
      return {
        ...routeSegmentState,
        concurrencies: [],
        popupCoords: null,
        routeSegmentData: [],
        routeSegmentId: null,
        routeSegments: payload.routeSegments,
      };
    case ReducerActionType.UPDATE_ROUTE_SEGMENT:
      return {
        ...routeSegmentState,
        concurrencies: [],
        lat: payload.lat,
        lon: payload.lon,
        popupCoords: null,
        routeSegmentData: payload.routeSegmentData,
        zoom: payload.zoom,
      };
    case ReducerActionType.UPDATE_ROUTE_SEGMENT_ID:
      return {
        ...routeSegmentState,
        routeSegmentId: payload.routeSegmentId,
      };
    case ReducerActionType.UPDATE_CONCURRENCIES:
      return {
        ...routeSegmentState,
        concurrencies: payload.concurrencies,
      };
    case ReducerActionType.UPDATE_POPUP:
      return {
        ...routeSegmentState,
        popupCoords: payload.popupCoords,
      };
    default:
      return routeSegmentState;
  }
};
