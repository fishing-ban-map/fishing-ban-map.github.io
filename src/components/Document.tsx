import { useState } from 'react';
import type { Document as DocumentType, TableRow } from '../types/regions';

interface DocumentViewProps {
  document: DocumentType;
  onBack: () => void;
}

interface RowProps {
  row: (string | TableRow)[];
  isExpanded: boolean;
  onToggle: () => void;
}

function DocumentRow({ row, isExpanded, onToggle }: RowProps) {
  const tableRow = row[1] as TableRow;
  const hasPoints = row.length > 1 && typeof row[1] === 'object' && 'points' in tableRow && tableRow.points && tableRow.points.length > 0;
  
  const displayText = row.map(it => typeof it === 'string' ? it : it.original).join(' ');

  return (
    <div className="border-b border-gray-200 last:border-0">
      <div 
        className={`p-4 hover:bg-gray-50 flex items-center justify-between ${
          hasPoints ? 'cursor-pointer' : ''
        }`}
        onClick={() => hasPoints && onToggle()}
      >
        <div className="flex-1">{displayText}</div>
        {hasPoints && (
          <svg
            className={`w-5 h-5 transform transition-transform ${
              isExpanded ? 'rotate-180' : ''
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
      {isExpanded && hasPoints && tableRow.points && (
        <div className="bg-gray-50 p-4">
          <h4 className="font-medium mb-2">Координаты:</h4>
          <div className="space-y-2">
            {tableRow.points.map((point, idx) => (
              <div key={idx} className="flex items-start space-x-2">
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

export default function Document({ document, onBack }: DocumentViewProps) {
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());

  const toggleRow = (index: number) => {
    const newExpandedRows = new Set(expandedRows);
    if (expandedRows.has(index)) {
      newExpandedRows.delete(index);
    } else {
      newExpandedRows.add(index);
    }
    setExpandedRows(newExpandedRows);
  };

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
          Back to region
        </button>
      </div>

      {/* Document title */}
      <h1 className="text-2xl font-bold text-gray-900 mb-4">
        {document.title}
      </h1>

      {/* Content section */}
      <div className="bg-white rounded-lg shadow mb-4 flex-grow overflow-y-auto">
        <div 
          className="p-4 prose prose-sm max-w-none"
          dangerouslySetInnerHTML={{ __html: document.content }}
        />
      </div>
    </div>
  );
} 