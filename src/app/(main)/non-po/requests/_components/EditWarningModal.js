'use client';

import { useAuth } from '@/utils/authContext';

export function EditWarningModal({ isOpen, onClose, onConfirm, isLoading }) {
    const { darkMode } = useAuth();
    if (!isOpen) return null;

    return (
        <div className={`fixed inset-0 ${darkMode ? 'bg-gray-900/60' : 'bg-gray-600/30'} backdrop-blur-sm flex items-center justify-center z-50 p-4`}>
            <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-xl max-w-md w-full p-6`}>
                <div className="flex items-start gap-3 mb-4">
                    <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${darkMode ? 'bg-amber-900/30' : 'bg-amber-100'}`}>
                        <svg className={`w-5 h-5 ${darkMode ? 'text-amber-400' : 'text-amber-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                    </div>
                    <div>
                        <h2 className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                            Unsaved changes
                        </h2>
                    </div>
                </div>

                <p className={`text-sm mb-6 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                    You have unsaved changes. Are you sure you want to leave without saving?
                </p>

                <div className="flex gap-3">
                    <button
                        onClick={onClose}
                        disabled={isLoading}
                        className={`flex-1 px-4 py-2 border font-medium rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed ${darkMode ? 'border-gray-600 text-gray-200 hover:bg-gray-700' : 'border-gray-300 text-gray-700 hover:bg-gray-50'}`}
                    >
                        Stay
                    </button>

                    <button
                        onClick={onConfirm}
                        disabled={isLoading}
                        className={`flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                        {isLoading ? (
                            <span className="flex items-center justify-center gap-2">
                                <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                </svg>
                                Leaving...
                            </span>
                        ) : (
                            'Leave'
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}