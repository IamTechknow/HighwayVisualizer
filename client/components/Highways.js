const R = 6371e3; // Mean radius of Earth

// Manages highway information on the client side, including route IDs, numbers, and points size.
export default class Highways {
  constructor() {
    this.titleCache = undefined;
    this.routeData = undefined;
    this.userSegments = [];
  }

  // Determine a good zoom level based on route complexity
  getZoomForRouteLen(len) {
    if (len <= 50) {
      return 13;
    } else if (len <= 100) {
      return 12;
    } else if (len <= 300) {
      return 11;
    } else if (len <= 600) {
      return 10;
    } else if(len <= 1000) {
      return 9;
    } else if(len <= 2000) {
      return 8;
    } else if(len <= 5000) {
      return 7;
    }
    return 6;
  }

  // TODO: Refactor to make an API call for this information
  buildCacheFor(state) {
    this.titleCache = {};
    ['5', '8', '10', '15', '40', '80', '105', '110', '205', '210', '215', '238', '280', '380', '405',
    '505', '580', '605', '680', '710', '780', '805', '880', '980'].forEach(ele => { this.titleCache[ele] = "Interstate"; });

    ['6', '50', '95', '97', '101', '199', '395'].forEach(ele => { this.titleCache[ele] = "US Highway"; });
  }

  buildStateRoutesData(raw) {
    const reducer = (accum, curr) => {
      accum[curr.id] = curr;
      return accum;
    };

    this.routeData = raw.reduce(reducer, {});
  }

  getNameForRoute(route) {
    return this.titleCache[route] ? this.titleCache[route] : 'State Route';
  }

  getMapForLiveIds(segments) {
    return new Map(segments.map((seg, i) => [seg.id, i]));
  }

  toRadians (angle) {
    return angle * (Math.PI / 180);
  }

  // Brute force: iterate through all points, calc distance between coordinate to clicked coordinate. Return closest coordinate
  // Optimized way: Using nearest neighbour algorithm for a 2D space, or a KD tree/quadtree?
  findSegmentPoint(polyline, clicked, routeId) {
    let points = polyline.getLatLngs();
    let shortestDistance = Number.MAX_VALUE;
    let closest;

    // Apply haversine formula to calculate the 'great-circle' distance between two coordinates
    for (let i = 0; i < points.length; i++) {
      let {lat, lng} = points[i];
      let clickedLat = clicked.lat, clickedLng = clicked.lng;

      var lat1 = this.toRadians(lat);
      var lat2 = this.toRadians(clickedLat);
      var deltaLat = this.toRadians(clickedLat) - this.toRadians(lat);
      var deltaLng = this.toRadians(clickedLng) - this.toRadians(lng);

      var a = Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
        Math.cos(lat1) * Math.cos(lat2) *
        Math.sin(deltaLng / 2) * Math.sin(deltaLng / 2);
      var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
      var d = R * c;

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

  addNewUserSegments(startMarker, endMarker, route, routeId, segments) {
    // Check whether both points have the same route ID
    if (startMarker.routeId === routeId) {
      const startId = Math.min(startMarker.idx, endMarker.idx),
        endId = Math.max(startMarker.idx, endMarker.idx);
      this.userSegments.push({
        route,
        routeId,
        startId,
        endId,
        clinched: false
      });
    } else {
      // Figure out higher and lower points
      const start = startMarker.routeId > routeId ? endMarker : startMarker;
      const end = startMarker.routeId < routeId ? endMarker : startMarker;
      const idMap = this.getMapForLiveIds(segments);

      // Add entire user segments if needed
      if (end.routeId - start.routeId > 1) {
        for (let i = start.routeId + 1; i < end.routeId; i += 1) {
          this.userSegments.push({
            route,
            routeId: i,
            startId: 0,
            endId: segments[idMap.get(i)].points.length,
            clinched: false
          });
        }
      }

      // Add user segments from the two route segments
      this.userSegments.push({
        route,
        routeId: start.routeId,
        startId: start.idx,
        endId: segments[idMap.get(start.routeId)].points.length,
        clinched: false
      });

      this.userSegments.push({
        route,
        routeId: end.routeId,
        startId: 0,
        endId: end.idx,
        clinched: false
      });
    }
  }

  addFullSegment(route, routeId) {
    this.userSegments.push({
      route,
      routeId,
      startId: 0,
      endId: this.routeData[routeId].len,
      clinched: false
    });
  }
}
