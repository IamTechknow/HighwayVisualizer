import PropTypes from 'prop-types/prop-types';

export default class UserSegment {
  constructor(routeNum, segmentId, startId, endId, clinched) {
    this.routeNum = routeNum;
    this.segmentId = segmentId;
    this.startId = startId;
    this.endId = endId;
    this.clinched = clinched;

    PropTypes.checkPropTypes(UserSegment.propTypes, this);
  }

  toString() {
    return '';
  }
}

UserSegment.propTypes = {
  clinched: PropTypes.bool.isRequired,
  endId: PropTypes.number.isRequired,
  routeNum: PropTypes.string.isRequired,
  segmentId: PropTypes.number.isRequired,
  startId: PropTypes.number.isRequired,
};
