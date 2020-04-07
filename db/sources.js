/**
 * @fileOverview Contains data to create URLs to shapefiles and ArcGIS Feature Server REST APIs.
 *               Most data is stored for reference but can be used by scripts to download files
 *               as an intermediate step.
 */

/**
 * Dataset source type enum. Used internally in the project to indicate what type of data an URL
 * represents.
 *
 * @readonly
 * @enum {number}
 * @module sourceEnum
 */
const SOURCE_ENUM = Object.freeze({
  SHAPEFILE: 0,
  ARCGIS_FEATURE_SERVER: 1,
});

/** @constant {string[]} */
const STATES = ["Alabama", "Alaska", "Arizona", "Arkansas", "California", "Colorado", "Connecticut", "Delaware", "District", "Florida", "Georgia", "Hawaii", "Idaho", "Illinois", "Indiana", "Iowa", "Kansas", "Kentucky", "Louisiana", "Maine", "Maryland", "Massachusetts", "Michigan", "Minnesota", "Mississippi", "Missouri", "Montana", "Nebraska", "Nevada", "New Hampshire", "New Jersey", "New Mexico", "New York", "North Carolina", "North Dakota", "Ohio", "Oklahoma", "Oregon", "Pennsylvania", "Puerto Rico", "Rhode Island", "South Carolina", "South Dakota", "Tennessee", "Texas", "Utah", "Vermont", "Virginia", "Washington", "West Virginia", "Wisconsin", "Wyoming"];

// Find more at opendata.arcgis.com
/** @constant {object} */
const shapefileURLs = {
  'California': ['https://opendata.arcgis.com/datasets/77f2d7ba94e040a78bfbe36feb6279da_0.zip?outSR=%7B%22latestWkid%22%3A3857%2C%22wkid%22%3A102100%7D'],
};

/** @constant {object} */
const otherArcgisServerURLs = {
  'California': ['https://gisdata.dot.ca.gov/arcgis/rest/services/Highway/SHN_Lines/MapServer/'],
};

/** @constant {object} */
const fhwaShapefileURLs = STATES.reduce(
  (accum, state) => { return {...accum, [state]: `https://www.fhwa.dot.gov/policyinformation/hpms/shapefiles/${state.toLowerCase().split(' ').join('')}2017.zip`}; }, {}
);

/** @constant {object} */
const fhwaArcgisServers = STATES.reduce(
  (accum, state) => { return {...accum, [state]: `https://geo.dot.gov/server/rest/services/Hosted/${state}_2018_PR/FeatureServer`}; }, {}
);

/**
 * Provides curated URLs for the requested US state and source type.
 *
 * Known sources of data include the Caltrans GIS website and FHWA webpages
 * for shapefile downloads and ArcGIS Feature Servers.
 *
 * @param {number} sourceType - An enum value from the sourceEnum.
 * @param {string} state - One of the fifty US State names.
 * @return {string[]} Returns an array with URLs for the state, or an empty array
 *         for an unknown state or if no sources are available for the given type.
 */
const getDataSourcesForState = (sourceType, state) => {
  if (sourceType === SOURCE_ENUM.SHAPEFILE) {
    return [fhwaShapefileURLs[state]].concat(shapefileURLs[state] || []);
  }
  if (sourceType === SOURCE_ENUM.ARCGIS_FEATURE_SERVER) {
    return [fhwaArcgisServers[state]].concat(otherArcgisServerURLs[state] || []);
  }
  throw new Error('Invalid data source type');
};

/** @module sources */
module.exports = {
  SOURCE_ENUM,
  getDataSourcesForState,
};
