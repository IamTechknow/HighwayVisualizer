import PropTypes from 'prop-types/prop-types';

export default class State {
  constructor(id, name, initials) {
    this.id = id;
    this.name = name;
    this.initials = initials;

    PropTypes.checkPropTypes(State.propTypes, this);
  }

  toString() {
    return `${this.name} ${this.initials}`;
  }
}

State.propTypes = {
  id: PropTypes.number.isRequired,
  initials: PropTypes.string.isRequired,
  name: PropTypes.string.isRequired,
};
