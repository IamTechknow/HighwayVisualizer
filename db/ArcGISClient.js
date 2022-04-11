/**
 * @fileOverview Module with functions to interact with any ArcGIS Feature Server REST API.
 *               May be used to query layer information, layer fields, feature IDs, and features.
 *               Contains some input validation for function parameters.
 *
 * @requires NPM:node-fetch
 */

import { Agent } from 'https';

// Converts from x, y to lng, lat
// Source to convert from EPSG 3857 to 4326: https://gist.github.com/onderaltintas/6649521
const convertFromEPSG3857To4326 = (x, y) => {
  const MAX_EXTENT = 20037508.34;
  return [
    (x * 180) / MAX_EXTENT,
    (Math.atan(Math.exp((y * Math.PI) / MAX_EXTENT)) * 360) / Math.PI - 90,
  ];
};

const getBoundingBoxForLayer = (extentObj) => {
  const {
    xmin, ymin, xmax, ymax, spatialReference,
  } = extentObj;
  const epsg = spatialReference.latestWkid;
  if (epsg !== 3857 && epsg !== 4326) {
    throw Error('Only EPSG 3857 and 4326 are supported for calculating the bbox');
  }
  if (epsg === 4326) {
    return [xmin, ymin, xmax, ymax];
  }
  return [...convertFromEPSG3857To4326(xmin, ymin), ...convertFromEPSG3857To4326(xmax, ymax)];
};

const stringifyQuery = (queryParams) => Object.keys(queryParams)
  .map((key) => `${key}=${queryParams[key]}`)
  .join('&');

// Validates a filter, making assumptions based on the parameters.
// For IN and NOT_IN, the value is checked to be a set.
// String validation enforces quotations on string values.
const validateFilter = (field, op, value, esriType) => {
  switch (op) {
    case 'IN':
    case 'NOT_IN':
      if (value[0] !== '(' || value[value.length - 1] !== ')') {
        throw Error('Value for IN or NOT_IN operator not a set');
      }
      if (value === '()') {
        throw Error('Value for IN or NON_IN operator is an empty set');
      }
      break;
    case '<=': case '>=': case '<': case '>': case '=':
    case '!=': case '<>': case 'LIKE': case 'IS': case 'IS NOT':
      break;
    case 'AND':
    case 'OR':
      throw Error('AND and OR should be part of conjunctions');

    default:
      throw Error(`${op} is not a valid operator`);
  }
  if (field == null || typeof field !== 'string' || field.length === 0) {
    throw Error('Field cannot be undefined, null, empty, or not a string');
  }
  if (value == null || typeof value !== 'string' || value.length === 0) {
    throw Error('Value cannot be undefined, null, empty, or not a string');
  }
  if (esriType === 'esriFieldTypeString' && value.match(/'(?:[^"\\]|\\.)*'/) === null) {
    throw Error('Invalid string value, not surrounded by single quotes');
  }
  if (
    (
      esriType === 'esriFieldTypeInteger' ||
      esriType === 'esriFieldTypeSmallInteger' ||
      esriType === 'esriFieldTypeOID'
    ) &&
    value !== 'null' &&
    Number.isNaN(parseInt(value, 10))
  ) {
    throw Error('Value is not an integer');
  }
};

