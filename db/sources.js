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
const STATES = ["Alabama", "Alaska", "Arizona", "Arkansas", "California", "Colorado", "Connecticut", "Delaware", "District", "Florida", "Georgia", "Hawaii", "Idaho", "Illinois", "Indiana", "Iowa", "Kansas", "Kentucky", "Louisiana", "Maine", "Maryland", "Massachusetts", "Michigan", "Minnesota", "Mississippi", "Missouri", "Montana", "Nebraska", "Nevada", "NewHampshire", "NewJersey", "NewMexico", "NewYork", "NorthCarolina", "NorthDakota", "Ohio", "Oklahoma", "Oregon", "Pennsylvania", "PuertoRico", "RhodeIsland", "SouthCarolina", "SouthDakota", "Tennessee", "Texas", "Utah", "Vermont", "Virginia", "Washington", "WestVirginia", "Wisconsin", "Wyoming"];

// Texas and Virginia do not have 2019 ArcGIS servers
const INITIALS = ["AK", "AL", "AR", "AS", "AZ", "CA", "CO", "CT", "DC", "DE", "FL", "GA", "HI", "IA", "ID", "IL", "IN", "KS", "KY", "LA", "MA", "MD", "ME", "MI", "MN", "MO", "MS", "MT", "NC", "ND", "NE", "NH", "NJ", "NM", "NV", "NY", "OH", "OK", "OR", "PA", "PR", "RI", "SC", "SD", "TN", "UT", "VT", "WA", "WI", "WV", "WY"];

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
  (accum, state) => { return { ...accum, [state]: `https://www.fhwa.dot.gov/policyinformation/hpms/shapefiles/${state.toLowerCase().split(' ').join('')}2017.zip` }; }, {}
);

/** @constant {object} */
const fhwaArcgisServers = STATES.reduce(
  (accum, state) => { return { ...accum, [state]: `https://geo.dot.gov/server/rest/services/Hosted/${state}_2018_PR/FeatureServer` }; }, {}
);

/** @constant {object} */
const fhwaArcgisServers2019 = INITIALS.reduce(
  (accum, initial) => { return { ...accum, [initial]: `https://geo.dot.gov/server/rest/services/Hosted/HPMS_Full_${initial}_2019/FeatureServer` }; }, {}
);

/**
 * Provides curated URLs for the requested US state identifier and source type.
 *
 * Known sources of data include the Caltrans GIS website and FHWA webpages
 * for shapefile downloads and ArcGIS Feature Servers.
 *
 * @param {number} sourceType - An enum value from the sourceEnum.
 * @param {string} stateIdentifier - One of the fifty US State names.
 * @param {string} stateInitial - One of the fifty US State initials.
 * @param {string} year - May currently be 2018 or 2019 for FHWA ArcGIS servers.
 * @return {string[]} Returns an array with URLs for the state, or an empty array
 *         for an unknown state or if no sources are available for the given type.
 */
const getDataSourcesForState = (sourceType, stateIdentifier, stateInitial, year = '2019') => {
  if (sourceType === SOURCE_ENUM.SHAPEFILE) {
    return [fhwaShapefileURLs[stateIdentifier]].concat(shapefileURLs[stateIdentifier] || []);
  }
  if (sourceType === SOURCE_ENUM.ARCGIS_FEATURE_SERVER) {
    if (year !== '2018' && year !== '2019') {
      throw new Error('Only 2018 and 2019 are supported for FHWA ArcGIS servers');
    }
    const fhwaServers = year === '2019'
      ? [fhwaArcgisServers2019[stateInitial]]
      : [fhwaArcgisServers[stateIdentifier]];
    return fhwaServers.concat(otherArcgisServerURLs[stateIdentifier] || []);
  }
  throw new Error('Invalid data source type for ' + stateIdentifier);
};

/** @module sources */
module.exports = {
  SOURCE_ENUM,
  getDataSourcesForState,
};
