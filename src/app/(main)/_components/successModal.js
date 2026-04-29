'use client';

import { useEffect } from 'react';
import { useAuth } from '../../../utils/authContext';

export default function SuccessModal({
    isOpen,
    title = 'Success',
    message = 'Operation completed successfully',
    onClose,
    autoCloseDelay = 3000
}) {
    const { darkMode } = useAuth();
    useEffect(() => {
        if (isOpen && autoCloseDelay > 0) {
            const timer = setTimeout(onClose, autoCloseDelay);
            return () => clearTimeout(timer);
        }
    }, [isOpen, autoCloseDelay, onClose]);

    if (!isOpen) return null;

    return (
        <div className={`fixed inset-0 ${darkMode ? 'bg-gray-900/50' : 'bg-gray-600/30'} backdrop-blur-sm bg-opacity-50  flex items-center justify-center z-50`}>
            <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-xl max-w-sm w-full mx-4 overflow-hidden`}>
                {/* Success Icon */}
                <div className="bg-gradient-to-r from-green-400 to-green-600 p-6 flex justify-center">
                    <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center">
                        <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                    </div>
                </div>

                {/* Content */}
                <div className="p-6 text-center">
                    <h2 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'} mb-2`}>{title}</h2>
                    <p className={`text-gray-600 text-sm mb-6 ${darkMode ? 'text-white' : ''}`}>{message}</p>

                    {/* Close Button */}
                    <button
                        onClick={onClose}
                        className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded-lg transition"
                    >
                        Close
                    </button>
                </div>

                {/* Auto-close indicator */}
                <div className={`h-1 ${darkMode ? 'bg-gray-700' : 'bg-gray-200'}`}>
                    <div
                        className="h-full bg-green-600 transition-all duration-300"
                        style={{
                            animation: `shrink ${autoCloseDelay}ms linear forwards`
                        }}
                    />
                </div>

                <style>{`
                    @keyframes shrink {
                        from {
                            width: 100%;
                        }
                        to {
                            width: 0%;
                        }
                    }
                `}</style>
            </div>
        </div>
    );
}
