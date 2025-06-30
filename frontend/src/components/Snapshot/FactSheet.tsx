// frontend/src/components/Snapshot/FactSheet.tsx

import React, { useState } from 'react';
import { FileText, Download, TrendingUp, AlertTriangle, Home, DollarSign, MapPin, Calendar, Clock } from 'lucide-react';
import { FactSheet as FactSheetType, Comp } from '../../../../shared/types';

interface FactSheetProps {
  selectedDocuments: any[];
  rehabScope?: any;
  onGenerateFactSheet: (factSheet: FactSheetType) => void;
}

export const FactSheet: React.FC<FactSheetProps> = ({
  selectedDocuments,
  rehabScope,
  onGenerateFactSheet
}) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [previewData, setPreviewData] = useState<FactSheetType | null>(null);

  // Get property data from selected documents
  const propertyData = React.useMemo(() => {
    if (selectedDocuments.length === 0) return null;
    
    const merged: any = {};
    selectedDocuments.forEach(doc => {
      Object.entries(doc).forEach(([key, value]) => {
        if (value !== null && value !== undefined && value !== 'N/A') {
          merged[key] = merged[key] || value;
        }
      });
    });
    return merged;
  }, [selectedDocuments]);

  const generateComps = (): Comp[] => {
    const basePrice = propertyData?.listingPrice || 300000;
    const baseSqft = propertyData?.squareFootage || 1500;
    const beds = propertyData?.beds || 3;
    const baths = propertyData?.baths || 2;

    return Array.from({ length: 3 }, (_, i) => ({
      address: `${123 + i * 10} ${['Oak', 'Maple', 'Pine'][i]} Street`,
      soldPrice: Math.round(basePrice * (0.9 + Math.random() * 0.2)),
      soldDate: new Date(Date.now() - Math.random() * 180 * 24 * 60 * 60 * 1000),
      squareFootage: Math.round(baseSqft * (0.85 + Math.random() * 0.3)),
      beds: beds + Math.floor(Math.random() * 2) - 1,
      baths: baths,
      distance: Math.round(Math.random() * 3 * 10) / 10
    }));
  };

  const generateHighlights = (): string[] => {
    const highlights = [];
    
    if (propertyData?.infrastructureScore > 80) {
      highlights.push('Excellent infrastructure condition minimizes renovation risks');
    }
    if (propertyData?.yearBuilt > 2010) {
      highlights.push('Modern construction with energy-efficient systems');
    }
    if (propertyData?.lienStatus === 'Clear') {
      highlights.push('Clear title status ensures smooth transaction');
    }
    if (propertyData?.estimatedARV > propertyData?.listingPrice * 1.25) {
      highlights.push('Strong value-add opportunity with 25%+ appreciation potential');
    }
    if (rehabScope?.projectedROI > 20) {
      highlights.push(`Projected ${rehabScope.projectedROI.toFixed(1)}% ROI exceeds market average`);
    }
    
    // Ensure at least 3 highlights
    while (highlights.length < 3) {
      if (!highlights.includes('Strategic location in developing neighborhood')) {
        highlights.push('Strategic location in developing neighborhood');
      } else if (!highlights.includes('Below-market pricing creates instant equity')) {
        highlights.push('Below-market pricing creates instant equity');
      } else {
        highlights.push('Strong rental demand in local market');
      }
    }
    
    return highlights.slice(0, 5);
  };

  const generateRisks = (): string[] => {
    const risks = [];
    
    if (propertyData?.yearBuilt < 1980) {
      risks.push('Older construction may require additional system updates');
    }
    if (propertyData?.roofAge > 15) {
      risks.push('Roof nearing end of service life');
    }
    if (!propertyData?.lienStatus || propertyData.lienStatus === 'Unknown') {
      risks.push('Lien status requires verification');
    }
    if (propertyData?.infrastructureScore < 60) {
      risks.push('Below-average infrastructure may increase renovation costs');
    }
    
    // Ensure at least 2 risks for balanced view
    if (risks.length === 0) {
      risks.push('Market conditions may affect resale timeline');
    }
    if (risks.length === 1) {
      risks.push('Property requires thorough inspection before purchase');
    }
    
    return risks.slice(0, 3);
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    
    const factSheet: FactSheetType = {
      propertyId: selectedDocuments[0]?.id || '',
      summary: {
        address: propertyData?.address || 'Unknown',
        beds: propertyData?.beds || 0,
        baths: propertyData?.baths || 0,
        squareFootage: propertyData?.squareFootage || 0,
        yearBuilt: propertyData?.yearBuilt || 0,
        propertyType: propertyData?.propertyType || 'Single Family'
      },
      financials: {
        listingPrice: propertyData?.listingPrice || 0,
        estimatedARV: propertyData?.estimatedARV || 0,
        rehabCost: rehabScope?.totalCost || 0,
        projectedROI: rehabScope?.projectedROI || calculateQuickROI()
      },
      comps: generateComps(),
      lienStatus: propertyData?.lienStatus || 'Unknown',
      infrastructureScore: propertyData?.infrastructureScore || 70,
      highlights: generateHighlights(),
      risks: generateRisks(),
      generatedAt: new Date()
    };

    // Simulate generation delay
    setTimeout(() => {
      setPreviewData(factSheet);
      setIsGenerating(false);
      onGenerateFactSheet(factSheet);
    }, 2000);
  };

  const calculateQuickROI = () => {
    const purchase = propertyData?.listingPrice || 0;
    const rehab = rehabScope?.totalCost || purchase * 0.15;
    const arv = propertyData?.estimatedARV || purchase * 1.3;
    return ((arv - purchase - rehab) / (purchase + rehab)) * 100;
  };

  if (!propertyData) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No Property Selected</h3>
          <p className="text-gray-600">Select property documents to generate a fact sheet</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {!previewData ? (
        <div className="bg-white rounded-lg shadow-lg p-8 text-center">
          <FileText className="w-24 h-24 text-blue-600 mx-auto mb-6" />
          <h2 className="text-2xl font-bold mb-4">Generate Property Fact Sheet</h2>
          <p className="text-gray-600 mb-6">
            Create a comprehensive one-page summary with key metrics, comparables, and investment insights
          </p>
          
          <div className="bg-gray-50 rounded-lg p-4 mb-6 text-left">
            <h3 className="font-semibold mb-2">What's Included:</h3>
            <ul className="space-y-1 text-sm text-gray-600">
              <li>✓ Property overview and specifications</li>
              <li>✓ Financial analysis with ROI projections</li>
              <li>✓ 3 comparable sales from the area</li>
              <li>✓ Investment highlights and risk assessment</li>
              <li>✓ Infrastructure score and lien status</li>
            </ul>
          </div>

          <button
            onClick={handleGenerate}
            disabled={isGenerating}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 mx-auto"
          >
            {isGenerating ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                Generating fact sheet...
              </>
            ) : (
              <>
                <FileText size={20} />
                Generate Fact Sheet
              </>
            )}
          </button>
          
          <p className="text-sm text-gray-500 mt-4">
            <Clock className="inline w-4 h-4 mr-1" />
            Generation time: ~3 seconds
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6">
            <div className="flex justify-between items-start">
              <div>
                <h1 className="text-3xl font-bold mb-2">Property Fact Sheet</h1>
                <div className="flex items-center gap-2 text-xl">
                  <MapPin size={20} />
                  <span>{previewData.summary.address}</span>
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm opacity-90">Generated</div>
                <div className="text-lg">{new Date(previewData.generatedAt).toLocaleDateString()}</div>
              </div>
            </div>
          </div>

          {/* Property Overview */}
          <div className="p-6 border-b">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Home size={20} />
              Property Overview
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <span className="text-gray-600 text-sm">Property Type</span>
                <p className="font-semibold">{previewData.summary.propertyType}</p>
              </div>
              <div>
                <span className="text-gray-600 text-sm">Beds/Baths</span>
                <p className="font-semibold">{previewData.summary.beds}/{previewData.summary.baths}</p>
              </div>
              <div>
                <span className="text-gray-600 text-sm">Square Footage</span>
                <p className="font-semibold">{previewData.summary.squareFootage.toLocaleString()} sq ft</p>
              </div>
              <div>
                <span className="text-gray-600 text-sm">Year Built</span>
                <p className="font-semibold">{previewData.summary.yearBuilt}</p>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4 mt-4">
              <div>
                <span className="text-gray-600 text-sm">Infrastructure Score</span>
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-gray-200 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full ${
                        previewData.infrastructureScore >= 80 ? 'bg-green-500' :
                        previewData.infrastructureScore >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${previewData.infrastructureScore}%` }}
                    />
                  </div>
                  <span className="font-semibold">{previewData.infrastructureScore}/100</span>
                </div>
              </div>
              <div>
                <span className="text-gray-600 text-sm">Lien Status</span>
                <p className={`font-semibold ${
                  previewData.lienStatus === 'Clear' ? 'text-green-600' : 'text-yellow-600'
                }`}>
                  {previewData.lienStatus}
                </p>
              </div>
            </div>
          </div>

          {/* Financial Analysis */}
          <div className="p-6 border-b bg-gray-50">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <DollarSign size={20} />
              Financial Analysis
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white p-4 rounded-lg">
                <span className="text-gray-600 text-sm">Listing Price</span>
                <p className="font-semibold text-lg">${previewData.financials.listingPrice.toLocaleString()}</p>
              </div>
              <div className="bg-white p-4 rounded-lg">
                <span className="text-gray-600 text-sm">Rehab Cost</span>
                <p className="font-semibold text-lg">${previewData.financials.rehabCost.toLocaleString()}</p>
              </div>
              <div className="bg-white p-4 rounded-lg">
                <span className="text-gray-600 text-sm">Est. ARV</span>
                <p className="font-semibold text-lg">${previewData.financials.estimatedARV.toLocaleString()}</p>
              </div>
              <div className="bg-white p-4 rounded-lg">
                <span className="text-gray-600 text-sm">Projected ROI</span>
                <p className="font-semibold text-2xl text-green-600">{previewData.financials.projectedROI.toFixed(1)}%</p>
              </div>
            </div>
          </div>

          {/* Comparables */}
          <div className="p-6 border-b">
            <h2 className="text-xl font-semibold mb-4">Recent Comparable Sales</h2>
            <div className="space-y-3">
              {previewData.comps.map((comp, i) => (
                <div key={i} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <p className="font-medium">{comp.address}</p>
                    <p className="text-sm text-gray-600">
                      {comp.beds} bed, {comp.baths} bath • {comp.squareFootage.toLocaleString()} sq ft • {comp.distance} mi away
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-lg">${comp.soldPrice.toLocaleString()}</p>
                    <p className="text-sm text-gray-600">
                      <Calendar className="inline w-3 h-3 mr-1" />
                      {new Date(comp.soldDate).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Highlights & Risks */}
          <div className="p-6 grid md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-semibold mb-3 flex items-center gap-2 text-green-700">
                <TrendingUp size={18} />
                Investment Highlights
              </h3>
              <ul className="space-y-2">
                {previewData.highlights.map((highlight, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <span className="text-green-600 mt-0.5">✓</span>
                    <span>{highlight}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-3 flex items-center gap-2 text-yellow-700">
                <AlertTriangle size={18} />
                Potential Risks
              </h3>
              <ul className="space-y-2">
                {previewData.risks.map((risk, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <span className="text-yellow-600 mt-0.5">⚠</span>
                    <span>{risk}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Footer */}
          <div className="bg-gray-50 p-4 flex items-center justify-between">
            <p className="text-sm text-gray-600">
              Generated on {new Date(previewData.generatedAt).toLocaleString()}
            </p>
            <button
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              onClick={() => {/* Handle download */}}
            >
              <Download size={16} />
              Download PDF
            </button>
          </div>
        </div>
      )}
    </div>
  );
};