// frontend/src/components/Search/DocumentTable.tsx

import React, { useState, useEffect } from 'react';
import { ChevronUp, ChevronDown, Eye, EyeOff, Filter, Download, X } from 'lucide-react';
import { ExtractedFields } from '../../../../shared/types';

interface DocumentTableProps {
  documents: any[];
  onFieldUpdate: (documentId: string, field: string, value: any) => void;
  onDocumentSelect: (documentIds: string[]) => void;
  onRunAutomation?: (documentIds: string[]) => void;
}

export const DocumentTable: React.FC<DocumentTableProps> = ({
  documents,
  onFieldUpdate,
  onDocumentSelect,
  onRunAutomation
}) => {
  const [sortField, setSortField] = useState<string>('uploadedAt');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [visibleColumns, setVisibleColumns] = useState<Set<string>>(new Set());
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [editingCell, setEditingCell] = useState<{ docId: string; field: string } | null>(null);
  const [editValue, setEditValue] = useState('');

  // Core columns that should always be visible
  const coreColumns = [
    'filename', 'address', 'beds', 'baths', 'squareFootage', 
    'listingPrice', 'estimatedARV', 'lienStatus', 'infrastructureScore'
  ];

  // All available columns from documents
  const allColumns = React.useMemo(() => {
    const columnSet = new Set<string>(['filename', 'uploadedAt', 'status']);
    documents.forEach(doc => {
      Object.keys(doc).forEach(key => {
        if (key !== 'id' && key !== 'type') {
          columnSet.add(key);
        }
      });
    });
    return Array.from(columnSet);
  }, [documents]);

  useEffect(() => {
    // Initialize visible columns with core columns
    setVisibleColumns(new Set(coreColumns.filter(col => allColumns.includes(col))));
  }, [allColumns]);

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const handleEdit = (docId: string, field: string, currentValue: any) => {
    setEditingCell({ docId, field });
    setEditValue(String(currentValue || ''));
  };

  const handleSaveEdit = () => {
    if (editingCell) {
      onFieldUpdate(editingCell.docId, editingCell.field, editValue);
      setEditingCell(null);
    }
  };

  const handleSelectRow = (docId: string) => {
    const newSelected = new Set(selectedRows);
    if (newSelected.has(docId)) {
      newSelected.delete(docId);
    } else {
      newSelected.add(docId);
    }
    setSelectedRows(newSelected);
    onDocumentSelect(Array.from(newSelected));
  };

  const filteredAndSortedDocs = React.useMemo(() => {
    let filtered = documents.filter(doc => {
      return Object.entries(filters).every(([field, value]) => {
        if (!value) return true;
        const docValue = String(doc[field] || '').toLowerCase();
        return docValue.includes(value.toLowerCase());
      });
    });

    return filtered.sort((a, b) => {
      const aVal = a[sortField] || '';
      const bVal = b[sortField] || '';
      const compare = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
      return sortDirection === 'asc' ? compare : -compare;
    });
  }, [documents, filters, sortField, sortDirection]);

  const renderCellValue = (doc: any, field: string) => {
    const value = doc[field];
    
    if (value === null || value === undefined) {
      return <span className="text-gray-400 italic">N/A</span>;
    }

    // Format specific field types
    if (field.includes('Price') || field === 'estimatedARV' || field === 'taxAssessment') {
      return typeof value === 'number' ? `$${value.toLocaleString()}` : value;
    }
    
    if (field === 'squareFootage' || field === 'lotSize') {
      return typeof value === 'number' ? `${value.toLocaleString()} sq ft` : value;
    }

    if (field === 'uploadedAt' && value instanceof Date) {
      return new Date(value).toLocaleDateString();
    }

    if (field === 'infrastructureScore' && typeof value === 'number') {
      const color = value >= 80 ? 'text-green-600' : value >= 60 ? 'text-yellow-600' : 'text-red-600';
      return <span className={`font-semibold ${color}`}>{value}/100</span>;
    }

    if (field === 'lienStatus') {
      const color = value === 'Clear' ? 'text-green-600' : value === 'Unknown' ? 'text-gray-500' : 'text-red-600';
      return <span className={color}>{value}</span>;
    }

    return String(value);
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-lg shadow">
      {/* Toolbar */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-semibold">Property Documents</h2>
          <span className="text-sm text-gray-500">
            {filteredAndSortedDocs.length} of {documents.length} documents
          </span>
        </div>
        
        <div className="flex items-center gap-2">
          {/* Column Visibility Toggle */}
          <div className="relative">
            <button
              className="p-2 hover:bg-gray-100 rounded-lg flex items-center gap-2"
              onClick={() => {/* Toggle column picker */}}
            >
              <Eye size={16} />
              <span className="text-sm">Columns</span>
            </button>
          </div>

          {/* Export Button */}
          <button className="p-2 hover:bg-gray-100 rounded-lg">
            <Download size={16} />
          </button>
        </div>
      </div>

      {/* Filter Row */}
      <div className="flex items-center gap-2 p-2 bg-gray-50 border-b">
        <Filter size={16} className="text-gray-500" />
        {Array.from(visibleColumns).slice(0, 5).map(column => (
          <input
            key={column}
            type="text"
            placeholder={`Filter ${column}`}
            className="px-2 py-1 text-sm border rounded flex-1"
            value={filters[column] || ''}
            onChange={(e) => setFilters({ ...filters, [column]: e.target.value })}
          />
        ))}
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        <table className="w-full">
          <thead className="bg-gray-50 sticky top-0">
            <tr>
              <th className="p-2 text-left">
                <input
                  type="checkbox"
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedRows(new Set(documents.map(d => d.id)));
                    } else {
                      setSelectedRows(new Set());
                    }
                  }}
                />
              </th>
              {Array.from(visibleColumns).map(column => (
                <th
                  key={column}
                  className="p-2 text-left text-sm font-medium text-gray-700 cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort(column)}
                >
                  <div className="flex items-center gap-1">
                    {column}
                    {sortField === column && (
                      sortDirection === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredAndSortedDocs.map((doc) => (
              <tr key={doc.id} className="border-b hover:bg-gray-50">
                <td className="p-2">
                  <input
                    type="checkbox"
                    checked={selectedRows.has(doc.id)}
                    onChange={() => handleSelectRow(doc.id)}
                  />
                </td>
                {Array.from(visibleColumns).map(column => (
                  <td
                    key={column}
                    className="p-2 text-sm"
                    onDoubleClick={() => handleEdit(doc.id, column, doc[column])}
                  >
                    {editingCell?.docId === doc.id && editingCell?.field === column ? (
                      <input
                        type="text"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onBlur={handleSaveEdit}
                        onKeyPress={(e) => e.key === 'Enter' && handleSaveEdit()}
                        className="w-full px-1 py-0.5 border rounded"
                        autoFocus
                      />
                    ) : (
                      renderCellValue(doc, column)
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Selected Actions */}
      {selectedRows.size > 0 && (
        <div className="p-4 bg-blue-50 border-t flex items-center justify-between">
          <span className="text-sm text-blue-700">
            {selectedRows.size} document{selectedRows.size > 1 ? 's' : ''} selected
          </span>
          <div className="flex gap-2">
              <button
             onClick={() => onRunAutomation?.(Array.from(selectedRows))}
             className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
           >
             Run Automation
           </button>
            <button className="px-3 py-1 bg-gray-600 text-white rounded hover:bg-gray-700 text-sm">
              Generate Snapshot
            </button>
          </div>
        </div>
      )}
    </div>
  );
};