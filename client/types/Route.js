import PropTypes from 'prop-types/prop-types';

export default class Route {
  constructor(id, route, seg, dir, len, len_m) {
    this.id = id;
    this.route = route;
    this.seg = seg;
    this.dir = dir;
    this.len = len;
    this.len_m = len_m;

    PropTypes.checkPropTypes(Route.propTypes, this);
  }

  toString() {
    return `${this.route} ${this.dir ? this.dir : ''}`;
  }
}

Route.propTypes = {
  dir: PropTypes.string,
  id: PropTypes.number.isRequired,
  len: PropTypes.number.isRequired,
  len_m: PropTypes.number.isRequired,
  route: PropTypes.string.isRequired,
  seg: PropTypes.number.isRequired,
};
