import {
  UPDATE_CONCURRENCIES, UPDATE_POPUP, UPDATE_SEGMENT, UPDATE_SEGMENT_ID, UPDATE_STATE,
} from '../actions/actionTypes';

export default (segmentState, payload) => {
  switch (payload.type) {
    case UPDATE_STATE:
      return {
        ...segmentState,
        concurrencies: [],
        lat: 0,
        lon: 0,
        popupCoords: null,
        segmentData: [],
        segmentId: null,
        segments: payload.segments,
      };
    case UPDATE_SEGMENT:
      return {
        ...segmentState,
        lat: payload.lat,
        lon: payload.lon,
        segmentData: payload.segmentData,
      };
    case UPDATE_SEGMENT_ID:
      return {
        ...segmentState,
        segmentId: payload.segmentId,
      };
    case UPDATE_CONCURRENCIES:
      return {
        ...segmentState,
        concurrencies: payload.concurrencies,
      };
    case UPDATE_POPUP:
      return {
        ...segmentState,
        popupCoords: payload.popupCoords,
      };
    default:
      return segmentState;
  }
};
