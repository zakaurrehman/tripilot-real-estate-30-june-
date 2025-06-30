// frontend/src/components/Search/ColumnToggle.tsx

import React, { useState } from 'react';
import { Eye, EyeOff, Check } from 'lucide-react';

interface ColumnToggleProps {
  availableColumns: string[];
  visibleColumns: Set<string>;
  onToggle: (columns: Set<string>) => void;
}

export const ColumnToggle: React.FC<ColumnToggleProps> = ({
  availableColumns,
  visibleColumns,
  onToggle
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const coreColumns = [
    'filename', 'address', 'beds', 'baths', 'squareFootage', 
    'listingPrice', 'estimatedARV', 'lienStatus', 'infrastructureScore'
  ];

  const handleToggleColumn = (column: string) => {
    const newColumns = new Set(visibleColumns);
    if (newColumns.has(column)) {
      newColumns.delete(column);
    } else {
      newColumns.add(column);
    }
    onToggle(newColumns);
  };

  const handleToggleAll = (show: boolean) => {
    if (show) {
      onToggle(new Set(availableColumns));
    } else {
      onToggle(new Set(coreColumns.filter(col => availableColumns.includes(col))));
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 border rounded-lg hover:bg-gray-50"
      >
        <Eye size={16} />
        <span className="text-sm">Columns</span>
        <span className="text-xs bg-gray-200 px-1.5 py-0.5 rounded">
          {visibleColumns.size}
        </span>
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-10" 
            onClick={() => setIsOpen(false)}
          />
          
          {/* Dropdown */}
          <div className="absolute right-0 top-full mt-2 w-64 bg-white border rounded-lg shadow-lg z-20">
            <div className="p-3 border-b">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium">Toggle Columns</h3>
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ×
                </button>
              </div>
              
              <div className="flex gap-2">
                <button
                  onClick={() => handleToggleAll(true)}
                  className="flex-1 text-xs px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded"
                >
                  Show All
                </button>
                <button
                  onClick={() => handleToggleAll(false)}
                  className="flex-1 text-xs px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded"
                >
                  Core Only
                </button>
              </div>
            </div>

            <div className="max-h-64 overflow-y-auto">
              {/* Core Columns Section */}
              <div className="p-2">
                <div className="text-xs text-gray-500 uppercase px-2 py-1">Core Fields</div>
                {coreColumns
                  .filter(col => availableColumns.includes(col))
                  .map(column => (
                    <label
                      key={column}
                      className="flex items-center gap-2 px-2 py-1.5 hover:bg-gray-50 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={visibleColumns.has(column)}
                        onChange={() => handleToggleColumn(column)}
                        className="rounded border-gray-300"
                      />
                      <span className="text-sm flex-1">{formatColumnName(column)}</span>
                      {visibleColumns.has(column) && (
                        <Check size={14} className="text-green-600" />
                      )}
                    </label>
                  ))}
              </div>

              {/* Additional Columns Section */}
              <div className="p-2 border-t">
                <div className="text-xs text-gray-500 uppercase px-2 py-1">Additional Fields</div>
                {availableColumns
                  .filter(col => !coreColumns.includes(col))
                  .map(column => (
                    <label
                      key={column}
                      className="flex items-center gap-2 px-2 py-1.5 hover:bg-gray-50 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={visibleColumns.has(column)}
                        onChange={() => handleToggleColumn(column)}
                        className="rounded border-gray-300"
                      />
                      <span className="text-sm flex-1">{formatColumnName(column)}</span>
                      {visibleColumns.has(column) && (
                        <Check size={14} className="text-green-600" />
                      )}
                    </label>
                  ))}
              </div>
            </div>

            <div className="p-2 border-t bg-gray-50 text-xs text-gray-600">
              Showing {visibleColumns.size} of {availableColumns.length} columns
            </div>
          </div>
        </>
      )}
    </div>
  );
};

function formatColumnName(column: string): string {
  return column
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, str => str.toUpperCase())
    .trim();
}