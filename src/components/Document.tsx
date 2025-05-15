import { useEffect, useRef, useState } from 'react';
import type { Document as DocumentType, TableRow } from '../types/regions';
import maplibregl from 'maplibre-gl';

interface DocumentViewProps {
  document: DocumentType;
  onBack: () => void;
  map: maplibregl.Map | null;
  selectedRow: number | null;
  setSelectedRow: (row: number | null) => void;
}

interface RowProps {
  row: TableRow
  isExpanded: boolean;
  onToggle: () => void;
  map: maplibregl.Map | null;
  selectedRow: number | null;
  setSelectedRow: (row: number | null) => void;
}

function DocumentRow({ row, isExpanded, onToggle, map, selectedRow, setSelectedRow }: RowProps) {
  const displayText = row.header
  const hasPoints = row.points && row.points.length > 0

  return (
    <div className={`border-b border-gray-200 last:border-0 ${isExpanded ? 'bg-gray-300' : hasPoints ? 'hover:bg-gray-100' : ''}`}>
      <div
        className={`p-1 flex items-center justify-between ${hasPoints ? 'cursor-pointer' : ''
          }`}
        onClick={() => {
          if (hasPoints) {
            onToggle()
            if (map && row.points && row.points.length > 0) {
              // Calculate bounds from points
              const bounds = row.points.reduce((acc, point) => {
                if (!acc) {
                  return [[point.lon, point.lat], [point.lon, point.lat]] as [[number, number], [number, number]];
                }
                return [
                  [Math.min(acc[0][0], point.lon), Math.min(acc[0][1], point.lat)],
                  [Math.max(acc[1][0], point.lon), Math.max(acc[1][1], point.lat)]
                ] as [[number, number], [number, number]];
              }, null as [[number, number], [number, number]] | null);

              if (bounds) {
                // Convert bounds to LngLatBoundsLike format
                const lngLatBounds: maplibregl.LngLatBoundsLike = [
                  bounds[0][0], // west
                  bounds[0][1], // south
                  bounds[1][0], // east
                  bounds[1][1]  // north
                ];

                map.fitBounds(lngLatBounds, {
                  padding: 100,
                  duration: 2000
                });
              }
            }
          }
        }}
      >
        <div className={`flex-1 overflow-hidden ${!isExpanded ? 'text-ellipsis whitespace-nowrap' : ''}`}>{displayText}</div>
        {hasPoints && (
          <svg
            className={`w-5 h-5 transform transition-transform ${isExpanded ? 'rotate-180' : ''
              }`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        )}
      </div>
      {isExpanded && hasPoints && row.points && (
        <div className="p-4 pl-10">
          <h4 className="font-medium mb-2">Координаты:</h4>
          <div className="space-y-2">
            {row.points.map((point, idx) => (
              <div key={idx} className="flex items-start space-x-2 cursor-pointer hover:bg-gray-400" onClick={() => {
                if (map) {
                  map.flyTo({
                    center: [point.lon, point.lat],
                    speed: 0.5,
                    curve: 1.5
                  })
                }
              }}>
                <span className="font-medium min-w-[24px]">{point.index}.</span>
                <span>{point.original}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function Document({ document, onBack, map, selectedRow, setSelectedRow }: DocumentViewProps) {

  const toggleRow = (index: number) => {
    setSelectedRow(selectedRow === index ? null : index)
  };
  const selectedRowRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (selectedRowRef.current) {
      if (!selectedRowRef.current.getBoundingClientRect().top || selectedRowRef.current.getBoundingClientRect().top < 0 || selectedRowRef.current.getBoundingClientRect().bottom > window.innerHeight) {
        selectedRowRef.current.scrollIntoView({ behavior: 'smooth' })
      }
    }
  }, [selectedRow, selectedRowRef])

  return (
    <div className="p-5 h-full flex flex-col">
      {/* Header with back button */}
      <div className="flex items-center mb-5">
        <button
          onClick={onBack}
          className="flex items-center text-blue-600 hover:text-blue-800 transition-colors"
        >
          <svg
            className="w-5 h-5 mr-1"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
          Назад
        </button>
      </div>

      {/* Document title */}
      <h1 className="text-lg font-bold text-gray-900 mb-4">
        {document.header ? (document.header.charAt(0).toUpperCase() + document.header.slice(1).toLowerCase()) : ''}
      </h1>

      <div className="flex-1 overflow-y-auto shadow-md rounded-lg p-4">
        {document.rows.map((row, idx) => (
          <div key={idx} ref={idx === selectedRow ? selectedRowRef : undefined}>
            <DocumentRow row={row} isExpanded={idx === selectedRow} onToggle={() => toggleRow(idx)} map={map} selectedRow={selectedRow} setSelectedRow={setSelectedRow} />
          </div>
        ))}
      </div>
    </div>
  );
} 