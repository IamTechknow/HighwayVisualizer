import PropTypes from 'prop-types';
import React, { useMemo, useState } from 'react';

import Highways from './Highways';

const SearchResults = ({
  getRouteName,
  onRouteItemClick,
  segments,
  stateTitle,
}) => {
  const [searchResults, setSearchResults] = useState([]);
  const fullRoutes = useMemo(
    () => segments.flat().filter((routeObj) => routeObj.segNum === 0),
    [segments],
  );

  const onSearchSegments = (event) => {
    const query = event.target.value;
    if (!query) {
      setSearchResults([]);
      return;
    }
    const dashSplit = query.split('-');
    const queries = dashSplit.length > 1 ? dashSplit : query.split(' ');
    const routeNum = queries.length > 0 ? queries[queries.length - 1] : null;
    let filteredSegments = fullRoutes;
    if (queries.length > 1) {
      const highwayType = Highways.getType(queries[0]);
      filteredSegments = fullRoutes.filter((routeObj) => routeObj.type === highwayType);
    }
    const results = filteredSegments.filter((routeObj) => routeObj.routeNum.indexOf(routeNum) >= 0);
    setSearchResults(results.slice(0, 30));
  };

  return (
    <div className="tabContent">
      <input
        type="text"
        size="50"
        className="nameFormElement"
        placeholder={`Search ${stateTitle} segments by type and/or number...`}
        onChange={onSearchSegments}
      />
      {
        !searchResults.length
          ? (
            <div>
              <h3>Search hints:</h3>
              <ul>
                <li>Try typing more of a route number to get more specific results</li>
                <li>
                  {
                    `To filter by Interstates and US Highways,
                     type I or US and number separated by space or dash`
                  }
                </li>
              </ul>
            </div>
          )
          : (
            <ul>
              {
                searchResults.map((firstSeg) => (
                  <li
                    key={firstSeg.id}
                    className="clickable"
                    onClick={(event) => onRouteItemClick(event, firstSeg)}
                    onKeyDown={(event) => {
                      if (event.keyCode === 13) {
                        onRouteItemClick(event, firstSeg);
                      }
                    }}
                    role="presentation"
                  >
                    {getRouteName(firstSeg)}
                  </li>
                ))
              }
            </ul>
          )
      }
    </div>
  );
};

SearchResults.propTypes = {
  getRouteName: PropTypes.func.isRequired,
  onRouteItemClick: PropTypes.func.isRequired,
  segments: PropTypes.arrayOf(
    PropTypes.arrayOf(
      PropTypes.shape({
        id: PropTypes.number,
        dir: PropTypes.string,
        routeNum: PropTypes.string.isRequired,
        type: PropTypes.number.isRequired,
      }),
    ),
  ).isRequired,
  stateTitle: PropTypes.string.isRequired,
};

export default SearchResults;
