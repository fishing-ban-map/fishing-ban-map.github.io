import { useCallback, useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { Layer, Map as MapLibre, Source } from 'react-map-gl/maplibre';

interface MapProps {
  geoJson: GeoJSON.FeatureCollection;
  onFeatureClick: (feature: GeoJSON.Feature) => void;
  viewState: { longitude: number, latitude: number, zoom: number };
  setViewState: (viewState: { longitude: number, latitude: number, zoom: number }) => void;
  onMapLoaded: (mpa: maplibregl.Map) => void;
}

const Map = ({ geoJson, onFeatureClick, onMapLoaded }: MapProps) => {

  const [currentViewState, setCurrentViewState] = useState({
    longitude: 37.7333,
    latitude: 55.9833,
    zoom: 11
  })

  return (
    <div className="relative h-full">
      <MapLibre
        initialViewState={{
          longitude: 37.7333,
          latitude: 55.9833,
          zoom: 11
        }}
        {...currentViewState}
        onMove={(e) => setCurrentViewState(e.viewState)}
        mapStyle="https://tiles.stadiamaps.com/styles/osm_bright.json"
        style={{ width: '100%', height: '100%' }}
        onLoad={(event) => {
          console.log(event)
          const map = event.target;
          map.on("mousemove", ['polygons', 'lines', 'points'], (e) => {
            if (!map) return;
            if (e.features?.[0]) {
              // map.getCanvas().style.cursor = 'pointer';

              // Show popup
              const feature = e.features[0];
              const coordinates = e.lngLat;

              // popup.current
              //   ?.setLngLat(coordinates)
              //   .setHTML(`<h3>${feature.properties.name}</h3>`)
              //   .addTo(map);
            } else {
              // map.getCanvas().style.cursor = '';
              // popup.current?.remove();
            }
          });

          map.on("mouseleave", ['polygons', 'lines', 'points'], () => {
            if (!map) return;
            // map.getCanvas().style.cursor = '';
            // popup.current?.remove();
          });

          map.on("click", ['polygons', 'lines', 'points'], (e) => {
            if (!map) return;
            const feature = e.features?.[0];
            if (feature) {
              onFeatureClick(feature);
            }
          });

          // if (map.getSource('polygons')) {
          //   map.removeLayer('polygons');
          //   map.removeSource('polygons');
          // }
          // if (map.getLayer('routes')) {
          //   map.removeLayer('routes');
          //   map.removeSource('routes');
          // }
          // if (map.getLayer('markers')) {
          //   map.removeLayer('markers');
          //   map.removeSource('markers');
          // }
          // Add polygon layer

          // map.addLayer({
          //   id: 'restricted-areas',
          //   type: 'fill',
          //   source: {
          //     type: 'geojson',
          //     data: {
          //       type: 'FeatureCollection',
          //       features: geoJson.features.filter(f => f.geometry.type === 'Polygon')
          //     }
          //   },
          //   paint: {
          //     'fill-color': ['get', 'fillColor'],
          //     'fill-opacity': ['get', 'fillOpacity'],
          //     'fill-outline-color': ['get', 'strokeColor']
          //   }
          // });

          // // Add line layer
          // map.addLayer({
          //   id: 'routes',
          //   type: 'line',
          //   source: {
          //     type: 'geojson',
          //     data: {
          //       type: 'FeatureCollection',
          //       features: geoJson.features.filter(f => f.geometry.type === 'LineString')
          //     }
          //   },
          //   paint: {
          //     'line-color': ['get', 'color'],
          //     'line-width': ['get', 'width']
          //   }
          // });

          // // Add point layer
          // map.addLayer({
          //   id: 'markers',
          //   type: 'circle',
          //   source: {
          //     type: 'geojson',
          //     data: {
          //       type: 'FeatureCollection',
          //       features: geoJson.features.filter(f => f.geometry.type === 'Point')
          //     }
          //   },
          //   paint: {
          //     'circle-radius': ['get', 'radius'],
          //     'circle-color': ['get', 'color'],
          //     'circle-stroke-width': ['get', 'strokeWidth'],
          //     'circle-stroke-color': ['get', 'strokeColor']
          //   }
          // });

          onMapLoaded(map);
        }}
      >
        <Source id="polygons" type="geojson" data={{
          type: 'FeatureCollection',
          features: geoJson.features.filter(f => f.geometry.type === 'Polygon')
        }}>
          <Layer {...{
            id: 'polygons',
            type: 'fill',
            paint: {
              'fill-color': ['get', 'fillColor'],
              'fill-opacity': ['get', 'fillOpacity'],
              'fill-outline-color': ['get', 'strokeColor']
            }
          }} />
        </Source>
        <Source id="lines" type="geojson" data={{
          type: 'FeatureCollection',
          features: geoJson.features.filter(f => f.geometry.type === 'LineString')
        }}>
          <Layer {...{
            id: 'lines',
            type: 'line',
            paint: {
              'line-color': ['get', 'color'],
              'line-width': ['get', 'width']
            }
          }} />
        </Source>
        <Source id="points" type="geojson" data={{
          type: 'FeatureCollection',
          features: geoJson.features.filter(f => f.geometry.type === 'Point')
        }}>
          <Layer {...{
            id: 'points',
            type: 'circle',
            paint: {
              'circle-radius': ['get', 'radius'],
              'circle-color': ['get', 'color'],
              'circle-stroke-width': ['get', 'strokeWidth'],
              'circle-stroke-color': ['get', 'strokeColor'] 
            }
          }} />
        </Source>
      </MapLibre>
    </div>
  );
};

export default Map; 