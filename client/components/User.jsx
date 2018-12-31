import React from 'react';
import ReactDOM from 'react-dom';
import { Map as LeafletMap, TileLayer, Polyline } from 'react-leaflet';

import Highways from './Highways';

const METERS = 1.000, KM = 1000.000, MILES = 1609.344;

export default class UserApp extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      loaded: false,
      notFound: false,
      stats: [],
      scale: METERS,
      userSegments: undefined  
    };

    this.onScaleChange = this.onScaleChange.bind(this);
  }

  static getSegmentsFor(userId) {
    return fetch(`/api/segments/${userId}`)
      .then(res => res.json());
  }

  componentDidMount() {
    return UserApp.getSegmentsFor(this.props.match.params.user)
      .then(result => {
        this.setState(result); // Data shape from endpoint matches that of the component state
      });
  }

  onScaleChange(event) {
    this.setState({ scale: Number.parseFloat(event.target.value) });
  }

  render() {
    const { loaded, notFound, scale, stats, userSegments } = this.state;
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
      <div id="mapGrid">
        <div id="routeUi">
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
                <th>Route</th>
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
                    <tr>
                      <td>{stat.route}</td>
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

        <LeafletMap center={userSegments[0].points[0]} zoom={7}>
          <TileLayer
            attribution='&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
            url='http://{s}.tile.osm.org/{z}/{x}/{y}.png'
          />

          { userSegments &&
            userSegments.map((seg, i) => <Polyline key={`seg-${i}`} positions={seg.points} color={ seg.clinched ? "lime" : "yellow" } /> )
          }
        </LeafletMap>
      </div>
    );
  }
}
