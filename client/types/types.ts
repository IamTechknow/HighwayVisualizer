import { ReducerActionType, RouteSignType } from './enums';

import * as Leaflet from 'leaflet';

export interface PopupCoord extends Leaflet.LatLngLiteral {
  readonly idx: number,
  readonly segmentId: number,
}

export interface RootPayload {
  routePayload?: RouteReducerPayload,
  segmentPayload?: SegmentReducerPayload,
}

export interface RootState {
  routeState: RouteState,
  segmentState: SegmentState,
}

export interface RouteReducerPayload {
  type: ReducerActionType | null,
  dir: string,
  firstSegmentId?: number,
  routeNum: string,
  routeType: RouteSignType,
}

export interface RouteState {
  dir?: string,
  firstSegmentId?: number | null,
  routeNum?: string,
  routeType?: RouteSignType,
}

export interface Segment {
  readonly id: number,
  readonly routeNum: string,
  readonly type: RouteSignType,
  readonly segNum: number,
  readonly dir: string,
  readonly len: number,
  readonly len_m: number,
}

export interface SegmentPolyLine {
  readonly id: number,
  readonly points: Array<Leaflet.LatLng>,
}

export interface SegmentReducerPayload {
  type: ReducerActionType | null,
  concurrencies?: Array<SegmentPolyLine>,
  lat?: number,
  lon?: number,
  popupCoords?: PopupCoord | null,
  segmentData?: Array<SegmentPolyLine>,
  segmentId?: number | null,
  segments?: Array<Segment>,
}

export interface SegmentState {
  concurrencies?: Array<SegmentPolyLine>,
  lat?: number,
  lon?: number,
  popupCoords?: PopupCoord | null,
  segmentData?: Array<SegmentPolyLine>,
  segmentId?: number | null,
  segments?: Array<Segment>,
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

export interface UserRouteProps {
  user: string,
}

export interface UserSegment {
  routeNum: string,
  segmentId: number,
  startId: number,
  endId: number,
  clinched: boolean,
}

export interface UserStatSegment extends UserSegment {
  points: Array<Leaflet.LatLngTuple>,
}

export interface UserStat {
  readonly percentage: string,
  readonly route: string,
  readonly segment: number,
  readonly state: string,
  readonly total: number,
  readonly traveled: number,
}

export interface UserStatsAPIPayload {
  readonly loaded: boolean
  readonly notFound: boolean
  readonly stats: Array<UserStat>,
  readonly userSegments: Array<UserStatSegment>
}

export interface SubmissionData {
  readonly message: string,
  readonly success: boolean,
}

export interface UserSubmissionData extends SubmissionData {
  userId: number,
}
