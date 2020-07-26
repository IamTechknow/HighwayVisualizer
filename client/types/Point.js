export default class Point {
  constructor(id, segmentKey, lat, lon) {
    this.id = id;
    this.segmentKey = segmentKey;
    this.lat = lat;
    this.lon = lon;
  }

  toString() {
    return `(${this.lat}, ${this.lon})`;
  }
}
