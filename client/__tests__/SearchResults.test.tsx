import React from 'react';
import { mount, ReactWrapper } from 'enzyme';
import type { Segment } from '../types/types';

import SearchResults from '../components/SearchResults';
import * as TestUtils from './utils/TestUtils';

const routeClickMap: { [routeStr: string]: number } = {};
const state = TestUtils.getTestStateData()[0];
const segmentData = TestUtils.getTestSegmentDataByStateID(state.id);

const onRouteItemClick = (_event: React.SyntheticEvent, segmentOfRoute: Segment): void => {
  const currVal = routeClickMap[segmentOfRoute.routeNum];
  routeClickMap[segmentOfRoute.routeNum] = currVal != null ? currVal + 1 : 1;
};

const mockSearchResults = () => mount(
  <SearchResults
    onRouteItemClick={onRouteItemClick}
    segments={segmentData}
    state={state}
  />,
);

const updateSearchBar = (searchBar: ReactWrapper, input: string) => {
  searchBar.simulate('change', {
    target: {
      value: input,
    },
  }).update();
};

describe('SearchResults component test suite', () => {
  it('should show search hints when search bar is empty or gets cleared', () => {
    const comp = mockSearchResults();
    const searchBar = comp.find('#routeSearch');
    const bulletPoints = comp.find('li');
    expect(searchBar.props().value).toBeFalsy();
    expect(bulletPoints.length).toBe(2);
    updateSearchBar(searchBar, '');
    expect(searchBar.props().value).toBeFalsy();
    expect(bulletPoints.length).toBe(2);
  });

  it('should show search hints when search yields no results', () => {
    const comp = mockSearchResults();
    const searchBar = comp.find('#routeSearch');
    updateSearchBar(searchBar, 'I');
    const searchHintHeader = comp.find('h3');
    const bulletPoints = comp.find('li');
    expect(searchHintHeader.length).toBe(1);
    expect(bulletPoints.length).toBe(2);
  });

  it('should show search results for a valid entry', () => {
    const comp = mockSearchResults();
    const searchBar = comp.find('#routeSearch');
    updateSearchBar(searchBar, 'I-5');
    const searchHintHeader = comp.find('h3');
    const bulletPoints = comp.find('li');
    expect(searchHintHeader.length).toBe(0);
    const expectedBulletPoints = segmentData
      .flat()
      .filter((segment) => segment.routeNum === '5')
      .length;
    expect(bulletPoints.length).toBe(expectedBulletPoints);
  });

  it('should allow selected routes to be clicked', () => {
    const routeNum = '5'; // I-5
    const comp = mockSearchResults();
    const searchBar = comp.find('#routeSearch');
    updateSearchBar(searchBar, routeNum);
    const bulletPoints = comp.find('li');
    bulletPoints.forEach((routeBullet): void => {
      routeBullet.simulate('click');
    });
    const bulletPointsWithRoute5 = segmentData
      .flat()
      .filter((segment) => segment.routeNum === routeNum)
      .length;
    expect(routeClickMap[routeNum]).toBe(bulletPointsWithRoute5);
  });
});
