export default class User {
  constructor(id, user) {
    this.id = id;
    this.user = user;
  }

  toString() {
    return this.user;
  }
}
