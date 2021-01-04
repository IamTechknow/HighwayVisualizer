import React, { useEffect, useState } from 'react';
import { User } from 'react-feather';
import {
  MapContainer, TileLayer, Polyline, PolylineProps,
} from 'react-leaflet';

import { RouteComponentProps } from 'react-router';
import type { UserRouteProps, UserStatSegment, UserStatsAPIPayload } from '../types/types';

import APIClient from './APIClient';
import { stringifyUserSegment } from '../utils/HighwayUtils';
import Sidebar from './Sidebar';
import SidebarTab from './SidebarTab';

const METERS = 1.000, KM = 1000.000, MILES = 1609.344;

const UserApp = ({ match }: RouteComponentProps<UserRouteProps>): React.ReactElement => {
  const [isCollapsed, setCollapsed] = useState(false);
  const [scale, setScale] = useState(MILES);
  const [selectedId, setSelectedId] = useState('users');
  const [userStats, setUserStats] = useState<UserStatsAPIPayload | undefined>();

  const onSidebarToggle = (id: string): void => {
    if (selectedId === id) {
      setCollapsed(!isCollapsed);
    }
    if (isCollapsed) {
      setCollapsed(false);
    }
    setSelectedId(id);
  };

  const getUnit = (scaleNum: number): string => {
    if (scaleNum === METERS) {
      return 'meters';
    }
    return scaleNum === KM ? 'km' : 'mi';
  };

  useEffect((): void => {
    APIClient.getUserStats(match.params.user)
      .then((result: UserStatsAPIPayload): void => {
        setUserStats(result);
      });
  }, []);

  if (userStats == null || !userStats.loaded) {
    return (
      <div>
        <h3>{`Getting ${match.params.user}'s segments...`}</h3>
      </div>
    );
  }
  const { notFound, stats, userSegments } = userStats;

  if (notFound) {
    return (
      <div>
        <h3>
          {`No segments found for ${match.params.user}. Either create the user or submit segments `}
          <a href="/">here.</a>
        </h3>
      </div>
    );
  }

  return (
    <div>
      <MapContainer className="mapStyle" center={userSegments[0].points[0]} zoom={7} zoomControl={false}>
        <TileLayer
          attribution='&copy; <a href="https://osm.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.osm.org/{z}/{x}/{y}.png"
        />

        {userSegments && userSegments.map(
          (userSeg: UserStatSegment): React.ReactElement<PolylineProps> => (
            <Polyline
              key={stringifyUserSegment(userSeg)}
              positions={userSeg.points ?? []}
              color={userSeg.clinched ? 'lime' : 'yellow'}
            />
          ),
        )}
      </MapContainer>
      <Sidebar
        id="sidebar"
        collapsed={isCollapsed}
        selected={selectedId}
        onClose={() => setCollapsed(true)}
        onToggle={(id) => onSidebarToggle(id)}
      >
        <SidebarTab id="users" header="User Stats" icon={<User size={16} />}>
          <div id="tabContent">
            <h3>{`${match.params.user}'s traveling statistics`}</h3>

            <p>Unit conversion</p>
            <select onChange={(event) => setScale(Number.parseFloat(event.target.value))}>
              <option value={METERS}>Meters</option>
              <option value={KM}>Kilometers</option>
              <option value={MILES}>Miles</option>
            </select>

            <table>
              <thead>
                <tr>
                  <th>State</th>
                  <th>Route</th>
                  <th>Segment</th>
                  <th>{`Traveled (${getUnit(scale)})`}</th>
                  <th>{`Total (${getUnit(scale)})`}</th>
                  <th>Percentage</th>
                </tr>
              </thead>
              <tbody>
                {
                  stats.map((stat) => (
                    <tr key={`${stat.state}_${stat.route}_${stat.segment}`}>
                      <td>{stat.state}</td>
                      <td>{stat.route}</td>
                      <td>{stat.segment}</td>
                      <td>{(stat.traveled / scale).toFixed(2)}</td>
                      <td>{(stat.total / scale).toFixed(2)}</td>
                      <td>
                        {stat.percentage}
                        %
                      </td>
                    </tr>
                  ))
                }
              </tbody>
            </table>
          </div>
        </SidebarTab>
      </Sidebar>
    </div>
  );
};

export default UserApp;
