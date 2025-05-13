import { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { parsedGeoJSON } from '../data/parsedGeoJSON';
import RiverSearch from './RiverSearch';

const Map = () => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<maplibregl.Map | null>(null);
  const popup = useRef<maplibregl.Popup | null>(null);

  useEffect(() => {
    if (!mapContainer.current) return;

    const map = new maplibregl.Map({
      container: mapContainer.current,
      style: 'https://tiles.stadiamaps.com/styles/osm_bright.json',
      center: [37.7333, 55.9833], // Пироговское водохранилище coordinates
      zoom: 11
    });

    map.addControl(new maplibregl.NavigationControl());

    // Create a popup but don't add it to the map yet
    popup.current = new maplibregl.Popup({
      closeButton: false,
      closeOnClick: false
    });

    map.on('load', () => {
      // Add polygon layer
      map.addLayer({
        id: 'restricted-areas',
        type: 'fill',
        source: {
          type: 'geojson',
          data: {
            type: 'FeatureCollection',
            features: parsedGeoJSON.features.filter(f => f.geometry.type === 'Polygon')
          }
        },
        paint: {
          'fill-color': ['get', 'fillColor'],
          'fill-opacity': ['get', 'fillOpacity'],
          'fill-outline-color': ['get', 'strokeColor']
        }
      });

      // Add line layer
      map.addLayer({
        id: 'routes',
        type: 'line',
        source: {
          type: 'geojson',
          data: {
            type: 'FeatureCollection',
            features: parsedGeoJSON.features.filter(f => f.geometry.type === 'LineString')
          }
        },
        paint: {
          'line-color': ['get', 'color'],
          'line-width': ['get', 'width']
        }
      });

      // Add point layer
      map.addLayer({
        id: 'markers',
        type: 'circle',
        source: {
          type: 'geojson',
          data: {
            type: 'FeatureCollection',
            features: parsedGeoJSON.features.filter(f => f.geometry.type === 'Point')
          }
        },
        paint: {
          'circle-radius': ['get', 'radius'],
          'circle-color': ['get', 'color'],
          'circle-stroke-width': ['get', 'strokeWidth'],
          'circle-stroke-color': ['get', 'strokeColor']
        }
      });

      // Add hover effect
      map?.on("mousemove", ['restricted-areas', 'routes', 'markers'], (e) => {
        if (!map) return;
        if (e.features?.[0]) {
          map.getCanvas().style.cursor = 'pointer';
          
          // Show popup
          const feature = e.features[0];
          const coordinates = e.lngLat;

          popup.current
            ?.setLngLat(coordinates)
            .setHTML(`<h3>${feature.properties.name}</h3>`)
            .addTo(map);
        } else {
          map.getCanvas().style.cursor = '';
          popup.current?.remove();
        }
      });

      map?.on("mouseleave", ['restricted-areas', 'routes', 'markers'], () => {
        if (!map) return;
        map.getCanvas().style.cursor = '';
        popup.current?.remove();
      });

      setMap(map);
    });

    return () => {
      map?.remove();
    };
  }, []);

  return (
    <>
      <RiverSearch map={map} />
      <div 
        ref={mapContainer} 
        className='w-full relative h-screen'
      />
    </>
  );
};

export default Map; 