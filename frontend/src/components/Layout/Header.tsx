// frontend/src/components/Layout/Header.tsx

import React from 'react';
import { Bell, Settings, User, HelpCircle } from 'lucide-react';

interface HeaderProps {
  title: string;
  lapisRemaining: number;
  subscriptionType: string;
  onSettingsClick?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  title,
  lapisRemaining,
  subscriptionType,
  onSettingsClick
}) => {
  return (
    <header className="bg-white shadow-sm px-6 py-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
        
        <div className="flex items-center gap-4">
          {/* Lapis Credits Badge */}
          <div className="flex items-center gap-2 px-3 py-1 bg-blue-100 text-blue-700 rounded-full">
            <span className="text-sm font-medium uppercase">{subscriptionType}</span>
            <span className="text-sm">• {lapisRemaining} Lapis</span>
          </div>

          {/* Notification Icon */}
          <button
            className="p-2 rounded-full hover:bg-gray-100 transition"
            aria-label="Notifications"
          >
            <Bell size={20} />
          </button>

          {/* Help Icon */}
          <button
            className="p-2 rounded-full hover:bg-gray-100 transition"
            aria-label="Help"
          >
            <HelpCircle size={20} />
          </button>

          {/* User Icon */}
          <button
            className="p-2 rounded-full hover:bg-gray-100 transition"
            aria-label="User"
          >
            <User size={20} />
          </button>

          {/* Settings Icon */}
          <button
            className="p-2 rounded-full hover:bg-gray-100 transition"
            aria-label="Settings"
            onClick={onSettingsClick}
          >
            <Settings size={20} />
          </button>
        </div>
      </div>
    </header>
  );
};