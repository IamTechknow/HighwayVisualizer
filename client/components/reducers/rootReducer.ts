import type {
  RootPayload, RootState, RouteReducerPayload, RouteSegmentReducerPayload,
} from '../../types/types';

import RouteReducer from './RouteReducer';
import RouteSegmentReducer from './RouteSegmentReducer';

// Dispatch function: payload should have nullable fields for routePayload, routeSegmentPayload
// if null, default switch case just returns state
export default (state: RootState, payload: RootPayload): RootState => {
  const { routeState: prevRouteState, routeSegmentState: prevSegmentState } = state;
  const {
    routePayload = <RouteReducerPayload>{},
    routeSegmentPayload = <RouteSegmentReducerPayload>{},
  } = payload;
  return {
    routeState: RouteReducer(prevRouteState, routePayload),
    routeSegmentState: RouteSegmentReducer(prevSegmentState, routeSegmentPayload),
  };
};
