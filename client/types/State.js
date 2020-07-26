export default class State {
  constructor(id, identifier, title, initials) {
    this.id = id;
    this.identifier = identifier;
    this.title = title;
    this.initials = initials;
  }

  toString() {
    return `${this.title} ${this.initials}`;
  }
}
