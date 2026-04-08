'use client';
import { useAuth } from '@/utils/authContext';

export default function RejectOptionModal({
    isOpen,
    onConfirm,
    onCancel,
    isLoading,
    darkMode: propDarkMode
}) {
    let darkMode = propDarkMode;
    const auth = useAuth();
    if (!darkMode && auth?.darkMode !== undefined) {
        darkMode = auth.darkMode;
    }

    if (!isOpen) return null;

    const options = [
        {
            id: 'PO',
            label: 'Reject P.O.',
            description: 'Reject the Purchase Order',
            icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z'
        },
        {
            id: 'PR',
            label: 'Reject P.R.',
            description: 'Reject the Purchase Request',
            icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z'
        }
    ];

    return (
        <div className={`fixed inset-0 ${darkMode ? 'bg-gray-900/50' : 'bg-gray-600/30'} backdrop-blur-sm flex items-center justify-center z-50 p-4`}>
            <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-xl max-w-md w-full p-6`}>
                <h2 className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-gray-900'} mb-2`}>
                    Select Rejection Type
                </h2>

                <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'} mb-6`}>
                    Choose what you want to reject:
                </p>

                <div className="space-y-3 mb-6">
                    {options.map((option) => (
                        <button
                            key={option.id}
                            onClick={() => onConfirm(option.id)}
                            disabled={isLoading}
                            className={`w-full p-4 border rounded-lg flex items-center gap-4 transition text-left ${
                                darkMode 
                                    ? 'border-gray-600 hover:bg-gray-700 hover:border-gray-500' 
                                    : 'border-gray-300 hover:bg-gray-50 hover:border-gray-400'
                            } disabled:opacity-50 disabled:cursor-not-allowed`}
                        >
                            <div className={`p-2 rounded-lg ${darkMode ? 'bg-red-900/30' : 'bg-red-100'}`}>
                                <svg className={`w-5 h-5 ${darkMode ? 'text-red-400' : 'text-red-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={option.icon} />
                                </svg>
                            </div>
                            <div className="flex-1">
                                <p className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                                    {option.label}
                                </p>
                                <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                    {option.description}
                                </p>
                            </div>
                            <svg className={`w-5 h-5 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                        </button>
                    ))}
                </div>

                <button
                    onClick={onCancel}
                    disabled={isLoading}
                    className={`w-full px-4 py-2 border ${darkMode ? 'border-gray-600 text-gray-200 hover:bg-gray-700' : 'border-gray-300 text-gray-700 hover:bg-gray-50'} font-medium rounded-lg transition disabled:opacity-50`}
                >
                    Cancel
                </button>
            </div>
        </div>
    );
}