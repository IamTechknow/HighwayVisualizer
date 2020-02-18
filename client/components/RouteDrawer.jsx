import PropTypes from 'prop-types';
import React, { useMemo, useState } from 'react';
import ReactDOM from 'react-dom';
import { FiMap, FiSearch, FiUser } from "react-icons/fi";

import Collapsible from './Collapsible';
import Sidebar from './Sidebar';
import SidebarTab from './SidebarTab';

const MANUAL = 0, CLINCH = 1;

const RouteDrawer = ({
  currMode,
  currUserId,
  getRouteName,
  highwayData,
  onClinchToggleFor,
  onFormSubmit,
  onResetUserSegments,
  onRouteClick,
  onSendUserSegments,
  onSetMode,
  onStateClick,
  onUserChange,
  routes,
  stateId,
  states,
  submitData,
  userSegments,
  users,
}) => {
  const [searchResults, setSearchResults] = useState([]);
  const [isCollapsed, setCollapsed] = useState(false);
  const [selectedId, setSelectedId] = useState('routes');
  const fullRoutes = useMemo(() => routes.flat().filter(routeObj => routeObj.seg === 0), [routes]);

  const onSearchRoutes = (event) => {
    const query = event.target.value;
    const dashSplit = query.split('-');
    const queries = dashSplit.length > 1 ? dashSplit : query.split(' ');
    const highwayClass = highwayData.getClassification(queries[0]);
    const routeNum = queries.length > 1 ?
      queries[queries.length - 1] :
      highwayClass === null && queries.length === 1 ? queries[0] : null;
    let filteredRoutes = fullRoutes;
    if (highwayClass !== null) {
      filteredRoutes = filteredRoutes.filter(
        routeObj => highwayData.getRoutePrefix(routeObj.route) === highwayClass
      );
    }
    const results =
      filteredRoutes.filter(routeObj => routeObj.route.indexOf(routeNum) >= 0);
    setSearchResults(results.slice(0, 30));
  };

  return (
    <Sidebar
      id="sidebar"
      collapsed={isCollapsed}
      selected={selectedId}
      onOpen={(id) => { setCollapsed(false); setSelectedId(id); }}
      onClose={() => setCollapsed(true)}
    >
      <SidebarTab id="users" header="User Settings" icon={<FiUser />}>
        <div className="tabContent">
          <h3>
            { currMode === CLINCH ? 'Clinch Mode' : 'Create Mode' }
            <span className="segRow">
              <button type="button" onClick={() => onSetMode(MANUAL)}>Manual</button>
              <button type="button" onClick={() => onSetMode(CLINCH)}>Clinch</button>
            </span>
          </h3>

          <Collapsible title="Users" open="true">
            <select value={currUserId} onChange={onUserChange} className="nameFormElement">
              <option key={-1} value={-1}>Select or create User</option>
              { users &&
                users.map((user) => (<option key={user.id} value={user.id}>{user.user}</option>))
              }
            </select>

            <form onSubmit={onFormSubmit}>
              <label htmlFor="userName" className="nameFormElement">
                Username
                <input type="text" id="userName" name="userName" className="nameFormElement" />
              </label>
              <br />
              <button type="submit">Create User</button>
              { currUserId >= 0 &&
                <a href={'/users/' + users[currUserId - 1].user}>View Stats</a>
              }
            </form>
          </Collapsible>

          <Collapsible title="User Segments">
            <ul>
              {
                userSegments &&
                userSegments.map((userSeg, i) => (
                  <div key={`userSegItem-${i}`} className="userSegRow">
                    <li>
                      {`${highwayData.getRoutePrefix(userSeg.route)} ${userSeg.route} Segment ${highwayData.getSegmentNum(userSeg.routeId)}`}
                      <input type="checkbox" onClick={() => {onClinchToggleFor(i);}}/>
                    </li>
                  </div>
                ))
              }
            </ul>

            { currUserId >= 0 && userSegments &&
              <button type="button" onClick={onSendUserSegments}>Submit User Segments</button>
            }
            <button type="button" onClick={onResetUserSegments}>Clear User Segments</button>

            {
              submitData.success &&
              <p>{`Successfully created ${submitData.entries} user segments`}</p>
            }
          </Collapsible>
        </div>
      </SidebarTab>
      <SidebarTab id="routes" header="Routes" icon={<FiMap />}>
        <div className="tabContent">
          <Collapsible title="States" open="true">
            <ul>
              { states && states.map(obj => (
                  <li key={obj.initials} className="clickable" onClick={() => {onStateClick(obj.id);}}>{obj.name}</li>
                ))
              }
            </ul>
          </Collapsible>

          {/* List each route and all route segments */}
          <Collapsible title="Routes" open="true">
            <ul>
              { routes && routes.map(obj => (
                <li key={`${obj[0].route}${obj[0].dir}`} className="clickable" onClick={(event) => {onRouteClick(event, obj[0].route, obj[0].route, obj[0].dir, true);}}>
                  {getRouteName(obj[0])}
                  { obj.length > 1 && (
                    <ul>
                      {obj.map((seg, i) => (
                        <li key={`segment-${seg.id}`} className="clickable" onClick={(event) => {onRouteClick(event, seg.route, seg.id, "", false);}}>{`Segment ${i + 1}`}</li>
                      ))}
                    </ul>
                  )}
                </li>
              ))}
            </ul>
          </Collapsible>
        </div>
      </SidebarTab>
      <SidebarTab id="search" header="Search" icon={<FiSearch />}>
        <div className="tabContent">
          <input type="text" size="50" className="nameFormElement" placeholder={`Search ${states[stateId - 1].name} routes by type and/or number...`} onChange={onSearchRoutes} />
          {
            !searchResults.length ?
            <div>
              <h3>Search hints:</h3>
              <ul>
                <li>Try typing a more of a route number to get more specific results</li>
                <li>To filter by Interstates and US Highways, type I or US and number separated by space or dash</li>
              </ul>
            </div>
            :
            <ul>
              {
                searchResults.map(obj => (
                  <li key={obj.id} className="clickable" onClick={(event) => {onRouteClick(event, obj.route, obj.route, obj.dir, true);}}>
                    {getRouteName(obj)}
                  </li>
                ))
              }
            </ul>
          }
        </div>
      </SidebarTab>
    </Sidebar>
  )
};

