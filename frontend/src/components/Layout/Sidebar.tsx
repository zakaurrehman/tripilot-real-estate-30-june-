// frontend/src/components/Layout/Sidebar.tsx

import React, { useState } from 'react';
import { Search, Wrench, Camera, ChevronLeft, ChevronRight, CreditCard, Settings } from 'lucide-react';
import { LapisUsage } from '../../../../shared/types';

interface SidebarProps {
  activeTask: 'search' | 'automate' | 'snapshot';
  onTaskChange: (task: 'search' | 'automate' | 'snapshot') => void;
  lapisUsage: LapisUsage;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTask,
  onTaskChange,
  lapisUsage,
  isCollapsed,
  onToggleCollapse
}) => {
  const totalUsed = lapisUsage.search + lapisUsage.automate + lapisUsage.snapshot;
  const usagePercent = (totalUsed / lapisUsage.total) * 100;

  const tasks = [
    { id: 'search', icon: Search, label: 'Search', cost: 2 },
    { id: 'automate', icon: Wrench, label: 'Automate', cost: 8 },
    { id: 'snapshot', icon: Camera, label: 'Snapshot', cost: 1 }
  ] as const;

  return (
    <div className={`bg-gray-900 text-white transition-all duration-300 ${
      isCollapsed ? 'w-16' : 'w-64'
    } h-full flex flex-col`}>
      {/* Logo Section */}
      <div className="p-4 border-b border-gray-800">
        <div className="flex items-center justify-between">
          <h1 className={`font-bold text-xl ${isCollapsed ? 'hidden' : 'block'}`}>
            TriPilot
          </h1>
          <button
            onClick={onToggleCollapse}
            className="p-1 hover:bg-gray-800 rounded"
          >
            {isCollapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
          </button>
        </div>
      </div>

      {/* Task Navigation */}
      <nav className="flex-1 p-4">
        {tasks.map((task) => {
          const Icon = task.icon;
          const isActive = activeTask === task.id;
          
          return (
            <button
              key={task.id}
              onClick={() => onTaskChange(task.id)}
              className={`w-full flex items-center gap-3 p-3 rounded-lg mb-2 transition-colors ${
                isActive 
                  ? 'bg-blue-600 text-white' 
                  : 'hover:bg-gray-800 text-gray-300'
              }`}
            >
              <Icon size={20} />
              {!isCollapsed && (
                <>
                  <span className="flex-1 text-left">{task.label}</span>
                  <span className="text-xs opacity-70">{task.cost}L</span>
                </>
              )}
            </button>
          );
        })}
      </nav>

      {/* Usage Section */}
      <div className="p-4 border-t border-gray-800">
        {!isCollapsed && (
          <>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-400">Usage</span>
              <span className="text-sm font-medium">{lapisUsage.remaining} Lapis</span>
            </div>
            <div className="w-full bg-gray-800 rounded-full h-2 mb-3">
              <div 
                className={`h-2 rounded-full transition-all ${
                  usagePercent > 80 ? 'bg-red-500' : usagePercent > 50 ? 'bg-yellow-500' : 'bg-green-500'
                }`}
                style={{ width: `${usagePercent}%` }}
              />
            </div>
          </>
        )}
        
        <button className={`w-full flex items-center gap-3 p-3 rounded-lg hover:bg-gray-800 text-gray-300 ${
          isCollapsed ? 'justify-center' : ''
        }`}>
          <CreditCard size={20} />
          {!isCollapsed && <span className="flex-1 text-left">Manage Subscription</span>}
        </button>
      </div>
    </div>
  );
};