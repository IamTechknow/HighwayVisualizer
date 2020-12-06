import type { IHighways } from '../types/interfaces';
import type { State, Segment, SubmissionData, User as UserType, UserSegment } from '../types/types';
import { SegmentCreateMode } from '../types/enums';

import React, { useState } from 'react';
import {
  Info, Map, Search, User,
} from 'react-feather';

import AboutContent from './AboutContent';
import SearchResults from './SearchResults';
import SegmentContent from './SegmentContent';
import Sidebar from './Sidebar';
import SidebarTab from './SidebarTab';
import UserSegmentContent from './UserSegmentContent';

const ICON_SIZE = 16;

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
  onUpdateState: (stateId: number) => void,
  onUserChange: (event: React.ChangeEvent<HTMLSelectElement>) => void,
  onUserSubmit: (newUser: string) => void,
  segments: Array<Array<Segment>>,
  stateId: number,
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
  onUpdateState,
  onUserChange,
  onUserSubmit,
  segments,
  stateId,
  states,
  submitData = null,
  userSegments,
  users,
}: Props): React.ReactElement<Props> => {
  const [isCollapsed, setCollapsed] = useState<boolean>(false);
  const [selectedId, setSelectedId] = useState<string>('segments');

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
        <UserSegmentContent
          currMode={currMode}
          currUserId={currUserId}
          highwayData={highwayData}
          onClinchToggleFor={onClinchToggleFor}
          onResetUserSegments={onResetUserSegments}
          onSendUserSegments={onSendUserSegments}
          onSetMode={onSetMode}
          onUserChange={onUserChange}
          onUserSubmit={onUserSubmit}
          submitData={submitData}
          userSegments={userSegments}
          users={users}
        />
      </SidebarTab>
      <SidebarTab id="segments" header="Segments" icon={<Map size={ICON_SIZE} />}>
        <SegmentContent
          highwayData={highwayData}
          onRouteItemClick={onRouteItemClick}
          onSegmentItemClick={onSegmentItemClick}
          onUpdateState={onUpdateState}
          segments={segments}
          stateId={stateId}
          states={states}
        />
      </SidebarTab>
      <SidebarTab id="search" header="Search" icon={<Search size={ICON_SIZE} />}>
        <SearchResults
          onRouteItemClick={onRouteItemClick}
          segments={segments}
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
