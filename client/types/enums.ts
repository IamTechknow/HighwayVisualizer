// Route sign types defined in FHWA HPMS manual
export enum RouteSignType {
  INTERSTATE = 2,
  US_HIGHWAY = 3,
  STATE = 4,
}

export enum SegmentCreateMode {
  MANUAL,
  CLINCH,
}

export enum ReducerActionType {
  UPDATE_CONCURRENCIES,
  UPDATE_POPUP,
  UPDATE_ROUTE_INFO,
  UPDATE_ROUTE_SHOW,
  UPDATE_SEGMENT,
  UPDATE_SEGMENT_ID,
  UPDATE_STATE,
}
