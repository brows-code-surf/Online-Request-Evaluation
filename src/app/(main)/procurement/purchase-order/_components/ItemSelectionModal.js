'use client';

import { useState, useEffect } from 'react';
import { getCanvassingDataForPO } from '../_actions';
import SkeletonLoader from '@/app/_components/skeletonLoader';
import currencyData from '@/utils/currency.json';
import { toast } from 'react-toastify';

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
      item.canvassedBy?.toLowerCase().includes(searchTerm) ||
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
          unitCost: item.finalPrice || 0,
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
      // Check if there are already selected items with a different purchase type
      if (currentSelectedItems.length > 0) {
        const existingPurchaseType = currentSelectedItems[0].purchaseType;
        if (item.purchaseType !== existingPurchaseType) {
          toast.error(`You can only select items with the same purchase type. Currently selected: ${existingPurchaseType || 'None'}`);
          return;
        }
      }
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
      // If there are already selected items, only select items with the same purchase type
      if (currentSelectedItems.length > 0) {
        const existingPurchaseType = currentSelectedItems[0].purchaseType;
        const itemsToSelect = filteredAvailableItems.filter(item => item.purchaseType === existingPurchaseType);
        setCurrentSelectedItems(itemsToSelect.map(item => ({
          ...item,
          unitCost: item.unitCost || 0,
          qtyOrder: item.qtyOrder || 0
        })));
      } else {
        // No items selected yet, select all items (they will all have the same purchase type)
        setCurrentSelectedItems(filteredAvailableItems.map(item => ({
          ...item,
          unitCost: item.unitCost || 0,
          qtyOrder: item.qtyOrder || 0
        })));
      }
    } else {
      setCurrentSelectedItems([]);
    }
  };

  const handleConfirmSelection = () => {
    onItemsSelected(currentSelectedItems);
    onClose();
  };

  const currencyDisplay = (currencyCode) => {
    if (!currencyCode) return '';
    try{
      const currency = currencyData[currencyCode];
      return currency ? currency.symbol_native : currencyCode;
    }catch (error){
      console.error('Error formatting currency:', error);
      return currencyCode;
    }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      <div className="flex items-start justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity" aria-hidden="true">
          <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm" onClick={onClose}></div>
        </div>

        <div className={`inline-block align-bottom rounded-2xl text-left shadow-2xl transform transition-all sm:my-8 sm:align-middle sm:max-w-6xl w-full mx-4 sm:mx-auto h-[95vh] max-h-[95vh] relative z-10 flex flex-col overflow-hidden ${darkMode ? 'bg-gray-800' : 'bg-white'}`} onClick={(e) => e.stopPropagation()}>
          <div className="flex flex-col h-full">
            {/* Header */}
            <div className={`px-2 sm:px-4 py-2 sm:py-3 border-b flex-shrink-0 ${darkMode ? 'border-blue-700/50 bg-gradient-to-r from-blue-900 via-blue-800 to-blue-900' : 'border-blue-200/50 bg-gradient-to-r from-blue-600 via-blue-500 to-blue-600'}`}>
              <div className="flex items-center justify-between gap-2">
                <h3 className={`text-sm sm:text-base font-semibold truncate ${darkMode ? 'text-white' : 'text-white'}`}>
                  Approved Canvasses
                </h3>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={onClose}
                    className={`rounded-lg sm:rounded-xl p-1.5 sm:p-2 transition-all duration-200 ${darkMode ? 'text-white hover:text-white hover:bg-white/10' : 'text-white/80 hover:text-white hover:bg-white/20'}`}
                  >
                    <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
              <p className={`text-xs sm:text-sm mt-1 ${darkMode ? 'text-white' : 'text-white/70'}`}>
                Select Items for Purchase Order
              </p>
            </div>

            {/* Content */}
            <div className="px-4 py-1 flex-1 overflow-hidden flex flex-col">
              {/* Supplier Header */}
              {selectedSupplier && (
                <div className={`mb-4 p-3 rounded-md ${darkMode ? 'bg-blue-900/50 border border-blue-700' : 'bg-blue-50 border border-blue-200'}`}>
                  <div className="flex items-center">
                    <svg className={`w-5 h-5 mr-2 ${darkMode ? 'text-blue-400' : 'text-blue-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                    <span className={`font-medium ${darkMode ? 'text-blue-300' : 'text-blue-800'}`}>
                      Selected Supplier: {selectedSupplier}
                      <p className={`text-sm ${darkMode ? 'text-white' : 'text-gray-600'}`}>
                        {currentSelectedItems.length} item{currentSelectedItems.length !== 1 ? 's' : ''} selected
                      </p>
                    </span>
                  </div>
                </div>
              )}

              {/* Controls */}
              <div className={`mb-4 ${darkMode ? 'bg-gray-700/30 border border-gray-700/50' : 'bg-gray-50 border border-gray-200'} rounded-lg p-3`}>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-4">
                    <label className={`flex items-center gap-2.5 cursor-pointer group`}>
                      <div className="relative">
                        <input
                          type="checkbox"
                          id="filterAssignedToModal"
                          checked={filterByAssignedTo}
                          onChange={(e) => setFilterByAssignedTo(e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className={`w-4 h-4 rounded-md border-2 transition-all duration-200 peer-checked:bg-blue-600 peer-checked:border-blue-600 ${darkMode ? 'border-gray-600' : 'border-gray-300'} ${filterByAssignedTo ? 'bg-blue-50 dark:bg-blue-900/30' : ''}`}></div>
                        <svg
                          className="absolute inset-0 m-auto w-3 h-3 text-white opacity-0 peer-checked:opacity-100 transition-opacity duration-200 pointer-events-none"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <span className={`text-xs font-medium ${darkMode ? 'text-white group-hover:text-white' : 'text-gray-700 group-hover:text-gray-900'} transition-colors`}>
                        My Items Only
                      </span>
                    </label>
                    <label className={`flex items-center gap-2.5 cursor-pointer group ${filteredAvailableItems.length === 0 ? 'opacity-50' : ''}`}>
                      <div className="relative">
                        <input
                          type="checkbox"
                          id="selectAllModal"
                          checked={currentSelectedItems.length === filteredAvailableItems.length && filteredAvailableItems.length > 0}
                          onChange={(e) => handleSelectAll(e.target.checked)}
                          disabled={filteredAvailableItems.length === 0}
                          className="sr-only peer"
                        />
                        <div className={`w-4 h-4 rounded-md border-2 transition-all duration-200 peer-checked:bg-blue-600 peer-checked:border-blue-600 ${darkMode ? 'border-gray-600 peer-checked:bg-blue-600' : 'border-gray-300 peer-checked:bg-blue-600'} ${currentSelectedItems.length === filteredAvailableItems.length && filteredAvailableItems.length > 0 ? 'bg-blue-50 dark:bg-blue-900/30' : ''}`}></div>
                        <svg className={`absolute top-0.5 left-0.5 w-3 h-3 text-white opacity-0 peer-checked:opacity-100 transition-opacity duration-200 pointer-events-none`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <span className={`text-xs font-medium ${darkMode ? 'text-white group-hover:text-white' : 'text-gray-700 group-hover:text-gray-900'} transition-colors`}>
                        Select All ({filteredAvailableItems.length} items)
                      </span>
                    </label>
                  </div>
                  {currentSelectedItems.length > 0 && (
                    <div className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px] font-medium ${darkMode ? 'bg-blue-900/50 text-blue-300' : 'bg-blue-100 text-blue-700'}`}>
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      {currentSelectedItems.length} selected
                    </div>
                  )}
                </div>
              </div>

              {/* Search Input */}
              <div className={`mb-4 ${darkMode ? 'bg-gray-700/30 border border-gray-700/50' : 'bg-gray-50 border border-gray-200'} rounded-lg`}>
                <div className="relative group">
                  <input
                    type="text"
                    placeholder="Search by PR#, COQ code, Canvass By, Item Code, Description"
                    value={tableSearchTerm}
                    onChange={(e) => setTableSearchTerm(e.target.value)}
                    className={`w-full px-3 py-1.5 pl-10 rounded-lg border-2 transition-all duration-200 focus:outline-none focus:ring-0 ${darkMode
                      ? 'bg-gray-700/50 border-gray-600 text-white placeholder-gray-400 focus:border-blue-500 focus:bg-gray-700'
                      : 'bg-white border-gray-200 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:shadow-sm'
                      }`}
                  />
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg className={`w-4 h-4 ${darkMode ? 'text-white' : 'text-gray-400'} group-hover:text-blue-500 transition-colors`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                  {tableSearchTerm && (
                    <button
                      type="button"
                      onClick={() => setTableSearchTerm('')}
                      className={`absolute inset-y-0 right-0 pr-4 flex items-center ${darkMode ? 'text-white hover:text-white' : 'text-gray-400 hover:text-gray-600'}`}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>

              {/* Items Table */}
              {loading ? (
                <div className="border-1 border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden flex-1">
                  <div className="h-full overflow-y-auto">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                      <thead className={`${darkMode ? 'bg-gray-700/50' : 'bg-gray-100'}`}>
                        <tr>
                          <th className={`px-4 py-4 text-left text-xs font-semibold uppercase tracking-wider ${darkMode ? 'text-white' : 'text-gray-500'}`}>
                            Select
                          </th>
                          <th className={`px-4 py-4 text-left text-xs font-semibold uppercase tracking-wider ${darkMode ? 'text-white' : 'text-gray-500'}`}>
                            PR No
                          </th>
                          <th className={`px-4 py-4 text-left text-xs font-semibold uppercase tracking-wider ${darkMode ? 'text-white' : 'text-gray-500'}`}>
                            COQ CODE
                          </th>
                          <th className={`px-4 py-4 text-left text-xs font-semibold uppercase tracking-wider ${darkMode ? 'text-white' : 'text-gray-500'}`}>
                            COQ POST DATE
                          </th>
                          <th className={`px-4 py-4 text-left text-xs font-semibold uppercase tracking-wider ${darkMode ? 'text-white' : 'text-gray-500'}`}>
                            CANVASS BY
                          </th>
                          <th className={`px-4 py-4 text-left text-xs font-semibold uppercase tracking-wider ${darkMode ? 'text-white' : 'text-gray-500'}`}>
                            ITEM CODE | DESCRIPTION
                          </th>
                          <th className={`px-4 py-4 text-left text-xs font-semibold uppercase tracking-wider ${darkMode ? 'text-white' : 'text-gray-500'}`}>
                            UNIT COST (CURRENCY) / U OF M
                          </th>
                          <th className={`px-4 py-4 text-left text-xs font-semibold uppercase tracking-wider ${darkMode ? 'text-white' : 'text-gray-500'}`}>
                            PURCHASE TYPE
                          </th>
                        </tr>
                      </thead>
                      <tbody className={`${darkMode ? 'bg-gray-800/50 divide-gray-700' : 'bg-white divide-gray-100'}`}>
                        {Array(6).fill().map((_, index) => (
                          <tr key={index} className={`${darkMode ? 'hover:bg-gray-700/30' : 'hover:bg-gray-50'}`}>
                            <td className="px-4 py-4">
                              <SkeletonLoader height="h-5" width="w-5" />
                            </td>
                            <td className="px-4 py-4">
                              <SkeletonLoader height="h-4" width="w-16" />
                            </td>
                            <td className="px-4 py-4">
                              <div className="space-y-2">
                                <SkeletonLoader height="h-4" width="w-28" />
                              </div>
                            </td>
                            <td className="px-4 py-4">
                              <div className="space-y-2">
                                <SkeletonLoader height="h-4" width="w-20" />
                              </div>
                            </td>
                            <td className="px-4 py-4">
                              <div className="space-y-2">
                                <SkeletonLoader height="h-4" width="w-20" />
                              </div>
                            </td>
                            <td className="px-4 py-4">
                              <div className="space-y-2">
                                <SkeletonLoader height="h-4" width="w-24" />
                                <SkeletonLoader height="h-3" width="w-16" />
                              </div>
                            </td>
                            <td className="px-4 py-4">
                              <SkeletonLoader height="h-4" width="w-20" />
                            </td>
                            <td className="px-4 py-4">
                              <SkeletonLoader height="h-4" width="w-12" />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : availableItems.length === 0 ? (
                <div className={`text-center py-10 rounded-xl ${darkMode ? 'bg-gray-700/20 border border-gray-700/50' : 'bg-gray-50 border-1 border-gray-200'}`}>
                  <div className="w-14 h-14 mx-auto mb-3 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                    <svg className="w-7 h-7 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2M4 13h2m8-5v2m0 0v2m0-2h2m-2 0h-2" />
                    </svg>
                  </div>
                  <p className={`text-lg font-medium mb-2 ${darkMode ? 'text-white' : 'text-gray-700'}`}>
                    No canvassing items available
                  </p>
                  <p className={`text-sm ${darkMode ? 'text-white' : 'text-gray-500'}`}>
                    Try adjusting your filters or check back later
                  </p>
                </div>
              ) : (
                <div className="border-1 border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden flex-1">
                  <div className="h-full overflow-y-auto overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                      <thead className={`${darkMode ? 'bg-gray-700/50' : 'bg-gray-100'}`}>
                        <tr>
                          <th className={`px-2 py-3 text-left text-[10px] font-semibold uppercase tracking-wider ${darkMode ? 'text-white' : 'text-gray-500'}`}>
                            Select
                          </th>
                          <th className={`px-2 sm:px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider ${darkMode ? 'text-white' : 'text-gray-500'}`}>
                            PR No
                          </th>
                          <th className={`px-2 sm:px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider ${darkMode ? 'text-white' : 'text-gray-500'}`}>
                            COQ Code
                          </th>
                          <th className={`px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider ${darkMode ? 'text-white' : 'text-gray-500'}`}>
                            COQ POST DATE
                          </th>
                          <th className={`px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider ${darkMode ? 'text-white' : 'text-gray-500'}`}>
                            CANVASS BY
                          </th>
                          <th className={`px-2 sm:px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider ${darkMode ? 'text-white' : 'text-gray-500'}`}>
                            ITEM CODE | DESCRIPTION
                          </th>
                          <th className={`px-2 sm:px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider ${darkMode ? 'text-white' : 'text-gray-500'}`}>
                            UNIT COST (CURRENCY) / U OF M
                          </th>
                          <th className={`px-2 sm:px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider ${darkMode ? 'text-white' : 'text-gray-500'}`}>
                            PURCHASE TYPE
                          </th>
                        </tr>
                      </thead>
                      <tbody className={`${darkMode ? 'bg-gray-800/50 divide-gray-700' : 'bg-white divide-gray-100'}`}>
                        {filteredAvailableItems.map((item, index) => {
                          const isSelected = currentSelectedItems.some(selected => selected.uniqueId === item.uniqueId);
                          return (
                            <tr
                              key={item.uniqueId}
                              onClick={() => handleItemSelect(item, !isSelected)}
                              className={`cursor-pointer transition-all duration-200 ${isSelected
                                ? (darkMode ? 'bg-blue-900/30 border-l-4 border-l-blue-500' : 'bg-blue-50 border-l-4 border-l-blue-500')
                                : (darkMode ? 'hover:bg-gray-700/50' : 'hover:bg-gray-50')
                                }`}>
                              <td className="px-2 sm:px-4 py-2">
                                <div className="relative">
                                  <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={(e) => handleItemSelect(item, e.target.checked)}
                                    onClick={(e) => e.stopPropagation()}
                                    className="sr-only peer"
                                  />
                                  <div className={`w-4 h-4 rounded-md border-2 transition-all duration-200 peer-checked:bg-blue-600 peer-checked:border-blue-600 pointer-events-none ${darkMode ? 'border-gray-600' : 'border-gray-300'} ${isSelected ? 'bg-blue-50 dark:bg-blue-900/30' : ''}`}></div>
                                  <svg className={`absolute top-0.5 left-0.5 w-3 h-3 text-white opacity-0 peer-checked:opacity-100 transition-opacity duration-200 pointer-events-none`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                  </svg>
                                </div>
                              </td>
                              <td className="px-2 sm:px-4 py-2">
                                <div className={`text-[10px] sm:text-xs ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                                  {item.prCode}
                                </div>
                              </td>
                              <td className="px-2 sm:px-4 py-2">
                                <div className={`text-[10px] sm:text-xs font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                                  {item.pqCode}
                                </div>
                              </td>
                              <td className="px-4 py-3.5">
                                <div className={`text-xs sm:text-sm ${darkMode ? 'text-white' : 'text-gray-700'}`}>
                                  {item.canvassDate ? new Date(item.canvassDate).toISOString().split('T')[0] : '-'}
                                </div>
                              </td>
                              <td className="px-4 py-3.5">
                                <div className={`text-xs sm:text-sm ${darkMode ? 'text-white' : 'text-gray-700'}`}>
                                  {item.canvassedBy || '-'}
                                </div>
                              </td>
                              <td className="px-2 sm:px-4 py-2">
                                <div>
                                  <div className={`text-[10px] sm:text-xs font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                                    {item.itemNumber}
                                  </div>
                                  <div className={`text-xs ${darkMode ? 'text-white' : 'text-gray-400'}`}>
                                    {item.itemDescription}
                                  </div>
                                </div>
                              </td>
                              <td className="px-2 sm:px-4 py-2">
                                <span className={`text-xs sm:text-sm ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                                  {currencyDisplay(item.currency)}{item.remaining} ({item.currency}) / {item.uofm}
                                </span>
                              </td>
                              <td className="px-2 sm:px-4 py-2">
                                <span className={`text-xs sm:text-sm ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                                  {item.purchaseType || '-'}
                                </span>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className={`px-2 sm:px-4 py-2 sm:py-3 border-t flex-shrink-0 ${darkMode ? 'border-blue-700/50 bg-gradient-to-r from-blue-900 via-blue-800 to-blue-900' : 'border-blue-200/50 bg-gradient-to-r from-blue-600 via-blue-500 to-blue-600'}`}>
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center space-y-3 sm:space-y-0">
                <div className={`text-sm text-center sm:text-left ${darkMode ? 'text-white' : 'text-white/70'}`}>
                  {currentSelectedItems.length > 0 && (
                    <span className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse"></span>
                      {currentSelectedItems.length} item{currentSelectedItems.length !== 1 ? 's' : ''} selected
                    </span>
                  )}
                </div>
                <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3">
                  <button
                    type="button"
                    onClick={onClose}
                    className={`px-4 py-2 border rounded-lg text-sm font-medium transition-all duration-200 order-2 sm:order-1 ${darkMode
                      ? 'border-white/20 text-white/80 hover:bg-white/10 hover:text-white'
                      : 'border-white/30 text-white/90 hover:bg-white/20 hover:text-white'
                      }`}
                  >
                    Cancel
                  </button>

                  <button
                    type="button"
                    onClick={handleConfirmSelection}
                    className="px-4 py-2 bg-white/20 backdrop-blur-sm border border-white/30 rounded-lg text-sm font-medium text-white hover:bg-white/30 transition-all duration-200 order-1 sm:order-2"
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
