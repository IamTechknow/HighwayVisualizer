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
  // Apply haversine formula to calculate the 'great-circle' distance between two coordinates
  static calcHavensine(point, radX2, radY2) {
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

  static getMapForLiveIds(segments) {
    return new Map(segments.map((seg, i) => [seg.id, i]));
  }

  static getRoutePrefix(typeEnum) {
    return ROUTE_NAMES[typeEnum];
  }

  static getType(input) {
    const classifications = {
      I: TYPE_ENUM.INTERSTATE,
      i: TYPE_ENUM.INTERSTATE,
      US: TYPE_ENUM.US_HIGHWAY,
      us: TYPE_ENUM.US_HIGHWAY,
    };
    return classifications[input] ? classifications[input] : TYPE_ENUM.STATE;
  }

  static shouldUseRouteDir(stateName) {
    switch (stateName) {
      case 'California':
      case 'District':
      case 'Maryland':
        return true;
      default:
        return false;
    }
  }

  static toRadians(angle) {
    return angle * FACTOR;
  }

  constructor() {
    // Flatened map from segment ID to segment data
    this.segmentData = undefined;
    // Map route number and direction to segment IDs for each route signage type
    this.idCache = {
      [TYPE_ENUM.INTERSTATE]: {},
      [TYPE_ENUM.US_HIGHWAY]: {},
      [TYPE_ENUM.STATE]: {},
    };
    // User segment data
    this.userSegments = [];
    // Map route number to segment length
    this.routeLengthMap = undefined;
  }

  getZoomForSegmentId(segmentId, isRouteNumber) {
    const len = isRouteNumber ? this.routeLengthMap[segmentId] : this.segmentData[segmentId].len_m;
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

  buildStateSegmentsData(raw) {
    const segmentReducer = (accum, curr) => {
      accum[curr.id] = curr;
      return accum;
    };
    const idReducer = (accum, currSegment) => {
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
    const lenReducer = (accum, currSegment) => {
      const { dir, len_m, routeNum } = currSegment;
      const key = routeNum + dir;
      accum[key] = accum[key] ? accum[key] + len_m : len_m;
      return accum;
    };
    this.segmentData = raw.reduce(segmentReducer, {});
    this.idCache = raw.reduce(idReducer, this.idCache);
    this.routeLengthMap = raw.reduce(lenReducer, {});
  }

  getSegmentNum(segmentId) {
    return this.segmentData[segmentId].segNum + 1;
  }

  getSegmentIds(type, routeNumAndDir) {
    return this.idCache[type][routeNumAndDir];
  }

  /*
    Assumptions made for binary search:
    - The route is generally travelling in a certain direction
      so points can be treated as a sorted array.
    - Less likely to work for routes that travel circular, may need to debug comparsions
  */
  findSegmentPoint(polyline, clicked, segmentId) {
    const points = polyline.getLatLngs();
    let shortestDistance = Number.MAX_VALUE;
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
      const startDistance = Highways.calcHavensine(points[lo], radX2, radY2);
      const midDistance = Highways.calcHavensine(points[mid], radX2, radY2);
      const endDistance = Highways.calcHavensine(points[hi], radX2, radY2);
      const startToMidDist = Highways.calcHavensine(points[lo], radXMid, radYMid);
      const midToEndDist = Highways.calcHavensine(points[hi], radXMid, radYMid);
      if (startDistance <= midDistance && startDistance <= endDistance) {
        hi = mid;
      } else if (
        midDistance <= startDistance && midDistance <= endDistance && endDistance >= midToEndDist
      ) {
        hi = mid;
      } else if (
        midDistance <= startDistance && midDistance <= endDistance && startDistance >= startToMidDist
      ) {
        lo = mid;
      } else {
        lo = mid;
      }
    }

    for (let i = lo; i <= hi; i += 1) {
      const d = Highways.calcHavensine(points[i], radX2, radY2);
      if (d < shortestDistance) {
        shortestDistance = d;
        closest = i;
      }
    }

    return Object.assign(points[closest], { idx: closest, segmentId });
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
      const idMap = Highways.getMapForLiveIds(userSegments);

      // Add first segment
      const endIdx = userSegments[idMap.get(start.segmentId)].points.length;
      this.addSegment(new UserSegment(routeNum, start.segmentId, start.idx, endIdx, false));
      // Add entire user segments if needed
      if (end.segmentId - start.segmentId > 1) {
        for (let i = start.segmentId + 1; i < end.segmentId; i += 1) {
          this.addSegment(
            new UserSegment(routeNum, i, 0, userSegments[idMap.get(i)].points.length, false),
          );
        }
      }
      // Add last segment
      this.addSegment(new UserSegment(routeNum, end.segmentId, 0, end.idx, false));
    }
  }

  addFullSegment(routeNum, segmentId) {
    this.addSegment(
      new UserSegment(routeNum, segmentId, 0, this.segmentData[segmentId].len, false),
    );
  }

  addAllSegments(routeNum, type, dir) {
    this.getSegmentIds(type, routeNum + dir).forEach((segmentId) => {
      this.addFullSegment(routeNum, segmentId);
    });
  }

  // Calculate # of points, then iterate thru array to get center, and return coordinates
  getCenterOfRoute(routeNumAndDir, type) {
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
}
