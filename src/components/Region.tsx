import { useState } from 'react';
import type { FishingBanRegion, Document as DocumentType } from '../types/regions';
import Document from './Document';

interface RegionProps {
  region: FishingBanRegion;
  onBack: () => void;
}

export default function Region({ region, onBack }: RegionProps) {
  const [selectedDocument, setSelectedDocument] = useState<DocumentType | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleDocumentClick = async (index: number) => {
    setSelectedDocument(region.documents[index]);
  };

  const handleDocumentBack = () => {
    setSelectedDocument(null);
    setError(null);
  };

  // If a document is selected, show the Document component
  if (selectedDocument) {
    return (
      <Document 
        document={selectedDocument}
        onBack={handleDocumentBack}
      />
    );
  }

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
          {error && (
            <div className="mb-3 p-3 bg-red-50 text-red-700 rounded-md">
              {error}
            </div>
          )}
          <ul className="space-y-2">
            {region.documents.map((doc, index) => (
              <li 
                key={index}
                className="flex items-center"
              >
                <button
                  onClick={() => handleDocumentClick(index)}
                  className="flex items-center text-gray-700 hover:text-blue-600 w-full text-left"
                >
                  <svg 
                    className="w-5 h-5 mr-2 flex-shrink-0" 
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
                  <span className="hover:underline">{doc.title}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
} 