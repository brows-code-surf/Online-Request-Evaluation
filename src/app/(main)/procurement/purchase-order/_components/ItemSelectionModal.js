'use client';

import { useState, useEffect } from 'react';
import { getCanvassingDataForPO } from '../_actions';
import SkeletonLoader from '@/app/_components/skeletonLoader';

function ItemSelectionModal({ isOpen, onClose, darkMode, user, selectedItems, selectedSupplier, onItemsSelected }) {
  const [loading, setLoading] = useState(false);
  const [availableItems, setAvailableItems] = useState([]);
  const [currentSelectedItems, setCurrentSelectedItems] = useState(selectedItems || []);
  const [filterByAssignedTo, setFilterByAssignedTo] = useState(false);
  const [tableSearchTerm, setTableSearchTerm] = useState('');

  // Filter available items based on search term and selected supplier
  const filteredAvailableItems = availableItems.filter((item) => {
    const searchTerm = tableSearchTerm.toLowerCase();
    const matchesSearch = (
      item.pqCode?.toLowerCase().includes(searchTerm) ||
      item.prCode?.toLowerCase().includes(searchTerm) ||
      item.itemNumber?.toString().toLowerCase().includes(searchTerm) ||
      item.itemDescription?.toLowerCase().includes(searchTerm) ||
      item.budgetCode?.toLowerCase().includes(searchTerm) ||
      item.company?.toLowerCase().includes(searchTerm) ||
      item.supplierName?.toLowerCase().includes(searchTerm)
    );

    // Filter by selected supplier if one is provided
    const matchesSupplier = selectedSupplier
      ? item.supplierName?.toLowerCase() === selectedSupplier.toLowerCase()
      : true;

    return matchesSearch && matchesSupplier;
  });

  // Load available canvassing items
  useEffect(() => {
    if (isOpen) {
      loadAvailableItems();
    }
  }, [isOpen, filterByAssignedTo]);

  // Preselect items when available items are loaded and selectedItems are provided
  useEffect(() => {
    if (availableItems.length > 0 && selectedItems && selectedItems.length > 0) {
      const preselectedItems = availableItems.filter(availableItem =>
        selectedItems.some(selectedItem =>
          selectedItem.rid === availableItem.rid
        )
      ).map(item => {
        const selectedItem = selectedItems.find(selected => selected.rid === item.rid);
        const qtyOrder = selectedItem ? selectedItem.qtyOrder || 0 : 0;
        return {
          ...item,
          unitCost: item.unitCost || 0,
          qtyOrder: qtyOrder,
          remaining: item.remaining + qtyOrder // Include current PO qtyOrder in remaining
        };
      });

      setCurrentSelectedItems(preselectedItems);
    } else if (availableItems.length > 0 && (!selectedItems || selectedItems.length === 0)) {
      setCurrentSelectedItems([]);
    }
  }, [availableItems, selectedItems]);

  const loadAvailableItems = async () => {
    setLoading(true);
    try {
      const result = await getCanvassingDataForPO(user, filterByAssignedTo);
      if (result.success) {
        setAvailableItems(result.items.map((item, index) => ({
          ...item,
          uniqueId: `${item.pqCode}-${item.rid || index}`,
          unitCost: item.finalPrice || item.bidPrice || item.offeredPrice || 0,
          qtyOrder: item.remaining || 0
        })));
      } else {
        console.error('Failed to load available canvassing items');
      }
    } catch (error) {
      console.error('Error loading items:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleItemSelect = (item, checked) => {
    if (checked) {
      setCurrentSelectedItems(prev => [...prev, {
        ...item,
        unitCost: item.unitCost || 0,
        qtyOrder: item.qtyOrder || 0
      }]);
    } else {
      setCurrentSelectedItems(prev => prev.filter(selected => selected.uniqueId !== item.uniqueId));
    }
  };

  const handleSelectAll = (checked) => {
    if (checked) {
      setCurrentSelectedItems(filteredAvailableItems.map(item => ({
        ...item,
        unitCost: item.unitCost || 0,
        qtyOrder: item.qtyOrder || 0
      })));
    } else {
      setCurrentSelectedItems([]);
    }
  };

  const handleConfirmSelection = () => {
    onItemsSelected(currentSelectedItems);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity" aria-hidden="true">
          <div className="absolute inset-0 bg-gray-500 opacity-75" onClick={onClose}></div>
        </div>

        <div className={`inline-block align-bottom rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-6xl w-full mx-4 sm:mx-auto h-[90vh] max-h-[90vh] relative z-10 ${darkMode ? 'bg-gray-800' : 'bg-white'}`} onClick={(e) => e.stopPropagation()}>
          <div className="flex flex-col h-full">
            {/* Header */}
            <div className={`px-6 py-4 border-b flex-shrink-0 ${darkMode ? 'border-blue-700 bg-gradient-to-r from-blue-800 to-blue-900' : 'border-blue-200 bg-gradient-to-r from-blue-50 to-blue-100'}`}>
              <div className="flex items-center justify-between">
                <div className="flex-1"></div>
                <div className="text-center">
                  <h3 className={`text-lg font-medium ${darkMode ? 'text-white' : 'text-black'}`}>
                    Select Items for Purchase Order
                  </h3>
                  <p className={`text-sm mt-1 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                    {currentSelectedItems.length} item{currentSelectedItems.length !== 1 ? 's' : ''} selected
                  </p>
                </div>
                <div className="flex-1 flex justify-end">
                  <button
                    type="button"
                    onClick={onClose}
                    className={`rounded-md p-2 ${darkMode ? 'text-gray-400 hover:text-gray-300' : 'text-gray-400 hover:text-gray-500'}`}
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
              {/* Supplier Header */}
              {selectedSupplier && (
                <div className={`mb-4 p-3 rounded-md ${darkMode ? 'bg-blue-900/50 border border-blue-700' : 'bg-blue-50 border border-blue-200'}`}>
                  <div className="flex items-center">
                    <svg className={`w-5 h-5 mr-2 ${darkMode ? 'text-blue-400' : 'text-blue-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                    <span className={`font-medium ${darkMode ? 'text-blue-300' : 'text-blue-800'}`}>
                      Selected Supplier: {selectedSupplier}
                    </span>
                  </div>
                </div>
              )}

              {/* Controls */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="filterAssignedToModal"
                      checked={filterByAssignedTo}
                      onChange={(e) => setFilterByAssignedTo(e.target.checked)}
                      className="rounded"
                    />
                    <label htmlFor="filterAssignedToModal" className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      My Items Only
                    </label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="selectAllModal"
                      checked={currentSelectedItems.length === filteredAvailableItems.length && filteredAvailableItems.length > 0}
                      onChange={(e) => handleSelectAll(e.target.checked)}
                      disabled={filteredAvailableItems.length === 0}
                      className="rounded disabled:opacity-50"
                    />
                    <label htmlFor="selectAllModal" className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'} ${filteredAvailableItems.length === 0 ? 'opacity-50' : ''}`}>
                      Select All ({filteredAvailableItems.length} items)
                    </label>
                  </div>
                </div>
              </div>

              {/* Search Input */}
              <div className="mb-4">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search items by PQ code, PR code, item details, company..."
                    value={tableSearchTerm}
                    onChange={(e) => setTableSearchTerm(e.target.value)}
                    className={`w-full px-3 py-2 pl-10 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${darkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'bg-white border-gray-300 placeholder-gray-500'}`}
                  />
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg className={`w-5 h-5 ${darkMode ? 'text-gray-400' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
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

                          <th className={`px-4 py-3 text-left text-xs font-medium uppercase tracking-wider ${darkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                            PR No
                          </th>
                          <th className={`px-4 py-3 text-left text-xs font-medium uppercase tracking-wider ${darkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                            PQ Code
                          </th>
                          <th className={`px-4 py-3 text-left text-xs font-medium uppercase tracking-wider ${darkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                            Canvass Date
                          </th>
                          <th className={`px-4 py-3 text-left text-xs font-medium uppercase tracking-wider ${darkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                            Canvassed By
                          </th>
                          <th className={`px-4 py-3 text-left text-xs font-medium uppercase tracking-wider ${darkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                            Item Details
                          </th>
                          <th className={`px-4 py-3 text-left text-xs font-medium uppercase tracking-wider ${darkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                            Unit Cost / U of M
                          </th>
                          <th className={`px-4 py-3 text-left text-xs font-medium uppercase tracking-wider ${darkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                            Agreed Price
                          </th>
                        </tr>
                      </thead>
                      <tbody className={`${darkMode ? 'bg-gray-800 divide-gray-700' : 'bg-white divide-gray-200'}`}>
                        {Array(7).fill().map((_, index) => (
                          <tr key={index} className={`${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-50'}`}>
                            <td className="px-4 py-3">
                              <SkeletonLoader height="h-4" width="w-4" />
                            </td>
                            <td className="px-4 py-3">
                              <SkeletonLoader height="h-4" width="w-12" />
                            </td>
                            <td className="px-4 py-3">
                              <SkeletonLoader height="h-4" width="w-20" />
                            </td>
                            <td className="px-4 py-3">
                              <SkeletonLoader height="h-4" width="w-20" />
                            </td>
                            <td className="px-4 py-3">
                              <SkeletonLoader height="h-4" width="w-24" />
                            </td>
                            <td className="px-4 py-3">
                              <div className="space-y-1">
                                <SkeletonLoader height="h-4" width="w-32" />
                                <SkeletonLoader height="h-3" width="w-24" />
                              </div>
                            </td>

                            <td className="px-4 py-3">
                              <SkeletonLoader height="h-4" width="w-16" />
                            </td>
                            <td className="px-4 py-3">
                              <SkeletonLoader height="h-4" width="w-12" />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : availableItems.length === 0 ? (
                <div className="text-center py-8">
                  <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2M4 13h2m8-5v2m0 0v2m0-2h2m-2 0h-2" />
                  </svg>
                  <p className={`mt-2 text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    No canvassing items available for purchase order
                  </p>
                </div>
              ) : (
                <div className="border rounded-md overflow-hidden">
                  <div className="max-h-96 overflow-y-auto overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className={`${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                        <tr>
                          <th className={`px-2 sm:px-4 py-3 text-left text-xs font-medium uppercase tracking-wider ${darkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                            Select
                          </th>
                          <th className={`px-2 sm:px-4 py-3 text-left text-xs font-medium uppercase tracking-wider ${darkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                            PR No
                          </th>
                          <th className={`px-2 sm:px-4 py-3 text-left text-xs font-medium uppercase tracking-wider ${darkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                            PQ Code
                          </th>
                          <th className={`px-4 py-3 text-left text-xs font-medium uppercase tracking-wider ${darkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                            Canvass Date
                          </th>
                          <th className={`px-4 py-3 text-left text-xs font-medium uppercase tracking-wider ${darkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                            Canvassed By
                          </th>
                          <th className={`px-2 sm:px-4 py-3 text-left text-xs font-medium uppercase tracking-wider ${darkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                            Item Details
                          </th>
                          <th className={`px-2 sm:px-4 py-3 text-left text-xs font-medium uppercase tracking-wider ${darkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                            Unit Cost / U of M
                          </th>
                          <th className={`px-2 sm:px-4 py-3 text-left text-xs font-medium uppercase tracking-wider ${darkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                            Agreed Price
                          </th>
                        </tr>
                      </thead>
                      <tbody className={`${darkMode ? 'bg-gray-800 divide-gray-700' : 'bg-white divide-gray-200'}`}>
                        {filteredAvailableItems.map((item, index) => (
                          <tr 
                            key={item.uniqueId} 
                            onClick={() => handleItemSelect(item, !currentSelectedItems.some(selected => selected.uniqueId === item.uniqueId))}
                            className={`cursor-pointer ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-50'}`}>
                            <td className="px-2 sm:px-4 py-3">
                              <input
                                type="checkbox"
                                checked={currentSelectedItems.some(selected => selected.uniqueId === item.uniqueId)}
                                onChange={(e) => handleItemSelect(item, e.target.checked)}
                                onClick={(e) => e.stopPropagation()}
                                className="rounded"
                              />
                            </td>
                            <td className="px-2 sm:px-4 py-3">
                              <div className={`text-xs sm:text-sm ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                                {item.prCode}
                              </div>
                            </td>
                            <td className="px-2 sm:px-4 py-3">
                              <div className={`text-xs sm:text-sm font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                                {item.pqCode}
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <div className={`text-xs sm:text-sm ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                                {item.canvassDate ? new Date(item.canvassDate).toISOString().split('T')[0] : '-'}
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <div className={`text-xs sm:text-sm ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                                {item.canvassedBy || '-'}
                              </div>
                            </td>
                            <td className="px-2 sm:px-4 py-3">
                              <div>
                                <div className={`text-xs sm:text-sm font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                                  {item.itemNumber}
                                </div>
                                <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-400'}`}>
                                  {item.itemDescription}
                                </div>
                              </div>
                            </td>

                            <td className="px-2 sm:px-4 py-3">
                              <span className={`text-xs sm:text-sm ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                                {item.remaining} {item.uofm}
                              </span>
                            </td>
                            <td className="px-2 sm:px-4 py-3">
                              <span className={`text-xs sm:text-sm ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                                ₱{item.finalPrice?.toLocaleString() || '0.00'}
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

            {/* Footer */}
            <div className={`px-6 py-4 border-t flex-shrink-0 ${darkMode ? 'border-blue-700 bg-gradient-to-r from-blue-800 to-blue-900' : 'border-blue-200 bg-gradient-to-r from-blue-50 to-blue-100'}`}>
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center space-y-3 sm:space-y-0">
                <div className="text-sm text-gray-500 text-center sm:text-left">
                  {currentSelectedItems.length > 0 && (
                    <span>{currentSelectedItems.length} item{currentSelectedItems.length !== 1 ? 's' : ''} selected</span>
                  )}
                </div>
                <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3">
                  <button
                    type="button"
                    onClick={onClose}
                    className={`px-4 py-2 border rounded-md text-sm font-medium transition-colors duration-200 order-2 sm:order-1 ${darkMode
                      ? 'border-gray-600 text-gray-300 hover:bg-gray-700'
                      : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                      }`}
                  >
                    Cancel
                  </button>

                  <button
                    type="button"
                    onClick={handleConfirmSelection}
                    className="px-4 py-2 bg-blue-600 border border-transparent rounded-md text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 order-1 sm:order-2"
                  >
                    Confirm Selection
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
