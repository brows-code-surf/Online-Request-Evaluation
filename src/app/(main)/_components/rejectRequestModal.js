'use client';
import { useAuth } from '../../../utils/authContext';

export default function RejectRequestModal({
    isOpen,
    remarks,
    onRemarksChange,
    onConfirm,
    onCancel,
    isLoading,
    title = "Reject Request",
    message = "Please provide remarks for rejecting this request. This will be included in the rejection email.",
    label = "Rejection Remarks",
    placeholder = "Enter reason for rejection...",
    confirmButtonText = "Confirm Reject",
    confirmButtonColor = "red",
    iconPath = "M6 18L18 6M6 6l12 12",
    rejectionType = null,
    showQuantity = false,
    quantity,
    onQuantityChange,
    quantityLabel = "Quantity to Cancel",
    maxQuantity = null
}) {
    const { darkMode } = useAuth();
    if (!isOpen) return null;

    const rejectionTypeLabels = {
        'PO': 'Purchase Order (P.O.)',
        'COQ': 'Canvassed Order Quotation (C.O.Q.)',
        'PR': 'Purchase Request (P.R.)'
    };

    return (
        <div className={`fixed inset-0 ${darkMode ? 'bg-gray-900/50' : 'bg-gray-600/30'} backdrop-blur-sm flex items-center justify-center z-50 p-4`}>
            <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-xl max-w-md w-full p-6`}>
                <h2 className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-gray-900'} mb-4`}>{title}</h2>

                {rejectionType && (
                    <div className={`mb-4 p-3 rounded-lg ${darkMode ? 'bg-red-900/20 border border-red-600' : 'bg-red-50 border border-red-200'}`}>
                        <p className={`text-sm ${darkMode ? 'text-red-300' : 'text-red-700'}`}>
                            <span className="font-semibold">Rejecting:</span> {rejectionTypeLabels[rejectionType] || rejectionType}
                        </p>
                    </div>
                )}

                <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'} mb-4`}>
                    {message}
                </p>

                {showQuantity && (
                    <div className="mb-4">
                        <label htmlFor="quantity" className={`block text-sm font-medium ${darkMode ? 'text-gray-200' : 'text-gray-700'} mb-2`}>
                            {quantityLabel}
                        </label>
                        <input
                            id="quantity"
                            type="number"
                            min="1"
                            max={maxQuantity}
                            value={quantity}
                            onChange={(e) => onQuantityChange(Number(e.target.value))}
                            className={`w-full px-3 py-2 border ${darkMode ? 'border-gray-600' : 'border-gray-300'} rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 ${darkMode ? 'text-white bg-gray-700' : 'text-gray-900 bg-white'}`}
                            required
                        />
                    </div>
                )}

                <div className="mb-4">
                    <label htmlFor="remarks" className={`block text-sm font-medium ${darkMode ? 'text-gray-200' : 'text-gray-700'} mb-2`}>
                        {label}
                    </label>
                    <textarea
                        id="remarks"
                        value={remarks}
                        onChange={(e) => onRemarksChange(e.target.value)}
                        placeholder={placeholder}
                        rows="4"
                        className={`w-full px-3 py-2 border ${darkMode ? 'border-gray-600' : 'border-gray-300'} rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 ${darkMode ? 'text-white bg-gray-700' : 'text-gray-900 bg-white'} resize-none`}
                        required
                    />
                </div>

                <div className="flex gap-3">
                    <button
                        onClick={onConfirm}
                        disabled={isLoading || !remarks.trim() || (showQuantity && (!quantity || quantity <= 0))}
                        className={`flex-1 px-4 py-2 bg-${confirmButtonColor}-600 hover:bg-${confirmButtonColor}-700 text-white font-medium rounded-lg transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={iconPath} />
                        </svg>
                        {isLoading ? `${confirmButtonText.replace('Confirm ', '')}ing...` : confirmButtonText}
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
