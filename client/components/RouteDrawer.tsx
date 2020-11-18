import type { IHighways } from '../types/interfaces';
import type { State, Segment, SubmissionData, User as UserType, UserSegment } from '../types/types';
import { SegmentCreateMode } from '../types/enums';

import React, { useState } from 'react';
import {
  Info, Map, Search, User,
} from 'react-feather';

import * as HighwayUtils from '../utils/HighwayUtils';
import Collapsible from './Collapsible';
import SearchResults from './SearchResults';
import Sidebar from './Sidebar';
import SidebarTab from './SidebarTab';

const KEY_ENTER = 'Enter', ICON_SIZE = 16;

interface Props {
  currMode: number,
  currUserId: number,
  highwayData: IHighways,
  onClinchToggleFor: (i: number) => void,
  onResetUserSegments: () => void,
  onRouteItemClick: (event: React.SyntheticEvent, segmentOfRoute: Segment) => void,
  onSegmentItemClick: (event: React.SyntheticEvent, segment: Segment) => void,
  onSendUserSegments: () => void,
  onSetMode: (mode: SegmentCreateMode) => void,
  onStateClick: (stateId: number) => void,
  onUserChange: (event: React.ChangeEvent<HTMLSelectElement>) => void,
  onUserSubmit: (newUser: string) => void,
  segments: Array<Array<Segment>>,
  stateId: number | null,
  states: Array<State>,
  submitData: SubmissionData | null,
  userSegments: Array<UserSegment>,
  users: Array<UserType>,
}

const RouteDrawer = ({
  currMode,
  currUserId,
  highwayData,
  onClinchToggleFor,
  onResetUserSegments,
  onRouteItemClick,
  onSegmentItemClick,
  onSendUserSegments,
  onSetMode,
  onStateClick,
  onUserChange,
  onUserSubmit,
  segments,
  stateId = null,
  states,
  submitData = null,
  userSegments,
  users,
}: Props): React.ReactElement<Props> => {
  const [isCollapsed, setCollapsed] = useState<boolean>(false);
  const [currNameInput, setNameInput] = useState<string>("");
  const [selectedId, setSelectedId] = useState<string>('segments');

  const getIdForUserSegment = (userSeg: UserSegment): string => {
    const { endId, segmentId, startId } = userSeg;
    return `userSeg-${segmentId}-${startId}-${endId}`;
  }

  const onUserNameChange = (event: React.ChangeEvent<HTMLInputElement>): void => {
    setNameInput(event.target.value);
  }

  const onFormSubmit = (event: React.FormEvent): void => {
    event.preventDefault();
    onUserSubmit(currNameInput);
  }

  return (
    <Sidebar
      id="sidebar"
      collapsed={isCollapsed}
      selected={selectedId}
      onClose={(): void => setCollapsed(true)}
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
          {submitData && <h3>{submitData.message}</h3>}
          <h3>
            {currMode === SegmentCreateMode.CLINCH ? 'Clinch Mode' : 'Create Mode'}
            <span className="segRow">
              <button type="button" onClick={() => onSetMode(SegmentCreateMode.MANUAL)}>Manual</button>
              <button type="button" onClick={() => onSetMode(SegmentCreateMode.CLINCH)}>Clinch</button>
            </span>
          </h3>

          <Collapsible title="Users" open={true}>
            <select value={currUserId} onChange={onUserChange} className="nameFormElement">
              <option key={-1} value={-1}>Select or create User</option>
              {users
                && users.map((user) => <option key={user.id} value={user.id}>{user.user}</option>)}
            </select>

            <form onSubmit={onFormSubmit}>
              <label htmlFor="userName" className="nameFormElement">
                Username
                <input
                  className="nameFormElement"
                  id="userName"
                  onChange={onUserNameChange}
                  name="userName"
                  type="text"
                  value={currNameInput}
                />
              </label>
              <br />
              <button type="submit">Create User</button>
              {currUserId >= 0
                && <a href={`/users/${users[currUserId - 1].user}`}>View Stats</a>}
            </form>
          </Collapsible>

          <Collapsible title="User Segments">
            <ul>
              {
                userSegments
                && userSegments.map((userSeg: UserSegment, i: number): React.ReactNode => (
                  <div key={getIdForUserSegment(userSeg)} className="userSegRow">
                    <li>
                      {`${HighwayUtils.getRoutePrefix(highwayData.segmentData[userSeg.segmentId].type)} ${userSeg.routeNum} Segment ${highwayData.getSegmentNum(userSeg.segmentId)}`}
                      <input type="checkbox" onClick={(): void => { onClinchToggleFor(i); }} />
                    </li>
                  </div>
                ))
              }
            </ul>

            <button
              disabled={currUserId < 0 && userSegments.length === 0}
              onClick={onSendUserSegments}
              type="button">
              Submit User Segments
            </button>
            <button type="button" onClick={onResetUserSegments}>Clear User Segments</button>
          </Collapsible>
        </div>
      </SidebarTab>
      <SidebarTab id="segments" header="Segments" icon={<Map size={ICON_SIZE} />}>
        <div className="tabContent">
          <Collapsible title="States" open={true}>
            <ul>
              {states ? states.map((state: State): React.ReactNode => (
                <li
                  key={`state_${state.id}`}
                  className="clickable"
                  onClick={(): void => onStateClick(state.id)}
                  onKeyDown={(event: React.KeyboardEvent): void => {
                    if (event.key === KEY_ENTER) {
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
          <Collapsible title="Segments" open={true}>
            <ul>
              {stateId != null && segments ? segments.map((segmentSet: Array<Segment>): React.ReactNode => (
                <li
                  key={`${segmentSet[0].routeNum}${segmentSet[0].dir}_${segmentSet[0].type}`}
                  className="clickable"
                  onClick={(event: React.MouseEvent): void => onRouteItemClick(event, segmentSet[0])}
                  onKeyDown={(event: React.KeyboardEvent): void => {
                    if (event.key === KEY_ENTER) {
                      onRouteItemClick(event, segmentSet[0]);
                    }
                  }}
                  role="presentation"
                >
                  {HighwayUtils.getRouteName(segmentSet[0], highwayData.getState(stateId).identifier)}
                  { segmentSet.length > 1 && (
                    <ul>
                      {segmentSet.map((segment: Segment, i: number): React.ReactNode => (
                        <li
                          key={`segment-${segment.id}`}
                          className="clickable"
                          onClick={(event: React.MouseEvent): void => onSegmentItemClick(event, segment)}
                          onKeyDown={(event: React.KeyboardEvent): void => {
                            if (event.key === KEY_ENTER) {
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
          onRouteItemClick={onRouteItemClick}
          segments={segments}
          state={stateId != null ? highwayData.getState(stateId) : null}
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

export default RouteDrawer;
