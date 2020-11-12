import { RouteSignType } from '../types/enums';
import type { PopupCoord, State, Segment, SegmentPolyLine, UserSegment } from '../types/types';

// All instance methods are defined here. TS doesn't allow properties to be declared static
export interface IHighways {
  segmentData: { [segmentId: number]: Segment },
  idCache: { [id: number]: { [routeStr: string]: Array<number> } },
  userSegments: Array<UserSegment>,
  routeLengthMap: { [routeStr: string]: number },
  stateCache: { [stateId: number]: State },

  addAllSegments(routeNum: string, type: RouteSignType, dir: string): void,
  addFullSegment(routeNum: string, segmentId: number): void,
  addNewUserSegments(startMarker: PopupCoord, endMarker: PopupCoord, routeNum: string, segmentId: number, segmentData: Array<SegmentPolyLine>): void,
  addSegment(userSegment: UserSegment): void,
  buildStateSegmentsData(raw: Array<Segment>): void,
  clearUserSegments(): void,
  getCenterOfRoute(routeNumAndDir: string, type: RouteSignType): Array<number>,
  getSegmentIds(type: RouteSignType, routeNumAndDir: string): Array<number>,
  getSegmentNum(segmentId: number): number,
  getState(stateId: number): State,
  getZoomLevel(routeStr: string, routeType: RouteSignType, segmentData: Array<SegmentPolyLine>, segmentId: number): number,
  setStates(stateArr: Array<State>): void,
  shouldUseRouteDir(stateId: number): boolean,
  toggleUserSegment(idx: number): void,
}
