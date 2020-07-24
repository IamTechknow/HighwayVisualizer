import PropTypes from 'prop-types/prop-types';

export default class State {
  constructor(id, identifier, title, initials) {
    this.id = id;
    this.identifier = identifier;
    this.title = title;
    this.initials = initials;

    PropTypes.checkPropTypes(State.propTypes, this);
  }

  toString() {
    return `${this.title} ${this.initials}`;
  }
}

State.propTypes = {
  id: PropTypes.number.isRequired,
  identifier: PropTypes.string.isRequired,
  initials: PropTypes.string.isRequired,
  title: PropTypes.string.isRequired,
};
