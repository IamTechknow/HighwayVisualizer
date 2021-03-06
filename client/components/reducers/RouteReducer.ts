import type { RouteReducerPayload, RouteState } from '../../types/types';

import { ReducerActionType } from '../../types/enums';

export default (routeState: RouteState, payload: RouteReducerPayload): RouteState => {
  switch (payload.type) {
    case ReducerActionType.UPDATE_ROUTE_INFO:
      return {
        ...routeState,
        firstRouteSegmentId: null,
        dir: payload.dir,
        routeNum: payload.routeNum,
        routeType: payload.routeType,
      };
    case ReducerActionType.UPDATE_ROUTE_SHOW:
      return {
        ...routeState,
        firstRouteSegmentId: payload.firstRouteSegmentId,
        dir: payload.dir,
        routeNum: payload.routeNum,
        routeType: payload.routeType,
      };
    default:
      return routeState;
  }
};
