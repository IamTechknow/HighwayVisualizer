/**
 * @fileOverview A module with curated route numbers with Interstate or U.S. Route route signing.
 *               Exports an object with state identifiers as keys and object values. Each state
 *               object provides the route signing enum value for certain route numbers.
 *               If a route number isn't specified here, its value defaults to the State enum value.
 *
 * @requires /db/routeEnum.js:routeEnum
 */

import { INTERSTATE, US_HIGHWAY } from './routeEnum.js';

/** @constant {object} */
const Alaska = {};
['1', '2', '3', '4'].forEach((ele) => { Alaska[ele] = INTERSTATE; });

/** @constant {object} */
export const California = {};
['5', '8', '10', '15', '40', '80', '105', '110', '205', '210', '215', '238', '280', '380', '405',
  '505', '580', '605', '680', '710', '780', '805', '880', '980'].forEach((ele) => { California[ele] = INTERSTATE; });
['6', '50', '95', '97', '101', '199', '395'].forEach((ele) => { California[ele] = US_HIGHWAY; });

/** @constant {object} */
const District = {};
['66', '95', '295', '395', '495', '695'].forEach((ele) => { District[ele] = INTERSTATE; });
['1', '29', '50'].forEach((ele) => { District[ele] = US_HIGHWAY; });

/** @constant {object} */
const Hawaii = {};
['1', '2', '3', '201'].forEach((ele) => { Hawaii[ele] = INTERSTATE; });

/** @constant {object} */
const Maryland = {};
['68', '70', '81', '83', '95', '97', '195', '270', '295', '370', '395', '495', '595', '695', '795', '895'].forEach((ele) => { Maryland[ele] = INTERSTATE; });
['1', '11', '13', '15', '29', '40', '50', '113', '219', '220', '222', '301', '340', '522'].forEach((ele) => { Maryland[ele] = US_HIGHWAY; });

/** @constant {object} */
const Nevada = {};
['11', '15', '80', '215', '515', '580'].forEach((ele) => { Nevada[ele] = INTERSTATE; });
['6', '50', '93', '95', '395'].forEach((ele) => { Nevada[ele] = US_HIGHWAY; });

export default {
  Alaska,
  California,
  District,
  Hawaii,
  Maryland,
  Nevada,
};
