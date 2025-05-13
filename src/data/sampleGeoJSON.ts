import type { FeatureCollection } from 'geojson';

export const sampleGeoJSON: FeatureCollection = {
  type: 'FeatureCollection',
  features: [
    // Polygon example (a square)
    {
      type: 'Feature',
      properties: {
        name: 'Sample Polygon',
        type: 'restricted-area',
        fillColor: '#ffff00',
        fillOpacity: 0.3,
        strokeColor: '#ffff00'
      },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [37.61, 55.75],
          [37.62, 55.75],
          [37.62, 55.76],
          [37.61, 55.76],
          [37.61, 55.75]
        ]]
      }
    },
    // LineString example
    {
      type: 'Feature',
      properties: {
        name: 'Sample Line',
        type: 'route',
        color: '#0000ff',
        width: 3
      },
      geometry: {
        type: 'LineString',
        coordinates: [
          [37.615, 55.755],
          [37.617, 55.757],
          [37.619, 55.756]
        ]
      }
    },
    // Point example
    {
      type: 'Feature',
      properties: {
        name: 'Sample Point',
        type: 'marker',
        color: '#00ff00',
        strokeColor: '#ffffff',
        strokeWidth: 2,
        radius: 8
      },
      geometry: {
        type: 'Point',
        coordinates: [37.6173, 55.7558]
      }
    }
  ]
}; 