RouteDrawer.propTypes = {
  currMode: PropTypes.number.isRequired,
  currUserId: PropTypes.number,
  getRouteName: PropTypes.func.isRequired,
  highwayData: PropTypes.object,
  onClinchToggleFor: PropTypes.func.isRequired,
  onFormSubmit: PropTypes.func.isRequired,
  onResetUserSegments: PropTypes.func.isRequired,
  onRouteClick: PropTypes.func.isRequired,
  onSendUserSegments: PropTypes.func.isRequired,
  onSetMode: PropTypes.func.isRequired,
  onStateClick: PropTypes.func.isRequired,
  onUserChange: PropTypes.func.isRequired,
  routes: PropTypes.arrayOf(
    PropTypes.arrayOf(
      PropTypes.shape({
        id: PropTypes.number,
        dir: PropTypes.string,
        route: PropTypes.string.isRequired,
      }),
    ),
  ),
  stateId: PropTypes.number.isRequired,
  states: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.number.isRequired,
      initials: PropTypes.string.isRequired,
      name: PropTypes.string.isRequired,
    }),
  ),
  submitData: PropTypes.shape({
    entries: PropTypes.number,
    success: PropTypes.bool,
  }).isRequired,
  userSegments: PropTypes.arrayOf(
    PropTypes.shape({
      route: PropTypes.string.isRequired,
      routeId: PropTypes.number.isRequired,
    }),
  ),
  users: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.number.isRequired,
      user: PropTypes.string.isRequired,
    }),
  ),
};

export default RouteDrawer;
