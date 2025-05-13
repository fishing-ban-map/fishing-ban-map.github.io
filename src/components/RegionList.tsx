import { useState } from 'react';
import type { FishingBanRegion } from '../types/regions';
import Region from './Region';

interface RegionListProps {
  regions: FishingBanRegion[];
  selectedRegion: string | null;
  onRegionSelect: (region: string) => void;
}

export default function RegionList({ regions, selectedRegion, onRegionSelect }: RegionListProps) {
  const [selectedRegionData, setSelectedRegionData] = useState<FishingBanRegion | null>(null);

  const handleRegionClick = (region: FishingBanRegion) => {
    setSelectedRegionData(region);
    onRegionSelect(region.region);
  };

  const handleBack = () => {
    setSelectedRegionData(null);
    onRegionSelect('');
  };

  if (selectedRegionData) {
    return <Region region={selectedRegionData} onBack={handleBack} />;
  }

  return (
    <div className="p-5 h-full flex flex-col">
      <h2 className="mb-5 text-2xl font-semibold text-gray-800">
        Fishing Ban Regions
      </h2>
      <div className="flex-1 overflow-y-auto">
        {regions.map((region) => (
          <div
            key={region.region}
            className={`p-4 mb-3 border rounded-lg cursor-pointer transition-all duration-200 hover:bg-gray-50 hover:translate-y-[-1px] hover:shadow-sm ${
              selectedRegion === region.region 
                ? 'bg-blue-50 border-blue-500' 
                : 'border-gray-200'
            }`}
            onClick={() => handleRegionClick(region)}
          >
            <h3 className="mb-2 text-lg font-medium text-blue-700">
              {region.region}
            </h3>
            {region.documents.length > 0 && (
              <div className="text-sm text-gray-600">
                <p className="mb-1">
                  Documents: {region.documents.length}
                </p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
} 