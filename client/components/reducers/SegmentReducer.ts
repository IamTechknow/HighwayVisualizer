import type {SegmentReducerPayload, SegmentState} from './../../types/types';

import {ReducerActionType} from './../../types/enums';

export default (segmentState: SegmentState, payload: SegmentReducerPayload): SegmentState => {
  switch (payload.type) {
    case ReducerActionType.UPDATE_STATE:
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
    case ReducerActionType.UPDATE_SEGMENT:
      return {
        ...segmentState,
        lat: payload.lat,
        lon: payload.lon,
        segmentData: payload.segmentData,
      };
    case ReducerActionType.UPDATE_SEGMENT_ID:
      return {
        ...segmentState,
        segmentId: payload.segmentId,
      };
    case ReducerActionType.UPDATE_CONCURRENCIES:
      return {
        ...segmentState,
        concurrencies: payload.concurrencies,
      };
    case ReducerActionType.UPDATE_POPUP:
      return {
        ...segmentState,
        popupCoords: payload.popupCoords,
      };
    default:
      return segmentState;
  }
};
