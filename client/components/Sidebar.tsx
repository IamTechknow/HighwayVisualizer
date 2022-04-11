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

const _renderTabRoute = (
  tab: ReactElement<SidebarTabProps>,
  onClose: () => void,
): ReactElement<typeof Route> => {
  const { props } = tab;
  const {
    children: tabChildren, header, linkPath, path,
  } = props;
  return (
    <Route
      key={linkPath ?? path}
      path={linkPath ?? path}
      element={
        (
          <div className="leaflet-sidebar-pane active">
            <h1 className="leaflet-sidebar-header">
              {header}
              <div
                className="leaflet-sidebar-close leaflet-sidebar-close-offset"
                onClick={onClose}
                onKeyDown={onClose}
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
  pathname: string,
  onToggle: (activePath: string) => void,
): ReactElement<HTMLLIElement> => {
  const { props } = tab;
  const { icon, linkPath, path } = props;
  return (
    <li
      className={pathname === `/${path}` ? 'active' : ''}
      key={path}
      onClick={() => onToggle(path)}
      onKeyDown={(event: React.KeyboardEvent) => {
        if (event.key === KEY_ENTER) {
          onToggle(path);
        }
      }}
      role="tab"
    >
      <Link to={linkPath ?? path}>{icon}</Link>
    </li>
  );
};

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

  const collapsedClass = isCollapsed ? ' collapsed' : '';

  return (
    <div className={`leaflet-sidebar leaflet-touch leaflet-sidebar-left${collapsedClass}`}>
      <div className="leaflet-sidebar-tabs">
        <ul role="tablist">
          {Array.isArray(children)
            ? children.map((
              tab: ReactElement<SidebarTabProps>,
            ) => _renderTab(tab, pathname, _onToggle))
            : _renderTab(children, pathname, _onToggle)}
        </ul>
      </div>
      <div className="leaflet-sidebar-content">
        <Routes>
          {Array.isArray(children)
            ? children.map((tab: ReactElement<SidebarTabProps>) => _renderTabRoute(tab, _onClose))
            : _renderTabRoute(children, _onClose)}
        </Routes>
      </div>
    </div>
  );
};

export default Sidebar;