const stringifyWhereFilters = (whereFilters, conjunctions) => {
  if (!Array.isArray(whereFilters) || !Array.isArray(conjunctions)) {
    throw Error('Either whereFilters or conjunctions is not an array');
  }
  let openingParens = 0, closingParens = 0;
  conjunctions.forEach((conjunction) => {
    if (conjunction === '(') {
      openingParens += 1;
    } else if (conjunction === ')') {
      closingParens += 1;
    }
  });
  if (openingParens !== closingParens) {
    throw Error('Expected all parenthesis to be closed in conjunctions for query');
  }
  const numConjunctions = conjunctions.length - openingParens - closingParens;
  if (numConjunctions !== whereFilters.length - 1) {
    throw Error(`Expected ${whereFilters.length - 1} conjunctions for query`);
  }
  conjunctions.forEach((conjunction) => {
    switch (conjunction) {
      case 'AND': case 'OR': case '(': case ')':
        break;

      default:
        throw Error('Found conjunction that is not parenthesis, AND or OR');
    }
  });

  const clauses = whereFilters.map((filterObj) => {
    const {
      field, op, value, esriType,
    } = filterObj;
    validateFilter(field, op, value, esriType);
    return `${field} ${op} ${value}`;
  });
  // Combine parenthesises with clauses. We need to add the first clause before iterating in
  // case there's a left parenthesises to be able to pop the clause and append it.
  let clauseIdx = 0;
  const clausesStack = [clauses[clauseIdx]];
  for (let i = 0; i < conjunctions.length; i += 1) {
    if (conjunctions[i] === '(') {
      clausesStack.push(`( ${clausesStack.pop()}`);
    } else if (conjunctions[i] === ')') {
      clausesStack.push(`${clausesStack.pop()} )`);
    } else {
      clauseIdx += 1;
      clausesStack.push(clauses[clauseIdx]);
    }
  }
  // Combine conjunctions with clauses
  const nonParens = conjunctions.filter((str) => str !== '(' && str !== ')');
  for (let i = 0; i < nonParens.length; i += 1) {
    clausesStack[i] = `${clausesStack[i]} ${nonParens[i]}`;
  }
  return clausesStack.join(' ');
};

// From: https://dev.to/karataev/handling-a-lot-of-requests-in-javascript-with-promises-1kbb
const processPromiseChunks = (items, cb) => {
  const result = [];
  return items.reduce((accum, curr) => {
    const accumResult = accum.then(() => cb(curr).then((res) => result.push(res)));
    return accumResult;
  }, Promise.resolve())
    .then(() => result);
};

/**
 * Retrieves layer information from the layers endpoint of an ArcGIS feature server URL.
 * @param {string} serviceURL - The ArcGIS feature server URL.
 * @return {Promise} Returns a Promise that resolves with an array of layer objects,
 *         each descripting fields, capabilities, and metadata.
 */
export const queryLayers = (serviceURL) => fetch(`${serviceURL}/layers?f=json`)
  .then((res) => res.json())
  .then((root) => root.layers);

/**
 * Calculates the bbox GeoJSON field for a given ArcGIS layer.
 * EPSG 3857 and 4326 are supported. If the extent data is given in EPSG 3857, it will be converted
 * to EPSG 4326.
 *
 * @param {string} serviceURL - The ArcGIS feature server URL.
 * @param {number} layerId - The integer ID of a layer starting at zero.
 * @return {Promise} Returns a Promise that resolves with a 4-tuple array bbox value.
 */
export const getLayerBBox = (serviceURL, layerId) => queryLayers(serviceURL)
  .then((layerArray) => getBoundingBoxForLayer(layerArray[layerId].extent));

/**
 * Retrieves the layer's fields in an ArcGIS feature server.
 * @param {string} serviceURL - The ArcGIS feature server URL.
 * @param {number} layerId - The integer ID of a layer starting at zero.
 * @return {Promise} Returns a Promise that resolves with an array of field objects,
 *         each describing the field name, alias, and type.
 */
export const queryLayerFields = (serviceURL, layerId) => queryLayers(serviceURL)
  .then((layerArray) => layerArray[layerId].fields);

/**
 * Queries for features of an ArcGIS feature layer with a where filter clause,
 * but request for the IDs only. The where filters and conjunctions will be validated.
 *
 * @param {string} serviceURL - The ArcGIS feature server URL.
 * @param {number} layerId - The integer ID of a layer starting at zero.
 * @param {Object[]} whereFilters - Array with filter objects for the where clause.
 * @param {string} whereFilters[].field - The field to apply an operator with a value.
 * @param {string} whereFilters[].op - The operator to apply to a value on a field.
 * @param {string} whereFilters[].value - A value that a record can take on for a field.
 *                 It can be of ESRI field type and also a null string.
 * @param {string} whereFilters[].esriType - The field type for the value. Used for validation.
 * @param {string[]} conjunctions - Array containing modifiers to the where clause.
 * @return {Promise} Returns a Promise that resolves with an array of feature IDs for the layer.
 */
