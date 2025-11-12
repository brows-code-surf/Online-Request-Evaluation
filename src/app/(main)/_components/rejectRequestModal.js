'use client';

export default function RejectRequestModal({
    isOpen,
    remarks,
    onRemarksChange,
    onConfirm,
    onCancel,
    isLoading
}) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-gray-600/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
                <h2 className="text-lg font-bold text-gray-900 mb-4">Reject Request</h2>

                <p className="text-sm text-gray-600 mb-4">
                    Please provide remarks for rejecting this request. This will be included in the rejection email.
                </p>

                <div className="mb-4">
                    <label htmlFor="remarks" className="block text-sm font-medium text-gray-700 mb-2">
                        Rejection Remarks
                    </label>
                    <textarea
                        id="remarks"
                        value={remarks}
                        onChange={(e) => onRemarksChange(e.target.value)}
                        placeholder="Enter reason for rejection..."
                        rows="4"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 text-gray-900 resize-none"
                    />
                </div>

                <div className="flex gap-3">
                    <button
                        onClick={onConfirm}
                        disabled={isLoading || !remarks.trim()}
                        className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                        {isLoading ? 'Rejecting...' : 'Confirm Reject'}
                    </button>
                    <button
                        onClick={onCancel}
                        disabled={isLoading}
                        className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition disabled:opacity-50"
                    >
                        Cancel
                    </button>
                    
                </div>
            </div>
        </div>
    );
}
