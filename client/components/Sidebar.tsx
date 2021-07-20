import React, { useState } from 'react';
import {
  ArrowLeft, Icon,
} from 'react-feather';
import {
  HashRouter, Link, Route, Switch, useLocation,
} from 'react-router-dom';

const KEY_ENTER = 'Enter';

interface Props {
  routes: Array<SidebarRoute>,
}

export interface SidebarRoute {
  Content: React.FC,
  FeatherIcon: Icon,
  activeHash: string,
  exact?: boolean,
  header: string,
  path: string,
}

// Sidebar implementation for leaflet-sidebar-v2 with react-router-dom
// Renders HTML with defined CSS classes, does not use Sidebar JS modules
const Sidebar = ({
  routes,
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

  const collapsedClass = isCollapsed ? 'collapsed' : '';

  return (
    <HashRouter hashType="noslash">
      <div className={`leaflet-sidebar leaflet-touch leaflet-sidebar-left ${collapsedClass}`}>
        <div className="leaflet-sidebar-tabs">
          <ul role="tablist">
            {
              routes.map(({ FeatherIcon, activeHash, path }) => (
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
                  <Link to={path}><FeatherIcon /></Link>
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

export default Sidebar;
