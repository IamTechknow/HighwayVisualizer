import type {
  State,
  RouteSegment,
  RouteSegmentPolyLine,
  SubmissionData,
  User,
  TravelSegment,
  UserSubmissionData,
  TravelStatsAPIPayload,
} from '../types/types';
import { RouteSignType } from '../types/enums';

// API host defined in webpack config
// eslint-disable-next-line @typescript-eslint/naming-convention
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

  static getRouteSegments(stateId: number): Promise<Array<RouteSegment>> {
    return fetch(`${__API__}/api/segments/${stateId}`)
      .then((res) => res.json());
  }

  static getRouteSegment(segmentId: number): Promise<Array<RouteSegmentPolyLine>> {
    return fetch(`${__API__}/api/points/${segmentId}`)
      .then((res) => res.json());
  }

  static getRoute(
    stateId: number,
    routeNum: string,
    type: RouteSignType,
    dir: string,
  ): Promise<Array<RouteSegmentPolyLine>> {
    const query = `?stateId=${stateId}&dir=${dir}`;
    return fetch(`${__API__}/api/points/${type}/${routeNum}/${query}`)
      .then((res) => res.json());
  }

  static getConcurrenyPoints(
    stateId: number,
    routeNum: string,
    dir: string,
  ): Promise<Array<RouteSegmentPolyLine>> {
    const query = `?stateId=${stateId}&dir=${dir}`;
    return fetch(`${__API__}/api/concurrencies/${routeNum}${query}`)
      .then((res) => res.json());
  }

  static getTravelStats(userId: string): Promise<TravelStatsAPIPayload> {
    return fetch(`${__API__}/api/user_segments/${userId}`)
      .then((res) => res.json());
  }

  static postUser(user: FormDataEntryValue): Promise<UserSubmissionData> {
    return APIClient.postUserData<UserSubmissionData>('/api/newUser', JSON.stringify({ user }));
  }

  static postTravelSegments(
    userId: number,
    travelSegments: Array<TravelSegment>,
  ): Promise<SubmissionData> {
    return APIClient.postUserData<SubmissionData>(
      '/api/user_segments/new',
      JSON.stringify({ userId, travelSegments }),
    );
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

  static parseRawRouteSegments(rawRouteSegments: Array<RouteSegment>): Array<Array<RouteSegment>> {
    const set = new Set();
    const organized: Array<Array<RouteSegment>> = [];
    let count = -1;
    rawRouteSegments.forEach((seg: RouteSegment): void => {
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
