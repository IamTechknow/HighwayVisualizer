import React from 'react';
import ReactDOM from 'react-dom';
import { Map as LeafletMap, TileLayer, Polyline } from 'react-leaflet';

export default class UserApp extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      loaded: false,
      notFound: false,
      userSegments: undefined  
    };
  }
  
  static getSegmentsFor(userId) {
    return fetch(`/api/segments/${userId}`)
      .then(res => res.json());
  }

  componentDidMount() {
    return UserApp.getSegmentsFor(this.props.match.params.user)
      .then(result => {
        this.setState(result); // Data shape matches that of the component state
      });
  }

  render() {
    const { loaded, notFound, userSegments } = this.state;
    const user = this.props.match.params.user;

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
