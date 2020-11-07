import RouteReducer from './RouteReducer';
import SegmentReducer from './SegmentReducer';

// Dispatch function: payload should have nullable fields for routePayload, segmentPayload
// if null, default switch case just returns state
export default (state, payload) => {
  const { routeState: prevRouteState, segmentState: prevSegmentState } = state;
  const { routePayload = {}, segmentPayload = {} } = payload;
  return {
    routeState: RouteReducer(prevRouteState, routePayload),
    segmentState: SegmentReducer(prevSegmentState, segmentPayload),
  };
};
