import * as Leaflet from 'leaflet';
import { RouteSignType } from '../types/enums';
import type {
  PopupCoord, RouteSegment, RouteSegmentPolyLine, TravelSegment,
} from '../types/types';

const R = 6371e3; // Mean radius of Earth in meters
const FACTOR = Math.PI / 180;
const POINTS_BINSEARCH_ITERATIONS = 2;
const ROUTE_NAMES: { [signType: number]: string } = {
  [RouteSignType.INTERSTATE]: 'Interstate',
  [RouteSignType.US_HIGHWAY]: 'US Highway',
  [RouteSignType.STATE]: 'State Route',
};

const ROUTE_ABBREVIATIONS: { [signType: number]: string } = {
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

export const getMapForLiveSegmentIds = (
  routeSegments: Array<RouteSegmentPolyLine>,
): Map<number, number> => new Map(routeSegments.map((seg, i) => [seg.id, i]));

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
  routeSegment: RouteSegment,
  stateIdentifier: string,
  useRouteTitle = true,
): string => {
  const { dir, routeNum, type } = routeSegment;
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
  routeSegmentId: number,
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

  return { idx: closest, routeSegmentId, ...points[closest] };
};

// Start at 1000 meters and 14 zoom. Increase most signficant digit from
// 1 -> 3 -> 5 -> 10 while decreasing zoom by 1.
// NOTE: Can be decimal but the zoom WMTS URL parameter is an integer.
export const getZoomForRouteLength = (len: number): number => {
  if (len <= 300) {
    return 16.0;
  }
  if (len >= 5e5) {
    return 6.0;
  }
  return 81.8435 - 59.8716 * (len ** 0.017957); // 81.8435-59.8716x^(0.017957)
};

export const stringifyTravelSegment = (travelSegment: TravelSegment): string => {
  const {
    clinched, endId, routeSegmentId, startId,
  } = travelSegment;
  return `userSeg-${routeSegmentId}-${startId}-${endId}-${clinched}`;
};
