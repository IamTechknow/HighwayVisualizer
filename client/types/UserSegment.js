export default class UserSegment {
  constructor(routeNum, segmentId, startId, endId, clinched) {
    this.routeNum = routeNum;
    this.segmentId = segmentId;
    this.startId = startId;
    this.endId = endId;
    this.clinched = clinched;
  }

  toString() {
    const { endId, segmentId, startId } = this;
    return `userSeg-${segmentId}-${startId}-${endId}`;
  }
}
