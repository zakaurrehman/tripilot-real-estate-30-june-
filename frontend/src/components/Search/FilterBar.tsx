// frontend/src/components/Search/FilterBar.tsx

import React, { useState } from 'react';
import { Filter, X, ChevronDown } from 'lucide-react';

interface FilterBarProps {
  onFiltersChange: (filters: any) => void;
  availableFilters: {
    propertyType?: string[];
    lienStatus?: string[];
    priceRange?: { min: number; max: number };
    beds?: number[];
    baths?: number[];
  };
}

export const FilterBar: React.FC<FilterBarProps> = ({
  onFiltersChange,
  availableFilters
}) => {
  const [activeFilters, setActiveFilters] = useState<any>({});
  const [showDropdown, setShowDropdown] = useState<string | null>(null);

  const handleFilterChange = (filterType: string, value: any) => {
    const newFilters = { ...activeFilters };
    
    if (value === null || value === undefined) {
      delete newFilters[filterType];
    } else {
      newFilters[filterType] = value;
    }
    
    setActiveFilters(newFilters);
    onFiltersChange(newFilters);
  };

  const removeFilter = (filterType: string) => {
    handleFilterChange(filterType, null);
  };

  const getFilterLabel = (type: string, value: any): string => {
    switch (type) {
      case 'priceRange':
        return `$${value.min.toLocaleString()} - $${value.max.toLocaleString()}`;
      case 'beds':
      case 'baths':
        return `${value}+`;
      default:
        return String(value);
    }
  };

  return (
    <div className="bg-gray-50 border-b px-4 py-3">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Filter size={16} className="text-gray-500" />
          <span className="text-sm font-medium text-gray-700">Filters:</span>
        </div>

        {/* Filter Dropdowns */}
        <div className="flex items-center gap-2">
          {/* Property Type Filter */}
          {availableFilters.propertyType && (
            <div className="relative">
              <button
                onClick={() => setShowDropdown(showDropdown === 'propertyType' ? null : 'propertyType')}
                className="px-3 py-1 border rounded-lg text-sm hover:bg-gray-100 flex items-center gap-1"
              >
                Property Type
                <ChevronDown size={14} />
              </button>
              
              {showDropdown === 'propertyType' && (
                <div className="absolute top-full mt-1 left-0 bg-white border rounded-lg shadow-lg z-10 min-w-[150px]">
                  {availableFilters.propertyType.map(type => (
                    <button
                      key={type}
                      onClick={() => {
                        handleFilterChange('propertyType', type);
                        setShowDropdown(null);
                      }}
                      className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50"
                    >
                      {type}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Lien Status Filter */}
          {availableFilters.lienStatus && (
            <div className="relative">
              <button
                onClick={() => setShowDropdown(showDropdown === 'lienStatus' ? null : 'lienStatus')}
                className="px-3 py-1 border rounded-lg text-sm hover:bg-gray-100 flex items-center gap-1"
              >
                Lien Status
                <ChevronDown size={14} />
              </button>
              
              {showDropdown === 'lienStatus' && (
                <div className="absolute top-full mt-1 left-0 bg-white border rounded-lg shadow-lg z-10 min-w-[150px]">
                  {availableFilters.lienStatus.map(status => (
                    <button
                      key={status}
                      onClick={() => {
                        handleFilterChange('lienStatus', status);
                        setShowDropdown(null);
                      }}
                      className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50"
                    >
                      {status}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Beds Filter */}
          <div className="relative">
            <button
              onClick={() => setShowDropdown(showDropdown === 'beds' ? null : 'beds')}
              className="px-3 py-1 border rounded-lg text-sm hover:bg-gray-100 flex items-center gap-1"
            >
              Beds
              <ChevronDown size={14} />
            </button>
            
            {showDropdown === 'beds' && (
              <div className="absolute top-full mt-1 left-0 bg-white border rounded-lg shadow-lg z-10">
                {[1, 2, 3, 4, 5].map(num => (
                  <button
                    key={num}
                    onClick={() => {
                      handleFilterChange('beds', num);
                      setShowDropdown(null);
                    }}
                    className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50"
                  >
                    {num}+ beds
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Baths Filter */}
          <div className="relative">
            <button
              onClick={() => setShowDropdown(showDropdown === 'baths' ? null : 'baths')}
              className="px-3 py-1 border rounded-lg text-sm hover:bg-gray-100 flex items-center gap-1"
            >
              Baths
              <ChevronDown size={14} />
            </button>
            
            {showDropdown === 'baths' && (
              <div className="absolute top-full mt-1 left-0 bg-white border rounded-lg shadow-lg z-10">
                {[1, 1.5, 2, 2.5, 3].map(num => (
                  <button
                    key={num}
                    onClick={() => {
                      handleFilterChange('baths', num);
                      setShowDropdown(null);
                    }}
                    className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50"
                  >
                    {num}+ baths
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Active Filters */}
        <div className="flex items-center gap-2 ml-4">
          {Object.entries(activeFilters).map(([type, value]) => (
            <div
              key={type}
              className="flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-sm"
            >
              <span>{getFilterLabel(type, value)}</span>
              <button
                onClick={() => removeFilter(type)}
                className="hover:bg-blue-200 rounded-full p-0.5"
              >
                <X size={12} />
              </button>
            </div>
          ))}
        </div>

        {/* Clear All */}
        {Object.keys(activeFilters).length > 0 && (
          <button
            onClick={() => {
              setActiveFilters({});
              onFiltersChange({});
            }}
            className="text-sm text-gray-600 hover:text-gray-800"
          >
            Clear all
          </button>
        )}
      </div>
    </div>
  );
};