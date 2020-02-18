import PropTypes from 'prop-types/prop-types';

export default class Point {
  constructor(id, segmentKey, lat, lon) {
    this.id = id;
    this.segmentKey = segmentKey;
    this.lat = lat;
    this.lon = lon;

    PropTypes.checkPropTypes(Point.propTypes, this);
  }

  toString() {
    return `(${this.lat}, ${this.lon})`;
  }
}

Point.propTypes = {
  id: PropTypes.number.isRequired,
  lat: PropTypes.number.isRequired,
  lon: PropTypes.number.isRequired,
  segmentKey: PropTypes.number.isRequired,
};
