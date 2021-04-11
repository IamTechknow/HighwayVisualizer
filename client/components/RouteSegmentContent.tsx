import React, { useState } from 'react';
import type { IHighways } from '../types/interfaces';
import type {
  State, RouteDrawerRouteData, RouteDataCallbackMap, RouteSegment,
} from '../types/types';

import * as HighwayUtils from '../utils/HighwayUtils';
import Collapsible from './Collapsible';

const KEY_ENTER = 'Enter', ROUTES_PER_ROW = 8;

interface Props {
  highwayData: IHighways,
  routeData: RouteDrawerRouteData,
  routeDataCallbackMap: RouteDataCallbackMap,
}

const RouteSegmentContent = ({
  highwayData,
  routeData,
  routeDataCallbackMap,
}: Props): React.ReactElement<Props> => {
  const { routeSegments, stateId, states } = routeData;
  const { onRouteItemClick, onRouteSegmentItemClick, onUpdateState } = routeDataCallbackMap;
  const [currRouteSegments, setRouteSegments] =
    useState<Array<RouteSegment>>(routeSegments[0] ?? []);

  const _onRouteItemClick = (
    event: React.SyntheticEvent,
    clickedRouteSegments: Array<RouteSegment>,
  ): void => {
    setRouteSegments(clickedRouteSegments);
    onRouteItemClick(event, clickedRouteSegments[0]);
  };

  const _onStateSelect = (event: React.ChangeEvent<HTMLSelectElement>): void => {
    onUpdateState(Number(event.target.value));
  };

  const _getRouteName = (
    firstRouteSegment: RouteSegment,
    currStateId: number | null,
    useRouteTitle = true,
  ): string => (currStateId != null
    ? HighwayUtils.getRouteName(
      firstRouteSegment,
      highwayData.getState(currStateId).identifier,
      useRouteTitle,
    )
    : '');

  const getNumFromRoute = (routeNum: string): number => {
    let i = 0;
    while (i < routeNum.length && !Number.isNaN(Number(routeNum[i]))) {
      i += 1;
    }
    return Number(routeNum.substring(0, i));
  };

  // Give enough space for routes based on # of digits
  const routeMatrix: RouteSegment[][][] = [];
  let segmentIdx = 0;
  while (segmentIdx < routeSegments.length) {
    let routesPerRow = ROUTES_PER_ROW;
    const currIdx = Math.min(routeSegments.length - 1, segmentIdx + routesPerRow - 1);
    const lastRouteInRow = routeSegments[currIdx][0];
    const lastRouteNum = getNumFromRoute(lastRouteInRow.routeNum);
    if (lastRouteNum >= 100) {
      routesPerRow = ROUTES_PER_ROW - 1;
    } else if (lastRouteNum >= 1000) {
      routesPerRow = ROUTES_PER_ROW - 2;
    }
    routeMatrix.push(routeSegments.slice(segmentIdx, segmentIdx + routesPerRow));
    segmentIdx += routesPerRow;
  }

  return (
    <div className="tabContent">
      <Collapsible title="States" open>
        <select value={stateId} onChange={_onStateSelect} className="nameFormElement">
          {stateId === -1 && <option value={-1}>Loading...</option>}
          {states.map(
            (state: State) => <option key={state.id} value={state.id}>{state.title}</option>,
          )}
        </select>
      </Collapsible>

      <Collapsible title="Routes" open>
        <div className="routeTable">
          {stateId != null ? routeMatrix.map(
            (routeSubArray: RouteSegment[][], i: number): React.ReactNode => (
              <span key={`routeSegmentSet-${i}`} className="routeRow">
                {
                  routeSubArray.map((routeSegmentSet: RouteSegment[]): React.ReactNode => {
                    const routeSegment = routeSegmentSet[0];
                    const { dir, routeNum, type } = routeSegment;
                    return (
                      <div
                        key={`${routeNum}${dir}_${type}`}
                        className="clickable"
                        onClick={
                          (event: React.MouseEvent) => _onRouteItemClick(event, routeSegmentSet)
                        }
                        onKeyDown={
                          (event: React.KeyboardEvent) => {
                            if (event.key === KEY_ENTER) {
                              _onRouteItemClick(event, routeSegmentSet);
                            }
                          }
                        }
                        role="link"
                        tabIndex={0}
                      >
                        {_getRouteName(routeSegment, stateId, false)}
                      </div>
                    );
                  })
                }
              </span>
            ),
          ) : <h3>Loading...</h3>}
        </div>
      </Collapsible>

      <Collapsible title={`${_getRouteName(currRouteSegments[0], stateId)} Segments`} open>
        <ul>
          {
            currRouteSegments.map((routeSegment: RouteSegment, i: number): React.ReactNode => (
              <li
                key={`routeSegment-${routeSegment.id}`}
                className="clickable"
                onClick={(event: React.MouseEvent) => onRouteSegmentItemClick(event, routeSegment)}
                onKeyDown={(event: React.KeyboardEvent) => {
                  if (event.key === KEY_ENTER) {
                    onRouteSegmentItemClick(event, routeSegment);
                  }
                }}
                role="presentation"
              >
                {`Segment ${i + 1}`}
              </li>
            ))
          }
        </ul>
      </Collapsible>
    </div>
  );
};

export default RouteSegmentContent;
