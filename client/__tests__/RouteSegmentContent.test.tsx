import React from 'react';
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import type { IHighways } from '../types/interfaces';
import type { RouteSegment } from '../types/types';

import APIClient from '../components/APIClient';
import Highways from '../components/Highways';
import RouteSegmentContent from '../components/RouteSegmentContent';
import * as TestUtils from './utils/TestUtils';

const highwayData: IHighways = new Highways();
const routeClickMap: { [routeStr: string]: number } = {};
const routeSegmentClickMap: { [segmentNum: number]: number } = {};
const stateData = TestUtils.getTestStateData();
const [CAState, DCState] = stateData;

const onRouteItemClick = (_event: React.SyntheticEvent, segmentOfRoute: RouteSegment) => {
  const currVal = routeClickMap[segmentOfRoute.routeNum];
  routeClickMap[segmentOfRoute.routeNum] = currVal != null ? currVal + 1 : 1;
};

const onRouteSegmentItemClick = (_event: React.SyntheticEvent, routeSegment: RouteSegment) => {
  const currVal = routeSegmentClickMap[routeSegment.id];
  routeSegmentClickMap[routeSegment.id] = currVal != null ? currVal + 1 : 1;
};

const onUpdateState = (stateId: number) => {
  const rawRouteSegmentData = TestUtils.getTestRawRouteSegmentDataByStateID(stateId);
  highwayData.buildStateSegmentsData(rawRouteSegmentData);
};

const mockRouteSegmentContent = (initialStateId: number) => {
  const rawRouteSegmentData = TestUtils.getTestRawRouteSegmentDataByStateID(initialStateId);
  const segmentDataByRoute = APIClient.parseRawRouteSegments(rawRouteSegmentData);
  highwayData.setStates(stateData);
  highwayData.buildStateSegmentsData(rawRouteSegmentData);
  return render(
    <RouteSegmentContent
      highwayData={highwayData}
      routeData={{
        currRouteSegmentsIdx: 0,
        routeSegments: segmentDataByRoute,
        stateId: initialStateId,
        states: stateData,
      }}
      routeDataCallbackMap={{
        onRouteItemClick,
        onRouteSegmentItemClick,
        onUpdateState,
      }}
    />,
  );
};

describe('RouteSegmentContent component test suite', () => {
  it('should render all available states', async () => {
    const comp = mockRouteSegmentContent(CAState.id);
    const stateOptions = comp.getAllByRole('option');
    const expectedStates = stateData.length;
    expect(stateOptions.length).toBe(expectedStates);
  });

  it('should render all available routes for the selected state', async () => {
    const segmentDataByRoute = TestUtils.getTestRouteSegmentDataByStateID(CAState.id);
    const comp = mockRouteSegmentContent(CAState.id);
    const routeRows = comp.getAllByRole('rowgroup');
    expect(routeRows.length).toBeGreaterThan(1);
    const clickables = comp.getAllByRole('link');
    const expectedRoutes = segmentDataByRoute.length;
    expect(clickables.length).toBe(expectedRoutes);
  });

  it('should render all available route segments for the selected route', async () => {
    const comp = mockRouteSegmentContent(CAState.id);
    const clickables = comp.getAllByRole('presentation');
    const expectedSegments = TestUtils.getTestRouteSegmentDataByStateID(CAState.id)[0].length;
    expect(clickables.length).toBe(expectedSegments);
  });

  it('should be able to switch data between states', async () => {
    const { id: initialStateID } = CAState;
    const { id: finalStateID, title } = DCState;
    const comp = mockRouteSegmentContent(initialStateID);
    const finalRouteSegments = TestUtils.getTestRouteSegmentDataByStateID(finalStateID);

    const selectElement = comp.getByRole('combobox');
    await userEvent.selectOptions(selectElement, String(finalStateID));
    comp.rerender(
      <RouteSegmentContent
        highwayData={highwayData}
        routeData={{
          currRouteSegmentsIdx: 0,
          routeSegments: finalRouteSegments,
          stateId: finalStateID,
          states: stateData,
        }}
        routeDataCallbackMap={{
          onRouteItemClick,
          onRouteSegmentItemClick,
          onUpdateState,
        }}
      />,
    );

    expect((comp.getByText(title) as HTMLOptionElement).selected).toBe(true);
    const clickableRoutes = comp.getAllByRole('link');
    const expectedDCRoutes = finalRouteSegments.length;
    expect(clickableRoutes.length).toBe(expectedDCRoutes);
  });

  it('should be able to handle selected routes or segments', async () => {
    const comp = mockRouteSegmentContent(CAState.id);
    const firstSegment = comp.getAllByRole('presentation')[0];
    const firstRoute = comp.getAllByRole('link')[0];

    await userEvent.click(firstSegment)
      .then(() => userEvent.type(firstSegment, '{Enter}'))
      .then(() => userEvent.click(firstRoute));

    const segmentDataByRoute = TestUtils.getTestRouteSegmentDataByStateID(CAState.id);
    const firstRouteSegs = segmentDataByRoute[0];
    const { id, routeNum } = firstRouteSegs[0];
    expect(routeSegmentClickMap[id]).toBe(2);
    expect(routeClickMap[routeNum]).toBe(1);
  });
});
