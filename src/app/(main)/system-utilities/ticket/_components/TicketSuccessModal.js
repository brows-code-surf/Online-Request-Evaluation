'use client';

import { useEffect } from 'react';
import { useAuth } from '../../../../../utils/authContext';

export default function TicketSuccessModal({ isOpen, onClose, message = "Ticket Created Successfully" }) {
  const { darkMode } = useAuth();
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        onClose();
      }, 3000); // Auto-close after 3 seconds

      return () => clearTimeout(timer);
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-opacity-50 flex items-center justify-center z-50">
      <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4 transform animate-in fade-in-0 zoom-in-95 duration-300`}>
        <div className="text-center">
          {/* Success Icon */}
          <div className={`mx-auto flex items-center justify-center h-16 w-16 rounded-full ${darkMode ? 'bg-green-900' : 'bg-green-100'} mb-4`}>
            <svg className="h-8 w-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>

          {/* Message */}
          <h3 className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-900'} mb-2`}>
            Success!
          </h3>
          <p className={`${darkMode ? 'text-gray-300' : 'text-gray-600'} mb-6`}>
            {message}
          </p>

          {/* Close Button */}
          <button
            onClick={onClose}
            className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-6 rounded-xl transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  );
}
