import * as Leaflet from 'leaflet';
import React from 'react';
import { useMap } from 'react-leaflet';

interface Props {
  bounds: Leaflet.BoundsLiteral | undefined | null
  center: Leaflet.LatLngExpression,
  zoom: number,
}

// Control the leaflet map when app state changes
const MapUpdater = ({ bounds, center, zoom }: Props): React.ReactElement | null => {
  const map = useMap();
  if (bounds != null) {
    map.fitBounds(bounds);
  } else {
    map.setView(center, zoom);
  }
  return null;
};

export default MapUpdater;
