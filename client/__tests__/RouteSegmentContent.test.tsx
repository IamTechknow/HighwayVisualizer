import React from 'react';
import { mount } from 'enzyme';
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
  const rawRouteSegmentData = TestUtils.getTestRawRouteSegmentDataByStateID(stateData[0].id);
  const segmentDataByRoute = APIClient.parseRawRouteSegments(rawRouteSegmentData);
  highwayData.setStates(stateData);
  highwayData.buildStateSegmentsData(rawRouteSegmentData);
  return mount(
    <RouteSegmentContent
      highwayData={highwayData}
      onRouteItemClick={onRouteItemClick}
      onRouteSegmentItemClick={onRouteSegmentItemClick}
      onUpdateState={onUpdateState}
      routeSegments={segmentDataByRoute}
      stateId={initialStateId}
      states={stateData}
    />,
  );
};

describe('RouteSegmentContent component test suite', () => {
  it('should render all available states', () => {
    const comp = mockRouteSegmentContent(stateData[0].id);
    const selectElement = comp.find('select');
    const stateOptions = selectElement.first().find('option');
    const expectedStates = stateData.length;
    expect(stateOptions.length).toBe(expectedStates);
  });

  it('should render all available routes for the selected state', () => {
    const segmentDataByRoute = TestUtils.getTestRouteSegmentDataByStateID(stateData[0].id);
    const comp = mockRouteSegmentContent(stateData[0].id);
    const routeTable = comp.find('.routeTable');
    const routeRows = routeTable.first().find('.routeRow');
    expect(routeRows.length).toBeGreaterThan(1);
    const clickables = routeTable.first().find('.clickable');
    const expectedRoutes = segmentDataByRoute.length;
    expect(clickables.length).toBe(expectedRoutes);
  });

  it('should render all available route segments for the selected route', () => {
    const comp = mockRouteSegmentContent(stateData[0].id);
    const routeSegmentList = comp.find('ul');
    const clickables = routeSegmentList.first().find('.clickable');
    const expectedSegments = TestUtils.getTestRouteSegmentDataByStateID(stateData[0].id)[0].length;
    expect(clickables.length).toBe(expectedSegments);
  });

  it('should be able to switch data between states', () => {
    const { id: initialStateID } = stateData[0];
    const { id: finalStateID } = stateData[1];
    const comp = mockRouteSegmentContent(initialStateID);
    const finalRouteSegments = TestUtils.getTestRouteSegmentDataByStateID(finalStateID);

    const selectElement = comp.find('select');
    selectElement.simulate('change', {
      target: {
        value: finalStateID,
      },
    }).update();
    comp.setProps({
      routeSegments: finalRouteSegments,
      stateId: finalStateID,
    }).update();

    const updatedSelect = comp.find('select');
    expect(updatedSelect.props().value).toBe(finalStateID);
    const routeTable = comp.find('.routeTable');
    const clickables = routeTable.first().find('.clickable');
    const expectedDCRoutes = finalRouteSegments.length;
    expect(clickables.length).toBe(expectedDCRoutes);
  });
});
