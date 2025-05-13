import { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { sampleGeoJSON } from '../data/sampleGeoJSON';

const Map = () => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const popup = useRef<maplibregl.Popup | null>(null);

  useEffect(() => {
    if (!mapContainer.current) return;

    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: 'https://tiles.stadiamaps.com/styles/osm_bright.json', // OSM demo style
      center: [37.6173, 55.7558], // Moscow coordinates
      zoom: 13
    });

    map.current.addControl(new maplibregl.NavigationControl());

    // Create a popup but don't add it to the map yet
    popup.current = new maplibregl.Popup({
      closeButton: false,
      closeOnClick: false
    });

    map.current.on('load', () => {
      if (!map.current) return;

      // Add polygon layer
      map.current.addLayer({
        id: 'restricted-areas',
        type: 'fill',
        source: {
          type: 'geojson',
          data: {
            type: 'FeatureCollection',
            features: sampleGeoJSON.features.filter(f => f.geometry.type === 'Polygon')
          }
        },
        paint: {
          'fill-color': ['get', 'fillColor'],
          'fill-opacity': ['get', 'fillOpacity'],
          'fill-outline-color': ['get', 'strokeColor']
        }
      });

      // Add line layer
      map.current.addLayer({
        id: 'routes',
        type: 'line',
        source: {
          type: 'geojson',
          data: {
            type: 'FeatureCollection',
            features: sampleGeoJSON.features.filter(f => f.geometry.type === 'LineString')
          }
        },
        paint: {
          'line-color': ['get', 'color'],
          'line-width': ['get', 'width']
        }
      });

      // Add point layer
      map.current.addLayer({
        id: 'markers',
        type: 'circle',
        source: {
          type: 'geojson',
          data: {
            type: 'FeatureCollection',
            features: sampleGeoJSON.features.filter(f => f.geometry.type === 'Point')
          }
        },
        paint: {
          'circle-radius': ['get', 'radius'],
          'circle-color': ['get', 'color'],
          'circle-stroke-width': ['get', 'strokeWidth'],
          'circle-stroke-color': ['get', 'strokeColor']
        }
      });

      map.current?.on("mousemove", ['restricted-areas', 'routes', 'markers'], (e) => {
        if (!map.current) return;
        if (e.features?.[0]) {
          map.current.getCanvas().style.cursor = 'pointer';
          
          // Show popup
          const feature = e.features[0];
          const coordinates = e.lngLat;

          popup.current
            ?.setLngLat(coordinates)
            .setHTML(`<h3>${feature.properties.name}</h3>`)
            .addTo(map.current);
        } else {
          map.current.getCanvas().style.cursor = '';
          popup.current?.remove();
        }
      });
      map.current?.on("mouseleave", ['restricted-areas', 'routes', 'markers'], (e) => {
        if (!map.current) return;
        map.current.getCanvas().style.cursor = '';
        popup.current?.remove();
      });
    });

    return () => {
      map.current?.remove();
    };
  }, []);

  return (
    <div 
      ref={mapContainer} 
      className='w-full relative h-screen'
    />
  );
};

export default Map; 