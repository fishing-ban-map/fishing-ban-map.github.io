import { useCallback, useEffect, useRef, useState, useMemo } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { Layer, Map as MapLibre, Source, Popup } from 'react-map-gl/maplibre';
import MaplibreGeocoder from '@maplibre/maplibre-gl-geocoder';
import '@maplibre/maplibre-gl-geocoder/dist/maplibre-gl-geocoder.css';
import unkinkPolygon from '@turf/unkink-polygon';
import cleanCoords from '@turf/clean-coords';
import distance from '@turf/distance';
import { point } from '@turf/helpers';
import type { Feature, FeatureCollection, LineString, Point, Polygon, Position } from 'geojson';

// Constants
const MAX_DISTANCE_KM = 100; // Maximum distance between points in kilometers
const DEFAULT_CENTER = {
  longitude: 37.7321,
  latitude: 55.7599,
  zoom: 9.07
};

// Helper function to get coordinates from URL
const getCoordinatesFromUrl = () => {
  const params = new URLSearchParams(window.location.search);
  const lng = parseFloat(params.get('lng') || String(DEFAULT_CENTER.longitude));
  const lat = parseFloat(params.get('lat') || String(DEFAULT_CENTER.latitude));
  const zoom = parseFloat(params.get('zoom') || String(DEFAULT_CENTER.zoom));

  return {
    longitude: isNaN(lng) ? DEFAULT_CENTER.longitude : lng,
    latitude: isNaN(lat) ? DEFAULT_CENTER.latitude : lat,
    zoom: isNaN(zoom) ? DEFAULT_CENTER.zoom : zoom
  };
};

// Helper function to update URL with coordinates
const updateUrlWithCoordinates = (longitude: number, latitude: number, zoom: number) => {
  const params = new URLSearchParams(window.location.search);
  params.set('lng', longitude.toFixed(4));
  params.set('lat', latitude.toFixed(4));
  params.set('zoom', zoom.toFixed(2));

  const newUrl = `${window.location.pathname}?${params.toString()}`;
  window.history.replaceState({}, '', newUrl);
};

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

// Helper function to check if two points are too far apart
function distanceBetweenPoints(coord1: Position, coord2: Position): number {
  const point1 = point([coord1[0], coord1[1]]);
  const point2 = point([coord2[0], coord2[1]]);
  return distance(point1, point2);
}

// Helper function to split polygon into parts if points are too far apart
function splitPolygonIfNeeded(feature: Feature<Polygon>): Feature<Polygon | LineString | Point>[] {
  const coordinates = feature.geometry.coordinates[0]; // Only handle outer ring for now
  const result: Feature<Polygon | LineString | Point>[] = [];
  let currentPart: Position[] = [coordinates[0]];

  const addCurrentPart = () => {
    if (currentPart.length === 1) {
      result.push({
        type: 'Feature',
        properties: { ...feature.properties },
        geometry: {
          type: 'Point',
          coordinates: currentPart[0]
        }
      });
    } else if (currentPart.length === 2) {
      result.push({
        type: 'Feature',
        properties: { ...feature.properties },
        geometry: {
          type: 'LineString',
          coordinates: [currentPart[0], currentPart[1]]
        }
      });
    } else {
      // Close the current polygon part
      currentPart.push(currentPart[0]); // Add first point to close the ring
      // Create a new feature for this part
      result.push({
        type: 'Feature',
        properties: { ...feature.properties },
        geometry: {
          type: 'Polygon',
          coordinates: [currentPart]
        }
      });
    }
  }

  let maxDistance = 0

  for (let i = 1; i < coordinates.length; i++) {
    const prevPoint = coordinates[i - 1];
    const currentPoint = coordinates[i];

    const distance = distanceBetweenPoints(prevPoint, currentPoint)

    if (distance > MAX_DISTANCE_KM) {
      if (distance > maxDistance) {
        maxDistance = distance
      }
      addCurrentPart()
      // Start a new part
      currentPart = [currentPoint];
    } else {
      currentPart.push(currentPoint);
    }
  }

  addCurrentPart()

  if (result.length > 1) {
    console.error(`Расстояние между точками больше ${MAX_DISTANCE_KM} км (${maxDistance.toFixed(1)} км) для участка ${feature.properties?.region} ${feature.properties?.name}`, feature)
  }

  return result.length > 1 ? result : [feature];
}

