import type { RouteSegment, State } from '../../types/types';

const getTestRouteSegmentDataForCA = (): Array<Array<RouteSegment>> => [
  [
    {
      id: 326, routeNum: '1', type: 4, segNum: 0, dir: 'S', len: 31, len_m: 1528.939697265625,
    },
    {
      id: 327, routeNum: '1', type: 4, segNum: 1, dir: 'S', len: 210, len_m: 15217.7734375,
    },
    {
      id: 328, routeNum: '1', type: 4, segNum: 2, dir: 'S', len: 687, len_m: 79710.3359375,
    },
  ],
  [
    {
      id: 339, routeNum: '1', type: 4, segNum: 0, dir: 'N', len: 35, len_m: 1517.7744140625,
    },
    {
      id: 340, routeNum: '1', type: 4, segNum: 1, dir: 'N', len: 212, len_m: 15213.5673828125,
    },
    {
      id: 341, routeNum: '1', type: 4, segNum: 2, dir: 'N', len: 710, len_m: 79773.6640625,
    },
  ],
  [
    {
      id: 528, routeNum: '2', type: 4, segNum: 0, dir: 'W', len: 10, len_m: 2210.22314453125,
    },
  ],
  [
    {
      id: 533, routeNum: '2', type: 4, segNum: 0, dir: 'E', len: 10, len_m: 2208.713134765625,
    },
  ],
  [
    {
      id: 588, routeNum: '3', type: 4, segNum: 0, dir: 'S', len: 2295, len_m: 56932.609375,
    },
  ],
  [
    {
      id: 590, routeNum: '3', type: 4, segNum: 0, dir: 'N', len: 2295, len_m: 56931.0546875,
    },
  ],
  [
    {
      id: 632, routeNum: '4', type: 4, segNum: 0, dir: 'W', len: 972, len_m: 99788.1875,
    },
  ],
  [
    {
      id: 636, routeNum: '4', type: 4, segNum: 0, dir: 'E', len: 933, len_m: 99850.5078125,
    },
  ],
  [
    {
      id: 682, routeNum: '5', type: 2, segNum: 0, dir: 'S', len: 1413, len_m: 214639.75,
    },
  ],
  [
    {
      id: 684, routeNum: '5', type: 2, segNum: 0, dir: 'N', len: 1539, len_m: 214749.796875,
    },
  ],
  [
    {
      id: 722, routeNum: '6', type: 3, segNum: 0, dir: 'S', len: 385, len_m: 65122.80859375,
    },
  ],
  [
    {
      id: 723, routeNum: '6', type: 3, segNum: 0, dir: 'N', len: 385, len_m: 65122.80859375,
    },
  ],
];

const getTestRouteSegmentDataForDC = (): Array<Array<RouteSegment>> => [
  [
    {
      id: 874, routeNum: '1', type: 3, segNum: 0, dir: 'E', len: 128, len_m: 1325.2808837890625,
    },
  ],
  [
    {
      id: 880, routeNum: '29', type: 3, segNum: 0, dir: 'N', len: 104, len_m: 1317.3594970703125,
    },
  ],
  [
    {
      id: 888, routeNum: '50', type: 3, segNum: 0, dir: 'N', len: 177, len_m: 2010.5015869140625,
    },
  ],
  [
    {
      id: 863, routeNum: '66', type: 2, segNum: 0, dir: 'E', len: 308, len_m: 2251.263916015625,
    },
  ],
  [
    {
      id: 865, routeNum: '95', type: 2, segNum: 0, dir: 'N', len: 5, len_m: 200.95787048339844,
    },
  ],
  [
    {
      id: 866, routeNum: '295', type: 2, segNum: 0, dir: 'N', len: 986, len_m: 8143.580078125,
    },
  ],
  [
    {
      id: 892, routeNum: '295', type: 4, segNum: 0, dir: 'S', len: 307, len_m: 2976.601806640625,
    },
  ],
  [
    {
      id: 868, routeNum: '395', type: 2, segNum: 0, dir: 'N', len: 525, len_m: 5594.1953125,
    },
  ],
  [
    {
      id: 872, routeNum: '695', type: 2, segNum: 0, dir: 'N', len: 429, len_m: 3513.908935546875,
    },
  ],
];

export const getTestRouteSegmentDataByStateID = (
  stateID: number,
): Array<Array<RouteSegment>> => {
  switch (stateID) {
    case 2:
      return getTestRouteSegmentDataForDC();
    default:
      return getTestRouteSegmentDataForCA();
  }
};

export const getTestRawRouteSegmentDataByStateID = (
  stateID: number,
): Array<RouteSegment> => getTestRouteSegmentDataByStateID(stateID).flat();

export const getTestStateData = (): Array<State> => [
  {
    id: 1,
    title: 'California',
    identifier: 'California',
    initials: 'CA',
    boundingBox: [
      [32.54430676692835, -124.2648724848089], [42.005476933924854, -114.29830844383291],
    ],
  },
  {
    id: 2,
    title: 'Washington DC',
    identifier: 'District',
    initials: 'DC',
    boundingBox: [
      [38.793219410999995, -77.116633422], [38.99524796399999, -76.90953115399998],
    ],
  },
];
