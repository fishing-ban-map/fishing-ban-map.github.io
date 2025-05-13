import type { Position } from 'geojson';

function parseDMS(dms: string, direction: 'N' | 'S' | 'E' | 'W'): number {
  // Remove all spaces and replace comma with dot for decimal
  const cleanDms = dms.replace(/\s+/g, '').replace(',', '.');
  
  // Extract degrees, minutes, and seconds, making the final quote optional
  const match = cleanDms.match(/(\d+)°(\d+)'([\d.]+)"?/);
  if (!match) throw new Error(`Invalid DMS format: ${dms}`);
  
  const [, degrees, minutes, seconds] = match;
  
  // Convert to decimal degrees
  let dd = Number(degrees) + Number(minutes)/60 + Number(seconds)/3600;
  
  // Apply direction
  if (direction === 'S' || direction === 'W') dd = -dd;
  
  return dd;
}

export function parseCoordinates(lat: string, lon: string): Position {
  return [parseDMS(lon, 'E'), parseDMS(lat, 'N')];
}

export function parseCoordinateBlock(block: string[]): Position[] {
  return block.map(line => {
    // Clean up the line by normalizing spaces and punctuation
    const cleanLine = line
      .replace(/(\d)\s+"/g, '$1"') // Remove spaces between number and quote
      .replace(/"\s+([а-я])/g, '"$1') // Remove spaces between quote and Cyrillic letters
      .replace(/с\.ш\.,?\s+/g, 'с.ш. ') // Normalize comma after с.ш.
      .replace(/в\.д\.,?\s+/g, 'в.д. '); // Normalize comma after в.д.
    
    // Extract coordinates from line with more flexible spacing
    const match = cleanLine.match(/(?:\d+\.)?\s*(\d+°\s*\d+'[\d,]+"?)\s*с\.ш\.?\s*,?\s*(\d+°\s*\d+'[\d,]+"?)\s*в\.д\.?/);
    if (!match) {
      console.warn(`Problematic line: ${line}`);
      console.warn(`Cleaned line: ${cleanLine}`);
      throw new Error(`Invalid coordinate line: ${line}`);
    }
    const [, lat, lon] = match;
    return parseCoordinates(lat, lon);
  });
} 