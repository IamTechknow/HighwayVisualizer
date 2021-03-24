import * as Leaflet from 'leaflet';
import { ReducerActionType, RouteSignType } from './enums';

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
  concurrencies?: Array<RouteSegmentPolyLine>,
  lat?: number,
  lon?: number,
  popupCoords?: PopupCoord | null,
  routeSegmentData?: Array<RouteSegmentPolyLine>,
  routeSegmentId?: number | null,
  routeSegments?: Array<Array<RouteSegment>>,
  zoom?: number,
}

export interface RouteSegmentState {
  concurrencies?: Array<RouteSegmentPolyLine>,
  lat?: number,
  lon?: number,
  popupCoords?: PopupCoord | null,
  routeSegmentData?: Array<RouteSegmentPolyLine>,
  routeSegmentId?: number | null,
  routeSegments?: Array<Array<RouteSegment>>,
  zoom?: number,
}

export interface State {
  readonly id: number,
  readonly identifier: string,
  readonly title: string,
  readonly initials: string,
}

export interface User {
  id: string,
  user: string,
}

export interface UserProps {
  user: string,
}

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

export interface UserSubmissionData extends SubmissionData {
  userId: number,
}
