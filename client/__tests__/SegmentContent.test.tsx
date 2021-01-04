import React from 'react';
import { mount } from 'enzyme';
import type { IHighways } from '../types/interfaces';
import type { Segment } from '../types/types';

import APIClient from '../components/APIClient';
import Highways from '../components/Highways';
import SegmentContent from '../components/SegmentContent';
import * as TestUtils from './utils/TestUtils';

const highwayData: IHighways = new Highways();
const routeClickMap: { [routeStr: string]: number } = {};
const segmentClickMap: { [segmentNum: number]: number } = {};
const stateData = TestUtils.getTestStateData();

const onRouteItemClick = (_event: React.SyntheticEvent, segmentOfRoute: Segment): void => {
  const currVal = routeClickMap[segmentOfRoute.routeNum];
  routeClickMap[segmentOfRoute.routeNum] = currVal != null ? currVal + 1 : 1;
};

const onSegmentItemClick = (_event: React.SyntheticEvent, segment: Segment): void => {
  const currVal = segmentClickMap[segment.id];
  segmentClickMap[segment.id] = currVal != null ? currVal + 1 : 1;
};

const onUpdateState = (stateId: number): void => {
  const rawSegmentData = TestUtils.getTestRawSegmentDataByStateID(stateId);
  highwayData.buildStateSegmentsData(rawSegmentData);
};

const mockSegmentContent = (initialStateId: number) => {
  const rawSegmentData = TestUtils.getTestRawSegmentDataByStateID(stateData[0].id);
  const segmentDataByRoute = APIClient.parseRawSegments(rawSegmentData);
  highwayData.setStates(stateData);
  highwayData.buildStateSegmentsData(rawSegmentData);
  return mount(
    <SegmentContent
      highwayData={highwayData}
      onRouteItemClick={onRouteItemClick}
      onSegmentItemClick={onSegmentItemClick}
      onUpdateState={onUpdateState}
      segments={segmentDataByRoute}
      stateId={initialStateId}
      states={stateData}
    />,
  );
};

describe('SegmentContent component test suite', () => {
  it('should render all available states', () => {
    const comp = mockSegmentContent(stateData[0].id);
    const selectElement = comp.find('select');
    const stateOptions = selectElement.first().find('option');
    const expectedStates = stateData.length;
    expect(stateOptions.length).toBe(expectedStates);
  });

  it('should render all available routes for the selected state', () => {
    const segmentDataByRoute = TestUtils.getTestSegmentDataByStateID(stateData[0].id);
    const comp = mockSegmentContent(stateData[0].id);
    const routeTable = comp.find('.routeTable');
    const routeRows = routeTable.first().find('.routeRow');
    expect(routeRows.length).toBeGreaterThan(1);
    const clickables = routeTable.first().find('.clickable');
    const expectedRoutes = segmentDataByRoute.length;
    expect(clickables.length).toBe(expectedRoutes);
  });

  it('should render all available segments for the selected route', () => {
    const comp = mockSegmentContent(stateData[0].id);
    const segmentList = comp.find('ul');
    const clickables = segmentList.first().find('.clickable');
    const expectedSegments = TestUtils.getTestSegmentDataByStateID(stateData[0].id)[0].length;
    expect(clickables.length).toBe(expectedSegments);
  });

  it('should be able to switch data between states', () => {
    const { id: initialStateID } = stateData[0];
    const { id: finalStateID } = stateData[1];
    const comp = mockSegmentContent(initialStateID);
    const finalSegments = TestUtils.getTestSegmentDataByStateID(finalStateID);

    const selectElement = comp.find('select');
    selectElement.simulate('change', {
      target: {
        value: finalStateID,
      },
    }).update();
    comp.setProps({
      segments: finalSegments,
      stateId: finalStateID,
    }).update();

    const updatedSelect = comp.find('select');
    expect(updatedSelect.props().value).toBe(finalStateID);
    const routeTable = comp.find('.routeTable');
    const clickables = routeTable.first().find('.clickable');
    const expectedDCRoutes = finalSegments.length;
    expect(clickables.length).toBe(expectedDCRoutes);
  });
});
