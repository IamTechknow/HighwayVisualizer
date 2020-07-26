export default class Segment {
  constructor(id, routeNum, type, segNum, dir, len, len_m) {
    this.id = id;
    this.routeNum = routeNum;
    this.type = type;
    this.segNum = segNum;
    this.dir = dir;
    this.len = len;
    this.len_m = len_m;
  }

  toString() {
    return `${this.routeNum} ${this.dir ? this.dir : ''} Segment ${this.segNum}`;
  }
}
