// frontend/src/components/Automate/RehabScopeForm.tsx

import React, { useState } from 'react';
import { Plus, Trash2, Calculator, AlertCircle, Check } from 'lucide-react';
import { RehabItem, WorkItemType, WORK_ITEM_COSTS } from '../../shared/types';

interface RehabScopeFormProps {
  propertySize: number;
  onSubmit: (items: RehabItem[], contingency: number, permitFees: number) => void;
  initialItems?: RehabItem[];
}

export const RehabScopeForm: React.FC<RehabScopeFormProps> = ({
  propertySize,
  onSubmit,
  initialItems = []
}) => {
  const [items, setItems] = useState<RehabItem[]>(initialItems);
  const [contingencyPercent, setContingencyPercent] = useState(10);
  const [permitFees, setPermitFees] = useState(2000);
  const [showValidation, setShowValidation] = useState(false);

  const addItem = () => {
    const newItem: RehabItem = {
      workType: WorkItemType.FLOORING,
      unitCost: WORK_ITEM_COSTS[WorkItemType.FLOORING].cost,
      quantity: WORK_ITEM_COSTS[WorkItemType.FLOORING].unit === 'sf' ? propertySize : 1,
      unit: WORK_ITEM_COSTS[WorkItemType.FLOORING].unit,
      totalCost: 0,
      notes: ''
    };
    
    // Calculate total cost
    newItem.totalCost = newItem.unitCost * newItem.quantity;
    setItems([...items, newItem]);
  };

  const updateItem = (index: number, updates: Partial<RehabItem>) => {
    const updated = [...items];
    updated[index] = { ...updated[index], ...updates };
    
    // Recalculate if work type changed
    if (updates.workType) {
      const config = WORK_ITEM_COSTS[updates.workType as WorkItemType];
      updated[index].unitCost = config.cost;
      updated[index].unit = config.unit;
      if (config.unit === 'sf' && !updates.quantity) {
        updated[index].quantity = propertySize;
      }
    }
    
    // Recalculate total
    updated[index].totalCost = updated[index].unitCost * updated[index].quantity;
    setItems(updated);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const calculateTotals = () => {
    const subtotal = items.reduce((sum, item) => sum + item.totalCost, 0);
    const contingencyAmount = subtotal * (contingencyPercent / 100);
    const total = subtotal + contingencyAmount + permitFees;
    return { subtotal, contingencyAmount, total };
  };

  const handleSubmit = () => {
    if (items.length === 0) {
      setShowValidation(true);
      return;
    }
    onSubmit(items, contingencyPercent, permitFees);
  };

  const { subtotal, contingencyAmount, total } = calculateTotals();

  return (
    <div className="space-y-6">
      {/* Work Items Section */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Work Items</h3>
          <button
            onClick={addItem}
            className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
          >
            <Plus size={16} />
            Add Item
          </button>
        </div>

        {showValidation && items.length === 0 && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
            <AlertCircle size={16} className="text-red-600" />
            <span className="text-sm text-red-700">Please add at least one work item</span>
          </div>
        )}

        <div className="space-y-3">
          {items.map((item, index) => (
            <div key={index} className="bg-gray-50 rounded-lg p-4">
              <div className="grid grid-cols-12 gap-3 items-center">
                {/* Work Type */}
                <div className="col-span-4">
                  <label className="text-xs text-gray-600">Work Type</label>
                  <select
                    value={item.workType}
                    onChange={(e) => updateItem(index, { workType: e.target.value as WorkItemType })}
                    className="w-full mt-1 px-3 py-2 border rounded-lg text-sm"
                  >
                    {Object.values(WorkItemType).map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>

                {/* Quantity */}
                <div className="col-span-2">
                  <label className="text-xs text-gray-600">Quantity</label>
                  <input
                    type="number"
                    value={item.quantity}
                    onChange={(e) => updateItem(index, { quantity: Number(e.target.value) })}
                    className="w-full mt-1 px-3 py-2 border rounded-lg text-sm"
                    min="1"
                  />
                </div>

                {/* Unit */}
                <div className="col-span-1">
                  <label className="text-xs text-gray-600">Unit</label>
                  <input
                    type="text"
                    value={item.unit}
                    readOnly
                    className="w-full mt-1 px-3 py-2 bg-gray-100 border rounded-lg text-sm"
                  />
                </div>

                {/* Unit Cost */}
                <div className="col-span-2">
                  <label className="text-xs text-gray-600">Unit Cost</label>
                  <div className="relative mt-1">
                    <span className="absolute left-3 top-2 text-gray-500 text-sm">$</span>
                    <input
                      type="number"
                      value={item.unitCost}
                      onChange={(e) => updateItem(index, { unitCost: Number(e.target.value) })}
                      className="w-full pl-8 pr-3 py-2 border rounded-lg text-sm"
                      min="0"
                    />
                  </div>
                </div>

                {/* Total */}
                <div className="col-span-2">
                  <label className="text-xs text-gray-600">Total</label>
                  <div className="mt-1 px-3 py-2 bg-gray-100 rounded-lg font-medium text-sm">
                    ${item.totalCost.toLocaleString()}
                  </div>
                </div>

                {/* Delete */}
                <div className="col-span-1 flex items-end">
                  <button
                    onClick={() => removeItem(index)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              {/* Notes */}
              <div className="mt-3">
                <input
                  type="text"
                  value={item.notes || ''}
                  onChange={(e) => updateItem(index, { notes: e.target.value })}
                  placeholder="Add notes (optional)"
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Cost Summary */}
      <div className="bg-gray-50 rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4">Cost Summary</h3>
        
        <div className="space-y-3">
          <div className="flex justify-between text-sm">
            <span>Subtotal</span>
            <span className="font-medium">${subtotal.toLocaleString()}</span>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm">Contingency</span>
              <input
                type="number"
                value={contingencyPercent}
                onChange={(e) => setContingencyPercent(Number(e.target.value))}
                className="w-16 px-2 py-1 border rounded text-sm"
                min="0"
                max="50"
              />
              <span className="text-sm">%</span>
            </div>
            <span className="font-medium text-sm">${contingencyAmount.toLocaleString()}</span>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm">Permits/Fees</span>
              <div className="relative">
                <span className="absolute left-2 top-1 text-gray-500 text-sm">$</span>
                <input
                  type="number"
                  value={permitFees}
                  onChange={(e) => setPermitFees(Number(e.target.value))}
                  className="w-24 pl-6 pr-2 py-1 border rounded text-sm"
                  min="0"
                />
              </div>
            </div>
            <span className="font-medium text-sm">${permitFees.toLocaleString()}</span>
          </div>

          <div className="pt-3 border-t">
            <div className="flex justify-between items-center">
              <span className="text-lg font-semibold">Total Project Cost</span>
              <span className="text-xl font-bold text-blue-600">${total.toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Submit Button */}
      <div className="flex justify-end">
        <button
          onClick={handleSubmit}
          className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Calculator size={20} />
          Calculate ROI & Generate Report
        </button>
      </div>
    </div>
  );
};