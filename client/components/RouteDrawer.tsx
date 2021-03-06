import React, { useState } from 'react';
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
  const [isCollapsed, setCollapsed] = useState<boolean>(false);
  const [selectedId, setSelectedId] = useState<string>('routeSegments');

  const _onClose = (): void => {
    setCollapsed(true);
  };

  const _onToggle = (id: string) => {
    if (selectedId === id) {
      setCollapsed(!isCollapsed);
    }
    if (isCollapsed) {
      setCollapsed(false);
    }
    setSelectedId(id);
  };

  return (
    <Sidebar
      id="sidebar"
      collapsed={isCollapsed}
      selected={selectedId}
      onClose={_onClose}
      onToggle={_onToggle}
    >
      <SidebarTab id="users" header="User Settings" icon={<User size={ICON_SIZE} />}>
        <TravelSegmentContent
          highwayData={highwayData}
          userData={userData}
          userDataCallbackMap={userDataCallbackMap}
        />
      </SidebarTab>
      <SidebarTab id="routeSegments" header="Route Segments" icon={<Map size={ICON_SIZE} />}>
        <RouteSegmentContent
          highwayData={highwayData}
          routeData={routeData}
          routeDataCallbackMap={routeDataCallbackMap}
        />
      </SidebarTab>
      <SidebarTab id="search" header="Search" icon={<Search size={ICON_SIZE} />}>
        <SearchResults
          onRouteItemClick={routeDataCallbackMap.onRouteItemClick}
          routeSegments={routeSegments}
          state={stateId != null ? highwayData.getState(stateId) : null}
        />
      </SidebarTab>
      <SidebarTab id="about" header="About HighwayVisualizer" icon={<Info size={ICON_SIZE} />}>
        <AboutContent />
      </SidebarTab>
    </Sidebar>
  );
};

export default RouteDrawer;
