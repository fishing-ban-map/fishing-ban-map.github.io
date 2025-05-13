import type { Feature, FeatureCollection, Geometry, Point, LineString, Polygon } from 'geojson';
import { parseCoordinateBlock } from './coordinateParser';

interface FeatureProperties {
  name: string;
  type: string;
  fillColor?: string;
  fillOpacity?: number;
  strokeColor?: string;
  color?: string;
  width?: number;
  radius?: number;
  strokeWidth?: number;
}

function createFeature(name: string, coordinates: number[][], type: 'Polygon' | 'LineString' | 'Point'): Feature {
  const properties: FeatureProperties = {
    name,
    type: type === 'Polygon' ? 'restricted-area' : type === 'LineString' ? 'route' : 'marker',
  };

  // Set style properties based on feature type
  if (type === 'Polygon') {
    properties.fillColor = '#ff0000';
    properties.fillOpacity = 0.3;
    properties.strokeColor = '#ff0000';
  } else if (type === 'LineString') {
    properties.color = '#0000ff';
    properties.width = 3;
  } else {
    properties.color = '#00ff00';
    properties.strokeColor = '#ffffff';
    properties.strokeWidth = 2;
    properties.radius = 8;
  }

  let geometry: Geometry;
  
  if (type === 'Polygon') {
    geometry = {
      type: 'Polygon',
      coordinates: [coordinates]
    } as Polygon;
  } else if (type === 'LineString') {
    geometry = {
      type: 'LineString',
      coordinates: coordinates
    } as LineString;
  } else {
    geometry = {
      type: 'Point',
      coordinates: coordinates[0]
    } as Point;
  }

  return {
    type: 'Feature',
    properties,
    geometry
  };
}

export function parseText(text: string): FeatureCollection {
  const features: Feature[] = [];
  const lines = text.split('\n').map(line => line.trim()).filter(line => line);
  
  let currentBlock: string[] = [];
  let currentName = '';
  let inCoordinateBlock = false;

  for (const line of lines) {
    // Skip header lines
    if (line.includes('Наименование') || line.includes('Место расположения') || line.includes('Московская область')) {
      continue;
    }

    // Check if line starts with coordinates
    const isCoordinate = /^\d+\.\s*\d+°/.test(line);

    if (isCoordinate) {
      inCoordinateBlock = true;
      currentBlock.push(line);
    } else {
      // If we were in a coordinate block and now we're not, process the block
      if (inCoordinateBlock && currentBlock.length > 0) {
        try {
          const coordinates = parseCoordinateBlock(currentBlock);
          
          // Create appropriate feature based on number of coordinates
          if (coordinates.length > 2) {
            // For polygons, ensure the first and last points match to close the polygon
            if (
              coordinates[0][0] !== coordinates[coordinates.length - 1][0] ||
              coordinates[0][1] !== coordinates[coordinates.length - 1][1]
            ) {
              coordinates.push(coordinates[0]);
            }
            features.push(createFeature(currentName, coordinates, 'Polygon'));
          } else if (coordinates.length === 2) {
            features.push(createFeature(currentName, coordinates, 'LineString'));
          } else if (coordinates.length === 1) {
            features.push(createFeature(currentName, coordinates, 'Point'));
          }
        } catch (error) {
          console.error(`Error processing coordinates for ${currentName}:`, error);
        }
        
        currentBlock = [];
        inCoordinateBlock = false;
      }

      // If line starts with a dash, it's a new feature name
      if (line.startsWith('-')) {
        currentName = line.substring(1).trim();
        // Remove the colon if it exists
        if (currentName.endsWith(':')) {
          currentName = currentName.slice(0, -1);
        }
      }
    }
  }

  // Process any remaining coordinate block
  if (inCoordinateBlock && currentBlock.length > 0) {
    try {
      const coordinates = parseCoordinateBlock(currentBlock);
      if (coordinates.length > 2) {
        if (
          coordinates[0][0] !== coordinates[coordinates.length - 1][0] ||
          coordinates[0][1] !== coordinates[coordinates.length - 1][1]
        ) {
          coordinates.push(coordinates[0]);
        }
        features.push(createFeature(currentName, coordinates, 'Polygon'));
      } else if (coordinates.length === 2) {
        features.push(createFeature(currentName, coordinates, 'LineString'));
      } else if (coordinates.length === 1) {
        features.push(createFeature(currentName, coordinates, 'Point'));
      }
    } catch (error) {
      console.error(`Error processing coordinates for ${currentName}:`, error);
    }
  }

  return {
    type: 'FeatureCollection',
    features
  };
} 