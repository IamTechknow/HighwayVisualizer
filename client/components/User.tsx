import React, { useEffect, useState } from 'react';
import { User } from 'react-feather';
import {
  MapContainer, TileLayer, Polyline, PolylineProps,
} from 'react-leaflet';

import { RouteComponentProps } from 'react-router';
import type { UserProps, TravelStatSegment, TravelStatsAPIPayload } from '../types/types';

import APIClient from './APIClient';
import { stringifyTravelSegment } from '../utils/HighwayUtils';
import Sidebar from './Sidebar';
import SidebarTab from './SidebarTab';

const METERS = 1.000, KM = 1000.000, MILES = 1609.344;

const UserApp = ({ match }: RouteComponentProps<UserProps>): React.ReactElement => {
  const [isCollapsed, setCollapsed] = useState(false);
  const [scale, setScale] = useState(MILES);
  const [selectedId, setSelectedId] = useState('users');
  const [userTravelStats, setUserTravelStats] = useState<TravelStatsAPIPayload | undefined>();

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
    APIClient.getTravelStats(match.params.user)
      .then((result: TravelStatsAPIPayload): void => {
        setUserTravelStats(result);
      });
  }, []);

  if (userTravelStats == null || !userTravelStats.loaded) {
    return (
      <div>
        <h3>{`Getting ${match.params.user}'s travel segments...`}</h3>
      </div>
    );
  }
  const { notFound, travelStats, travelSegments } = userTravelStats;

  if (notFound) {
    return (
      <div>
        <h3>
          {`No travel segments found for ${match.params.user}. Either create the user or submit travel segments `}
          <a href="/">here.</a>
        </h3>
      </div>
    );
  }

  return (
    <div>
      <MapContainer className="mapStyle" center={travelSegments[0].points[0]} zoom={7} zoomControl={false}>
        <TileLayer
          attribution='&copy; <a href="https://osm.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.osm.org/{z}/{x}/{y}.png"
        />

        {travelSegments && travelSegments.map(
          (travelSeg: TravelStatSegment): React.ReactElement<PolylineProps> => (
            <Polyline
              key={stringifyTravelSegment(travelSeg)}
              positions={travelSeg.points ?? []}
              color={travelSeg.clinched ? 'lime' : 'yellow'}
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
        <SidebarTab id="users" header="Travel Stats" icon={<User size={16} />}>
          <div id="tabContent">
            <h3>{`${match.params.user}'s travel statistics`}</h3>

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
                  <th>Route Segment</th>
                  <th>{`Traveled (${getUnit(scale)})`}</th>
                  <th>{`Total (${getUnit(scale)})`}</th>
                  <th>Percentage</th>
                </tr>
              </thead>
              <tbody>
                {
                  travelStats.map((stat) => (
                    <tr key={`${stat.state}_${stat.route}_${stat.routeSegment}`}>
                      <td>{stat.state}</td>
                      <td>{stat.route}</td>
                      <td>{stat.routeSegment}</td>
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
