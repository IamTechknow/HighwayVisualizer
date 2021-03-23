import type { SegmentReducerPayload, SegmentState } from '../../types/types';

import { ReducerActionType } from '../../types/enums';

export default (segmentState: SegmentState, payload: SegmentReducerPayload): SegmentState => {
  switch (payload.type) {
    case ReducerActionType.UPDATE_STATE:
      return {
        ...segmentState,
        concurrencies: [],
        popupCoords: null,
        segmentData: [],
        segmentId: null,
        segments: payload.segments,
      };
    case ReducerActionType.UPDATE_SEGMENT:
      return {
        ...segmentState,
        concurrencies: [],
        lat: payload.lat,
        lon: payload.lon,
        popupCoords: null,
        segmentData: payload.segmentData,
        zoom: payload.zoom,
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
