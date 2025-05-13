import { useEffect, useState } from 'react';
import RegionList from './components/RegionList';
import Map from './components/Map';
import type { FishingBanRegion } from './types/regions';

function App() {
  const [regions, setRegions] = useState<FishingBanRegion[]>([]);
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null);

  useEffect(() => {
    // Load regions data
    fetch('/data/fishing-ban-regions.json')
      .then(response => response.json())
      .then(data => {
        setRegions(data.regions || []);
      })
      .catch(error => {
        console.error('Error loading regions:', error);
      });
  }, []);

  return (
    <div className="flex h-screen w-screen overflow-hidden">
      <div className="w-[400px] h-full border-r border-gray-200 overflow-y-auto bg-white">
        <RegionList 
          regions={regions}
          selectedRegion={selectedRegion}
          onRegionSelect={setSelectedRegion}
        />
      </div>
      <div className="flex-1 h-full bg-gray-50">
        <Map />
      </div>
    </div>
  );
}

export default App;
