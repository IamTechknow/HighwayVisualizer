const R = 6371e3; // Mean radius of Earth in meters
const FACTOR = Math.PI / 180;

class Utils {
  static toRadians (angle) {
    return angle * FACTOR;
  }

  // Apply haversine formula to calculate the 'great-circle' distance of polyline
  // Vincenty's formulae gives a result accurate to 0.5 mm
  static calcSegmentDistance(seg) {
    let metersTraveled = 0;

    for (let i = 0; i < seg.length - 1; i += 1) {
      const [lat1, lng1] = seg[i];
      const [lat2, lng2] = seg[i + 1];

      const radX1 = Utils.toRadians(lat1);
      const radX2 = Utils.toRadians(lat2);
      const deltaLat = radX2 - radX1;
      const deltaLng = Utils.toRadians(lng2) - Utils.toRadians(lng1);
      const sinOfDeltaLat = Math.sin(deltaLat / 2);
      const sinOfDeltaLng = Math.sin(deltaLng / 2);

      const a = sinOfDeltaLat * sinOfDeltaLat +
        Math.cos(radX1) * Math.cos(radX2) *
        sinOfDeltaLng * sinOfDeltaLng;
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
      metersTraveled += R * c;
    }

    return metersTraveled;
  }

  static insertSegment = async (db, segmentsTable, pointsTable, segmentID, coords) => {
    const items = coords.map(tup => [segmentID, tup[1], tup[0]]);
    const lenInMeters = Utils.calcSegmentDistance(coords.map(tup => [tup[1], tup[0]]));
    await db.queryAsync(`UPDATE ${segmentsTable} SET len_m = ${lenInMeters} WHERE id = ${segmentID};`);
    await db.queryAsync(`INSERT INTO ${pointsTable} (segment_key, lat, lon) VALUES ?;`, [items]);
    console.log(`Seeded segment with ID ${segmentID} with ${items.length} points, length = ${lenInMeters}m`);
  }
}

module.exports = Utils;
