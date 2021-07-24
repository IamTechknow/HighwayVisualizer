import React, { useState } from 'react';
import { ArrowLeft } from 'react-feather';
import {
  HashRouter, Link, Route, Switch, useLocation,
} from 'react-router-dom';
import type { Props as SidebarTabProps } from './SidebarTab';

const KEY_ENTER = 'Enter';

interface Props {
  children: React.ReactElement<SidebarTabProps> | React.ReactElement<SidebarTabProps>[],
}

// Sidebar implementation for leaflet-sidebar-v2 with react-router-dom
// Renders HTML with defined CSS classes, does not use Sidebar JS modules
const Sidebar = ({
  children,
}: Props): React.ReactElement<Props> => {
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

  const _renderTabRoute = (tab: React.ReactElement<SidebarTabProps>): React.ReactElement<Route> => {
    const { props } = tab;
    const {
      children: tabChildren, exact, header, path,
    } = props;
    return (
      <Route
        key={path}
        path={path}
        exact={exact}
        render={() => (
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
        )}
      />
    );
  };

  const _renderTab = (
    tab: React.ReactElement<SidebarTabProps>,
  ): React.ReactElement<HTMLLIElement> => {
    const { props } = tab;
    const { activeHash, icon, path } = props;
    return (
      <li
        className={hash === activeHash ? 'active' : ''}
        key={path}
        onClick={() => _onToggle(activeHash)}
        onKeyDown={(event: React.KeyboardEvent) => {
          if (event.key === KEY_ENTER) {
            _onToggle(activeHash);
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
    <HashRouter hashType="noslash">
      <div className={`leaflet-sidebar leaflet-touch leaflet-sidebar-left${collapsedClass}`}>
        <div className="leaflet-sidebar-tabs">
          <ul role="tablist">
            {React.Children.map(children, _renderTab)}
          </ul>
        </div>
        <div className="leaflet-sidebar-content">
          <Switch>{React.Children.map(children, _renderTabRoute)}</Switch>
        </div>
      </div>
    </HashRouter>
  );
};

export default Sidebar;
