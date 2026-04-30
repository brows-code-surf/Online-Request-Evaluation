'use client';

import { useAuth } from '../../../utils/authContext';

export default function Pagination({
    currentPage,
    totalPages,
    totalItems,
    itemsPerPage,
    onPageChange,
    onItemsPerPageChange,
    showItemsPerPageSelector = true
}) {
    const { darkMode } = useAuth();
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = Math.min(startIndex + itemsPerPage, totalItems);

    return (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-4">
            {/* Items per page selector */}
            {showItemsPerPageSelector && (
                <div className="flex items-center gap-2">
                    <span className={`text-sm ${darkMode ? 'text-white' : 'text-gray-600'}`}>
                        Show
                    </span>
                    <select
                        value={itemsPerPage}
                        onChange={(e) => onItemsPerPageChange(Number(e.target.value))}
                        className={`px-2 py-1 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500 ${darkMode ? 'border-gray-600 bg-gray-700 text-white' : 'border-gray-300'}`}
                    >
                        <option value={5}>5</option>
                        <option value={10}>10</option>
                        <option value={25}>25</option>
                        <option value={50}>50</option>
                    </select>
                    <span className={`text-sm ${darkMode ? 'text-white' : 'text-gray-600'}`}>
                        entries
                    </span>
                </div>
            )}

            {/* Pagination info and controls */}
            <div className="flex items-center gap-4">
                <div className={`text-sm ${darkMode ? 'text-white' : 'text-gray-600'}`}>
                    Showing {startIndex + 1} to {endIndex} of {totalItems} entries
                </div>

                <div className="flex items-center gap-1">
                    <button
                        onClick={() => onPageChange(currentPage - 1)}
                        disabled={currentPage === 1}
                        className={`px-3 py-2 border rounded-md text-sm font-medium transition-colors ${
                            currentPage === 1
                                ? `border-gray-300 ${darkMode ? 'text-white' : 'text-gray-400'} cursor-not-allowed`
                                : `border-gray-300 ${darkMode ? 'text-white' : 'text-gray-700'} hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500`
                        }`}
                    >
                        Previous
                    </button>

                    {/* Page Numbers */}
                    {Array.from({ length: totalPages }, (_, i) => i + 1)
                        .filter(page => {
                            // Show first page, last page, current page, and pages around current page
                            return page === 1 ||
                                   page === totalPages ||
                                   (page >= currentPage - 1 && page <= currentPage + 1);
                        })
                        .map((page, index, array) => (
                            <div key={page} className="flex items-center">
                                {index > 0 && array[index - 1] !== page - 1 && (
                                    <span className={`px-2 py-2 text-sm ${darkMode ? 'text-white' : 'text-gray-500'}`}>...</span>
                                )}
                                <button
                                    onClick={() => onPageChange(page)}
                                    className={`px-3 py-2 border rounded-md text-sm font-medium transition-colors ${
                                        currentPage === page
                                            ? 'bg-blue-600 border-blue-600 text-white'
                                            : `border-gray-300 ${darkMode ? 'text-white' : 'text-gray-700'} hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500`
                                    }`}
                                >
                                    {page}
                                </button>
                            </div>
                        ))}

                    <button
                        onClick={() => onPageChange(currentPage + 1)}
                        disabled={currentPage === totalPages}
                        className={`px-3 py-2 border rounded-md text-sm font-medium transition-colors ${
                            currentPage === totalPages
                                ? 'border-gray-300 text-gray-400 cursor-not-allowed'
                                : `border-gray-300 ${darkMode ? 'text-white' : 'text-gray-700'} hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500`
                        }`}
                    >
                        Next
                    </button>
                </div>
            </div>
        </div>
    );
}
