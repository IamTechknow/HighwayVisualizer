/**
 * @fileOverview Defines an enum for Interstate, U.S. Route, and state highways.
 */

/**
 * Route signing enum module. These values are defined in Chapter 4 of the HPMS Field Manual,
 * Item 18. A FHWA feature may use these values in the route_signing field. Also used internally
 * for all route segment database records.
 *
 * @readonly
 * @enum {number}
 * @module routeEnum
 * @see {@link https://www.fhwa.dot.gov/policyinformation/hpms/fieldmanual/page05.cfm#toc249159702 HPMS Reference}
 */
module.exports = Object.freeze({
  NOT_SIGNED: 1,
  INTERSTATE: 2,
  US_HIGHWAY: 3,
  STATE: 4,
});
