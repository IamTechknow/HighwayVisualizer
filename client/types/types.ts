import * as Leaflet from 'leaflet';
import { ReducerActionType, RouteSignType, TravelSegmentCreateMode } from './enums';

export interface PopupCoord extends Leaflet.LatLngLiteral {
  readonly idx: number,
  readonly routeSegmentId: number,
}

export interface RootPayload {
  routePayload?: RouteReducerPayload,
  routeSegmentPayload?: RouteSegmentReducerPayload,
}

export interface RootState {
  routeState: RouteState,
  routeSegmentState: RouteSegmentState,
}

export interface RouteDataCallbackMap {
  onRouteItemClick: (
    event: React.SyntheticEvent,
    segmentOfRoute: RouteSegment,
    newIdx: number
  ) => void,
  onRouteSegmentItemClick: (event: React.SyntheticEvent, routeSegment: RouteSegment) => void,
  onUpdateState: (stateId: number) => void,
}

export interface RouteDrawerRouteData {
  currRouteSegmentsIdx: number,
  routeSegments: Array<Array<RouteSegment>>,
  stateId: number,
  states: Array<State>,
}

export interface RouteDrawerUserData {
  currMode: number,
  currUserId: number,
  submitData: SubmissionData | null,
  travelSegments: Array<TravelSegment>,
  users: Array<User>,
}

export interface RouteReducerPayload {
  type: ReducerActionType | null,
  dir: string,
  firstRouteSegmentId?: number,
  routeNum: string,
  routeType: RouteSignType,
}

export interface RouteState {
  dir?: string,
  firstRouteSegmentId?: number | null,
  routeNum?: string,
  routeType?: RouteSignType,
}

export interface RouteSegment {
  readonly id: number,
  readonly routeNum: string,
  readonly type: RouteSignType,
  readonly segNum: number,
  readonly dir: string,
  readonly len: number,
  readonly len_m: number,
}

export interface RouteSegmentPolyLine {
  readonly id: number,
  readonly points: Array<Leaflet.LatLngTuple>,
}

export interface RouteSegmentReducerPayload {
  type: ReducerActionType | null,
  boundingBox?: Leaflet.BoundsLiteral,
  concurrencies?: Array<RouteSegmentPolyLine>,
  currRouteSegmentsIdx?: number,
  lat?: number,
  lon?: number,
  popupCoords?: PopupCoord | null,
  routeSegmentData?: Array<RouteSegmentPolyLine>,
  routeSegmentId?: number | null,
  routeSegments?: Array<Array<RouteSegment>>,
  zoom?: number,
}

export interface RouteSegmentState {
  boundingBox?: Leaflet.BoundsLiteral | null,
  concurrencies?: Array<RouteSegmentPolyLine>,
  currRouteSegmentsIdx?: number,
  lat?: number,
  lon?: number,
  popupCoords?: PopupCoord | null,
  routeSegmentData?: Array<RouteSegmentPolyLine>,
  routeSegmentId?: number | null,
  routeSegments?: Array<Array<RouteSegment>>,
  zoom?: number,
}

export interface SearchResultData {
  idx: number,
  routeSeg: RouteSegment,
}

export interface State {
  readonly id: number,
  readonly identifier: string,
  readonly title: string,
  readonly initials: string,
  readonly boundingBox: Leaflet.BoundsLiteral
}

export interface User {
  id: string,
  user: string,
}

export type UserProps = {
  user: string,
};

export interface TravelSegment {
  routeNum: string,
  routeSegmentId: number,
  startId: number,
  endId: number,
  clinched: boolean,
}

export interface TravelStatSegment extends TravelSegment {
  points: Array<Leaflet.LatLngTuple>,
}

export interface TravelStat {
  readonly percentage: string,
  readonly route: string,
  readonly routeSegment: number,
  readonly state: string,
  readonly total: number,
  readonly traveled: number,
}

export interface TravelStatsAPIPayload {
  readonly loaded: boolean
  readonly notFound: boolean
  readonly travelStats: Array<TravelStat>,
  readonly travelSegments: Array<TravelStatSegment>
}

export interface SubmissionData {
  readonly message: string,
  readonly success: boolean,
}

export interface UserDataCallbackMap {
  onClinchToggleFor: (i: number) => void,
  onResetTravelSegments: () => void,
  onSendTravelSegments: () => void,
  onSetMode: (mode: TravelSegmentCreateMode) => void,
  onUserChange: (event: React.ChangeEvent<HTMLSelectElement>) => void,
  onUserSubmit: (newUser: string) => void,
}

export interface UserSubmissionData extends SubmissionData {
  userId: number,
}
