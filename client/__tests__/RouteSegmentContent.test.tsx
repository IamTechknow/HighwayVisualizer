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
  return mount(
    <RouteSegmentContent
      highwayData={highwayData}
      routeData={{
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
  it('should render all available states', () => {
    const comp = mockRouteSegmentContent(CAState.id);
    const selectElement = comp.find('select');
    const stateOptions = selectElement.first().find('option');
    const expectedStates = stateData.length;
    expect(stateOptions.length).toBe(expectedStates);
  });

  it('should render all available routes for the selected state', () => {
    const segmentDataByRoute = TestUtils.getTestRouteSegmentDataByStateID(CAState.id);
    const comp = mockRouteSegmentContent(CAState.id);
    const routeTable = comp.find('.routeTable');
    const routeRows = routeTable.first().find('.routeRow');
    expect(routeRows.length).toBeGreaterThan(1);
    const clickables = routeTable.first().find('.clickable');
    const expectedRoutes = segmentDataByRoute.length;
    expect(clickables.length).toBe(expectedRoutes);
  });

  it('should render all available route segments for the selected route', () => {
    const comp = mockRouteSegmentContent(CAState.id);
    const routeSegmentList = comp.find('ul');
    const clickables = routeSegmentList.first().find('.clickable');
    const expectedSegments = TestUtils.getTestRouteSegmentDataByStateID(CAState.id)[0].length;
    expect(clickables.length).toBe(expectedSegments);
  });

  it('should be able to switch data between states', () => {
    const { id: initialStateID } = CAState;
    const { id: finalStateID } = DCState;
    const comp = mockRouteSegmentContent(initialStateID);
    const finalRouteSegments = TestUtils.getTestRouteSegmentDataByStateID(finalStateID);

    const selectElement = comp.find('select');
    selectElement.simulate('change', {
      target: {
        value: finalStateID,
      },
    }).update();
    comp.setProps({
      routeData: {
        routeSegments: finalRouteSegments,
        stateId: finalStateID,
        states: stateData,
      },
    }).update();

    const updatedSelect = comp.find('select');
    expect(updatedSelect.props().value).toBe(finalStateID);
    const routeTable = comp.find('.routeTable');
    const clickables = routeTable.first().find('.clickable');
    const expectedDCRoutes = finalRouteSegments.length;
    expect(clickables.length).toBe(expectedDCRoutes);
  });

  // TODO: simulate() is decrepated and will be removed in Enzyme 4
  it('should be able to handle selected routes or segments', () => {
    const comp = mockRouteSegmentContent(CAState.id);
    const routeSegmentList = comp.find('ul');
    const clickableSegments = routeSegmentList.first().find('.clickable');
    const routeTable = comp.find('.routeTable');
    const clickableRoutes = routeTable.first().find('.clickable');

    clickableSegments.first().simulate('click');
    clickableSegments.first().simulate('keydown', { key: 'Enter' });
    clickableRoutes.first().simulate('click');
    clickableRoutes.first().simulate('keydown', { key: 'Enter' });

    const segmentDataByRoute = TestUtils.getTestRouteSegmentDataByStateID(CAState.id);
    const firstRouteSegs = segmentDataByRoute[0];
    const { id, routeNum } = firstRouteSegs[0];
    expect(routeClickMap[routeNum]).toBe(2);
    expect(routeSegmentClickMap[id]).toBe(2);
  });
});
