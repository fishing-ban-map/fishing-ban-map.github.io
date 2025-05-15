import { useCallback, useEffect, useRef, useState, useMemo } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { Layer, Map as MapLibre, Source, Popup } from 'react-map-gl/maplibre';
import MaplibreGeocoder from '@maplibre/maplibre-gl-geocoder';
import '@maplibre/maplibre-gl-geocoder/dist/maplibre-gl-geocoder.css';
import unkinkPolygon from '@turf/unkink-polygon';
import cleanCoords from '@turf/clean-coords';
import type { Feature, FeatureCollection, Polygon, Position } from 'geojson';

// Helper function to add a small random offset to coordinates
function fuzzCoordinate(coord: Position, index: number): Position {
  // Add a tiny random offset (about 1-2 centimeters)
  const fuzzFactor = 0.0000001 * (index + 1); // Approximately 1cm at the equator
  return [
    coord[0] + fuzzFactor,
    coord[1] + fuzzFactor
  ];
}

// Helper function to remove duplicate vertices with fuzzing
function removeDuplicatesWithFuzzing(coordinates: Position[][]): Position[][] {
  return coordinates.map(ring => {
    const seen = new Set<string>();
    return ring.map((coord, index) => {
      const key = `${coord[0]},${coord[1]}`;
      if (seen.has(key)) {
        // If we've seen this coordinate before, fuzz it
        const fuzzed = fuzzCoordinate(coord, index);
        seen.add(`${fuzzed[0]},${fuzzed[1]}`);
        return fuzzed;
      }
      seen.add(key);
      return coord;
    });
  });
}

interface MapProps {
  geoJson: GeoJSON.FeatureCollection;
  onFeatureClick: (feature: GeoJSON.Feature) => void;
  viewState: { longitude: number, latitude: number, zoom: number };
  setViewState: (viewState: { longitude: number, latitude: number, zoom: number }) => void;
  onMapLoaded: (map: maplibregl.Map) => void;
}

const Map = ({ geoJson, onFeatureClick, onMapLoaded }: MapProps) => {
  const [currentViewState, setCurrentViewState] = useState({
    longitude: 37.7333,
    latitude: 55.9833,
    zoom: 11
  });
  const [featureUnderMouse, setFeatureUnderMouse] = useState<{ feature: GeoJSON.Feature, coordinates: maplibregl.LngLat } | null>(null);

  // Process polygons to fix self-intersections
  const processedPolygons = useMemo(() => {
    const polygonFeatures = geoJson.features.filter((f): f is Feature<Polygon> =>
      f.geometry.type === 'Polygon'
    );
    const unkinkedFeatures = polygonFeatures.flatMap(feature => {
      try {
        // First clean the coordinates and then fuzz any remaining duplicates
        const cleanedFeature = cleanCoords(feature) as Feature<Polygon>;
        const fuzzedFeature: Feature<Polygon> = {
          ...cleanedFeature,
          geometry: {
            ...cleanedFeature.geometry,
            coordinates: removeDuplicatesWithFuzzing(cleanedFeature.geometry.coordinates)
          }
        };

        const unkinked = unkinkPolygon(fuzzedFeature);
        // Copy the original properties to all resulting features
        return unkinked.features.map((f) => {
          if (f.geometry.type !== 'Polygon') {
            console.error('Unexpected geometry type after unkinking:', f.geometry.type);
            return feature;
          }
          return {
            ...f,
            properties: {
              ...feature.properties,
              originalId: feature.properties?.documentIndex // Keep track of original feature
            }
          } as Feature<Polygon>;
        });
      } catch (e) {
        console.error('Error unkinking polygon:', e);
        return [feature]; // Return original feature if unkinking fails
      }
    });

    return {
      type: 'FeatureCollection',
      features: unkinkedFeatures
    } as FeatureCollection<Polygon>;
  }, [geoJson]);

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
        cursor={featureUnderMouse ? 'pointer' : 'auto'}
        onLoad={(event) => {
          const map = event.target;
          map.on("mousemove", ['polygons', 'lines', 'points'], (e) => {
            if (!map) return;
            if (e.features?.[0]) {
              // map.getCanvas().style.cursor = 'pointer';

              // Show popup
              const feature = e.features[0];
              const coordinates = e.lngLat;

              setFeatureUnderMouse({ feature, coordinates })
              //   .setHTML(`<h3>${feature.properties.name}</h3>`)
              //   .addTo(map);
            } else {
              setFeatureUnderMouse(null)
            }
          });

          map.on("mouseleave", ['polygons', 'lines', 'points'], () => {
            if (!map) return;
            setFeatureUnderMouse(null)
          });

          map.on("click", ['polygons', 'lines', 'points'], (e) => {
            if (!map) return;
            const feature = e.features?.[0];
            if (feature) {
              onFeatureClick(feature);
            }
          });

          const geocoder = new MaplibreGeocoder({
            forwardGeocode: async (config) => {
              try {
                const request = await fetch(
                  `https://nominatim.openstreetmap.org/search?q=${config.query}&format=geojson&polygon_geojson=1&addressdetails=1`
                );
                const geojson = await request.json();
                return {
                  type: "FeatureCollection",
                  features: geojson.features.map((feature: any) => {
                    const center = [
                      feature.bbox[0] + (feature.bbox[2] - feature.bbox[0]) / 2,
                      feature.bbox[1] + (feature.bbox[3] - feature.bbox[1]) / 2
                    ];
                    return {
                      type: "Feature",
                      geometry: {
                        type: "Point",
                        coordinates: center
                      },
                      place_name: feature.properties.display_name,
                      properties: feature.properties,
                      text: feature.properties.display_name,
                      place_type: ["place"],
                      center: center
                    };
                  })
                };
              } catch (e) {
                console.error(`Failed to forwardGeocode with error: ${e}`);
                return {
                  type: "FeatureCollection",
                  features: []
                };
              }
            }
          }, {
            maplibregl: maplibregl,
            marker: true,
            flyTo: {
              duration: 2000
            }
          });
          map.addControl(geocoder, 'top-left');
          onMapLoaded(map);
        }}
      >
        <Source id="polygons" type="geojson" data={processedPolygons}>
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
        {featureUnderMouse && (
          <Popup
            longitude={featureUnderMouse.coordinates.lng}
            latitude={featureUnderMouse.coordinates.lat}
            closeButton={false}
          >
            <div>
              <h3>{featureUnderMouse.feature.properties?.name}</h3>
            </div>
          </Popup>
        )}
      </MapLibre>
    </div>
  );
};

export default Map; 