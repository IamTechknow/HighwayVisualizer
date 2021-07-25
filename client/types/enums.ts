// Route sign types defined in FHWA HPMS manual
export enum RouteSignType {
  INTERSTATE = 2,
  US_HIGHWAY = 3,
  STATE = 4,
}

export enum TravelSegmentCreateMode {
  MANUAL,
  CLINCH,
}

export enum ReducerActionType {
  UPDATE_CONCURRENCIES,
  UPDATE_POPUP,
  UPDATE_ROUTE_INFO,
  UPDATE_ROUTE_SHOW,
  UPDATE_ROUTE_SEGMENT,
  UPDATE_ROUTE_SEGMENT_ID,
  UPDATE_SELECTED_ROUTE,
  UPDATE_STATE,
}
