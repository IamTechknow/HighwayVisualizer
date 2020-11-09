import type {State, Segment, SegmentPolyLine, SubmissionData, User, UserSegment, UserSubmissionData} from '../types/types';
import {RouteSignType} from '../types/enums';

// API host defined in webpack config
declare const __API__: string;

// Promise based utility client to interact with API endpoints
export default class APIClient {
  static getUsers(): Promise<Array<User>> {
    return fetch(`${__API__}/api/users`)
      .then((res) => res.json());
  }

  static getStates(): Promise<Array<State>> {
    return fetch(`${__API__}/api/states`)
      .then((res) => res.json());
  }

  static getSegments(stateId: number): Promise<Array<Segment>> {
    return fetch(`${__API__}/api/segments/${stateId}`)
      .then((res) => res.json());
  }

  static getSegment(segmentId: number): Promise<SegmentPolyLine> {
    return fetch(`${__API__}/api/points/${segmentId}`)
      .then((res) => res.json());
  }

  static getRoute(stateId: number, routeNum: string, type: RouteSignType, dir: String) {
    const query = `?stateId=${stateId}&dir=${dir}`;
    return fetch(`${__API__}/api/points/${type}/${routeNum}/${query}`)
      .then((res) => res.json());
  }

  static getConcurrenyPoints(stateId: number, routeNum: string, dir: string) {
    const query = `?stateId=${stateId}&dir=${dir}`;
    return fetch(`${__API__}/api/concurrencies/${routeNum}${query}`)
      .then((res) => res.json());
  }

  static postUser(user: FormDataEntryValue): Promise<UserSubmissionData> {
    return APIClient.postUserData<UserSubmissionData>('/api/newUser', JSON.stringify({ user }));
  }

  static postUserSegments(userId: number, userSegments: Array<UserSegment>): Promise<SubmissionData> {
    return APIClient.postUserData<SubmissionData>('/api/user_segments/new', JSON.stringify({ userId, userSegments }));
  }

  static postUserData<T>(endpoint: string, data: string): Promise<T> {
    return fetch(__API__ + endpoint, {
      method: 'POST',
      mode: 'cors',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
      },
      body: data,
    }).then((res) => res.json());
  }

  static parseRawSegments(rawSegments: Array<Segment>): Array<Array<Segment>> {
    const set = new Set();
    const organized: Array<Array<Segment>> = [];
    let count = -1;
    rawSegments.forEach((seg: Segment): void => {
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
