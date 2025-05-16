import { useCallback, useEffect, useState, useMemo } from 'react';
import RegionList from './components/RegionList';
import Map from './components/Map';
import type { FishingBanRegion, Table, Document } from './types/regions';
import * as cheerio from 'cheerio';
import type { FeatureCollection } from 'geojson';


function dmsToDecimal(degrees: number, minutes: number, seconds: number) {
  return degrees + (minutes / 60) + (seconds / 3600);
}

function parseCoordinate(coordText: string) {
  // Match pattern: degrees°minutes'seconds,decimals" direction
  const pattern = /(\d+)°(\d+)['"](\d+,?\d*)"\s*(с\.ш\.?|в\.д\.?)/g;
  const matches = [...coordText.matchAll(pattern)];

  if (matches.length === 0) return null;

  return matches.map(match => {
    const [_, degrees, minutes, seconds, direction] = match;
    const decimal = dmsToDecimal(
      parseInt(degrees),
      parseInt(minutes),
      parseFloat(seconds.replace(',', '.'))
    );
    return {
      decimal,
      direction: direction.includes('с.ш') ? 'N' : 'E'
    };
  });
}

const pointPattern = /(?:\d+\.\s*)?(\d+°\d+['"][\d,]+"\s*с\.ш\.?\s*\d+°\d+['"][\d,]+"\s*в\.д\.?)/g;

function parseCoordinatePoints(text: string) {
  // Remove extra spaces and normalize line endings
  text = text.replace(/\s+/g, ' ').trim();

  const points = [...text.matchAll(pointPattern)]
    .map(match => match[1])

  return points.map((point, index) => {
    const coords = parseCoordinate(point);
    if (!coords || coords.length !== 2) {
      console.error('Invalid coordinate', point)
      throw new Error('Invalid coordinate')
    }

    return {
      index: index + 1,
      lat: coords[0].decimal,  // с.ш. - N
      lon: coords[1].decimal,  // в.д. - E
      original: point
    };
  }).filter(p => p !== null);
}

function parseLocationTable(html: string) {
  const $ = cheerio.load(html);
  const tables: Table[] = [];

  const title = $('body').contents().filter(function () {
    return this.nodeType === 1 && $(this).is('p') && $(this).nextAll('table').length > 0;
  }).map(function () {
    return $(this).text().trim();
  }).get().join(' ');

  $('table').each((tableIndex, tableElement) => {
    const table: Table = {
      rows: [],
    };

    // Extract rows
    $(tableElement).find('tr').slice(1).each((_, row) => {
      const rowData: string[] = [];
      $(row).find('td').each((cellIndex, cell) => {
        const cellText = $(cell).text().trim();
        rowData.push(cellText);
      });

      if (rowData.length > 0) {
        table.rows.push({
          header: rowData.join(' '),
          points: rowData[1] ? parseCoordinatePoints(rowData[1]) : [],
        });
      }
    });

    // Only add tables that have data
    if (table.rows.length > 0) {
      tables.push(table);
    }
  });

  return {
    header: title,
    rows: tables[0].rows,
  }
}

function App() {
  const [regions, setRegions] = useState<FishingBanRegion[]>([]);
  const [selectedRegion, setSelectedRegion] = useState<FishingBanRegion | null>(null);
  const [selectedDocuments, setSelectedDocuments] = useState<Document[]>([]);
  const [openedDocument, setOpenedDocument] = useState<Document | null>(null);
  const [features, setFeatures] = useState<FeatureCollection>({
    type: 'FeatureCollection',
    features: []
  });
  const [map, setMap] = useState<maplibregl.Map | null>(null);
  const [selectedRow, setSelectedRow] = useState<number | null>(null);
  const [showWarning, setShowWarning] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  useEffect(() => {
    // Load regions data
    fetch('/fishing-ban-regions.json')
      .then(response => response.json() as Promise<{ regions: FishingBanRegion[], lastUpdated: string }>)
      .then(data => {
        setLastUpdated(data.lastUpdated)
        const documentsToSelect: Document[] = []
        data.regions.forEach(region => {
          region.documents.forEach(document => {
            const table = parseLocationTable(document.content);
            document.header = table.header
            document.rows = table.rows
            document.region = region
            if (document.header.toLowerCase().includes('нерест')) {
              documentsToSelect.push(document)
            }
          });
        });
        setRegions(data.regions || []);
        setSelectedDocuments(documentsToSelect)
      })
      .catch(error => {
        console.error('Error loading regions:', error);
      });
  }, []);

  useEffect(() => {
    const features: FeatureCollection = {
      type: 'FeatureCollection',
      features: []
    }
    selectedDocuments.forEach((document, documentIndex) => {
      document.rows.forEach((row, rowIndex) => {
        if (!row.points || row.points.length === 0) {
          return
        }
        if (row.points.length > 2) {
          features.features.push({
            type: 'Feature',
            geometry: {
              type: 'Polygon',
              coordinates: [row.points.map(point => [point.lon, point.lat] as [number, number])]
            },
            properties: {
              fillColor: '#ff0000',
              fillOpacity: 0.3,
              strokeColor: '#ff0000',
              name: row.header,
              region: document.region?.region,
              document: document.title,
              documentIndex,
              rowIndex
            }
          })
        } else if (row.points.length === 2) {
          features.features.push({
            type: 'Feature',
            geometry: {
              type: 'LineString',
              coordinates: [[row.points[0].lon, row.points[0].lat], [row.points[1].lon, row.points[1].lat]]
            },
            properties: {
              color: '#ff0000',
              width: 2,
              name: row.header,
              region: document.region?.region,
              document: document.title,
              documentIndex,
              rowIndex
            }
          })
        } else if (row.points.length === 1) {
          features.features.push({
            type: 'Feature',
            geometry: {
              type: 'Point',
              coordinates: [row.points[0].lon, row.points[0].lat]
            },
            properties: {
              color: '#ff0000',
              radius: 1.5,
              strokeColor: '#ff0000',
              strokeWidth: 2,
              name: row.header,
              region: document.region?.region,
              document: document.title,
              documentIndex,
              rowIndex
            }
          })
        }
      });
    })
    setFeatures(features)
  }, [selectedDocuments, regions])

  console.log(selectedDocuments)
  const handleFeatureClick = (feature: GeoJSON.Feature) => {
    if (feature.properties?.documentIndex !== undefined && feature.properties?.rowIndex !== undefined) {
      setSelectedDocuments(prev => {
        const document = prev[feature.properties!.documentIndex]
        setSelectedRegion(document.region || null)
        setOpenedDocument(document || null)
        setSelectedRow(feature.properties!.rowIndex || null)
        return prev
      })
    }
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden">
      <div className="flex flex-col h-screen w-screen overflow-hidden">
        {showWarning && (
          <div className="p-1 bg-yellow-50 border-b border-yellow-200 text-sm flex items-center justify-center relative">
            <span>Внимание!
              Данная карта использует информацию об участках с официального сайта <a href="https://moktu.fish.gov.ru/activities/rybookhrana/vnimanie-nerest/" target="_blank" rel="noopener noreferrer">fish.gov.ru</a>{lastUpdated ? ` от ${new Date(lastUpdated).toLocaleDateString()}` : ''}. Из-за большого колличества ошибок в данных, некоторые участки отображаются вытянутыми полигонами.
              Актуальность и точность данных может устареть в любой момент.
              Для получения достоверной информации необходимо использовать официальные документы Росрыболовства. Предложения по улучшению сайта принимаются <a href="https://github.com/fishing-ban-map/fishing-ban-map.github.io/issues">тут</a>.</span>
            <button
              onClick={() => setShowWarning(false)}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
            >
              ✕
            </button>
          </div>
        )}
        <div className="flex flex-1 overflow-hidden">
          <div className="w-1/3 h-full border-r border-gray-200 overflow-y-auto bg-white">
            <RegionList
              regions={regions}
              selectedRegion={selectedRegion}
              onRegionSelect={setSelectedRegion}
              selectedDocuments={selectedDocuments}
              setSelectedDocuments={setSelectedDocuments}
              openedDocument={openedDocument}
              setOpenedDocument={setOpenedDocument}
              map={map}
              selectedRow={selectedRow}
              setSelectedRow={setSelectedRow}
            />

          </div>
          <div className="flex-1 h-full bg-gray-50">
            <Map geoJson={features} onFeatureClick={(feature) => handleFeatureClick(feature)} onMapLoaded={(map) => setMap(map)} />
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
