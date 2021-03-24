import React, { useState } from 'react';
import type { IHighways } from '../types/interfaces';
import type { SubmissionData, User as UserType, TravelSegment } from '../types/types';
import { TravelSegmentCreateMode } from '../types/enums';

import * as HighwayUtils from '../utils/HighwayUtils';
import Collapsible from './Collapsible';

interface Props {
  currMode: number,
  currUserId: number,
  highwayData: IHighways,
  onClinchToggleFor: (i: number) => void,
  onResetTravelSegments: () => void,
  onSendTravelSegments: () => void,
  onSetMode: (mode: TravelSegmentCreateMode) => void,
  onUserChange: (event: React.ChangeEvent<HTMLSelectElement>) => void,
  onUserSubmit: (newUser: string) => void,
  submitData: SubmissionData | null,
  travelSegments: Array<TravelSegment>,
  users: Array<UserType>,
}

const TravelSegmentContent = ({
  currMode,
  currUserId,
  highwayData,
  onClinchToggleFor,
  onResetTravelSegments,
  onSendTravelSegments,
  onSetMode,
  onUserChange,
  onUserSubmit,
  submitData,
  travelSegments,
  users,
}: Props): React.ReactElement<Props> => {
  const [currNameInput, setNameInput] = useState<string>('');

  const getIdForTravelSegment = (travelSeg: TravelSegment): string => {
    const { endId, routeSegmentId, startId } = travelSeg;
    return `travelSeg-${routeSegmentId}-${startId}-${endId}`;
  };

  const onUserNameChange = (event: React.ChangeEvent<HTMLInputElement>): void => {
    setNameInput(event.target.value);
  };

  const onFormSubmit = (event: React.FormEvent): void => {
    event.preventDefault();
    onUserSubmit(currNameInput);
  };

  const getTravelSegmentTitle = (travelSeg: TravelSegment) => {
    const { routeSegmentId, routeNum } = travelSeg;
    const prefix = HighwayUtils.getRoutePrefix(highwayData.routeSegmentData[routeSegmentId].type);
    return `${prefix} ${routeNum} Segment ${highwayData.getRouteSegmentNum(routeSegmentId)}`;
  };

  const travelSegmentsInState = travelSegments.filter(
    (travelSeg: TravelSegment) => travelSeg.routeSegmentId in highwayData.routeSegmentData,
  );

  return (
    <div className="tabContent">
      {submitData && <h3>{submitData.message}</h3>}
      <h3>
        {currMode === TravelSegmentCreateMode.CLINCH ? 'Clinch Mode' : 'Create Mode'}
        <span className="segRow">
          <button type="button" onClick={() => onSetMode(TravelSegmentCreateMode.MANUAL)}>Manual</button>
          <button type="button" onClick={() => onSetMode(TravelSegmentCreateMode.CLINCH)}>Clinch</button>
        </span>
      </h3>

      <Collapsible title="Users" open>
        <select value={currUserId} onChange={onUserChange} className="nameFormElement">
          <option key={-1} value={-1}>Select or create User</option>
          {users &&
            users.map((user) => <option key={user.id} value={user.id}>{user.user}</option>)}
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
          {currUserId >= 0 &&
            (
              <a
                href={`/users/${users[currUserId - 1].user}`}
                rel="noopener noreferrer"
              >
                View Stats
              </a>
            )}
        </form>
      </Collapsible>

      <Collapsible title="Travel Segments" open>
        {
          travelSegmentsInState.length > 0
            ? (
              <ul>
                {
                  travelSegmentsInState.map((
                    travelSeg: TravelSegment,
                    i: number,
                  ): React.ReactNode => {
                    const travelSegKey = getIdForTravelSegment(travelSeg);
                    return (
                      <div key={travelSegKey} className="travelSegRow">
                        <li>
                          <label className="clickable" htmlFor={travelSegKey}>
                            {getTravelSegmentTitle(travelSeg)}
                          </label>
                          <input
                            id={travelSegKey}
                            type="checkbox"
                            onClick={(): void => { onClinchToggleFor(i); }}
                          />
                        </li>
                      </div>
                    );
                  })
                }
              </ul>
            ) : <h3>No unsubmitted travel segments in current state</h3>
        }

        <button
          disabled={currUserId < 0 || travelSegments.length === 0}
          onClick={onSendTravelSegments}
          type="button"
        >
          Submit Travel Segments
        </button>
        <button type="button" onClick={onResetTravelSegments}>Clear Travel Segments</button>
      </Collapsible>
    </div>
  );
};

export default TravelSegmentContent;