export const queryLayerFeatureIDs = (serviceURL, layerId, whereFilters, conjunctions) => {
  const queryParams = {
    where: stringifyWhereFilters(whereFilters, conjunctions),
    returnIdsOnly: true,
    f: 'json',
  };
  const queryStr = stringifyQuery(queryParams);
  const url = `${serviceURL}/${layerId}/query/?${queryStr}`;
  return fetch(url).then((res) => res.json())
    .then((root) => root.objectIds || root.error);
};

/**
 * Queries for an ArcGIS feature layer's features in JSON or GeoJSON format.
 * Can support a large number of IDs by paginating the request to 100 features at a time,
 * as well as GeoJSON format and a custom coordinate precision.
 *
 * @param {string} serviceURL - The ArcGIS feature server URL.
 * @param {number} layerId - The integer ID of a layer starting at zero.
 * @param {number[]} ids - An array of feature IDs from a call to queryLayerFeatureIDs().
 * @param {string} outFields - Requested fields separated by commas. Defaults to all fields.
 * @param {boolean} requestGeoJSON - Whether to request GeoJSON output. Defaults to false,
 *        as the ArcGIS feature server version must be 10.4 and up.
 * @param {number} geometryPrecision - Decimal precision for coordinate values.
 *        Defaults to 7 digits for balanced accuracy and output size.
 * @param {number[]} bbox - A 4-tuple representing the bbox value for the GeoJSON feature collection
 *        from a call to getLayerBBox().
 * @param {number} chunkSize - Concurrency limit for the number of network requests. Lower the
 *        chunk size if encountering connection timeouts.
 * @return {Promise} Returns a Promise that resolves with a GeoJSON feature collection object
 *         that contains all features represented by the ids array parameter.
 *         If any errors were encountered from a GeoJSON chunk, the error field will be non-null.
 *         The bbox field is optional.
 */
export const queryLayerFeaturesWithIDs = (
  serviceURL,
  layerId,
  ids,
  outFields = '*',
  requestGeoJSON = false,
  geometryPrecision = 7,
  bbox = null,
  chunkSize = 100,
) => {
  const idSubsets = [];
  for (let i = 0; i < ids.length; i += 100) {
    idSubsets.push(ids.slice(i, i + 100));
  }
  const urls = idSubsets.map((idSubset) => {
    const queryParams = {
      objectIds: idSubset.join(','),
      geometryPrecision,
      outFields,
      outSR: '4326',
      f: requestGeoJSON ? 'geojson' : 'json',
    };
    const queryStr = stringifyQuery(queryParams);
    return `${serviceURL}/${layerId}/query/?${queryStr}`;
  });
  const urlChunks = [];
  for (let i = 0; i < urls.length; i += chunkSize) {
    urlChunks.push(urls.slice(i, i + chunkSize));
  }
  let jsonChunks = [];
  const fetchOptions = {
    agent: new Agent({ keepAlive: true }),
  };
  return processPromiseChunks(
    urlChunks,
    (urlChunk) => Promise.all(
      urlChunk.map((url) => fetch(url, fetchOptions).then((res) => res.json())),
    )
      .then((res) => {
        jsonChunks = jsonChunks.concat(res);
      }),
  )
    .then(() => {
      const anyErrors = jsonChunks.filter((chunk) => chunk.error);
      const allFeatures = jsonChunks.filter((chunk) => chunk.features)
        .reduce((accum, chunk) => accum.concat(chunk.features), []);
      return {
        bbox,
        error: anyErrors.length > 0 ? anyErrors[0].error : null,
        features: allFeatures,
        type: 'FeatureCollection',
      };
    });
};
