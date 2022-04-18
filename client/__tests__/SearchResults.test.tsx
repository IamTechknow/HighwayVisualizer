import React from 'react';
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import type { RouteSegment } from '../types/types';

import SearchResults from '../components/SearchResults';
import * as TestUtils from './utils/TestUtils';

const routeClickMap: { [routeStr: string]: number } = {};
const state = TestUtils.getTestStateData()[0];
const routeSegmentData = TestUtils.getTestRouteSegmentDataByStateID(state.id);

const onRouteItemClick = (_event: React.SyntheticEvent, segmentOfRoute: RouteSegment): void => {
  const currVal = routeClickMap[segmentOfRoute.routeNum];
  routeClickMap[segmentOfRoute.routeNum] = currVal != null ? currVal + 1 : 1;
};

const mockSearchResults = () => render(
  <SearchResults
    onRouteItemClick={onRouteItemClick}
    routeSegments={routeSegmentData}
    state={state}
  />,
);

const updateSearchBar = (
  searchBar: HTMLElement,
  input: string,
): Promise<void> => (input === '' ? userEvent.clear(searchBar) : userEvent.type(searchBar, input));

describe('SearchResults component test suite', () => {
  it('should show search hints when search bar is empty or gets cleared', async () => {
    const comp = mockSearchResults();
    const searchBar = comp.getByRole('searchbox');
    const bulletPoints = comp.getAllByRole('listitem');
    expect(bulletPoints.length).toBe(2);
    await updateSearchBar(searchBar, '');
    expect(searchBar.nodeValue).toBeFalsy();
    expect(bulletPoints.length).toBe(2);
  });

  it('should show search hints when search yields no results', async () => {
    const comp = mockSearchResults();
    const searchBar = comp.getByRole('searchbox');
    await updateSearchBar(searchBar, 'I');
    const searchHintHeader = comp.getByRole('heading', { level: 3 });
    const bulletPoints = comp.getAllByRole('listitem');
    expect(searchHintHeader).toHaveTextContent('Search hints:');
    expect(bulletPoints.length).toBe(2);
  });

  it('should show search results for a valid entry', async () => {
    const comp = mockSearchResults();
    const searchBar = comp.getByRole('searchbox');
    await updateSearchBar(searchBar, 'I-5');
    const searchHintHeader = comp.queryByRole('heading', { level: 3 });
    const bulletPoints = comp.getAllByRole('presentation');
    expect(searchHintHeader).toBeNull();
    const expectedBulletPoints = routeSegmentData
      .flat()
      .filter((routeSegment) => routeSegment.routeNum === '5')
      .length;
    expect(bulletPoints.length).toBe(expectedBulletPoints);
  });

  it('should allow selected routes to be clicked', async () => {
    const routeNum = '5'; // I-5
    const comp = mockSearchResults();
    const searchBar = comp.getByRole('searchbox');
    await updateSearchBar(searchBar, routeNum);
    // Role is override to presentation to make <li> clickable
    const bulletPoints = comp.getAllByRole('presentation');
    for (const routeBullet of bulletPoints) {
      await userEvent.click(routeBullet).then(() => userEvent.type(routeBullet, '{Enter}'));
    }
    const bulletPointsWithRoute5 = routeSegmentData
      .flat()
      .filter((routeSegment) => routeSegment.routeNum === routeNum)
      .length;
    expect(routeClickMap[routeNum]).toBe(bulletPointsWithRoute5 * 2);
  });
});
