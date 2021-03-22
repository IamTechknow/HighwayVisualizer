import * as Leaflet from 'leaflet';
import { RouteSignType } from '../types/enums';
import type {
  PopupCoord, Segment, SegmentPolyLine, UserSegment,
} from '../types/types';

const R = 6371e3; // Mean radius of Earth in meters
const FACTOR = Math.PI / 180;
const POINTS_BINSEARCH_ITERATIONS = 2;
const ROUTE_NAMES = {
  [RouteSignType.INTERSTATE]: 'Interstate',
  [RouteSignType.US_HIGHWAY]: 'US Highway',
  [RouteSignType.STATE]: 'State Route',
};

const ROUTE_ABBREVIATIONS = {
  [RouteSignType.INTERSTATE]: 'I-',
  [RouteSignType.US_HIGHWAY]: 'US ',
  [RouteSignType.STATE]: '',
};

export const toRadians = (angle: number): number => angle * FACTOR;

// Apply haversine formula to calculate the 'great-circle' distance between two coordinates
export const calcHavensine = (point: Leaflet.LatLng, radX2: number, radY2: number): number => {
  const { lat, lng } = point;

  const radX1 = toRadians(lat);
  const deltaLat = radX2 - radX1;
  const deltaLng = radY2 - toRadians(lng);
  const sinOfDeltaLat = Math.sin(deltaLat / 2);
  const sinOfDeltaLng = Math.sin(deltaLng / 2);

  const a = sinOfDeltaLat * sinOfDeltaLat +
    Math.cos(radX1) * Math.cos(radX2) *
    sinOfDeltaLng * sinOfDeltaLng;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

export const getMapForLiveIds = (
  segments: Array<SegmentPolyLine>,
): Map<number, number> => new Map(segments.map((seg, i) => [seg.id, i]));

export const getRoutePrefix = (typeEnum: RouteSignType): string => ROUTE_NAMES[typeEnum];

export const getType = (input: string): RouteSignType => {
  const classifications: { [key: string]: RouteSignType } = {
    I: RouteSignType.INTERSTATE,
    i: RouteSignType.INTERSTATE,
    US: RouteSignType.US_HIGHWAY,
    us: RouteSignType.US_HIGHWAY,
  };
  return classifications[input] ? classifications[input] : RouteSignType.STATE;
};

const shouldUseRouteDir = (stateIdentifier: string): boolean => {
  switch (stateIdentifier) {
    case 'California':
    case 'District':
    case 'Maryland':
      return true;
    default:
      return false;
  }
};

export const getRouteName = (
  segment: Segment,
  stateIdentifier: string,
  useRouteTitle = true,
): string => {
  const { dir, routeNum, type } = segment;
  if (!useRouteTitle) {
    const abbreviation = stateIdentifier === 'District' && type === RouteSignType.STATE
      ? 'DC '
      : ROUTE_ABBREVIATIONS[type];
    return `${abbreviation}${routeNum}${shouldUseRouteDir(stateIdentifier) ? `${dir}` : ''}`;
  }
  // One exception for D.C. Route 295
  const routeName = stateIdentifier === 'District' && type === RouteSignType.STATE
    ? `D.C. Route ${routeNum}`
    : `${getRoutePrefix(type)} ${routeNum}`;
  return shouldUseRouteDir(stateIdentifier) ? `${routeName} ${dir}` : routeName;
};

/*
    Assumptions made for binary search:
    - The route is generally travelling in a certain direction
      so points can be treated as a sorted array.
    - Less likely to work for routes that travel circular, may need to debug comparsions
  */
export const findSegmentPoint = (
  polyline: Leaflet.Polyline,
  clicked: Leaflet.LatLng,
  segmentId: number,
): PopupCoord => {
  const points = <Leaflet.LatLng[]>polyline.getLatLngs();
  let shortestDist = Number.MAX_VALUE;
  const clickedLat = clicked.lat, clickedLng = clicked.lng;
  const radX2 = toRadians(clickedLat), radY2 = toRadians(clickedLng);

  // Binary search for desired range by comparing distances
  // Not exhaustive to ensure point is found
  let lo = 0, hi = points.length - 1;
  for (let i = 0; i < POINTS_BINSEARCH_ITERATIONS; i += 1) {
    const mid = Math.trunc((hi + lo) / 2);
    const latMid = points[mid].lat, lngMid = points[mid].lng;
    const radXMid = toRadians(latMid), radYMid = toRadians(lngMid);
    const startDist = calcHavensine(points[lo], radX2, radY2);
    const midDist = calcHavensine(points[mid], radX2, radY2);
    const endDist = calcHavensine(points[hi], radX2, radY2);
    const startToMidDist = calcHavensine(points[lo], radXMid, radYMid);
    const midToEndDist = calcHavensine(points[hi], radXMid, radYMid);
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

  let closest = lo;
  for (let i = lo; i <= hi; i += 1) {
    const d = calcHavensine(points[i], radX2, radY2);
    if (d < shortestDist) {
      shortestDist = d;
      closest = i;
    }
  }

  return { idx: closest, segmentId, ...points[closest] };
};

export const getZoomForRouteLength = (len: number): number => {
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
};

export const stringifyUserSegment = (userSegment: UserSegment): string => {
  const {
    clinched, endId, segmentId, startId,
  } = userSegment;
  return `userSeg-${segmentId}-${startId}-${endId}-${clinched}`;
};
