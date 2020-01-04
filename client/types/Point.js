import PropTypes from 'prop-types/prop-types';

export default class Point {
  constructor(id, routeKey, lat, lon) {
    this.id = id;
    this.routeKey = routeKey;
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
  routeKey: PropTypes.number.isRequired,
};
