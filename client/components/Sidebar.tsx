import React, { useState } from 'react';
import { ArrowLeft } from 'react-feather';
import {
  Link, Route, Routes, useLocation,
} from 'react-router-dom';
import type { ReactElement } from 'react';
import type { Props as SidebarTabProps } from './SidebarTab';

const KEY_ENTER = 'Enter';

interface Props {
  children: ReactElement<SidebarTabProps> | ReactElement<SidebarTabProps>[],
}

// Sidebar implementation for leaflet-sidebar-v2 with react-router-dom
// Renders HTML with defined CSS classes, does not use Sidebar JS modules
const Sidebar = ({
  children,
}: Props): ReactElement<Props> => {
  const [isCollapsed, setCollapsed] = useState<boolean>(false);
  const { pathname } = useLocation();

  const _onClose = () => {
    setCollapsed(true);
  };

  const _onToggle = (activePath: string) => {
    if (pathname === `/${activePath}`) {
      setCollapsed(!isCollapsed);
    }
    if (isCollapsed) {
      setCollapsed(false);
    }
  };

  const _renderTabRoute = (tab: ReactElement<SidebarTabProps>): ReactElement<typeof Route> => {
    const { props } = tab;
    const {
      children: tabChildren, header, path,
    } = props;
    return (
      <Route
        key={path}
        path={path}
        element={
          (
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
              {tabChildren}
            </div>
          )
        }
      />
    );
  };

  const _renderTab = (
    tab: ReactElement<SidebarTabProps>,
  ): ReactElement<HTMLLIElement> => {
    const { props } = tab;
    const { icon, path } = props;
    return (
      <li
        className={pathname === `/${path}` ? 'active' : ''}
        key={path}
        onClick={() => _onToggle(path)}
        onKeyDown={(event: React.KeyboardEvent) => {
          if (event.key === KEY_ENTER) {
            _onToggle(path);
          }
        }}
        role="tab"
      >
        <Link to={path}>{icon}</Link>
      </li>
    );
  };

  const collapsedClass = isCollapsed ? ' collapsed' : '';

  return (
    <div className={`leaflet-sidebar leaflet-touch leaflet-sidebar-left${collapsedClass}`}>
      <div className="leaflet-sidebar-tabs">
        <ul role="tablist">
          {React.Children.map(children, _renderTab)}
        </ul>
      </div>
      <div className="leaflet-sidebar-content">
        <Routes>{React.Children.map(children, _renderTabRoute)}</Routes>
      </div>
    </div>
  );
};

export default Sidebar;
