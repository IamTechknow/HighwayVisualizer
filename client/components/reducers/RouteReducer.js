import { UPDATE_ROUTE_INFO, UPDATE_ROUTE_SHOW } from '../actions/actionTypes';

export default (routeState, payload) => {
  switch (payload.type) {
    case UPDATE_ROUTE_INFO:
      return {
        ...routeState,
        firstSegmentId: null,
        dir: payload.dir,
        routeNum: payload.routeNum,
        routeType: payload.routeType,
      };
    case UPDATE_ROUTE_SHOW:
      return {
        ...routeState,
        firstSegmentId: payload.firstSegmentId,
        dir: payload.dir,
        routeNum: payload.routeNum,
        routeType: payload.routeType,
      };
    default:
      return routeState;
  }
};
