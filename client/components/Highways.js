import UserSegment from '../types/UserSegment';
import Prefixes from './RoutePrefixes';

const R = 6371e3; // Mean radius of Earth in meters
const FACTOR = Math.PI / 180;
const POINTS_BINSEARCH_ITERATIONS = 2;

// Manages highway information on the client side, including route IDs, numbers, and points size.
export default class Highways {
  constructor() {
    // Map route numbers to Interstate and US Highway prefixes
    this.titleCache = undefined;
    // Flatened map from route ID to route data
    this.routeData = undefined;
    // Map route number and direction to segment IDs
    this.idCache = undefined;
    // User segment data
    this.userSegments = [];
    // Map route number to route length
    this.routeLengthMap = undefined;
  }

  getZoomForRouteId(routeId, isRouteNumber) {
    const len = isRouteNumber ? this.routeLengthMap[routeId] : this.routeData[routeId].len_m;
    if (len <= 1000) {
      return 14.5;
    } else if (len <= 3000) {
      return 13.5;
    } else if (len <= 5000) {
      return 12.5;
    } else if (len <= 10000) {
      return 11.5;
    } else if (len <= 30000) {
      return 11;
    } else if (len <= 50000) {
      return 10.5;
    } else if (len <= 100000) {
      return 9.5;
    } else if (len <= 300000) {
      return 8.5;
    } else if (len <= 500000) {
      return 7.5;
    }
    return 6;
  }

  buildCacheFor(state) {
    this.titleCache = Prefixes[state] ?? {};
  }

  buildStateRoutesData(raw) {
    const routeReducer = (accum, curr) => {
      accum[curr.id] = curr;
      return accum;
    };
    const idReducer = (accum, curr) => {
      const key = curr.route + curr.dir;
      if (accum[key]) {
        accum[key].push(curr.id);
      } else {
        accum[key] = [curr.id];
      }
      return accum;
    }
    const lenReducer = (accum, curr) => {
      const key = curr.route + curr.dir;
      if (accum[key]) {
        accum[key] += curr.len_m;
      } else {
        accum[key] = curr.len_m;
      }
      return accum;
    }
    this.routeData = raw.reduce(routeReducer, {});
    this.idCache = raw.reduce(idReducer, {});
    this.routeLengthMap = raw.reduce(lenReducer, {});
  }

  getRoutePrefix(route) {
    return this.titleCache[route] ? this.titleCache[route] : 'State Route';
  }

  getMapForLiveIds(segments) {
    return new Map(segments.map((seg, i) => [seg.id, i]));
  }

  getClassification(input) {
    const classifications = {
      I : 'Interstate',
      i : 'Interstate',
      US : 'US Highway',
      us : 'US Highway',
    };
    return classifications[input] ? classifications[input] : null;
  }

  getSegmentNum(routeId) {
    return this.routeData[routeId].seg + 1;
  }

  toRadians (angle) {
    return angle * FACTOR;
  }

  /*
    Assumptions made for binary search:
    - The route is generally travelling in a certain direction so points can be treated as a sorted array.
    - Less likely to work for routes that travel circular, may need to debug comparsions
    - CA 18 is a special case, it does not work right even for linear search
  */
  findSegmentPoint(polyline, clicked, routeId) {
    let points = polyline.getLatLngs();
    let shortestDistance = Number.MAX_VALUE;
    let closest;
    const clickedLat = clicked.lat, clickedLng = clicked.lng;
    const radX2 = this.toRadians(clickedLat), radY2 = this.toRadians(clickedLng);

    // Binary search for desired range by comparing distances
    // Not exhaustive to ensure point is found
    let lo = 0, hi = points.length - 1;
    for (let i = 0; i < POINTS_BINSEARCH_ITERATIONS; i += 1) {
      let mid = Math.trunc((hi + lo) / 2);
      let startDistance = this.calcHavensine(points[lo], radX2, radY2);
      let midDistance = this.calcHavensine(points[mid], radX2, radY2);
      let endDistance = this.calcHavensine(points[hi], radX2, radY2);
      let temp;
      if (startDistance <= midDistance && startDistance <= endDistance) {
        hi = mid;
      } else if (midDistance <= startDistance && midDistance <= endDistance && startDistance <= endDistance) {
        hi = mid;
      } else if (midDistance <= startDistance && midDistance <= endDistance && startDistance > endDistance) {
        lo = mid;
      } else {
        lo = mid;
      }
    }

    for (let i = lo; i <= hi; i += 1) {
      const d = this.calcHavensine(points[i], radX2, radY2);
      if (d < shortestDistance) {
        shortestDistance = d;
        closest = i;
      }
    }

    return Object.assign(points[closest], {idx: closest, routeId});
  }

  clearUserSegments() {
    this.userSegments = [];
  }

  toggleUserSegment(idx) {
    this.userSegments[idx].clinched = !this.userSegments[idx].clinched;
  }

  addSegment(userSegment) {
    this.userSegments.push(userSegment);
  }

  addNewUserSegments(startMarker, endMarker, route, routeId, segments) {
    // Check whether both points have the same route ID
    if (startMarker.routeId === routeId) {
      const startId = Math.min(startMarker.idx, endMarker.idx),
        endId = Math.max(startMarker.idx, endMarker.idx);
      this.addSegment(new UserSegment(route, routeId, startId, endId, false));
    } else {
      // Figure out higher and lower points
      const start = startMarker.routeId > routeId ? endMarker : startMarker;
      const end = startMarker.routeId < routeId ? endMarker : startMarker;
      const idMap = this.getMapForLiveIds(segments);

      // Add first segment
      const endIdx = segments[idMap.get(start.routeId)].points.length;
      this.addSegment(new UserSegment(route, start.routeId, start.idx, endIdx, false));
      // Add entire user segments if needed
      if (end.routeId - start.routeId > 1) {
        for (let i = start.routeId + 1; i < end.routeId; i += 1) {
          this.addSegment(new UserSegment(route, i, 0, segments[idMap.get(i)].points.length, false));
        }
      }

      this.addSegment(new UserSegment(route, end.routeId, 0, end.idx, false)); // Add last segment
    }
  }

  addFullSegment(route, routeId) {
    this.addSegment(new UserSegment(route, routeId, 0, this.routeData[routeId].len, false));
  }

  addAllSegments(route, dir) {
    for (let routeId of this.idCache[route + dir]) {
      this.addFullSegment(route, routeId);
    }
  }

  // Apply haversine formula to calculate the 'great-circle' distance between two coordinates
  calcHavensine(point, radX2, radY2) {
    const {lat, lng} = point;

    const radX1 = this.toRadians(lat);
    const deltaLat = radX2 - radX1;
    const deltaLng = radY2 - this.toRadians(lng);
    const sinOfDeltaLat = Math.sin(deltaLat / 2);
    const sinOfDeltaLng = Math.sin(deltaLng / 2);

    const a = sinOfDeltaLat * sinOfDeltaLat +
      Math.cos(radX1) * Math.cos(radX2) *
      sinOfDeltaLng * sinOfDeltaLng;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }
}
