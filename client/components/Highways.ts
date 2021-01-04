import { RouteSignType } from '../types/enums';
import type {
  PopupCoord, State, Segment, SegmentPolyLine, UserSegment,
} from '../types/types';
import type { IHighways } from '../types/interfaces';

import { getMapForLiveIds, getZoomForRouteLength } from '../utils/HighwayUtils';

// Manages highway information on the client side, including route IDs, numbers, and points size.
export default class Highways implements IHighways {
  // Flattened map from segment ID to segment data
  public segmentData: { [segmentId: number]: Segment };

  // Map route number and direction to segment IDs for each route signage type
  public idCache: { [id: number]: { [routeStr: string]: Array<number> } };

  // User segment data
  public userSegments: Array<UserSegment>;

  // Map route number to segment length
  public routeLengthMap: { [routeStr: string]: number };

  // Map state ID to object
  public stateCache: { [stateId: number]: State };

  constructor() {
    this.segmentData = {};
    this.idCache = {};
    this.userSegments = [];
    this.routeLengthMap = {};
    this.stateCache = {};
  }

  buildStateSegmentsData(raw: Array<Segment>): void {
    const initialIdCache = {
      [RouteSignType.INTERSTATE]: {},
      [RouteSignType.US_HIGHWAY]: {},
      [RouteSignType.STATE]: {},
    };
    const segmentReducer = (accum: { [segmentId: number]: Segment }, curr: Segment) => {
      accum[curr.id] = curr;
      return accum;
    };
    const idReducer = (
      accum: { [id: number]: { [routeStr: string]: Array<number> } },
      currSegment: Segment,
    ) => {
      const {
        dir, id, routeNum, type,
      } = currSegment;
      const key = routeNum + dir;
      if (accum[type][key]) {
        accum[type][key].push(id);
      } else {
        accum[type][key] = [id];
      }
      return accum;
    };
    const lenReducer = (accum: { [routeStr: string]: number }, currSegment: Segment) => {
      // eslint-disable-next-line @typescript-eslint/naming-convention
      const { dir, len_m, routeNum } = currSegment;
      const key = routeNum + dir;
      accum[key] = accum[key] ? accum[key] + len_m : len_m;
      return accum;
    };
    this.segmentData = raw.reduce(segmentReducer, {});
    this.idCache = raw.reduce(idReducer, initialIdCache);
    this.routeLengthMap = raw.reduce(lenReducer, {});
  }

  getSegmentNum(segmentId: number): number {
    return this.segmentData[segmentId].segNum + 1;
  }

  getSegmentIds(type: RouteSignType, routeNumAndDir: string): Array<number> {
    return this.idCache[type][routeNumAndDir];
  }

  clearUserSegments(): void {
    this.userSegments = [];
  }

  toggleUserSegment(idx: number): void {
    this.userSegments[idx].clinched = !this.userSegments[idx].clinched;
  }

  addSegment(userSegment: UserSegment): void {
    this.userSegments.push(userSegment);
  }

  addNewUserSegments(
    startMarker: PopupCoord,
    endMarker: PopupCoord,
    routeNum: string,
    segmentId: number,
    segmentData: Array<SegmentPolyLine>,
  ): void {
    // Check whether both points have the same route ID
    if (startMarker.segmentId === segmentId) {
      const startId = Math.min(startMarker.idx, endMarker.idx),
        endId = Math.max(startMarker.idx, endMarker.idx);
      this.addSegment({
        routeNum, segmentId, startId, endId, clinched: false,
      });
    } else {
      // Figure out higher and lower points
      const start = startMarker.segmentId > segmentId ? endMarker : startMarker;
      const end = startMarker.segmentId < segmentId ? endMarker : startMarker;
      const idMap = getMapForLiveIds(segmentData);

      // Add first segment
      const endIdx = segmentData[<number>idMap.get(start.segmentId)].points.length;
      this.addSegment({
        routeNum,
        segmentId: start.segmentId,
        startId: start.idx,
        endId: endIdx,
        clinched: false,
      });
      // Add entire user segments if needed
      if (end.segmentId - start.segmentId > 1) {
        for (let i = start.segmentId + 1; i < end.segmentId; i += 1) {
          this.addSegment({
            routeNum,
            segmentId: i,
            startId: 0,
            endId: segmentData[<number>idMap.get(i)].points.length,
            clinched: false,
          });
        }
      }
      // Add last segment
      this.addSegment({
        routeNum,
        segmentId: end.segmentId,
        startId: 0,
        endId: end.idx,
        clinched: false,
      });
    }
  }

  addFullSegment(routeNum: string, segmentId: number): void {
    this.addSegment(
      {
        routeNum, segmentId, startId: 0, endId: this.segmentData[segmentId].len, clinched: false,
      },
    );
  }

  addAllSegments(routeNum: string, type: RouteSignType, dir: string): void {
    this.getSegmentIds(type, routeNum + dir).forEach((segmentId: number): void => {
      this.addFullSegment(routeNum, segmentId);
    });
  }

  // Calculate # of points, then iterate thru array to get center, and return coordinates
  getCenterOfRoute(routeNumAndDir: string, type: RouteSignType): Array<number> {
    const segmentIds = this.getSegmentIds(type, routeNumAndDir);
    const numPoints = segmentIds.map((segmentId) => this.segmentData[segmentId].len);
    const totalNum = numPoints.reduce((accum, curr) => accum + curr, 0);

    let segmentIdIdx = 0;
    let midPointIdx = Math.floor(totalNum / 2);
    while (segmentIdIdx < numPoints.length && midPointIdx > numPoints[segmentIdIdx]) {
      midPointIdx -= numPoints[segmentIdIdx];
      segmentIdIdx += 1;
    }
    return [segmentIdIdx, midPointIdx];
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
    segmentData: Array<SegmentPolyLine>,
    segmentId: number,
  ): number {
    const wholeRouteSelected = segmentData.length > 1 ||
      this.getSegmentIds(routeType, routeStr).length === 1;
    const routeLen = wholeRouteSelected
      ? this.routeLengthMap[routeStr]
      : this.segmentData[segmentId].len_m;
    return getZoomForRouteLength(routeLen);
  }

  setStates(stateArr: Array<State>): void {
    this.stateCache = {};
    stateArr.forEach((stateObj: State): void => {
      this.stateCache[stateObj.id] = stateObj;
    });
  }
}
