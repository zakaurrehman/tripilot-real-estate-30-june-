// frontend/src/components/Common/ProgressRipple.tsx

import React from 'react';

interface ProgressRippleProps {
  progress: number; // 0-100
  status: 'idle' | 'processing' | 'completed' | 'error';
  label?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const ProgressRipple: React.FC<ProgressRippleProps> = ({
  progress,
  status,
  label,
  size = 'md'
}) => {
  const sizeClasses = {
    sm: 'w-32 h-1',
    md: 'w-48 h-2',
    lg: 'w-64 h-3'
  };

  const getStatusColor = () => {
    switch (status) {
      case 'completed':
        return 'bg-green-500';
      case 'error':
        return 'bg-red-500';
      case 'processing':
        return 'bg-blue-500';
      default:
        return 'bg-gray-300';
    }
  };

  return (
    <div className="relative">
      {/* Progress Bar Container */}
      <div className={`${sizeClasses[size]} bg-gray-200 rounded-full overflow-hidden relative`}>
        {/* Progress Fill */}
        <div
          className={`h-full ${getStatusColor()} transition-all duration-300 ease-out relative`}
          style={{ width: `${progress}%` }}
        >
          {/* Ripple Effect */}
          {status === 'processing' && (
            <div className="absolute inset-0 overflow-hidden">
              <div className="absolute inset-0 opacity-30">
                <div className="absolute -inset-4 bg-white animate-pulse" />
              </div>
              <div 
                className="absolute top-0 -left-full h-full w-full bg-gradient-to-r from-transparent via-white to-transparent opacity-30"
                style={{
                  animation: 'ripple 1.5s linear infinite'
                }}
              />
            </div>
          )}
        </div>
      </div>

      {/* Label */}
      {label && (
        <div className="mt-1 text-xs text-gray-600 flex items-center justify-between">
          <span>{label}</span>
          <span className="font-medium">{progress}%</span>
        </div>
      )}

      {/* Status Indicator */}
      {status === 'completed' && (
        <div className="absolute -right-8 top-1/2 -translate-y-1/2 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
          <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        </div>
      )}

      {status === 'error' && (
        <div className="absolute -right-8 top-1/2 -translate-y-1/2 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
          <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>
      )}

      <style>{`
        @keyframes ripple {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(200%);
          }
        }
      `}</style>
    </div>
  );
};