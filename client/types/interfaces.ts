import { RouteSignType } from './enums';
import type {
  PopupCoord, State, RouteSegment, RouteSegmentPolyLine, TravelSegment,
} from './types';

// All instance methods are defined here. TS doesn't allow properties to be declared static
export interface IHighways {
  routeSegmentData: { [routeSegmentId: number]: RouteSegment },
  idCache: { [id: number]: { [routeStr: string]: Array<number> } },
  travelSegments: Array<TravelSegment>,
  routeLengthMap: { [routeStr: string]: number },
  stateCache: { [stateId: number]: State },

  addAllRouteSegments(routeNum: string, type: RouteSignType, dir: string): void,
  addFullRouteSegment(routeNum: string, routeSegmentId: number): void,
  addNewTravelSegments(
    startMarker: PopupCoord,
    endMarker: PopupCoord,
    routeNum: string,
    routeSegmentId: number,
    routeSegmentData: Array<RouteSegmentPolyLine>
  ): void,
  addTravelSegment(travelSegment: TravelSegment): void,
  buildStateSegmentsData(raw: Array<RouteSegment>): void,
  clearTravelSegments(): void,
  getCenterOfRoute(routeNumAndDir: string, type: RouteSignType): Array<number>,
  getRouteSegmentIds(type: RouteSignType, routeNumAndDir: string): Array<number>,
  getRouteSegmentNum(routeSegmentId: number): number,
  getState(stateId: number): State,
  getZoomLevel(routeStr: string,
    routeType: RouteSignType,
    routeSegmentData: Array<RouteSegmentPolyLine>,
    routeSegmentId: number
  ): number,
  setStates(stateArr: Array<State>): void,
  toggleTravelSegment(idx: number): void,
}
