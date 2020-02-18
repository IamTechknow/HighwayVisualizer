import PropTypes from 'prop-types/prop-types';

export default class Segment {
  constructor(id, routeNum, segNum, dir, len, len_m) {
    this.id = id;
    this.routeNum = routeNum;
    this.segNum = segNum;
    this.dir = dir;
    this.len = len;
    this.len_m = len_m;

    PropTypes.checkPropTypes(Segment.propTypes, this);
  }

  toString() {
    return `${this.routeNum} ${this.dir ? this.dir : ''} Segment ${this.segNum}`;
  }
}

Segment.propTypes = {
  dir: PropTypes.string,
  id: PropTypes.number.isRequired,
  len: PropTypes.number.isRequired,
  len_m: PropTypes.number.isRequired,
  routeNum: PropTypes.string.isRequired,
  segNum: PropTypes.number.isRequired,
};
