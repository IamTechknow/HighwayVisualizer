/**
 * @fileOverview A module with curated route numbers with Interstate or U.S. Route route signing.
 *               Exports an object with state identifiers as keys and object values. Each state object
 *               provides the route signing enum value for certain route numbers. If a route number
 *               isn't specified here, its value defaults to the State enum value.
 *
 * @requires /db/routeEnum.js:routeEnum
 */

const TYPE_ENUM = require('./routeEnum.js');

/** @constant {object} */
const Alaska = {};
['1', '2', '3', '4'].forEach(ele => { Alaska[ele] = TYPE_ENUM.INTERSTATE; });

/** @constant {object} */
const California = {};
['5', '8', '10', '15', '40', '80', '105', '110', '205', '210', '215', '238', '280', '380', '405',
'505', '580', '605', '680', '710', '780', '805', '880', '980'].forEach(ele => { California[ele] = TYPE_ENUM.INTERSTATE; });
['6', '50', '95', '97', '101', '199', '395'].forEach(ele => { California[ele] = TYPE_ENUM.US_HIGHWAY; });

/** @constant {object} */
const District = {};
['66', '95', '295', '395', '495', '695'].forEach(ele => { District[ele] = TYPE_ENUM.INTERSTATE; });
['1', '29', '50'].forEach(ele => { District[ele] = TYPE_ENUM.US_HIGHWAY; });

/** @constant {object} */
const Hawaii = {};
['1', '2', '3', '201'].forEach(ele => { Hawaii[ele] = TYPE_ENUM.INTERSTATE; });

/** @constant {object} */
const Maryland = {};
['68', '70', '81', '83', '95', '97', '195', '270', '295', '370', '395', '495', '595', '695', '795', '895'].forEach(ele => { Maryland[ele] = TYPE_ENUM.INTERSTATE; });
['1', '11', '13', '15', '29', '40', '50', '113', '219', '220', '222', '301', '340', '522'].forEach(ele => { Maryland[ele] = TYPE_ENUM.US_HIGHWAY; });

/** @constant {object} */
const Nevada = {};
['11', '15', '80', '215', '515', '580'].forEach(ele => { Nevada[ele] = TYPE_ENUM.INTERSTATE; });
['6', '50', '93', '95', '395'].forEach(ele => { Nevada[ele] = TYPE_ENUM.US_HIGHWAY; });

/** @module routePrefixes */
module.exports = {
  Alaska,
  California,
  District,
  Hawaii,
  Maryland,
  Nevada
};
