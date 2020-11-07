import PropTypes from 'prop-types';
import React, { useState } from 'react';
import {
  Info, Map, Search, User,
} from 'react-feather';

import Highways from './Highways';
import Collapsible from './Collapsible';
import SearchResults from './SearchResults';
import Sidebar from './Sidebar';
import SidebarTab from './SidebarTab';

const MANUAL = 0, CLINCH = 1, KEY_ENTER = 13, ICON_SIZE = 16;

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
      <SidebarTab id="users" header="User Settings" icon={<User size={ICON_SIZE} />}>
        <div className="tabContent">
          { submitData && <h3>{submitData.message}</h3> }
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
          </Collapsible>
        </div>
      </SidebarTab>
      <SidebarTab id="segments" header="Segments" icon={<Map size={ICON_SIZE} />}>
        <div className="tabContent">
          <Collapsible title="States" open="true">
            <ul>
              { states ? states.map((state) => (
                <li
                  key={`state_${state.id}`}
                  className="clickable"
                  onClick={() => onStateClick(state.id)}
                  onKeyDown={(event) => {
                    if (event.keyCode === KEY_ENTER) {
                      onStateClick(state.id);
                    }
                  }}
                  role="presentation"
                >
                  {state.title}
                </li>
              )) : <h3>Loading...</h3>}
            </ul>
          </Collapsible>

          {/* List each route and all route segments */}
          <Collapsible title="Segments" open="true">
            <ul>
              { segments ? segments.map((segmentSet) => (
                <li
                  key={`${segmentSet[0].routeNum}${segmentSet[0].dir}_${segmentSet[0].type}`}
                  className="clickable"
                  onClick={(event) => onRouteItemClick(event, segmentSet[0])}
                  onKeyDown={(event) => {
                    if (event.keyCode === KEY_ENTER) {
                      onRouteItemClick(event, segmentSet[0]);
                    }
                  }}
                  role="presentation"
                >
                  {getRouteName(segmentSet[0])}
                  { segmentSet.length > 1 && (
                    <ul>
                      {segmentSet.map((segment, i) => (
                        <li
                          key={`segment-${segment.id}`}
                          className="clickable"
                          onClick={(event) => onSegmentItemClick(event, segment)}
                          onKeyDown={(event) => {
                            if (event.keyCode === KEY_ENTER) {
                              onSegmentItemClick(event, segment);
                            }
                          }}
                          role="presentation"
                        >
                          {`Segment ${i + 1}`}
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              )) : <h3>Loading...</h3>}
            </ul>
          </Collapsible>
        </div>
      </SidebarTab>
      <SidebarTab id="search" header="Search" icon={<Search size={ICON_SIZE} />}>
        <SearchResults
          getRouteName={getRouteName}
          onRouteItemClick={onRouteItemClick}
          segments={segments}
          stateTitle={stateId != null ? highwayData.getState(stateId).title : ''}
        />
      </SidebarTab>
      <SidebarTab id="about" header="About HighwayVisualizer" icon={<Info size={ICON_SIZE} />}>
        <div className="tabContent">
          <h3>About</h3>
          <p>
            HighwayVisualizer is a tool designed to render geodata of highway systems
            in the United States and to allow users to create and view segments of
            highways they have traveled on.
          </p>
          <h3>Note on Travel Mapping</h3>
          <p>
            Neither this project nor the developer(s) of HighwayVisualizer are affilated
            with the
            {' '}
            <a href="https://travelmapping.net/">Travel Mapping project</a>
            &nbsp;which serves a similar purpose.
          </p>
          <h3>Repository Info</h3>
          <p>
            The project&apos;s code repository and attributions may be found on&nbsp;
            <a href="https://github.com/IamTechknow/HighwayVisualizer">Github</a>
            .
          </p>
        </div>
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
  stateId: PropTypes.number,
  states: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.number.isRequired,
      identifier: PropTypes.string.isRequired,
      initials: PropTypes.string.isRequired,
      title: PropTypes.string.isRequired,
    }),
  ).isRequired,
  submitData: PropTypes.shape({
    message: PropTypes.string,
    success: PropTypes.bool,
  }),
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

RouteDrawer.defaultProps = {
  stateId: null,
  submitData: null,
};

export default RouteDrawer;
