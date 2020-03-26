const R = 6371e3; // Mean radius of Earth in meters
const FACTOR = Math.PI / 180;
const POINTS_BINSEARCH_ITERATIONS = 2;

class Utils {
  static toRadians (angle) {
    return angle * FACTOR;
  }

  static calcHavensine(point, radX2, radY2) {
    const [lat, lng] = point;

    const radX1 = Utils.toRadians(lat);
    const deltaLat = radX2 - radX1;
    const deltaLng = radY2 - Utils.toRadians(lng);
    const sinOfDeltaLat = Math.sin(deltaLat / 2);
    const sinOfDeltaLng = Math.sin(deltaLng / 2);

    const a = sinOfDeltaLat * sinOfDeltaLat
      + Math.cos(radX1) * Math.cos(radX2)
      * sinOfDeltaLng * sinOfDeltaLng;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  // Apply haversine formula to calculate the 'great-circle' distance of polyline
  // Vincenty's formulae gives a result accurate to 0.5 mm
  static calcSegmentDistance(seg) {
    let metersTraveled = 0;
    for (let i = 0; i < seg.length - 1; i += 1) {
      const [lat2, lng2] = seg[i + 1];
      metersTraveled += Utils.calcHavensine(seg[i], Utils.toRadians(lat2), Utils.toRadians(lng2));
    }
    return metersTraveled;
  }

  static insertSegment = async (db, segmentID, coords) => {
    const items = coords.map(tup => [segmentID, tup[1], tup[0]]);
    const lenInMeters = Utils.calcSegmentDistance(coords.map(tup => [tup[1], tup[0]]));
    await db.queryAsync('UPDATE segments SET len_m = ? WHERE id = ?;', [lenInMeters, segmentID]);
    await db.queryAsync('INSERT INTO points (segment_key, lat, lon) VALUES ?;', [items]);
    console.log(`Seeded segment with ID ${segmentID} with ${items.length} points, length = ${lenInMeters}m`);
  }

  static findClosestSegmentPoint(points, origin) {
    let shortestDistance = Number.MAX_VALUE;
    let closest;
    const [lat2, lng2] = origin;
    const radX2 = Utils.toRadians(lat2), radY2 = Utils.toRadians(lng2);

    // Binary search for desired range by comparing distances
    // Not exhaustive to ensure point is found
    let lo = 0, hi = points.length - 1;
    for (let i = 0; i < POINTS_BINSEARCH_ITERATIONS; i += 1) {
      const mid = Math.trunc((hi + lo) / 2);
      const [latMid, lngMid] = points[mid];
      const radXMid = Utils.toRadians(latMid), radYMid = Utils.toRadians(lngMid);
      const startDistance = Utils.calcHavensine(points[lo], radX2, radY2);
      const midDistance = Utils.calcHavensine(points[mid], radX2, radY2);
      const endDistance = Utils.calcHavensine(points[hi], radX2, radY2);
      const startToMidDist = Utils.calcHavensine(points[lo], radXMid, radYMid);
      const midToEndDist = Utils.calcHavensine(points[hi], radXMid, radYMid);
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
      const d = Utils.calcHavensine(points[i], radX2, radY2);
      if (d < shortestDistance) {
        shortestDistance = d;
        closest = i;
      }
    }

    return { idx: closest, d: shortestDistance };
  }
}

module.exports = Utils;
