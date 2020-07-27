// Promise based utility client to interact with API endpoints
export default class APIClient {
  static getUsers() {
    return fetch('/api/users')
      .then((res) => res.json());
  }

  static getStates() {
    return fetch('/api/states')
      .then((res) => res.json());
  }

  static getSegments(stateId) {
    return fetch(`/api/segments/${stateId}`)
      .then((res) => res.json());
  }

  static getSegment(segmentId) {
    return fetch(`/api/points/${segmentId}`)
      .then((res) => res.json());
  }

  static getRoute(stateId, routeNum, type, dir) {
    const query = `?stateId=${stateId}&dir=${dir}`;
    return fetch(`/api/points/${type}/${routeNum}/${query}`)
      .then((res) => res.json());
  }

  static getConcurrenyPoints(stateId, routeNum, dir) {
    const query = `?stateId=${stateId}&dir=${dir}`;
    return fetch(`/api/concurrencies/${routeNum}${query}`)
      .then((res) => res.json());
  }

  static postUser(user) {
    return APIClient.postUserData('/api/newUser', { user });
  }

  static postUserSegments(userId, userSegments) {
    return APIClient.postUserData('/api/user_segments/new', { userId, userSegments });
  }

  static postUserData(endpoint, data) {
    return fetch(endpoint, {
      method: 'POST',
      mode: 'cors',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
      },
      body: JSON.stringify(data),
    }).then((res) => res.json());
  }

  static parseRawSegments(rawSegments) {
    const set = new Set();
    const organized = [];
    let count = -1;
    rawSegments.forEach((seg) => {
      const key = `${seg.routeNum}${seg.dir}_${seg.type}`;
      if (set.has(key)) {
        organized[count].push(seg);
      } else {
        set.add(key);
        organized.push([seg]);
        count += 1;
      }
    });
    return organized;
  }
}