interface MapProps {
  geoJson: GeoJSON.FeatureCollection;
  onFeatureClick: (feature: GeoJSON.Feature) => void;
  onMapLoaded: (map: maplibregl.Map) => void;
}

const Map = ({ geoJson, onFeatureClick, onMapLoaded }: MapProps) => {
  const [currentViewState, setCurrentViewState] = useState(getCoordinatesFromUrl());
  const [featureUnderMouse, setFeatureUnderMouse] = useState<{ feature: GeoJSON.Feature, coordinates: maplibregl.LngLat } | null>(null);

  // Update URL when map view changes
  const handleMoveEnd = useCallback((e: any) => {
    const { longitude, latitude, zoom } = e.viewState;
    updateUrlWithCoordinates(longitude, latitude, zoom);
    setCurrentViewState(e.viewState);
  }, []);

  // Process polygons to fix self-intersections
  const processedGeoJson = useMemo(() => {
    const polygonFeatures = geoJson.features.filter((f): f is Feature<Polygon> =>
      f.geometry.type === 'Polygon'
    );
    const notPolygons = geoJson.features.filter((f) =>
      f.geometry.type !== 'Polygon'
    );
    const processedFeatures = polygonFeatures.flatMap(feature => {
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

        // Split polygons if points are too far apart
        const splitFeatures = splitPolygonIfNeeded(fuzzedFeature);
        const splitPolygons = splitFeatures.filter(f => f.geometry.type === 'Polygon') as Feature<Polygon>[]

        // Then unkink each split part
        return [...splitPolygons.flatMap(splitFeature => {
          const unkinked = unkinkPolygon(splitFeature);
          // Copy the original properties to all resulting features
          return unkinked.features.map((f) => {
            if (f.geometry.type !== 'Polygon') {
              console.error('Unexpected geometry type after unkinking:', f.geometry.type);
              return splitFeature;
            }
            return {
              ...f,
              properties: {
                ...feature.properties,
                originalId: feature.properties?.documentIndex // Keep track of original feature
              }
            } as Feature<Polygon>;
          });
        }), ...splitFeatures.filter(f => f.geometry.type !== 'Polygon')];
      } catch (e) {
        console.error('Error processing polygon:', e);
        return [feature]; // Return original feature if processing fails
      }
    });

    return {
      type: 'FeatureCollection',
      features: [...processedFeatures, ...notPolygons]
    } as FeatureCollection<Polygon | LineString | Point>;
  }, [geoJson]);

  return (
    <div className="relative h-full">
      <MapLibre
        initialViewState={currentViewState}
        onMoveEnd={handleMoveEnd}
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
        <Source id="polygons" type="geojson" data={{
          type: 'FeatureCollection',
          features: processedGeoJson.features.filter(f => f.geometry.type === 'Polygon')
        }}>
          <Layer {...{
            id: 'polygons',
            type: 'fill',
            paint: {
              'fill-color': '#ff000077',
              'fill-opacity': 1,
              'fill-outline-color': '#ff0000'
            }
          }} />
        </Source>
        <Source id="lines" type="geojson" data={{
          type: 'FeatureCollection',
          features: processedGeoJson.features.filter(f => f.geometry.type === 'LineString')
        }}>
          <Layer {...{
            id: 'lines',
            type: 'line',
            paint: {
              'line-color': '#ff0000',
              'line-width': 2
            }
          }} />
        </Source>
        <Source id="points" type="geojson" data={{
          type: 'FeatureCollection',
          features: processedGeoJson.features.filter(f => f.geometry.type === 'Point')
        }}>
          <Layer {...{
            id: 'points',
            type: 'circle',
            paint: {
              'circle-radius': 3,
              'circle-color': '#ff0000',
              'circle-opacity': 0.3,
              'circle-stroke-width': 1,
              'circle-stroke-color': '#ff0000',
              'circle-stroke-opacity': 1
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