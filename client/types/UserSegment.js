import PropTypes from 'prop-types/prop-types';

export default class UserSegment {
  constructor(route, routeId, startId, endId, clinched) {
    this.route = route;
    this.routeId = routeId;
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
  route: PropTypes.string.isRequired,
  routeId: PropTypes.number.isRequired,
  startId: PropTypes.number.isRequired,
};
