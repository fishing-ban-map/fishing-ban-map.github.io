import { useState } from 'react';
import type { FishingBanRegion, Document as DocumentType } from '../types/regions';
import Document from './Document';

// Utility function to process HTML content and add target="_blank" to links
const processHtmlContent = (html: string): string => {
  // Create a temporary div to parse the HTML
  const div = document.createElement('div');
  div.innerHTML = html;

  // Find all links and modify them
  const links = div.getElementsByTagName('a');
  for (let i = 0; i < links.length; i++) {
    const link = links[i];
    const href = link.getAttribute('href');

    if (href) {
      try {
        // Parse the original URL to get the pathname
        const url = new URL(href, window.location.origin);
        // Create new URL with moktu.fish.gov.ru domain
        const newUrl = new URL(url.pathname, 'https://moktu.fish.gov.ru');
        // Update the href
        link.setAttribute('href', newUrl.toString());
      } catch (e) {
        // If URL parsing fails, try to directly prepend the domain
        if (href.startsWith('/')) {
          link.setAttribute('href', `https://moktu.fish.gov.ru${href}`);
        } else {
          link.setAttribute('href', `https://moktu.fish.gov.ru/${href}`);
        }
      }
    }

    // Add target="_blank" and security attributes
    link.setAttribute('target', '_blank');
    link.setAttribute('rel', 'noopener noreferrer');
  }

  return div.innerHTML;
};

interface RegionProps {
  region: FishingBanRegion;
  onBack: () => void;
  openedDocument: DocumentType | null;
  setOpenedDocument: (document: DocumentType | null) => void;
  map: maplibregl.Map | null;
  selectedRow: number | null;
  setSelectedRow: (row: number | null) => void;
}

export default function Region({ region, onBack, openedDocument, setOpenedDocument, map, selectedRow, setSelectedRow }: RegionProps) {
  const [error, setError] = useState<string | null>(null);
  const handleDocumentClick = async (index: number) => {
    setOpenedDocument(region.documents[index]);
  };

  const handleDocumentBack = () => {
    setOpenedDocument(null);
    setError(null);
  };

  // If a document is selected, show the Document component
  if (openedDocument) {
    return (
      <Document
        document={openedDocument}
        onBack={handleDocumentBack}
        map={map}
        selectedRow={selectedRow}
        setSelectedRow={setSelectedRow}
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
          Назад
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
          dangerouslySetInnerHTML={{ __html: processHtmlContent(region.contentHtml) }}
        />
      </div>

      {/* Documents section */}
      {region.documents.length > 0 && (
        <div className="bg-white rounded-lg shadow p-4">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">
            Участки
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
                className="flex items-center p-2 mb-2 border rounded-lg cursor-pointer transition-all duration-200 hover:bg-gray-50 hover:translate-y-[-1px] hover:shadow-sm"
              >
                <button
                  onClick={() => handleDocumentClick(index)}
                  className="flex items-center text-gray-700  w-full text-left hover:cursor-pointer"
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
                  <span>{doc.title}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
} 