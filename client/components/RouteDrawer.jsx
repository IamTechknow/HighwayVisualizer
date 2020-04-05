import PropTypes from 'prop-types';
import React, { useState } from 'react';
import { FiMap, FiSearch, FiUser } from 'react-icons/fi';

import Highways from './Highways';
import Collapsible from './Collapsible';
import SearchResults from './SearchResults';
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
  onRouteItemClick,
  onSegmentItemClick,
  onSendUserSegments,
  onSetMode,
  onStateClick,
  onUserChange,
  segments,
  stateId,
  states,
  submitData,
  userSegments,
  users,
}) => {
  const [isCollapsed, setCollapsed] = useState(false);
  const [selectedId, setSelectedId] = useState('segments');

  return (
    <Sidebar
      id="sidebar"
      collapsed={isCollapsed}
      selected={selectedId}
      onClose={() => setCollapsed(true)}
      onToggle={(id) => {
        if (selectedId === id) {
          setCollapsed(!isCollapsed);
        }
        if (isCollapsed) {
          setCollapsed(false);
        }
        setSelectedId(id);
      }}
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
              { users
                && users.map((user) => <option key={user.id} value={user.id}>{user.user}</option>)}
            </select>

            <form onSubmit={onFormSubmit}>
              <label htmlFor="userName" className="nameFormElement">
                Username
                <input type="text" id="userName" name="userName" className="nameFormElement" />
              </label>
              <br />
              <button type="submit">Create User</button>
              { currUserId >= 0
                && <a href={`/users/${users[currUserId - 1].user}`}>View Stats</a>}
            </form>
          </Collapsible>

          <Collapsible title="User Segments">
            <ul>
              {
                userSegments
                && userSegments.map((userSeg, i) => (
                  <div key={userSeg.toString()} className="userSegRow">
                    <li>
                      {`${Highways.getRoutePrefix(highwayData.segmentData[userSeg.segmentId].type)} ${userSeg.routeNum} Segment ${highwayData.getSegmentNum(userSeg.segmentId)}`}
                      <input type="checkbox" onClick={() => { onClinchToggleFor(i); }} />
                    </li>
                  </div>
                ))
              }
            </ul>

            { currUserId >= 0 && userSegments
              && <button type="button" onClick={onSendUserSegments}>Submit User Segments</button>}
            <button type="button" onClick={onResetUserSegments}>Clear User Segments</button>

            {
              submitData.success
              && <p>{`Successfully created ${submitData.entries} user segments`}</p>
            }
          </Collapsible>
        </div>
      </SidebarTab>
      <SidebarTab id="segments" header="Segments" icon={<FiMap />}>
        <div className="tabContent">
          <Collapsible title="States" open="true">
            <ul>
              { states && states.map((obj) => (
                <li
                  key={`state_${obj.id}`}
                  className="clickable"
                  onClick={() => onStateClick(obj.id)}
                >
                  {obj.name}
                </li>
              ))}
            </ul>
          </Collapsible>

          {/* List each route and all route segments */}
          <Collapsible title="Segments" open="true">
            <ul>
              { segments && segments.map((obj) => (
                <li
                  key={`${obj[0].routeNum}${obj[0].dir}_${obj[0].type}`}
                  className="clickable"
                  onClick={(event) => onRouteItemClick(event, obj[0])}
                >
                  {getRouteName(obj[0])}
                  { obj.length > 1 && (
                    <ul>
                      {obj.map((seg, i) => (
                        <li
                          key={`segment-${seg.id}`}
                          className="clickable"
                          onClick={(event) => onSegmentItemClick(event, seg.routeNum, seg.id)}
                        >
                          {`Segment ${i + 1}`}
                        </li>
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
        <SearchResults
          getRouteName={getRouteName}
          onRouteItemClick={onRouteItemClick}
          segments={segments}
          stateName={states[stateId - 1].name}
        />
      </SidebarTab>
    </Sidebar>
  );
};

RouteDrawer.propTypes = {
  currMode: PropTypes.number.isRequired,
  currUserId: PropTypes.number.isRequired,
  getRouteName: PropTypes.func.isRequired,
  highwayData: PropTypes.instanceOf(Highways).isRequired,
  onClinchToggleFor: PropTypes.func.isRequired,
  onFormSubmit: PropTypes.func.isRequired,
  onResetUserSegments: PropTypes.func.isRequired,
  onRouteItemClick: PropTypes.func.isRequired,
  onSegmentItemClick: PropTypes.func.isRequired,
  onSendUserSegments: PropTypes.func.isRequired,
  onSetMode: PropTypes.func.isRequired,
  onStateClick: PropTypes.func.isRequired,
  onUserChange: PropTypes.func.isRequired,
  segments: PropTypes.arrayOf(
    PropTypes.arrayOf(
      PropTypes.shape({
        id: PropTypes.number,
        dir: PropTypes.string,
        routeNum: PropTypes.string.isRequired,
        type: PropTypes.number.isRequired,
      }),
    ),
  ).isRequired,
  stateId: PropTypes.number.isRequired,
  states: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.number.isRequired,
      initials: PropTypes.string.isRequired,
      name: PropTypes.string.isRequired,
    }),
  ).isRequired,
  submitData: PropTypes.shape({
    entries: PropTypes.number,
    success: PropTypes.bool,
  }).isRequired,
  userSegments: PropTypes.arrayOf(
    PropTypes.shape({
      routeNum: PropTypes.string.isRequired,
      segmentId: PropTypes.number.isRequired,
    }),
  ).isRequired,
  users: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.number.isRequired,
      user: PropTypes.string.isRequired,
    }),
  ).isRequired,
};

export default RouteDrawer;
