/* eslint-disable no-nested-ternary */
import PropTypes from 'prop-types';
import React, { useEffect, useState } from 'react';
import { FiUser } from 'react-icons/fi';
import { Map, TileLayer, Polyline } from 'react-leaflet';

import Sidebar from './Sidebar';
import SidebarTab from './SidebarTab';

const METERS = 1.000, KM = 1000.000, MILES = 1609.344;

const UserApp = ({ match }) => {
  const [isCollapsed, setCollapsed] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [scale, setScale] = useState(MILES);
  const [selectedId, setSelectedId] = useState('users');
  const [stats, setStats] = useState([]);
  const [userSegments, setUserSegments] = useState([]);

  const getUserSegmentsFor = (userId) => fetch(`/api/user_segments/${userId}`)
    .then((res) => res.json());

  const onSidebarToggle = (id) => {
    if (selectedId === id) {
      setCollapsed(!isCollapsed);
    }
    if (isCollapsed) {
      setCollapsed(false);
    }
    setSelectedId(id);
  };

  useEffect(() => {
    getUserSegmentsFor(match.params.user).then((result) => {
      // Update boolean variables last because this is not simultaneous state update
      setUserSegments(result.userSegments);
      setStats(result.stats);
      setNotFound(result.notFound);
      setLoaded(result.loaded);
    });
  }, []);

  if (!loaded) {
    return (
      <div>
        <h3>{`Getting ${match.params.user}'s segments...`}</h3>
      </div>
    );
  }

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
      <Map className="mapStyle" center={userSegments[0].points[0]} zoom={7} zoomControl={false}>
        <TileLayer
          attribution='&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
          url="http://{s}.tile.osm.org/{z}/{x}/{y}.png"
        />

        { userSegments && userSegments.map((userSeg) => (
          <Polyline
            key={userSeg.toString()}
            positions={userSeg.points}
            color={userSeg.clinched ? 'lime' : 'yellow'}
          />
        ))}
      </Map>
      <Sidebar
        id="sidebar"
        collapsed={isCollapsed}
        selected={selectedId}
        onClose={() => setCollapsed(true)}
        onToggle={(id) => onSidebarToggle(id)}
      >
        <SidebarTab id="users" header="User Stats" icon={<FiUser />}>
          <div id="tabContent">
            <h3>{`${match.params.user}'s traveling statistics`}</h3>

            <p>Unit conversion</p>
            <select onChange={(event) => setScale(Number.parseFloat(event.target.value, 10))}>
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
                  <th>{`Traveled (${scale === METERS ? 'meters' : scale === KM ? 'km' : 'mi'})`}</th>
                  <th>{`Total (${scale === METERS ? 'meters' : scale === KM ? 'km' : 'mi'})`}</th>
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

UserApp.propTypes = {
  match: PropTypes.shape({
    params: PropTypes.shape({
      user: PropTypes.string.isRequired,
    }).isRequired,
  }).isRequired,
};

export default UserApp;
