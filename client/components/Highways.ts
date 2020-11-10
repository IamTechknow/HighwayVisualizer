import { RouteSignType } from '../types/enums';
import type { PopupCoord, State, Segment, SegmentPolyLine, UserSegment } from '../types/types';

import * as Leaflet from 'leaflet';

const R = 6371e3; // Mean radius of Earth in meters
const FACTOR = Math.PI / 180;
const POINTS_BINSEARCH_ITERATIONS = 2;
const ROUTE_NAMES = Object.freeze({
  [RouteSignType.INTERSTATE]: 'Interstate',
  [RouteSignType.US_HIGHWAY]: 'US Highway',
  [RouteSignType.STATE]: 'State Route',
});

// Manages highway information on the client side, including route IDs, numbers, and points size.
export default class Highways {
  // Flatened map from segment ID to segment data
  private segmentData: { [segmentId: number]: Segment };
  // Map route number and direction to segment IDs for each route signage type
  private idCache: { [id: number]: { [routeStr: string]: Array<number> } };
  // User segment data
  public userSegments: Array<UserSegment>;
  // Map route number to segment length
  private routeLengthMap: { [routeStr: string]: number };
  // Map state ID to object
  private stateCache: { [stateId: number]: State };

  // Apply haversine formula to calculate the 'great-circle' distance between two coordinates
  static calcHavensine(point: Leaflet.LatLng, radX2: number, radY2: number): number {
    const { lat, lng } = point;

    const radX1 = Highways.toRadians(lat);
    const deltaLat = radX2 - radX1;
    const deltaLng = radY2 - Highways.toRadians(lng);
    const sinOfDeltaLat = Math.sin(deltaLat / 2);
    const sinOfDeltaLng = Math.sin(deltaLng / 2);

    const a = sinOfDeltaLat * sinOfDeltaLat
      + Math.cos(radX1) * Math.cos(radX2)
      * sinOfDeltaLng * sinOfDeltaLng;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  static getMapForLiveIds(segments: Array<SegmentPolyLine>): Map<number, number> {
    return new Map(segments.map((seg, i) => [seg.id, i]));
  }

  static getRoutePrefix(typeEnum: RouteSignType): string {
    return ROUTE_NAMES[typeEnum];
  }

  static getType(input: string): RouteSignType {
    const classifications: { [key: string]: RouteSignType } = {
      I: RouteSignType.INTERSTATE,
      i: RouteSignType.INTERSTATE,
      US: RouteSignType.US_HIGHWAY,
      us: RouteSignType.US_HIGHWAY,
    };
    return classifications[input] ? classifications[input] : RouteSignType.STATE;
  }

  static toRadians(angle: number): number {
    return angle * FACTOR;
  }

  /*
    Assumptions made for binary search:
    - The route is generally travelling in a certain direction
      so points can be treated as a sorted array.
    - Less likely to work for routes that travel circular, may need to debug comparsions
  */
  static findSegmentPoint(
    polyline: Leaflet.Polyline,
    clicked: Leaflet.LatLng,
    segmentId: number,
  ): PopupCoord {
    const points = <Leaflet.LatLng[]>polyline.getLatLngs();
    let shortestDist = Number.MAX_VALUE;
    let closest;
    const clickedLat = clicked.lat, clickedLng = clicked.lng;
    const radX2 = Highways.toRadians(clickedLat), radY2 = Highways.toRadians(clickedLng);

    // Binary search for desired range by comparing distances
    // Not exhaustive to ensure point is found
    let lo = 0, hi = points.length - 1;
    for (let i = 0; i < POINTS_BINSEARCH_ITERATIONS; i += 1) {
      const mid = Math.trunc((hi + lo) / 2);
      const latMid = points[mid].lat, lngMid = points[mid].lng;
      const radXMid = Highways.toRadians(latMid), radYMid = Highways.toRadians(lngMid);
      const startDist = Highways.calcHavensine(points[lo], radX2, radY2);
      const midDist = Highways.calcHavensine(points[mid], radX2, radY2);
      const endDist = Highways.calcHavensine(points[hi], radX2, radY2);
      const startToMidDist = Highways.calcHavensine(points[lo], radXMid, radYMid);
      const midToEndDist = Highways.calcHavensine(points[hi], radXMid, radYMid);
      if (startDist <= midDist && startDist <= endDist) {
        hi = mid;
      } else if (
        midDist <= startDist && midDist <= endDist && endDist >= midToEndDist
      ) {
        hi = mid;
      } else if (
        midDist <= startDist && midDist <= endDist && startDist >= startToMidDist
      ) {
        lo = mid;
      } else {
        lo = mid;
      }
    }

    for (let i = lo; i <= hi; i += 1) {
      const d = Highways.calcHavensine(points[i], radX2, radY2);
      if (d < shortestDist) {
        shortestDist = d;
        closest = i;
      }
    }
    if (closest == null) {
      throw new Error('Assertion failed: No point index found during binary search!');
    }

    return { idx: closest, segmentId, ...points[closest] };
  }

  static getZoomForRouteLength(len: number): number {
    if (len <= 1000) {
      return 14.5;
    }
    if (len <= 3000) {
      return 13.5;
    }
    if (len <= 5000) {
      return 12.5;
    }
    if (len <= 10000) {
      return 11.5;
    }
    if (len <= 30000) {
      return 11;
    }
    if (len <= 50000) {
      return 10.5;
    }
    if (len <= 100000) {
      return 9.5;
    }
    if (len <= 300000) {
      return 8.5;
    }
    if (len <= 500000) {
      return 7.5;
    }
    return 6;
  }

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
      this.addSegment({ routeNum, segmentId, startId, endId, clinched: false });
    } else {
      // Figure out higher and lower points
      const start = startMarker.segmentId > segmentId ? endMarker : startMarker;
      const end = startMarker.segmentId < segmentId ? endMarker : startMarker;
      const idMap = Highways.getMapForLiveIds(segmentData);

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
      { routeNum, segmentId, startId: 0, endId: this.segmentData[segmentId].len, clinched: false },
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
    segmentData: Array<Segment>,
    segmentId: number,
  ): number {
    if (segmentData.length === 0) {
      return 0;
    }
    // Check for data match, because segmentData and route vars may be out of sync.
    const firstSegment = segmentData[0];
    const segmentsOfRoute = this.getSegmentIds(routeType, routeStr);
    if (!segmentsOfRoute.includes(firstSegment.id)) {
      return 0; // TODO: parameter for previous zoom
    }
    const wholeRouteSelected = segmentData.length > 1
      || this.getSegmentIds(routeType, routeStr).length === 1;
    const routeLen = wholeRouteSelected
      ? this.routeLengthMap[routeStr]
      : this.segmentData[segmentId].len_m;
    return Highways.getZoomForRouteLength(routeLen);
  }

  setStates(stateArr: Array<State>): void {
    this.stateCache = {};
    stateArr.forEach((stateObj: State): void => {
      this.stateCache[stateObj.id] = stateObj;
    });
  }

  shouldUseRouteDir(stateId: number): boolean {
    switch (this.stateCache[stateId].identifier) {
      case 'California':
      case 'District':
      case 'Maryland':
        return true;
      default:
        return false;
    }
  }
}
