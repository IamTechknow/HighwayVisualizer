import React, { useState } from 'react';
import {
  Info, Map, Search, User,
} from 'react-feather';
import type { IHighways } from '../types/interfaces';
import type {
  State, RouteSegment, SubmissionData, User as UserType, TravelSegment,
} from '../types/types';
import { TravelSegmentCreateMode } from '../types/enums';

import AboutContent from './AboutContent';
import SearchResults from './SearchResults';
import RouteSegmentContent from './RouteSegmentContent';
import Sidebar from './Sidebar';
import SidebarTab from './SidebarTab';
import TravelSegmentContent from './TravelSegmentContent';

const ICON_SIZE = 16;

interface Props {
  currMode: number,
  currUserId: number,
  highwayData: IHighways,
  onClinchToggleFor: (i: number) => void,
  onResetTravelSegments: () => void,
  onRouteItemClick: (event: React.SyntheticEvent, segmentOfRoute: RouteSegment) => void,
  onRouteSegmentItemClick: (event: React.SyntheticEvent, routeSegment: RouteSegment) => void,
  onSendTravelSegments: () => void,
  onSetMode: (mode: TravelSegmentCreateMode) => void,
  onUpdateState: (stateId: number) => void,
  onUserChange: (event: React.ChangeEvent<HTMLSelectElement>) => void,
  onUserSubmit: (newUser: string) => void,
  routeSegments: Array<Array<RouteSegment>>,
  stateId: number,
  states: Array<State>,
  submitData: SubmissionData | null,
  travelSegments: Array<TravelSegment>,
  users: Array<UserType>,
}

const RouteDrawer = ({
  currMode,
  currUserId,
  highwayData,
  onClinchToggleFor,
  onResetTravelSegments,
  onRouteItemClick,
  onRouteSegmentItemClick,
  onSendTravelSegments,
  onSetMode,
  onUpdateState,
  onUserChange,
  onUserSubmit,
  routeSegments,
  stateId,
  states,
  submitData = null,
  travelSegments,
  users,
}: Props): React.ReactElement<Props> => {
  const [isCollapsed, setCollapsed] = useState<boolean>(false);
  const [selectedId, setSelectedId] = useState<string>('routeSegments');

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
        <TravelSegmentContent
          currMode={currMode}
          currUserId={currUserId}
          highwayData={highwayData}
          onClinchToggleFor={onClinchToggleFor}
          onResetTravelSegments={onResetTravelSegments}
          onSendTravelSegments={onSendTravelSegments}
          onSetMode={onSetMode}
          onUserChange={onUserChange}
          onUserSubmit={onUserSubmit}
          submitData={submitData}
          travelSegments={travelSegments}
          users={users}
        />
      </SidebarTab>
      <SidebarTab id="routeSegments" header="Route Segments" icon={<Map size={ICON_SIZE} />}>
        <RouteSegmentContent
          highwayData={highwayData}
          onRouteItemClick={onRouteItemClick}
          onRouteSegmentItemClick={onRouteSegmentItemClick}
          onUpdateState={onUpdateState}
          routeSegments={routeSegments}
          stateId={stateId}
          states={states}
        />
      </SidebarTab>
      <SidebarTab id="search" header="Search" icon={<Search size={ICON_SIZE} />}>
        <SearchResults
          onRouteItemClick={onRouteItemClick}
          routeSegments={routeSegments}
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
