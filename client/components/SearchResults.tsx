import type { Segment } from '../types/types';

import React, { useMemo, useState } from 'react';

import Highways from './Highways';

interface Props {
  getRouteName: (seg: Segment) => string,
  onRouteItemClick: (event: React.SyntheticEvent, segmentOfRoute: Segment) => void,
  segments: Array<Array<Segment>>,
  stateTitle: string,
}

const SearchResults = ({
  getRouteName,
  onRouteItemClick,
  segments,
  stateTitle,
}: Props): React.ReactElement<Props> => {
  if (segments.length === 0 || stateTitle === '') {
    return <h3>Loading...</h3>;
  }

  const [searchResults, setSearchResults] = useState<Segment[]>([]);
  const fullRoutes = useMemo<Segment[]>(
    (): Segment[] => segments.flat().filter((routeObj: Segment): boolean => routeObj.segNum === 0),
    [segments],
  );

  const onSearchSegments = (event: React.ChangeEvent<HTMLInputElement>): void => {
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
      filteredSegments = fullRoutes.filter(
        (routeObj: Segment): boolean => routeObj.type === highwayType,
      );
    }
    const results = filteredSegments.filter(
      (routeObj: Segment): boolean => routeNum != null && routeObj.routeNum.indexOf(routeNum) >= 0,
    );
    setSearchResults(results.slice(0, 30));
  };

  return (
    <div className="tabContent">
      <input
        type="text"
        size={50}
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
                searchResults.map((firstSeg: Segment): React.ReactNode => (
                  <li
                    key={firstSeg.id}
                    className="clickable"
                    onClick={(event: React.MouseEvent): void => onRouteItemClick(event, firstSeg)}
                    onKeyDown={(event: React.KeyboardEvent): void => {
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

export default SearchResults;