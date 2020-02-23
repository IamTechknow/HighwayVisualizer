// Promise based utility client to interact with API endpoints
export default class APIClient {
  static getUsers() {
    return fetch(`/api/users`)
      .then(res => res.json());
  }

  static getStates() {
    return fetch(`/api/states`)
      .then(res => res.json());
  }

  static getSegments(stateId) {
    return fetch(`/api/segments/${stateId}`)
      .then(res => res.json());
  }

  static getSegment(segmentId) {
    return fetch(`/api/points/${segmentId}`)
      .then(res => res.json());
  }

  static getRoute(stateId, routeNum, type, dir) {
    const query = `?stateId=${stateId}&dir=${dir}`;
    return fetch(`/api/points/${type}/${routeNum}/${query}`)
      .then(res => res.json());
  }

  static parseRawSegments(rawSegments) {
    let set = new Set();
    let organized = [];
    let count = -1;

    for (let seg of rawSegments) {
      const key = `${seg.routeNum}${seg.dir}_${seg.type}`;

      if (set.has(key)) {
        organized[count].push(seg);
      } else {
        set.add(key);
        organized.push([seg]);
        count += 1;
      }
    }

    return organized;
  }
}
