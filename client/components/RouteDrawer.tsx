import React from 'react';
import {
  Info, Map, Search, User,
} from 'react-feather';
import type { IHighways } from '../types/interfaces';
import type {
  RouteDataCallbackMap,
  RouteDrawerRouteData,
  RouteDrawerUserData,
  UserDataCallbackMap,
} from '../types/types';

import AboutContent from './AboutContent';
import SearchResults from './SearchResults';
import RouteSegmentContent from './RouteSegmentContent';
import Sidebar from './Sidebar';
import TravelSegmentContent from './TravelSegmentContent';

const ICON_SIZE = 16;

interface Props {
  highwayData: IHighways,
  routeData: RouteDrawerRouteData,
  routeDataCallbackMap: RouteDataCallbackMap,
  userData: RouteDrawerUserData,
  userDataCallbackMap: UserDataCallbackMap,
}

const RouteDrawer = ({
  highwayData,
  routeData,
  routeDataCallbackMap,
  userData,
  userDataCallbackMap,
}: Props): React.ReactElement<Props> => {
  const { routeSegments, stateId } = routeData;
  const routes = [
    {
      Content: () => (
        <TravelSegmentContent
          highwayData={highwayData}
          userData={userData}
          userDataCallbackMap={userDataCallbackMap}
        />
      ),
      FeatherIcon: () => <User size={ICON_SIZE} />,
      activeHash: '#travel_segments',
      header: 'Travel Segments',
      path: '/travel_segments',
    },
    {
      Content: () => (
        <RouteSegmentContent
          highwayData={highwayData}
          routeData={routeData}
          routeDataCallbackMap={routeDataCallbackMap}
        />
      ),
      FeatherIcon: () => <Map size={ICON_SIZE} />,
      activeHash: '',
      exact: true,
      header: 'Route Segments',
      path: '/',
    },
    {
      Content: () => (
        <SearchResults
          onRouteItemClick={routeDataCallbackMap.onRouteItemClick}
          routeSegments={routeSegments}
          state={stateId != null ? highwayData.getState(stateId) : null}
        />
      ),
      FeatherIcon: () => <Search size={ICON_SIZE} />,
      activeHash: '#search',
      header: 'Search',
      path: '/search',
    },
    {
      Content: () => <AboutContent />,
      FeatherIcon: () => <Info size={ICON_SIZE} />,
      activeHash: '#about',
      header: 'About HighwayVisualizer',
      path: '/about',
    },
  ];
  return <Sidebar routes={routes} />;
};

export default RouteDrawer;
