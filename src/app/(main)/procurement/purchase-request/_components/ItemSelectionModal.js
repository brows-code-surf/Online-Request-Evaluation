'use client';

import { useState, useEffect } from 'react';
import SkeletonLoader from '@/app/_components/skeletonLoader';
import { searchItems } from '../_actions';
import Pagination from '@/app/(main)/_components/Pagination';

function ItemSelectionModal({ isOpen, onClose, darkMode, onSelectItem }) {
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedItem, setSelectedItem] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Load items using the searchItems action
  useEffect(() => {
    if (isOpen) {
      loadItems();
    }
  }, [isOpen]);

  const loadItems = async () => {
    setLoading(true);
    try {
      // Use the searchItems action directly
      const result = await searchItems('');
      if (result.success) {
        setItems(result.items);
      } else {
        console.error('Failed to load items:', result.message);
      }
    } catch (error) {
      console.error('Error loading items:', error);
    } finally {
      setLoading(false);
    }
  };

  // Filter items based on search term
  const filteredItems = items.filter(item => {
    const term = searchTerm.toLowerCase();
    return (
      item.ITEMNMBR?.toLowerCase().includes(term) ||
      item.ITEMDESC?.toLowerCase().includes(term) ||
      item.UOFM?.toLowerCase().includes(term) ||
      item.LOCNCODE?.toLowerCase().includes(term)
    );
  });

  // Calculate paginated items
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedItems = filteredItems.slice(startIndex, startIndex + itemsPerPage);
  const totalPages = Math.ceil(filteredItems.length / itemsPerPage);

  const handleSelectItem = (item) => {
    setSelectedItem(item);
    onSelectItem(item);
    onClose();
  };

  const handleDoubleClick = (item) => {
    handleSelectItem(item);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity" aria-hidden="true">
          <div className="absolute inset-0 bg-gray-500 opacity-75" onClick={onClose}></div>
        </div>

        <div className={`inline-block align-bottom rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl w-full mx-4 sm:mx-auto h-[80vh] max-h-[80vh] relative z-10 ${darkMode ? 'bg-gray-800' : 'bg-white'}`} onClick={(e) => e.stopPropagation()}>
          <div className="flex flex-col h-full">
            {/* Header */}
            <div className={`px-6 py-4 border-b flex-shrink-0 ${darkMode ? 'border-blue-700 bg-gradient-to-r from-blue-800 to-blue-900' : 'border-blue-200 bg-gradient-to-r from-blue-50 to-blue-100'}`}>
              <div className="flex items-center justify-between">
                <div className="flex-1"></div>
                <div className="text-center">
                  <h3 className={`text-lg font-medium ${darkMode ? 'text-white' : 'text-black'}`}>
                    Select Item from Masterfile
                  </h3>
                  <p className={`text-sm mt-1 ${darkMode ? 'text-white' : 'text-gray-600'}`}>
                    Double-click or select an item to choose
                  </p>
                </div>
                <div className="flex-1 flex justify-end">
                  <button
                    type="button"
                    onClick={onClose}
                    className={`rounded-md p-2 ${darkMode ? 'text-white hover:text-gray-300' : 'text-gray-400 hover:text-gray-500'}`}
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="px-6 py-4 flex-1 overflow-y-auto">
              {/* Search Input */}
              <div className="mb-4">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search items by item number, description, or location..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className={`w-full px-3 py-2 pl-10 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${darkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'bg-white border-gray-300 placeholder-gray-500'}`}
                  />
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg className={`w-5 h-5 ${darkMode ? 'text-white' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Items Table */}
              {loading ? (
                <div className="border rounded-md overflow-hidden">
                  <div className="max-h-96 overflow-y-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className={`${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                        <tr>
                          <th className={`px-4 py-3 text-left text-xs font-medium uppercase tracking-wider ${darkMode ? 'text-white' : 'text-gray-500'}`}>
                            Item Number
                          </th>
                          <th className={`px-4 py-3 text-left text-xs font-medium uppercase tracking-wider ${darkMode ? 'text-white' : 'text-gray-500'}`}>
                            Item Description
                          </th>
                          <th className={`px-4 py-3 text-left text-xs font-medium uppercase tracking-wider ${darkMode ? 'text-white' : 'text-gray-500'}`}>
                            Unit of Measure
                          </th>
                        </tr>
                      </thead>
                      <tbody className={`${darkMode ? 'bg-gray-800 divide-gray-700' : 'bg-white divide-gray-200'}`}>
                        {Array(5).fill().map((_, index) => (
                          <tr key={index} className={`${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-50'}`}>
                            <td className="px-4 py-3">
                              <SkeletonLoader height="h-4" width="w-48" />
                            </td>
                            <td className="px-4 py-3">
                              <SkeletonLoader height="h-4" width="w-48" />
                            </td>
                            <td className="px-4 py-3">
                              <SkeletonLoader height="h-4" width="w-48" />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : items.length === 0 ? (
                <div className="text-center py-8">
                  <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2M4 13h2m8-5v2m0 0v2m0-2h2m-2 0h-2" />
                  </svg>
                  <p className={`mt-2 text-sm ${darkMode ? 'text-white' : 'text-gray-600'}`}>
                    No items found in masterfile
                  </p>
                </div>
              ) : (
                <div className="border rounded-md overflow-hidden">
                  <div className="max-h-96 overflow-y-auto overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className={`${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                        <tr>
                          <th className={`px-4 py-3 text-left text-xs font-medium uppercase tracking-wider ${darkMode ? 'text-white' : 'text-gray-500'}`}>
                            Item Number
                          </th>
                          <th className={`px-4 py-3 text-left text-xs font-medium uppercase tracking-wider ${darkMode ? 'text-white' : 'text-gray-500'}`}>
                            Item Description
                          </th>
                          <th className={`px-4 py-3 text-left text-xs font-medium uppercase tracking-wider ${darkMode ? 'text-white' : 'text-gray-500'}`}>
                            Unit of Measure
                          </th>
                        </tr>
                      </thead>
                      <tbody className={`${darkMode ? 'bg-gray-800 divide-gray-700' : 'bg-white divide-gray-200'}`}>
                        {paginatedItems.map((item, index) => (
                          <tr
                            key={index}
                            className={`${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-50'} cursor-pointer ${selectedItem === item ? (darkMode ? 'bg-blue-600' : 'bg-blue-100') : ''}`}
                            onClick={() => setSelectedItem(item)}
                            onDoubleClick={() => handleDoubleClick(item)}
                          >
                            <td className="px-4 py-3">
                              <div className={`text-sm font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                                {item.ITEMNMBR}
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <div className={`text-sm ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                                {item.ITEMDESC}
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <span className={`text-sm ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                                {item.UOFM}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            {/* Pagination */}
            {filteredItems.length > itemsPerPage && (
              <div className="px-6 py-2 border-t">
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  totalItems={filteredItems.length}
                  itemsPerPage={itemsPerPage}
                  onPageChange={setCurrentPage}
                  onItemsPerPageChange={setItemsPerPage}
                  showItemsPerPageSelector={true}
                />
              </div>
            )}

            {/* Footer */}
            <div className={`px-6 py-4 border-t flex-shrink-0 ${darkMode ? 'border-blue-700 bg-gradient-to-r from-blue-800 to-blue-900' : 'border-blue-200 bg-gradient-to-r from-blue-50 to-blue-100'}`}>
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center space-y-3 sm:space-y-0">
                <div className={`text-sm ${darkMode ? 'text-white' : 'text-gray-500'} text-center sm:text-left`}>
                  Showing {startIndex + 1}-{Math.min(startIndex + itemsPerPage, filteredItems.length)} of {filteredItems.length} item{filteredItems.length !== 1 ? 's' : ''}
                </div>
                <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3">
                  <button
                    type="button"
                    onClick={onClose}
                    className={`px-4 py-2 border rounded-md text-sm font-medium transition-colors duration-200 order-2 sm:order-1 ${darkMode
                      ? `border-gray-600 ${darkMode ? 'text-white' : 'text-gray-300'} hover:bg-gray-700`
                      : `border-gray-300 ${darkMode ? 'text-white' : 'text-gray-700'} hover:bg-gray-50`
                      }`}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (selectedItem) {
                        onSelectItem(selectedItem);
                        onClose();
                      }
                    }}
                    disabled={!selectedItem}
                    className={`px-4 py-2 border rounded-md text-sm font-medium transition-colors duration-200 order-1 sm:order-2 ${selectedItem
                      ? 'bg-blue-600 border-transparent text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'
                      : `bg-gray-300 border-gray-300 ${darkMode ? 'text-white' : 'text-gray-500'} cursor-not-allowed`
                      }`}
                  >
                    Select Item
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ItemSelectionModal;
