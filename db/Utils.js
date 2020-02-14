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
        Math.cos(rad1) * Math.cos(rad2) *
        sinOfDeltaLng * sinOfDeltaLng;
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
      metersTraveled += R * c;
    }

    return metersTraveled;
  }
}

module.exports = Utils;
