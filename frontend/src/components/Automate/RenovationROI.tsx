// frontend/src/components/Automate/RenovationROI.tsx

import React, { useState } from 'react';
import { Calculator, Download, Plus, Trash2, DollarSign, Calendar } from 'lucide-react';
import { RehabScope, RehabItem, WorkItemType, WORK_ITEM_COSTS } from '../../shared/types';

interface RenovationROIProps {
  selectedDocuments: any[];
  onGenerateReport: (scope: RehabScope) => void;
}

export const RenovationROI: React.FC<RenovationROIProps> = ({
  selectedDocuments,
  onGenerateReport
}) => {
  const [targetROI, setTargetROI] = useState(15);
  const [budgetCap, setBudgetCap] = useState(100000);
  const [contingencyPercent, setContingencyPercent] = useState(10);
  const [permitFees, setPermitFees] = useState(2000);
  const [workItems, setWorkItems] = useState<RehabItem[]>([]);
  const [isCalculating, setIsCalculating] = useState(false);

  // Get property data from selected documents
  const propertyData = React.useMemo(() => {
    if (selectedDocuments.length === 0) return null;
    
    // Merge data from multiple documents
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

  const propertySize = propertyData?.squareFootage || 1500;

  const addWorkItem = () => {
    const newItem: RehabItem = {
      workType: WorkItemType.FLOORING,
      unitCost: WORK_ITEM_COSTS[WorkItemType.FLOORING].cost,
      quantity: WORK_ITEM_COSTS[WorkItemType.FLOORING].unit === 'sf' ? propertySize : 1,
      unit: WORK_ITEM_COSTS[WorkItemType.FLOORING].unit,
      totalCost: 0
    };
    setWorkItems([...workItems, newItem]);
  };

  const updateWorkItem = (index: number, updates: Partial<RehabItem>) => {
    const updated = [...workItems];
    updated[index] = { ...updated[index], ...updates };
    
    // Recalculate total cost
    if (updates.workType) {
      const config = WORK_ITEM_COSTS[updates.workType as WorkItemType];
      updated[index].unitCost = config.cost;
      updated[index].unit = config.unit;
      if (config.unit === 'sf' && !updates.quantity) {
        updated[index].quantity = propertySize;
      }
    }
    
    updated[index].totalCost = updated[index].unitCost * updated[index].quantity;
    setWorkItems(updated);
  };

  const removeWorkItem = (index: number) => {
    setWorkItems(workItems.filter((_, i) => i !== index));
  };

  const calculateTotals = () => {
    const subtotal = workItems.reduce((sum, item) => sum + item.totalCost, 0);
    const contingencyAmount = subtotal * (contingencyPercent / 100);
    const total = subtotal + contingencyAmount + permitFees;
    return { subtotal, contingencyAmount, total };
  };

  const calculateROI = () => {
    const purchasePrice = propertyData?.listingPrice || 300000;
    const { total: rehabCost } = calculateTotals();
    const totalInvestment = purchasePrice + rehabCost;
    const arv = propertyData?.estimatedARV || purchasePrice * 1.3;
    const profit = arv - totalInvestment;
    return (profit / totalInvestment) * 100;
  };

  const handleGenerateReport = async () => {
    setIsCalculating(true);
    
    const { total } = calculateTotals();
    const roi = calculateROI();
    
    const scope: RehabScope = {
      propertyId: selectedDocuments[0]?.id || '',
      propertySize,
      items: workItems,
      contingencyPercent,
      permitFees,
      totalCost: total,
      timeline: estimateTimeline(),
      projectedROI: roi
    };

    // Simulate API call
    setTimeout(() => {
      onGenerateReport(scope);
      setIsCalculating(false);
    }, 2000);
  };

  const estimateTimeline = () => {
    const timelines = {
      [WorkItemType.ROOF]: 7,
      [WorkItemType.KITCHEN]: 21,
      [WorkItemType.BATH]: 14,
      [WorkItemType.FLOORING]: 7,
      [WorkItemType.INTERIOR_PAINT]: 5,
      [WorkItemType.EXTERIOR_PAINT]: 7,
      [WorkItemType.WINDOWS]: 3,
      [WorkItemType.HVAC]: 5,
      [WorkItemType.ELECTRICAL]: 10,
      [WorkItemType.PLUMBING]: 10,
      [WorkItemType.LANDSCAPING]: 5
    };

    const maxDays = Math.max(...workItems.map(item => timelines[item.workType] || 5));
    const totalDays = workItems.reduce((sum, item) => sum + (timelines[item.workType] || 5), 0);
    return Math.max(maxDays, Math.ceil(totalDays * 0.6));
  };

  const { subtotal, contingencyAmount, total } = calculateTotals();
  const projectedROI = calculateROI();

  if (!propertyData) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <Calculator className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No Property Selected</h3>
          <p className="text-gray-600">Select property documents from the search table to begin ROI analysis</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="bg-white rounded-lg shadow-lg p-6">
        {/* Header */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold mb-2">Renovation ROI Analysis</h2>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <span className="text-gray-600">Property:</span>
              <span className="ml-2 font-medium">{propertyData.address || 'Unknown'}</span>
            </div>
            <div>
              <span className="text-gray-600">Size:</span>
              <span className="ml-2 font-medium">{propertySize.toLocaleString()} sq ft</span>
            </div>
            <div>
              <span className="text-gray-600">Purchase Price:</span>
              <span className="ml-2 font-medium">${(propertyData.listingPrice || 0).toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Settings */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium mb-1">Target ROI (%)</label>
            <input
              type="number"
              value={targetROI}
              onChange={(e) => setTargetROI(Number(e.target.value))}
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Budget Cap</label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
              <input
                type="number"
                value={budgetCap}
                onChange={(e) => setBudgetCap(Number(e.target.value))}
                className="w-full pl-9 pr-3 py-2 border rounded-lg"
              />
            </div>
          </div>
        </div>

        {/* Work Items */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-lg font-semibold">Rehabilitation Scope</h3>
            <button
              onClick={addWorkItem}
              className="flex items-center gap-2 px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              <Plus size={16} />
              Add Work Item
            </button>
          </div>

          <div className="space-y-2">
            {workItems.map((item, index) => (
              <div key={index} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <select
                  value={item.workType}
                  onChange={(e) => updateWorkItem(index, { workType: e.target.value as WorkItemType })}
                  className="flex-1 px-3 py-2 border rounded"
                >
                  {Object.values(WorkItemType).map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
                
                <input
                  type="number"
                  value={item.quantity}
                  onChange={(e) => updateWorkItem(index, { quantity: Number(e.target.value) })}
                  className="w-24 px-3 py-2 border rounded"
                />
                
                <span className="text-sm text-gray-600 w-12">{item.unit}</span>
                
                <div className="flex items-center gap-1">
                  <span className="text-sm text-gray-600">$</span>
                  <input
                    type="number"
                    value={item.unitCost}
                    onChange={(e) => updateWorkItem(index, { unitCost: Number(e.target.value) })}
                    className="w-20 px-2 py-2 border rounded"
                  />
                  <span className="text-sm text-gray-600">/{item.unit}</span>
                </div>
                
                <span className="font-medium w-24 text-right">
                  ${item.totalCost.toLocaleString()}
                </span>
                
                <button
                  onClick={() => removeWorkItem(index)}
                  className="p-1 text-red-600 hover:bg-red-50 rounded"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Cost Summary */}
        <div className="border-t pt-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span>Subtotal</span>
            <span>${subtotal.toLocaleString()}</span>
          </div>
          <div className="flex justify-between text-sm">
            <div className="flex items-center gap-2">
              <span>Contingency</span>
              <input
                type="number"
                value={contingencyPercent}
                onChange={(e) => setContingencyPercent(Number(e.target.value))}
                className="w-16 px-2 py-1 border rounded text-xs"
              />
              <span>%</span>
            </div>
            <span>${contingencyAmount.toLocaleString()}</span>
          </div>
          <div className="flex justify-between text-sm">
            <div className="flex items-center gap-2">
              <span>Permits/Fees</span>
              <input
                type="number"
                value={permitFees}
                onChange={(e) => setPermitFees(Number(e.target.value))}
                className="w-24 px-2 py-1 border rounded text-xs"
              />
            </div>
            <span>${permitFees.toLocaleString()}</span>
          </div>
          <div className="flex justify-between font-semibold text-lg border-t pt-2">
            <span>Total Project Cost</span>
            <span>${total.toLocaleString()}</span>
          </div>
        </div>

        {/* ROI Summary */}
        <div className="mt-6 p-4 bg-blue-50 rounded-lg">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-sm text-gray-600">Total Investment</div>
              <div className="text-xl font-bold">
                ${((propertyData?.listingPrice || 0) + total).toLocaleString()}
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-600">Estimated ARV</div>
              <div className="text-xl font-bold">
                ${(propertyData?.estimatedARV || 0).toLocaleString()}
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-600">Projected ROI</div>
              <div className={`text-2xl font-bold ${projectedROI >= targetROI ? 'text-green-600' : 'text-red-600'}`}>
                {projectedROI.toFixed(1)}%
              </div>
            </div>
          </div>
          
          <div className="mt-4 flex items-center justify-center gap-2 text-sm text-gray-600">
            <Calendar size={16} />
            <span>Estimated Timeline: {estimateTimeline()} days</span>
          </div>
        </div>

        {/* Actions */}
        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={handleGenerateReport}
            disabled={workItems.length === 0 || isCalculating}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isCalculating ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                Generating...
              </>
            ) : (
              <>
                <Download size={16} />
                Generate PDF Report
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};