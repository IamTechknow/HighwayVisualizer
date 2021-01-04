import React, { useState } from 'react';
import type { IHighways } from '../types/interfaces';
import type { SubmissionData, User as UserType, UserSegment } from '../types/types';
import { SegmentCreateMode } from '../types/enums';

import * as HighwayUtils from '../utils/HighwayUtils';
import Collapsible from './Collapsible';

interface Props {
  currMode: number,
  currUserId: number,
  highwayData: IHighways,
  onClinchToggleFor: (i: number) => void,
  onResetUserSegments: () => void,
  onSendUserSegments: () => void,
  onSetMode: (mode: SegmentCreateMode) => void,
  onUserChange: (event: React.ChangeEvent<HTMLSelectElement>) => void,
  onUserSubmit: (newUser: string) => void,
  submitData: SubmissionData | null,
  userSegments: Array<UserSegment>,
  users: Array<UserType>,
}

const UserSegmentContent = ({
  currMode,
  currUserId,
  highwayData,
  onClinchToggleFor,
  onResetUserSegments,
  onSendUserSegments,
  onSetMode,
  onUserChange,
  onUserSubmit,
  submitData,
  userSegments,
  users,
}: Props): React.ReactElement<Props> => {
  const [currNameInput, setNameInput] = useState<string>('');

  const getIdForUserSegment = (userSeg: UserSegment): string => {
    const { endId, segmentId, startId } = userSeg;
    return `userSeg-${segmentId}-${startId}-${endId}`;
  };

  const onUserNameChange = (event: React.ChangeEvent<HTMLInputElement>): void => {
    setNameInput(event.target.value);
  };

  const onFormSubmit = (event: React.FormEvent): void => {
    event.preventDefault();
    onUserSubmit(currNameInput);
  };

  return (
    <div className="tabContent">
      {submitData && <h3>{submitData.message}</h3>}
      <h3>
        {currMode === SegmentCreateMode.CLINCH ? 'Clinch Mode' : 'Create Mode'}
        <span className="segRow">
          <button type="button" onClick={() => onSetMode(SegmentCreateMode.MANUAL)}>Manual</button>
          <button type="button" onClick={() => onSetMode(SegmentCreateMode.CLINCH)}>Clinch</button>
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

      <Collapsible title="User Segments">
        <ul>
          {
            userSegments &&
            userSegments.map((userSeg: UserSegment, i: number): React.ReactNode => (
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
          disabled={currUserId < 0 || userSegments.length === 0}
          onClick={onSendUserSegments}
          type="button"
        >
          Submit User Segments
        </button>
        <button type="button" onClick={onResetUserSegments}>Clear User Segments</button>
      </Collapsible>
    </div>
  );
};

export default UserSegmentContent;
