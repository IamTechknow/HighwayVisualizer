import PropTypes from 'prop-types/prop-types';

export default class User {
  constructor(id, user) {
    this.id = id;
    this.user = user;

    PropTypes.checkPropTypes(User.propTypes, this);
  }

  toString() {
    return this.user;
  }
}

User.propTypes = {
  id: PropTypes.number.isRequired,
  user: PropTypes.string.isRequired,
};
