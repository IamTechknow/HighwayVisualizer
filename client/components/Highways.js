import UserSegment from '../types/UserSegment';

const R = 6371e3; // Mean radius of Earth in meters
const FACTOR = Math.PI / 180;
const POINTS_BINSEARCH_ITERATIONS = 2;
const TYPE_ENUM = Object.freeze({
  INTERSTATE: 2,
  US_HIGHWAY: 3,
  STATE: 4,
});
const ROUTE_NAMES = Object.freeze({
  [TYPE_ENUM.INTERSTATE]: 'Interstate',
  [TYPE_ENUM.US_HIGHWAY]: 'US Highway',
  [TYPE_ENUM.STATE]: 'State Route',
});

// Manages highway information on the client side, including route IDs, numbers, and points size.
export default class Highways {
  constructor() {
    // Flatened map from segment ID to segment data
    this.segmentData = undefined;
    // Map route number and direction to segment IDs
    this.idCache = undefined;
    // User segment data
    this.userSegments = [];
    // Map route number to segment length
    this.routeLengthMap = undefined;
  }

  getZoomForSegmentId(segmentId, isRouteNumber) {
    const len = isRouteNumber ? this.routeLengthMap[segmentId] : this.segmentData[segmentId].len_m;
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

  buildStateSegmentsData(raw) {
    const segmentReducer = (accum, curr) => {
      accum[curr.id] = curr;
      return accum;
    };
    const idReducer = (accum, curr) => {
      const key = curr.routeNum + curr.dir;
      if (accum[key]) {
        accum[key].push(curr.id);
      } else {
        accum[key] = [curr.id];
      }
      return accum;
    }
    const lenReducer = (accum, curr) => {
      const key = curr.routeNum + curr.dir;
      if (accum[key]) {
        accum[key] += curr.len_m;
      } else {
        accum[key] = curr.len_m;
      }
      return accum;
    }
    this.segmentData = raw.reduce(segmentReducer, {});
    this.idCache = raw.reduce(idReducer, {});
    this.routeLengthMap = raw.reduce(lenReducer, {});
  }

  getRoutePrefix(typeEnum) {
    return ROUTE_NAMES[typeEnum];
  }

  getMapForLiveIds(segments) {
    return new Map(segments.map((seg, i) => [seg.id, i]));
  }

  getType(input) {
    const classifications = {
      I : TYPE_ENUM.INTERSTATE,
      i : TYPE_ENUM.INTERSTATE,
      US : TYPE_ENUM.US_HIGHWAY,
      us : TYPE_ENUM.US_HIGHWAY,
    };
    return classifications[input] ? classifications[input] : TYPE_ENUM.STATE;
  }

  getSegmentNum(segmentId) {
    return this.segmentData[segmentId].segNum + 1;
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
  findSegmentPoint(polyline, clicked, segmentId) {
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

    return Object.assign(points[closest], {idx: closest, segmentId});
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

  addNewUserSegments(startMarker, endMarker, routeNum, segmentId, userSegments) {
    // Check whether both points have the same route ID
    if (startMarker.segmentId === segmentId) {
      const startId = Math.min(startMarker.idx, endMarker.idx),
        endId = Math.max(startMarker.idx, endMarker.idx);
      this.addSegment(new UserSegment(routeNum, segmentId, startId, endId, false));
    } else {
      // Figure out higher and lower points
      const start = startMarker.segmentId > segmentId ? endMarker : startMarker;
      const end = startMarker.segmentId < segmentId ? endMarker : startMarker;
      const idMap = this.getMapForLiveIds(userSegments);

      // Add first segment
      const endIdx = userSegments[idMap.get(start.segmentId)].points.length;
      this.addSegment(new UserSegment(routeNum, start.segmentId, start.idx, endIdx, false));
      // Add entire user segments if needed
      if (end.segmentId - start.segmentId > 1) {
        for (let i = start.segmentId + 1; i < end.segmentId; i += 1) {
          this.addSegment(new UserSegment(routeNum, i, 0, userSegments[idMap.get(i)].points.length, false));
        }
      }

      this.addSegment(new UserSegment(routeNum, end.segmentId, 0, end.idx, false)); // Add last segment
    }
  }

  addFullSegment(routeNum, segmentId) {
    this.addSegment(new UserSegment(routeNum, segmentId, 0, this.segmentData[segmentId].len, false));
  }

  addAllSegments(routeNum, dir) {
    for (let segmentId of this.idCache[routeNum + dir]) {
      this.addFullSegment(routeNum, segmentId);
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

  // Calculate # of points, then iterate thru array to get center, and return coordinates
  getCenterOfRoute(routeNumAndDir) {
    const segmentIds = this.idCache[routeNumAndDir];
    const numPoints = segmentIds.map(segmentId => this.segmentData[segmentId].len);
    let totalNum = numPoints.reduce((accum, curr) => accum + curr, 0);

    let segmentIdIdx = 0;
    let midPointIdx = Math.floor(totalNum / 2);
    while (segmentIdIdx < numPoints.length && midPointIdx > numPoints[segmentIdIdx]) {
      midPointIdx -= numPoints[segmentIdIdx];
      segmentIdIdx += 1;
    }
    return [segmentIdIdx, midPointIdx];
  }

  shouldUseRouteDir(stateName) {
    switch(stateName) {
      case 'California':
      case 'District':
      case 'Maryland':
        return true;
      default:
        return false;
    }
  }
}
