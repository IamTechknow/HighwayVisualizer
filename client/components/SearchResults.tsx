import React, { useMemo, useState } from 'react';
import type { RouteSegment, State } from '../types/types';

import * as HighwayUtils from '../utils/HighwayUtils';

const KEY_ENTER = 'Enter', MAX_RESULTS = 30;

interface Props {
  onRouteItemClick: (event: React.SyntheticEvent, segmentOfRoute: RouteSegment) => void,
  routeSegments: Array<Array<RouteSegment>>,
  state: State | null,
}

const SearchResults = ({
  onRouteItemClick,
  routeSegments,
  state,
}: Props): React.ReactElement<Props> => {
  if (routeSegments.length === 0 || state == null) {
    return <h3>Loading...</h3>;
  }

  const [searchResults, setSearchResults] = useState<RouteSegment[]>([]);
  const fullRoutes = useMemo<RouteSegment[]>(
    (): RouteSegment[] => routeSegments.flat().filter(
      (routeSeg: RouteSegment) => routeSeg.segNum === 0,
    ),
    [routeSegments],
  );

  const onSearchRoutes = (event: React.ChangeEvent<HTMLInputElement>): void => {
    const query = event.target.value;
    if (!query) {
      setSearchResults([]);
      return;
    }
    const dashSplit = query.split('-');
    const queries = dashSplit.length > 1 ? dashSplit : query.split(' ');
    const routeNum = queries.length > 0 ? queries[queries.length - 1] : null;
    let filteredRouteSegments = fullRoutes;
    if (queries.length > 1) {
      const highwayType = HighwayUtils.getType(queries[0]);
      filteredRouteSegments = fullRoutes.filter(
        (routeSeg: RouteSegment) => routeSeg.type === highwayType,
      );
    }
    const results = filteredRouteSegments.filter(
      (routeSeg: RouteSegment) => routeNum != null && routeSeg.routeNum.indexOf(routeNum) >= 0,
    );
    setSearchResults(results.slice(0, MAX_RESULTS));
  };

  return (
    <div className="tabContent">
      <input
        id="routeSearch"
        className="nameFormElement"
        onChange={onSearchRoutes}
        placeholder={`Search ${state.title} routes by type and/or number...`}
        type="search"
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
                searchResults.map((firstRouteSeg: RouteSegment): React.ReactNode => (
                  <li
                    key={firstRouteSeg.id}
                    className="clickable"
                    onClick={
                      (event: React.MouseEvent): void => onRouteItemClick(event, firstRouteSeg)
                    }
                    onKeyDown={(event: React.KeyboardEvent): void => {
                      if (event.key === KEY_ENTER) {
                        onRouteItemClick(event, firstRouteSeg);
                      }
                    }}
                    role="presentation"
                  >
                    {HighwayUtils.getRouteName(firstRouteSeg, state.identifier)}
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
