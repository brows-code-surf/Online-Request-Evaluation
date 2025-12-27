'use client';
import { useAuth } from '../../../utils/authContext';

export default function ConfirmModal({
    isOpen,
    title = 'Confirm Action',
    message = 'Are you sure you want to proceed? This action cannot be undone.',
    confirmButtonText = 'Confirm',
    onConfirm,
    onCancel,
    isLoading,
    confirmButtonColor = 'green'
}) {
    const { darkMode } = useAuth();
    if (!isOpen) return null;

    const colorClasses = {
        green: 'bg-green-600 hover:bg-green-700',
        blue: 'bg-blue-600 hover:bg-blue-700',
        red: 'bg-red-600 hover:bg-red-700',
        orange: 'bg-orange-600 hover:bg-orange-700'
    };

    return (
        <div className={`fixed inset-0 ${darkMode ? 'bg-gray-900/50' : 'bg-gray-600/30'} backdrop-blur-sm flex items-center justify-center z-50 p-4`}>
            <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-xl max-w-md w-full p-6`}>
                <h2 className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-gray-900'} mb-4`}>{title}</h2>

                <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'} mb-6`}>
                    {message}
                </p>

                <div className="flex gap-3">
                    <button
                        onClick={onConfirm}
                        disabled={isLoading}
                        className={`flex-1 px-4 py-2 ${colorClasses[confirmButtonColor]} text-white font-medium rounded-lg transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                        {isLoading ? (
                            <>
                                <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                </svg>
                                Processing...
                            </>
                        ) : (
                            <>
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                                {confirmButtonText}
                            </>
                        )}
                    </button>
                    <button
                        onClick={onCancel}
                        disabled={isLoading}
                        className={`flex-1 px-4 py-2 border ${darkMode ? 'border-gray-600' : 'border-gray-300'} ${darkMode ? 'text-gray-200' : 'text-gray-700'} font-medium rounded-lg ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-50'} transition disabled:opacity-50`}
                    >
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    );
}
