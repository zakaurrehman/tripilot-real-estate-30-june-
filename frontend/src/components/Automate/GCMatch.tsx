// frontend/src/components/Automate/GCMatch.tsx

import React, { useState } from 'react';
import { Users, MapPin, Calendar, Send, Check, X } from 'lucide-react';
import { RehabScope, Contractor } from '../../shared/types';

interface GCMatchProps {
  rehabScope: RehabScope | null;
  onSendRFPs: (contractors: Contractor[], startDate: string, zipCode: string) => void;
}

export const GCMatch: React.FC<GCMatchProps> = ({ rehabScope, onSendRFPs }) => {
  const [startDate, setStartDate] = useState('');
  const [zipCode, setZipCode] = useState('');
  const [isMatching, setIsMatching] = useState(false);
  const [matchedContractors, setMatchedContractors] = useState<Contractor[]>([]);
  const [selectedContractors, setSelectedContractors] = useState<Set<string>>(new Set());

  const handleMatch = async () => {
    setIsMatching(true);
    
    // Simulate contractor matching
    setTimeout(() => {
      const mockContractors: Contractor[] = [
        {
          id: 'gc-001',
          name: 'Premier Construction LLC',
          email: 'contact@premierconstruction.com',
          phone: '555-0101',
          specialties: ['Kitchen', 'Bath', 'Flooring'] as any,
          rating: 4.8,
          availability: true,
          priceRange: 'medium',
          location: zipCode
        },
        {
          id: 'gc-002',
          name: 'Quality Builders Inc',
          email: 'info@qualitybuilders.com',
          phone: '555-0102',
          specialties: ['Roof', 'HVAC', 'Electrical Re-wire'] as any,
          rating: 4.5,
          availability: true,
          priceRange: 'high',
          location: zipCode
        },
        {
          id: 'gc-003',
          name: 'HomeReno Experts',
          email: 'projects@homereno.com',
          phone: '555-0103',
          specialties: ['Kitchen', 'Interior Paint', 'Exterior Paint'] as any,
          rating: 4.2,
          availability: true,
          priceRange: 'low',
          location: zipCode
        }
      ];
      
      setMatchedContractors(mockContractors);
      setSelectedContractors(new Set(mockContractors.slice(0, 3).map(c => c.id)));
      setIsMatching(false);
    }, 1500);
  };

  const handleSendRFPs = () => {
    const selected = matchedContractors.filter(c => selectedContractors.has(c.id));
    onSendRFPs(selected, startDate, zipCode);
  };

  if (!rehabScope) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Generate Rehab Scope First</h3>
          <p className="text-gray-600">Run Renovation ROI analysis to create a rehab scope before matching contractors</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-2xl font-bold mb-6">GC-Match: Find Contractors</h2>

        {/* Rehab Scope Summary */}
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <h3 className="font-semibold mb-2">Project Summary</h3>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <span className="text-gray-600">Total Cost:</span>
              <span className="ml-2 font-medium">${rehabScope.totalCost.toLocaleString()}</span>
            </div>
            <div>
              <span className="text-gray-600">Timeline:</span>
              <span className="ml-2 font-medium">{rehabScope.timeline} days</span>
            </div>
            <div>
              <span className="text-gray-600">Work Items:</span>
              <span className="ml-2 font-medium">{rehabScope.items.length}</span>
            </div>
          </div>
          <div className="mt-2">
            <span className="text-gray-600 text-sm">Scope includes: </span>
            <span className="text-sm">
              {rehabScope.items.map(item => item.workType).join(', ')}
            </span>
          </div>
        </div>

        {/* Match Parameters */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium mb-1">Desired Start Date</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full pl-9 pr-3 py-2 border rounded-lg"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Project Location (ZIP)</label>
            <div className="relative">
              <MapPin className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={zipCode}
                onChange={(e) => setZipCode(e.target.value)}
                placeholder="Enter ZIP code"
                className="w-full pl-9 pr-3 py-2 border rounded-lg"
              />
            </div>
          </div>
        </div>

        {/* Match Button */}
        {matchedContractors.length === 0 && (
          <button
            onClick={handleMatch}
            disabled={!startDate || !zipCode || isMatching}
            className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isMatching ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                Matching contractors...
              </>
            ) : (
              <>
                <Users size={20} />
                Find Matching Contractors
              </>
            )}
          </button>
        )}

        {/* Matched Contractors */}
        {matchedContractors.length > 0 && (
          <div className="space-y-4">
            <h3 className="font-semibold">Matched Contractors</h3>
            
            {matchedContractors.map((contractor) => (
              <div
                key={contractor.id}
                className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                  selectedContractors.has(contractor.id) ? 'border-blue-500 bg-blue-50' : 'hover:bg-gray-50'
                }`}
                onClick={() => {
                  const newSelected = new Set(selectedContractors);
                  if (newSelected.has(contractor.id)) {
                    newSelected.delete(contractor.id);
                  } else {
                    newSelected.add(contractor.id);
                  }
                  setSelectedContractors(newSelected);
                }}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={selectedContractors.has(contractor.id)}
                        onChange={() => {}}
                        className="mt-1"
                      />
                      <div>
                        <h4 className="font-semibold">{contractor.name}</h4>
                        <div className="flex items-center gap-4 mt-1 text-sm text-gray-600">
                          <span>⭐ {contractor.rating}</span>
                          <span>📧 {contractor.email}</span>
                          <span>📞 {contractor.phone}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="mt-2 ml-7">
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-gray-600">Specialties:</span>
                        <div className="flex gap-1">
                          {contractor.specialties.map((specialty, i) => (
                            <span
                              key={i}
                              className={`px-2 py-0.5 rounded text-xs ${
                                rehabScope.items.some(item => item.workType === specialty)
                                  ? 'bg-green-100 text-green-700'
                                  : 'bg-gray-100 text-gray-600'
                              }`}
                            >
                              {specialty}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className="flex items-center gap-4 mt-1 text-sm">
                        <span className="text-gray-600">
                          Price Range: <span className="font-medium">{contractor.priceRange}</span>
                        </span>
                        <span className="text-gray-600">
                          Status: {contractor.availability ? (
                            <span className="text-green-600 font-medium">Available</span>
                          ) : (
                            <span className="text-red-600 font-medium">Busy</span>
                          )}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <div className="text-lg font-semibold">
                      ${Math.round(rehabScope.totalCost * (
                        contractor.priceRange === 'low' ? 0.85 :
                        contractor.priceRange === 'high' ? 1.15 : 1
                      )).toLocaleString()}
                    </div>
                    <div className="text-xs text-gray-500">Estimated</div>
                  </div>
                </div>
              </div>
            ))}

            {/* Send RFPs Button */}
            <div className="mt-6 flex justify-end">
              <button
                onClick={handleSendRFPs}
                disabled={selectedContractors.size === 0}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send size={16} />
                Send RFPs to {selectedContractors.size} Contractor{selectedContractors.size !== 1 ? 's' : ''}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};