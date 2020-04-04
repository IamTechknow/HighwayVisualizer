const fetch = require('node-fetch');

// JSON response contains layers and tables field
const queryFeatureLayers = (serviceURL) => fetch(serviceURL + '/layers?f=json')
  .then(res => res.json())
  .then(root => root.layers);

const queryLayerFields = (serviceURL, layerId) => queryFeatureLayers(serviceURL)
  .then(layerArray => layerArray[layerId].fields);

const queryLayerFeatureIDs = (serviceURL, layerId, whereFilters, conjunctions) => {
  const queryParams = {
    where: stringifyWhereFilters(whereFilters, conjunctions),
    returnIdsOnly: true,
    f: 'json',
  };
  const queryStr = stringifyQuery(queryParams);
  const url = `${serviceURL}/${layerId}/query/?${queryStr}`;
  return fetch(url).then(res => res.json())
    .then(root => root.objectIds || root.error);
};

const queryLayerFeaturesWithIDs = (serviceURL, layerId, ids, outFields = '*', geometryPrecision = 7) => {
  const queryParams = {
    objectIds: ids.join(','),
    geometryPrecision,
    outFields,
    outSR: '4326',
    f: 'json',
  };
  const queryStr = stringifyQuery(queryParams);
  const url = `${serviceURL}/${layerId}/query/?${queryStr}`;
  console.log(url);
  return fetch(url).then(res => res.json())
    .then(root => root.features || root.error);
};

const stringifyQuery = (queryParams) => Object.keys(queryParams)
  .map(key => `${key}=${queryParams[key]}`)
  .join('&');

const stringifyWhereFilters = (whereFilters, conjunctions) => {
  if (!Array.isArray(whereFilters) || !Array.isArray(conjunctions)) {
    throw Error('Either whereFilters or conjunctions is not an array');
  }
  if (conjunctions.length !== whereFilters.length - 1) {
    throw Error(`Expected ${whereFilters.length - 1} conjunctions for query`);
  }
  conjunctions.forEach((conjunction) => {
    if (conjunction !== 'AND' && conjunction !== 'OR') {
      throw Error('Found conjunction that is not AND or OR');
    }
  });
  return whereFilters
    .map((filterObj) => {
      const {field, op, value, esriType} = filterObj;
      validateFilter(field, op, value, esriType);
      return `${field} ${op} ${value}`;
    })
    .reduce((accum, clause, i) => `${accum} ${conjunctions[i - 1]} ${clause}`);
};

const validateFilter = (field, op, value, esriType) => {
  switch (op) {
    case 'IN':
    case 'NOT_IN':
      if(value[0] !== '(' || value[value.length - 1] !== ')') {
        throw Error('Value for IN or NOT_IN operator not a set');
      }
      if (value === '()') {
        throw Error('Value for IN or NON_IN operator is an empty set');
      }
      break;
    case '<=': case '>=': case '<': case '>': case '=':
    case '!=': case '<>': case 'LIKE': case 'IS': case 'IS_NOT':
      break;
    case 'AND':
    case 'OR':
      throw Error('AND and OR should be part of conjunctions');

    default:
      throw Error(`${op} is not a valid operator`);
  }
  if (field == null || typeof field !== 'string' || field.length === 0 ) {
    throw Error('Field cannot be undefined, null, empty, or not a string');
  }
  if (value == null || typeof value !== 'string' || value.length === 0) {
    throw Error('Value cannot be undefined, null, empty, or not a string');
  }
  if (esriType === 'esriFieldTypeString' && value.match(/'(?:[^"\\]|\\.)*'/) === null) {
    throw Error('Invalid string value, not surrounded by single quotes');
  }
  if (
    (esriType === 'esriFieldTypeInteger' || esriType === 'esriFieldTypeOID') &&
    isNaN(parseInt(value, 10))
  ) {
    throw Error('Value is not an integer');
  }
};

module.exports = {
  queryFeatureLayers,
  queryLayerFields,
  queryLayerFeatureIDs,
  queryLayerFeaturesWithIDs,
};
