'use client';

import React from 'react';

export default function EmergencyServices() {
  const handleEmergencyCall = () => {
    window.location.href = 'tel:911';
  };

  return (
    <div className="min-h-screen p-4">
      {/* Emergency Header */}
      <div className="max-w-2xl mx-auto text-center mb-8">
        <h1 className="text-3xl font-bold text-red-500 mb-4">
          Emergency Services
        </h1>
        <p className="text-gray-300 mb-2">
          If you are experiencing a medical emergency, please don't hesitate to call for help
        </p>
      </div>

      {/* Emergency Call Button */}
      <div className="max-w-md mx-auto mb-12">
        <button
          onClick={handleEmergencyCall}
          className="w-full py-6 px-4 bg-red-600 hover:bg-red-700 text-white text-2xl font-bold rounded-lg shadow-lg transition-colors duration-200 flex items-center justify-center space-x-3"
        >
          <svg 
            className="w-8 h-8" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" 
            />
          </svg>
          <span>Call Emergency Number</span>
        </button>
      </div>

      {/* Important Information */}
      <div className="max-w-2xl mx-auto">
        <div className="bg-gray-900 rounded-lg p-6 shadow-sm border border-gray-800">
          <h2 className="text-xl font-semibold mb-4 text-white">When to Call 911:</h2>
          <ul className="space-y-2 text-gray-300">
            <li className="flex items-center">
              <span className="mr-2 text-red-500">•</span>
              Chest pain or difficulty breathing
            </li>
            <li className="flex items-center">
              <span className="mr-2 text-red-500">•</span>
              Severe bleeding or head trauma
            </li>
            <li className="flex items-center">
              <span className="mr-2 text-red-500">•</span>
              Loss of consciousness
            </li>
            <li className="flex items-center">
              <span className="mr-2 text-red-500">•</span>
              Suspected stroke or heart attack
            </li>
            <li className="flex items-center">
              <span className="mr-2 text-red-500">•</span>
              Severe allergic reactions
            </li>
          </ul>
        </div>

        <div className="mt-6 text-sm text-gray-400 text-center">
          <p>
            If you're not sure whether it's an emergency,
            it's better to call an emergency numer and let professionals assess the situation.
          </p>
        </div>
      </div>
    </div>
  );
}
