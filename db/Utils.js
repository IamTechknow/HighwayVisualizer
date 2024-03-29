/**
 * @fileOverview Contains utility methods to work with points and route segments in the form of a
 *               static class. These methods may be used in other modules and classes.
 */

/** @constant {number} */
const R = 6371e3;

/** @constant {number} */
const FACTOR = Math.PI / 180;

/** @constant {number} */
const POINTS_BINSEARCH_ITERATIONS = 2;

/** @constant {string} */
const INSERTSTMT = 'INSERT INTO segments (route_num, type, segment_num, direction, state_key, len, len_m, base) VALUES (?);';

/** Utility class used to calculate or insert data */
class Utils {
  /**
   * Convert an angle from degrees to radians.
   * @param {number} angle - The angle in degrees from -180 to 180.
   * @return {number} The angle in radians.
   */
  static toRadians(angle) {
    return angle * FACTOR;
  }

  /**
   * Calculates the "great-circle" distance of two points using the haversine formula.
   * Vincenty's formulae gives a result accurate to 0.5 mm.
   *
   * @param {number[]} point - Array containing the first latitude and longitude.
   * @param {number} radX2 - The angle in radians of the second latitude from -180 to 180.
   * @param {number} radY2 - The angle in radians of the second longitude from -180 to 180.
   * @return {number} The distance between two points presented by the parameters in meters.
   */
  static calcHavensine(point, radX2, radY2) {
    const [lat, lng] = point;

    const radX1 = Utils.toRadians(lat);
    const deltaLat = radX2 - radX1;
    const deltaLng = radY2 - Utils.toRadians(lng);
    const sinOfDeltaLat = Math.sin(deltaLat / 2);
    const sinOfDeltaLng = Math.sin(deltaLng / 2);

    const a = sinOfDeltaLat * sinOfDeltaLat +
      Math.cos(radX1) * Math.cos(radX2) *
      sinOfDeltaLng * sinOfDeltaLng;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  /**
   * Calculates the total "great-circle" distance of a polyline by using calcHavensine().
   * @param {Array[]} routeSeg - An array containing geographical points represented by arrays.
   *        Each subarray contains the latitude and longitude of a point.
   * @return {number} The total distance of the polyline in meters.
   */
  static calcSegmentDistance(routeSeg) {
    let metersTraveled = 0;
    for (let i = 0; i < routeSeg.length - 1; i += 1) {
      const [lat2, lng2] = routeSeg[i + 1];
      metersTraveled +=
        Utils.calcHavensine(routeSeg[i], Utils.toRadians(lat2), Utils.toRadians(lng2));
    }
    return metersTraveled;
  }

  /**
   * Inserts a polyline into a MySQL database by creating records of a route segment
   * and its coordinates.
   *
   * @async
   * @param {object} db - A database client that can perform queries from the mysql2 module.
   * @param {Array[]} coords - An array containing geographical points represented by arrays.
   *        Each subarray contains the longitude and latitude of a point, in that order.
   * @param {string} routeNum - Number of the route the segment is a part of.
   * @param {number} type - A routeEnum value of the HPMS route signing type.
   * @param {string} dir - The direction of the route, either 'N', 'E', 'S', or 'W'.
   * @param {number} stateID - The state ID for the route number.
   * @param {number} baseID - The ID in the points table of the first point for this segment.
   * @param {number} seq - A number that determines the ordering of the segment within the route.
   * @return {Promise<number>} Returns a promise that resolves to the number of coordinates inserted
   *         that make up the segment.
   */
  static insertSegment = async (db, coords, routeNum, type, dir, stateID, baseID, seq = 0) => {
    const numPoints = coords.length;
    const lenInMeters = Utils.calcSegmentDistance(coords.map((tup) => [tup[1], tup[0]]));
    const queryArgs = [routeNum, type, seq, dir, stateID, numPoints, lenInMeters, baseID];
    const routeSegmentID = await db.query(INSERTSTMT, [queryArgs]).then((res) => res[0].insertId);
    const items = coords.map((tup) => [routeSegmentID, tup[1], tup[0]]);
    await db.query('INSERT INTO points (segment_key, lat, lon) VALUES ?;', [items]);
    return numPoints;
  };

  /**
   * Given a route segment and a origin coordinate of comparsion, calculate the point on the
   * route segment closest to the origin. Utilizes a binary search technique to quickly
   * find the point.
   *
   * @param {Array[]} points - An array containing geographical points represented by arrays.
   *        Each subarray contains the latitude and longitude of a point.
   * @param {number[]} origin - An array containing the latitude and longitude of the point to
   *        compare.
   * @return {object} An object with idx and d fields representing the closest point in the
   *         route segment relative to the origin, and the distance in meters.
   */
  static findClosestRouteSegmentPoint(points, origin) {
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
        midDistance <= startDistance &&
        midDistance <= endDistance &&
        startDistance >= startToMidDist
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

/** @module Utils */
export default Utils;
