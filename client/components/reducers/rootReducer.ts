import type { RootPayload, RootState, RouteReducerPayload, SegmentReducerPayload } from './../../types/types';

import RouteReducer from './RouteReducer';
import SegmentReducer from './SegmentReducer';

// Dispatch function: payload should have nullable fields for routePayload, segmentPayload
// if null, default switch case just returns state
export default (state: RootState, payload: RootPayload): RootState => {
  const { routeState: prevRouteState, segmentState: prevSegmentState } = state;
  const { routePayload = <RouteReducerPayload>{}, segmentPayload = <SegmentReducerPayload>{} } = payload;
  return {
    routeState: RouteReducer(prevRouteState, routePayload),
    segmentState: SegmentReducer(prevSegmentState, segmentPayload),
  };
};
