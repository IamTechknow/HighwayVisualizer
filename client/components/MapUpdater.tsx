import * as Leaflet from 'leaflet';
import React from 'react';
import { useMap } from 'react-leaflet';

interface Props {
  center: Leaflet.LatLngExpression,
  zoom: number,
}

// Control the leaflet map when app state changes
const MapUpdater = ({ center, zoom }: Props): React.ReactElement | null => {
  const map = useMap();
  map.setView(center, zoom);
  return null;
};

export default MapUpdater;