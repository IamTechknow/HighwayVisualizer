import { RouteSignType } from '../types/enums';
import type {
  PopupCoord, State, RouteSegment, RouteSegmentPolyLine, TravelSegment,
} from '../types/types';
import type { IHighways } from '../types/interfaces';

import { getMapForLiveSegmentIds, getZoomForRouteLength } from '../utils/HighwayUtils';

// Manages highway information on the client side, including route IDs, numbers, and points size.
export default class Highways implements IHighways {
  // Flattened map from route segment ID to route segment data
  public routeSegmentData: { [routeSegmentId: number]: RouteSegment };

  // Map route number and direction to route segment IDs for each route signage type
  public idCache: { [id: number]: { [routeStr: string]: Array<number> } };

  // Travel segment data
  public travelSegments: Array<TravelSegment>;

  // Map route number to route segment length
  public routeLengthMap: { [routeStr: string]: number };

  // Map state ID to object
  public stateCache: { [stateId: number]: State };

  constructor() {
    this.routeSegmentData = {};
    this.idCache = {};
    this.travelSegments = [];
    this.routeLengthMap = {};
    this.stateCache = {};
  }

  buildStateSegmentsData(raw: Array<RouteSegment>): void {
    const initialIdCache = {
      [RouteSignType.INTERSTATE]: {},
      [RouteSignType.US_HIGHWAY]: {},
      [RouteSignType.STATE]: {},
    };
    const routeSegmentReducer = (
      accum: { [routeSegmentId: number]: RouteSegment },
      curr: RouteSegment,
    ) => {
      accum[curr.id] = curr;
      return accum;
    };
    const idReducer = (
      accum: { [id: number]: { [routeStr: string]: Array<number> } },
      currRouteSegment: RouteSegment,
    ) => {
      const {
        dir, id, routeNum, type,
      } = currRouteSegment;
      const key = routeNum + dir;
      if (accum[type][key]) {
        accum[type][key].push(id);
      } else {
        accum[type][key] = [id];
      }
      return accum;
    };
    const lenReducer = (accum: { [routeStr: string]: number }, currRouteSegment: RouteSegment) => {
      // eslint-disable-next-line @typescript-eslint/naming-convention
      const { dir, len_m, routeNum } = currRouteSegment;
      const key = routeNum + dir;
      accum[key] = accum[key] ? accum[key] + len_m : len_m;
      return accum;
    };
    this.routeSegmentData = raw.reduce(routeSegmentReducer, {});
    this.idCache = raw.reduce(idReducer, initialIdCache);
    this.routeLengthMap = raw.reduce(lenReducer, {});
  }

  getRouteSegmentNum(routeSegmentId: number): number {
    return this.routeSegmentData[routeSegmentId].segNum + 1;
  }

  getRouteSegmentIds(type: RouteSignType, routeNumAndDir: string): Array<number> {
    return this.idCache[type][routeNumAndDir];
  }

  clearTravelSegments(): void {
    this.travelSegments = [];
  }

  toggleTravelSegment(idx: number): void {
    this.travelSegments[idx].clinched = !this.travelSegments[idx].clinched;
  }

  addTravelSegment(travelSegment: TravelSegment): void {
    this.travelSegments.push(travelSegment);
  }

  addNewTravelSegments(
    startMarker: PopupCoord,
    endMarker: PopupCoord,
    routeNum: string,
    routeSegmentId: number,
    routeSegmentData: Array<RouteSegmentPolyLine>,
  ): void {
    // Check whether both points have the same route ID
    if (startMarker.routeSegmentId === routeSegmentId) {
      const startId = Math.min(startMarker.idx, endMarker.idx),
        endId = Math.max(startMarker.idx, endMarker.idx);
      this.addTravelSegment({
        routeNum, routeSegmentId, startId, endId, clinched: false,
      });
    } else {
      // Figure out higher and lower points
      const start = startMarker.routeSegmentId > routeSegmentId ? endMarker : startMarker;
      const end = startMarker.routeSegmentId < routeSegmentId ? endMarker : startMarker;
      const idMap = getMapForLiveSegmentIds(routeSegmentData);

      // Add first segment
      const endIdx = routeSegmentData[<number>idMap.get(start.routeSegmentId)].points.length;
      this.addTravelSegment({
        routeNum,
        routeSegmentId: start.routeSegmentId,
        startId: start.idx,
        endId: endIdx,
        clinched: false,
      });
      // Add entire user segments if needed
      if (end.routeSegmentId - start.routeSegmentId > 1) {
        for (let i = start.routeSegmentId + 1; i < end.routeSegmentId; i += 1) {
          this.addTravelSegment({
            routeNum,
            routeSegmentId: i,
            startId: 0,
            endId: routeSegmentData[<number>idMap.get(i)].points.length,
            clinched: false,
          });
        }
      }
      // Add last segment
      this.addTravelSegment({
        routeNum,
        routeSegmentId: end.routeSegmentId,
        startId: 0,
        endId: end.idx,
        clinched: false,
      });
    }
  }

  addFullRouteSegment(routeNum: string, routeSegmentId: number): void {
    this.addTravelSegment(
      {
        routeNum,
        routeSegmentId,
        startId: 0,
        endId: this.routeSegmentData[routeSegmentId].len,
        clinched: false,
      },
    );
  }

  addAllRouteSegments(routeNum: string, type: RouteSignType, dir: string): void {
    this.getRouteSegmentIds(type, routeNum + dir).forEach((routeSegmentId: number): void => {
      this.addFullRouteSegment(routeNum, routeSegmentId);
    });
  }

  // Calculate # of points, then iterate thru array to get center, and return coordinates
  getCenterOfRoute(routeNumAndDir: string, type: RouteSignType): Array<number> {
    const routeSegmentIds = this.getRouteSegmentIds(type, routeNumAndDir);
    const numPoints = routeSegmentIds
      .map((routeSegmentId) => this.routeSegmentData[routeSegmentId].len);
    const totalNum = numPoints.reduce((accum, curr) => accum + curr, 0);

    let routeSegmentIdIdx = 0;
    let midPointIdx = Math.floor(totalNum / 2);
    while (routeSegmentIdIdx < numPoints.length && midPointIdx > numPoints[routeSegmentIdIdx]) {
      midPointIdx -= numPoints[routeSegmentIdIdx];
      routeSegmentIdIdx += 1;
    }
    return [routeSegmentIdIdx, midPointIdx];
  }

  getState(stateId: number): State {
    if (!this.stateCache[stateId]) {
      throw new Error(`State with ${stateId} not found!`);
    }
    return this.stateCache[stateId];
  }

  getZoomLevel(
    routeStr: string,
    routeType: RouteSignType,
    routeSegmentData: Array<RouteSegmentPolyLine>,
    routeSegmentId: number,
  ): number {
    const wholeRouteSelected = routeSegmentData.length > 1 ||
      this.getRouteSegmentIds(routeType, routeStr).length === 1;
    const routeLen = wholeRouteSelected
      ? this.routeLengthMap[routeStr]
      : this.routeSegmentData[routeSegmentId].len_m;
    return getZoomForRouteLength(routeLen);
  }

  setStates(stateArr: Array<State>): void {
    this.stateCache = {};
    stateArr.forEach((stateObj: State): void => {
      this.stateCache[stateObj.id] = stateObj;
    });
  }
}
