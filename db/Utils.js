const R = 6371e3; // Mean radius of Earth

class Utils {
  static toRadians (angle) {
    return angle * (Math.PI / 180);
  }

  // Get miles travelled by calculating distance between all points
  static calcSegmentDistance(seg) {
    let metersTraveled = 0;

    for (let i = 0; i < seg.length - 1; i += 1) {
      const [lat1, lng1] = seg[i];
      const [lat2, lng2] = seg[i + 1];

      const rad1 = Utils.toRadians(lat1);
      const rad2 = Utils.toRadians(lat2);
      const deltaLat = Utils.toRadians(lat2) - Utils.toRadians(lat1);
      const deltaLng = Utils.toRadians(lng2) - Utils.toRadians(lng1);

      const a = Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
        Math.cos(rad1) * Math.cos(rad2) *
        Math.sin(deltaLng / 2) * Math.sin(deltaLng / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
      const d = R * c;
      metersTraveled += d;
    }

    return metersTraveled;
  }
}

module.exports = Utils;
