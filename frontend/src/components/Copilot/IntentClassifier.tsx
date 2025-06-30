// frontend/src/components/Copilot/IntentClassifier.tsx

import React from 'react';
import { Search, Wrench, Camera, HelpCircle } from 'lucide-react';

interface IntentClassifierProps {
  intent: 'search' | 'automate' | 'snapshot' | 'unclear';
  message: string;
  onActionClick: (action: string) => void;
}

export const IntentClassifier: React.FC<IntentClassifierProps> = ({
  intent,
  message,
  onActionClick
}) => {
  type ColorType = 'blue' | 'green' | 'purple' | 'gray';

  interface IntentInfo {
    icon: React.ElementType;
    color: ColorType;
    title: string;
    description: string;
    actions: { label: string; action: string }[];
  }

  const getIntentInfo = (): IntentInfo => {
    switch (intent) {
      case 'search':
        return {
          icon: Search,
          color: 'blue',
          title: 'Search Intent Detected',
          description: 'I can help you explore and filter your documents.',
          actions: [
            { label: 'View All Documents', action: 'view-documents' },
            { label: 'Apply Filters', action: 'apply-filters' },
            { label: 'Search Similar', action: 'search-similar' }
          ]
        };

      case 'automate':
        return {
          icon: Wrench,
          color: 'green',
          title: 'Automation Intent Detected',
          description: 'Let me help you automate your analysis.',
          actions: [
            { label: 'Run Renovation ROI', action: 'renovation-roi' },
            { label: 'Match Contractors', action: 'gc-match' },
            { label: 'View Automation History', action: 'automation-history' }
          ]
        };

      case 'snapshot':
        return {
          icon: Camera,
          color: 'purple',
          title: 'Snapshot Intent Detected',
          description: 'I can generate a quick summary for you.',
          actions: [
            { label: 'Generate Fact Sheet', action: 'fact-sheet' },
            { label: 'Quick Property Summary', action: 'quick-summary' },
            { label: 'Export Report', action: 'export-report' }
          ]
        };

      default:
        return {
          icon: HelpCircle,
          color: 'gray',
          title: 'How Can I Help?',
          description: 'I\'m not sure what you\'re looking for. Here are some options:',
          actions: [
            { label: 'Upload Documents', action: 'upload' },
            { label: 'View Tutorial', action: 'tutorial' },
            { label: 'Contact Support', action: 'support' }
          ]
        };
    }
  };

  const info = getIntentInfo();
  const Icon = info.icon;

  const colorClasses: Record<ColorType, string> = {
    blue: 'bg-blue-50 text-blue-700 border-blue-200',
    green: 'bg-green-50 text-green-700 border-green-200',
    purple: 'bg-purple-50 text-purple-700 border-purple-200',
    gray: 'bg-gray-50 text-gray-700 border-gray-200'
  };

  return (
    <div className={`p-4 rounded-lg border ${colorClasses[info.color]}`}>
      <div className="flex items-start gap-3">
        <div className={`p-2 rounded-lg ${info.color === 'blue' ? 'bg-blue-100' : info.color === 'green' ? 'bg-green-100' : info.color === 'purple' ? 'bg-purple-100' : 'bg-gray-100'}`}>
          <Icon size={20} />
        </div>
        
        <div className="flex-1">
          <h4 className="font-semibold mb-1">{info.title}</h4>
          <p className="text-sm opacity-90 mb-3">{info.description}</p>
          
          <div className="flex flex-wrap gap-2">
            {info.actions.map((action, index) => (
              <button
                key={index}
                onClick={() => onActionClick(action.action)}
                className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                  info.color === 'blue' ? 'bg-blue-600 text-white hover:bg-blue-700' :
                  info.color === 'green' ? 'bg-green-600 text-white hover:bg-green-700' :
                  info.color === 'purple' ? 'bg-purple-600 text-white hover:bg-purple-700' :
                  'bg-gray-600 text-white hover:bg-gray-700'
                }`}
              >
                {action.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};