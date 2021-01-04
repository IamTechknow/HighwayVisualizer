import React, { useState } from 'react';
import type { IHighways } from '../types/interfaces';
import type { State, Segment } from '../types/types';

import * as HighwayUtils from '../utils/HighwayUtils';
import Collapsible from './Collapsible';

const KEY_ENTER = 'Enter', ROUTES_PER_ROW = 8;

interface Props {
  highwayData: IHighways,
  onRouteItemClick: (event: React.SyntheticEvent, segmentOfRoute: Segment) => void,
  onSegmentItemClick: (event: React.SyntheticEvent, segment: Segment) => void,
  onUpdateState: (stateId: number) => void,
  segments: Array<Array<Segment>>,
  stateId: number,
  states: Array<State>,
}

const SegmentContent = ({
  highwayData,
  onRouteItemClick,
  onSegmentItemClick,
  onUpdateState,
  segments,
  stateId,
  states,
}: Props): React.ReactElement<Props> => {
  const [currSegments, setSegments] = useState<Array<Segment>>(segments[0] ?? []);

  const _onRouteItemClick = (
    event: React.SyntheticEvent,
    clickedSegments: Array<Segment>,
  ): void => {
    setSegments(clickedSegments);
    onRouteItemClick(event, clickedSegments[0]);
  };

  const _onStateSelect = (event: React.ChangeEvent<HTMLSelectElement>): void => {
    onUpdateState(Number(event.target.value));
  };

  const _getRouteName = (
    firstSegment: Segment,
    currStateId: number | null,
    useRouteTitle = true,
  ): string => (currStateId != null
    ? HighwayUtils.getRouteName(
      firstSegment,
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
  const routeMatrix: Segment[][][] = [];
  let segmentIdx = 0;
  while (segmentIdx < segments.length) {
    let routesPerRow = ROUTES_PER_ROW;
    const currIdx = Math.min(segments.length - 1, segmentIdx + routesPerRow - 1);
    const lastRouteInRow = segments[currIdx][0];
    const lastRouteNum = getNumFromRoute(lastRouteInRow.routeNum);
    if (lastRouteNum >= 100) {
      routesPerRow = ROUTES_PER_ROW - 1;
    } else if (lastRouteNum >= 1000) {
      routesPerRow = ROUTES_PER_ROW - 2;
    }
    routeMatrix.push(segments.slice(segmentIdx, segmentIdx + routesPerRow));
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
            (segmentSubArray: Segment[][], i: number): React.ReactNode => (
              <span key={`segmentSet-${i}`} className="routeRow">
                {
                  segmentSubArray.map((segmentSet: Segment[]): React.ReactNode => {
                    const segment = segmentSet[0];
                    const { dir, routeNum, type } = segment;
                    return (
                      <div
                        key={`${routeNum}${dir}_${type}`}
                        className="clickable"
                        onClick={
                          (event: React.MouseEvent): void => _onRouteItemClick(event, segmentSet)
                        }
                        onKeyDown={
                          (event: React.KeyboardEvent): void => {
                            if (event.key === KEY_ENTER) {
                              _onRouteItemClick(event, segmentSet);
                            }
                          }
                        }
                        role="link"
                        tabIndex={0}
                      >
                        {_getRouteName(segment, stateId, false)}
                      </div>
                    );
                  })
                }
              </span>
            ),
          ) : <h3>Loading...</h3>}
        </div>
      </Collapsible>

      <Collapsible title={`${_getRouteName(currSegments[0], stateId)} Segments`} open>
        <ul>
          {
            currSegments.map((segment: Segment, i: number): React.ReactNode => (
              <li
                key={`segment-${segment.id}`}
                className="clickable"
                onClick={(event: React.MouseEvent): void => onSegmentItemClick(event, segment)}
                onKeyDown={(event: React.KeyboardEvent): void => {
                  if (event.key === KEY_ENTER) {
                    onSegmentItemClick(event, segment);
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

export default SegmentContent;
