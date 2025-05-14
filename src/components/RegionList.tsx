import { useState } from 'react';
import type { FishingBanRegion, Document } from '../types/regions';
import Region from './Region';

interface RegionListProps {
  regions: FishingBanRegion[];
  selectedRegion: FishingBanRegion | null;
  onRegionSelect: (region: FishingBanRegion | null) => void;
  selectedDocuments: Document[];
  setSelectedDocuments: (documents: Document[]) => void;
  openedDocument: Document | null;
  setOpenedDocument: (document: Document | null) => void;
  map: maplibregl.Map | null;
  selectedRow: number | null;
  setSelectedRow: (row: number | null) => void;
}

export default function RegionList({ regions, selectedRegion, onRegionSelect, selectedDocuments, setSelectedDocuments, openedDocument, setOpenedDocument, map, selectedRow, setSelectedRow }: RegionListProps) {
  const handleBack = () => {
    onRegionSelect(null);
  };

  if (selectedRegion) {
    return <Region region={selectedRegion} onBack={handleBack} openedDocument={openedDocument} setOpenedDocument={setOpenedDocument} map={map} selectedRow={selectedRow} setSelectedRow={setSelectedRow} />;
  }

  return (
    <div className="p-5 h-full flex flex-col">
      <h2 className="mb-1 text-2xl font-semibold text-gray-800">
        Области
      </h2>
      <div className="p-2 border-b border-gray-200">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            className="h-4 w-4 text-blue-600 rounded border-gray-300"
            checked={selectedDocuments.length === regions.flatMap(r => r.documents).length}
            onChange={(e) => {
              if (e.target.checked) {
                // Select all documents from all regions
                setSelectedDocuments(regions.flatMap(r => r.documents));
              } else {
                // Deselect all
                setSelectedDocuments([]);
              }
            }}
          />
          <span className="text-sm font-medium">Выбрать все участки</span>
        </label>       
         <label className="flex items-center gap-2">
          <input
            type="checkbox"
            className="h-4 w-4 text-blue-600 rounded border-gray-300"
            checked={regions.flatMap(r => r.documents).filter(d => d.header?.toLowerCase().includes('нерест')).every(d => selectedDocuments.includes(d))}
            onChange={(e) => {
              if (e.target.checked) {
                // Select all documents from all regions
                setSelectedDocuments(regions.flatMap(r => r.documents).filter(d => d.header?.toLowerCase().includes('нерест')));
              } else {
                // Deselect all
                setSelectedDocuments(selectedDocuments.filter(d => !d.header?.toLowerCase().includes('нерест')));
              }
            }}
          />
          <span className="text-sm font-medium">Нерестовые участки</span>
        </label>

        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            className="h-4 w-4 text-blue-600 rounded border-gray-300"
            checked={regions.flatMap(r => r.documents).filter(d => d.header?.toLowerCase().includes('зимоваль')).every(d => selectedDocuments.includes(d))}
            onChange={(e) => {
              if (e.target.checked) {
                // Select all documents from all regions
                setSelectedDocuments(regions.flatMap(r => r.documents).filter(d => d.header?.toLowerCase().includes('зимоваль') || selectedDocuments.includes(d)));
              } else {
                // Deselect all
                setSelectedDocuments(selectedDocuments.filter(d => !d.header?.toLowerCase().includes('зимоваль')));
              }
            }}
          />
          <span className="text-sm font-medium">Зимовальные ямы</span>
        </label>
      </div>
      <div className="flex-1 overflow-y-auto">
        {regions.map((region) => (
          <div
            key={region.region}
            className={`flex flex-col p-2 mb-2 border rounded-lg cursor-pointer transition-all duration-200 hover:bg-gray-50 hover:translate-y-[-1px] hover:shadow-sm ${selectedRegion === region.region
              ? 'bg-blue-50 border-blue-500'
              : 'border-gray-200'
              }`}
          >
            <span className="mb text-lg" onClick={() => onRegionSelect(region)}>
              {region.region} ({region.documents.length})
            </span>
            {region.documents.map((document, idx) => (
              <div className="flex flex-col" key={idx}>
                <label className="text-sm whitespace-nowrap overflow-hidden text-ellipsis flex items-center gap-1">
                  <input
                    type="checkbox"
                    className="h-4 w-4 text-blue-600 rounded border-gray-300"
                    checked={selectedDocuments.includes(document)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedDocuments([...selectedDocuments, document]);
                      } else {
                        setSelectedDocuments(selectedDocuments.filter(d => d !== document));
                      }
                    }}
                  />
                  {document.header?.toLowerCase()}
                </label>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
} 