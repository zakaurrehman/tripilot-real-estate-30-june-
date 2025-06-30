// frontend/src/components/Layout/CollapsibleSidebar.tsx

import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface CollapsibleSidebarProps {
  isCollapsed: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}

export const CollapsibleSidebar: React.FC<CollapsibleSidebarProps> = ({
  isCollapsed,
  onToggle,
  children
}) => {
  return (
    <div className={`relative transition-all duration-300 ${
      isCollapsed ? 'w-16' : 'w-64'
    }`}>
      {children}
      
      <button
        onClick={onToggle}
        className="absolute -right-3 top-8 w-6 h-6 bg-gray-800 text-white rounded-full flex items-center justify-center hover:bg-gray-700 transition-colors"
      >
        {isCollapsed ? (
          <ChevronRight size={14} />
        ) : (
          <ChevronLeft size={14} />
        )}
      </button>
    </div>
  );
};