import type { FishingBanRegion } from '../types/regions';

interface RegionProps {
  region: FishingBanRegion;
  onBack: () => void;
}

export default function Region({ region, onBack }: RegionProps) {
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
          Back to list
        </button>
      </div>

      {/* Region title */}
      <h1 className="text-2xl font-bold text-gray-900 mb-4">
        {region.region}
      </h1>

      {/* Content section */}
      <div className="bg-white rounded-lg shadow mb-4 flex-grow overflow-y-auto">
        <div 
          className="p-4 prose prose-sm max-w-none"
          dangerouslySetInnerHTML={{ __html: region.contentHtml }}
        />
      </div>

      {/* Documents section */}
      {region.documents.length > 0 && (
        <div className="bg-white rounded-lg shadow p-4">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">
            Documents
          </h2>
          <ul className="space-y-2">
            {region.documents.map((doc, index) => (
              <li 
                key={index}
                className="flex items-center text-gray-700 hover:text-blue-600"
              >
                <svg 
                  className="w-5 h-5 mr-2" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={2} 
                    d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" 
                  />
                </svg>
                <a 
                  href={doc.url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="hover:underline"
                >
                  {doc.title}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
} 