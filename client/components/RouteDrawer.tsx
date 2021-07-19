import React, { useState } from 'react';
import {
  ArrowLeft, Info, Map, Search, User,
} from 'react-feather';
import {
  HashRouter, Link, Route, Switch, useLocation,
} from 'react-router-dom';
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
// import Sidebar from './Sidebar';
// import SidebarTab from './SidebarTab';
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
  const { hash } = useLocation();

  const _onClose = () => {
    setCollapsed(true);
  };

  const _onToggle = (activeHash: string) => {
    if (hash === activeHash) {
      setCollapsed(!isCollapsed);
    }
    if (isCollapsed) {
      setCollapsed(false);
    }
  };

  const collapsedClass = isCollapsed ? 'collapsed' : '';

  const routes = [
    {
      Content: () => (
        <TravelSegmentContent
          highwayData={highwayData}
          userData={userData}
          userDataCallbackMap={userDataCallbackMap}
        />
      ),
      Icon: () => <User size={ICON_SIZE} />,
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
      Icon: () => <Map size={ICON_SIZE} />,
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
      Icon: () => <Search size={ICON_SIZE} />,
      activeHash: '#search',
      header: 'Search',
      path: '/search',
    },
    {
      Content: () => <AboutContent />,
      Icon: () => <Info size={ICON_SIZE} />,
      activeHash: '#about',
      header: 'About HighwayVisualizer',
      path: '/about',
    },
  ];

  return (
    <HashRouter hashType="noslash">
      <div className={`leaflet-sidebar leaflet-touch leaflet-sidebar-left ${collapsedClass}`}>
        <div className="leaflet-sidebar-tabs">
          <ul role="tablist">
            {
              routes.map(({ Icon, activeHash, path }) => (
                <li
                  className={hash === activeHash ? 'active' : ''}
                  key={path}
                  onClick={() => _onToggle(activeHash)}
                  onKeyDown={() => _onToggle(activeHash)}
                  role="tab"
                >
                  <Link to={path}><Icon /></Link>
                </li>
              ))
            }
          </ul>
        </div>
        <div className="leaflet-sidebar-content">
          <Switch>
            {
              routes.map(({
                Content, exact, header, path,
              }) => (
                <Route
                  key={path}
                  path={path}
                  exact={exact}
                >
                  <div className="leaflet-sidebar-pane active">
                    <h1 className="leaflet-sidebar-header">
                      {header}
                      <div
                        className="leaflet-sidebar-close leaflet-sidebar-close-offset"
                        onClick={_onClose}
                        onKeyDown={_onClose}
                        role="button"
                        tabIndex={-1}
                      >
                        <ArrowLeft />
                      </div>
                    </h1>
                    <Content />
                  </div>
                </Route>
              ))
            }
          </Switch>
        </div>
      </div>
    </HashRouter>
  );
};

export default RouteDrawer;
