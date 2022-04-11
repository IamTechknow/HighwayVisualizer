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
import SidebarTab from './SidebarTab';
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
  return (
    <Sidebar>
      <SidebarTab
        header="User Settings"
        icon={<User size={ICON_SIZE} />}
        path="travel_segments"
      >
        <TravelSegmentContent
          highwayData={highwayData}
          userData={userData}
          userDataCallbackMap={userDataCallbackMap}
        />
      </SidebarTab>
      <SidebarTab
        header="Route Segments"
        icon={<Map size={ICON_SIZE} />}
        path=""
      >
        <RouteSegmentContent
          highwayData={highwayData}
          routeData={routeData}
          routeDataCallbackMap={routeDataCallbackMap}
        />
      </SidebarTab>
      <SidebarTab
        header="Search"
        icon={<Search size={ICON_SIZE} />}
        path="search"
      >
        <SearchResults
          onRouteItemClick={routeDataCallbackMap.onRouteItemClick}
          routeSegments={routeSegments}
          state={stateId != null ? highwayData.getState(stateId) : null}
        />
      </SidebarTab>
      <SidebarTab
        header="About HighwayVisualizer"
        icon={<Info size={ICON_SIZE} />}
        path="about"
      >
        <AboutContent />
      </SidebarTab>
    </Sidebar>
  );
};

export default RouteDrawer;
