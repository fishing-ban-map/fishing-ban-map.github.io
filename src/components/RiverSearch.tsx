import { useState } from 'react';
import type { KeyboardEvent } from 'react';
import maplibregl from 'maplibre-gl';

interface RiverSearchProps {
  map: maplibregl.Map | null;
}

const RiverSearch = ({ map }: RiverSearchProps) => {
  const [riverName, setRiverName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const searchRiver = async () => {
    console.log(map, riverName);

    if (!map || !riverName.trim()) return;
    console.log('searching river');
    
    setLoading(true);
    setError(null);

    try {
      // Overpass API query for river geometry
      const query = `
[out:json][timeout:25];
(
  way["waterway"="river"]["name"~"${riverName}"];
  relation["waterway"="river"]["name"~"${riverName}"];
);
out body;
>;
out skel qt;
      `;

      const bounds = map.getBounds();
      const bbox = `${bounds.getSouth()},${bounds.getWest()},${bounds.getNorth()},${bounds.getEast()}`;
      const apiUrl = `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(
        query.replace('{{bbox}}', bbox)
      )}`;

      console.time('fetching river');
      const response = await fetch(apiUrl);
      const data = await response.json();
      console.timeEnd('fetching river');
      console.log(data);

      // Convert OSM data to GeoJSON
      const features = data.elements.filter((el: any) => el.type === 'way').map((way: any) => {
        const coordinates = way.nodes.map((nodeId: number) => {
          const node = data.elements.find((el: any) => el.type === 'node' && el.id === nodeId);
          if (!node) return null;
          return [node.lon, node.lat];
        }).filter((coord: number[] | null): coord is number[] => coord !== null);

        return {
          type: 'Feature',
          properties: {
            name: way.tags?.['name:ru'],
            id: way.id
          },
          geometry: {
            type: 'LineString',
            coordinates
          }
        };
      });

      if (features.length === 0) {
        setError(`No rivers found with name "${riverName}" in the current map view. Try zooming out or panning to a different area.`);
        return;
      }

      // Remove existing river layer if it exists
      if (map.getLayer('searched-river')) {
        map.removeLayer('searched-river');
      }
      if (map.getSource('searched-river')) {
        map.removeSource('searched-river');
      }

      // Add new river layer
      map.addSource('searched-river', {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features
        }
      });

      map.addLayer({
        id: 'searched-river',
        type: 'line',
        source: 'searched-river',
        paint: {
          'line-color': '#0080ff',
          'line-width': 3
        }
      });

      // Fit map to river bounds
      if (features.length > 0) {
        const coordinates = features.flatMap((feature: any) => feature.geometry.coordinates);
        const bounds = coordinates.reduce(
          (bounds: maplibregl.LngLatBounds, coord: number[]) => bounds.extend(coord as [number, number]),
          new maplibregl.LngLatBounds(coordinates[0], coordinates[0])
        );
        map.fitBounds(bounds, { padding: 50 });
      }
    } catch (error) {
      console.error('Error fetching river data:', error);
      setError('Error fetching river data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !loading) {
      searchRiver();
    }
  };

  return (
    <div className="absolute top-4 left-4 z-10 bg-white p-4 rounded-lg shadow-lg">
      <div className="flex flex-col gap-2">
        <div className="flex gap-2">
          <input
            type="text"
            value={riverName}
            onChange={(e) => setRiverName(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Enter river name"
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={searchRiver}
            disabled={loading || !riverName.trim()}
            className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:bg-blue-300"
          >
            {loading ? 'Searching...' : 'Search'}
          </button>
        </div>
        {error && (
          <div className="text-red-500 text-sm mt-1">
            {error}
          </div>
        )}
      </div>
    </div>
  );
};

export default RiverSearch; 