import PropTypes from 'prop-types';
import React from 'react';
import ReactDOM from 'react-dom';
import { FiUser } from "react-icons/fi";
import { Map, TileLayer, Polyline } from 'react-leaflet';

import Highways from './Highways';
import Sidebar from './Sidebar';
import SidebarTab from './SidebarTab';

const METERS = 1.000, KM = 1000.000, MILES = 1609.344;

export default class UserApp extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      isCollapsed: false,
      loaded: false,
      notFound: false,
      stats: [],
      scale: MILES,
      userSegments: undefined  
    };

    this.onScaleChange = this.onScaleChange.bind(this);
  }

  static getUserSegmentsFor(userId) {
    return fetch(`/api/user_segments/${userId}`)
      .then(res => res.json());
  }

  componentDidMount() {
    return UserApp.getUserSegmentsFor(this.props.match.params.user)
      .then(result => {
        this.setState(result); // Data shape from endpoint matches that of the component state
      });
  }

  onScaleChange(event) {
    this.setState({ scale: Number.parseFloat(event.target.value) });
  }

  onSidebarClose() {
    this.setState({ isCollapsed: true });
  }

  onSidebarOpen(id) {
    this.setState({
      isCollapsed: false,
      selectedId: id,
    });
  }

  render() {
    const { isCollapsed, loaded, notFound, scale, stats, userSegments } = this.state;
    const user = this.props.match.params.user;
    const highwayUtils = new Highways();
    highwayUtils.buildCacheFor(0);

    if (!loaded) {
      return (
        <div>
          <h3>{`Getting ${user}\'s segments...`}</h3>
        </div>
      );
    }

    if (notFound) {
      return (
        <div>
          <h3>
            {`No segments found for ${user}. Either create the user or submit segments `}
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
            url='http://{s}.tile.osm.org/{z}/{x}/{y}.png'
          />

          { userSegments &&
            userSegments.map((userSeg, i) => <Polyline key={`userSeg-${i}`} positions={userSeg.points} color={ userSeg.clinched ? "lime" : "yellow" } /> )
          }
        </Map>
        <Sidebar
          id="sidebar"
          collapsed={isCollapsed}
          selected="users"
          onOpen={this.onSidebarOpen.bind(this)}
          onClose={this.onSidebarClose.bind(this)}
        >
          <SidebarTab id="users" header="User Stats" icon={<FiUser />}>
            <div id="tabContent">
              <h3>{`${user}\'s traveling statistics`}</h3>

              <p>Unit conversion</p>
              <select onChange={this.onScaleChange}>
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
                    <th>{`Traveled (${ scale === METERS ? 'meters' : scale === KM ? 'km' : 'mi' })`}</th>
                    <th>{`Total (${ scale === METERS ? 'meters' : scale === KM ? 'km' : 'mi' })`}</th>
                    <th>Percentage</th>
                  </tr>
                </thead>
                <tbody>
                  {
                    stats.map((stat) => {
                      const traveledStat = (stat.traveled / scale).toFixed(2);
                      const totalStat = (stat.total / scale).toFixed(2);
                      return (
                        <tr key={`${stat.state}_${stat.route}_${stat.segment}`}>
                          <td>{stat.state}</td>
                          <td>{stat.route}</td>
                          <td>{stat.segment}</td>
                          <td>{traveledStat}</td>
                          <td>{totalStat}</td>
                          <td>{stat.percentage}%</td>
                        </tr>
                      );
                    })
                  }
                </tbody>
              </table>
            </div>
          </SidebarTab>
        </Sidebar>
      </div>
    );
  }
}

UserApp.propTypes = {
  match: PropTypes.shape({
    params: PropTypes.shape({
      user: PropTypes.string.isRequired,
    }).isRequired,
  }).isRequired,
};
