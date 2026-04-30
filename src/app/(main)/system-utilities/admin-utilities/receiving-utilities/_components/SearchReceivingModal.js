'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/utils/authContext';
import { getReceivingEntries } from '../_actions/index.js';
import { Search, AlertTriangle } from 'lucide-react';

function SearchReceivingModal({ isOpen, onClose, darkMode, user, isAdmin, onDone, filters = {} }) {
  const [allEntries, setAllEntries] = useState([]);
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchFilters, setSearchFilters] = useState({
    referenceNo: ''
  });
  const [localSelectedEntry, setLocalSelectedEntry] = useState(null);

  const fetchAllEntries = async () => {
    setLoading(true);
    try {
      const result = await getReceivingEntries(filters, user, isAdmin());
      if (result.success) {
        let data = result.data;
        // If filters specify hasDA, filter client-side
        if (filters.hasDA !== undefined) {
          data = data.filter(entry => entry.hasDA === filters.hasDA);
        }
        setAllEntries(data);
        setEntries(data);
      } else {
        console.error('Error fetching entries:', result.error);
        alert('Error fetching entries: ' + result.error);
      }
    } catch (error) {
      console.error('Error fetching entries:', error);
      alert('Error fetching entries: ' + error.message);
    }
    setLoading(false);
  };

  const handleFilter = () => {
    const filtered = allEntries.filter(entry =>
      entry.referenceNo.toLowerCase().includes(searchFilters.referenceNo.toLowerCase())
    );
    setEntries(filtered);
  };

  useEffect(() => {
    if (isOpen) {
      fetchAllEntries();
    }
  }, [isOpen, filters]);

  useEffect(() => {
    handleFilter();
  }, [searchFilters.referenceNo, allEntries]);

  const handleSelectEntry = (entry) => {
    if (localSelectedEntry?.id === entry.id) {
      setLocalSelectedEntry(null);
    } else {
      setLocalSelectedEntry(entry);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString();
  };

  const getStatusColor = (status) => {
    const s = Number(status);
    switch (s) {
      case 1:
        return 'bg-purple-100 text-purple-800 border-purple-300';
      case 0:
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getStatusText = (status, hasDA = false) => {
    const s = Number(status);
    if (isNaN(s)) return 'Unknown';
    switch (s) {
      case 1:
        return hasDA ? 'POSTED W/ DA' : 'POSTED';
      case 0:
        return 'NOT POSTED';
      default:
        return 'Unknown';
    }
  };

  const isSelected = !!localSelectedEntry;

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
                  Search Receiving Entries
                </h3>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={onClose}
                    className={`rounded-lg sm:rounded-xl p-1.5 sm:p-2 transition-all duration-200 ${darkMode ? 'text-gray-400 hover:text-white hover:bg-white/10' : 'text-white/80 hover:text-white hover:bg-white/20'}`}
                  >
                    <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
              <p className={`text-xs sm:text-sm mt-1 ${darkMode ? 'text-gray-400' : 'text-white/70'}`}>
                Find and select receiving entries to edit
              </p>
            </div>

            {/* Content */}
            <div className="px-4 py-1 flex-1 overflow-hidden flex flex-col">
              {/* Selected Entry */}
              {isSelected && (
                <div className={`mb-4 p-3 rounded-md ${darkMode ? 'bg-blue-900/50 border border-blue-700' : 'bg-blue-50 border border-blue-200'}`}>
                  <div className="flex items-center">
                    <svg className={`w-5 h-5 mr-2 ${darkMode ? 'text-blue-400' : 'text-blue-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className={`font-medium ${darkMode ? 'text-blue-300' : 'text-blue-800'}`}>
                      1 entry selected: {localSelectedEntry.referenceNo}
                    </span>
                  </div>
                </div>
              )}

              {/* Search Filters */}
              <div className={`mb-4 ${darkMode ? 'bg-gray-700/30 border border-gray-700/50' : 'bg-gray-50 border border-gray-200'} rounded-lg p-3`}>
                <div>
                  <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Search Reference No
                  </label>
                  <input
                    type="text"
                    value={searchFilters.referenceNo}
                    onChange={(e) => setSearchFilters({...searchFilters, referenceNo: e.target.value})}
                    className={`w-full px-3 py-2 border rounded-md ${
                      darkMode ? 'bg-gray-600 border-gray-500 text-white' : 'bg-white border-gray-300'
                    }`}
                    placeholder="RR-..."
                  />
                </div>
              </div>

              {/* Search Results */}
              {loading ? (
                <div className={`text-center py-10 rounded-xl ${darkMode ? 'bg-gray-700/20 border border-gray-700/50' : 'bg-gray-50 border-1 border-gray-200'}`}>
                  <div className="w-14 h-14 mx-auto mb-3 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                    <svg className="w-7 h-7 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2M4 13h2m8-5v2m0 0v2m0-2h2m-2 0h-2" />
                    </svg>
                  </div>
                  <p className={`text-lg font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Searching entries...
                  </p>
                </div>
              ) : entries.length === 0 ? (
                <div className={`text-center py-10 rounded-xl ${darkMode ? 'bg-gray-700/20 border border-gray-700/50' : 'bg-gray-50 border-1 border-gray-200'}`}>
                  <div className="w-14 h-14 mx-auto mb-3 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                    <svg className="w-7 h-7 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2M4 13h2m8-5v2m0 0v2m0-2h2m-2 0h-2" />
                    </svg>
                  </div>
                  <p className={`text-lg font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    No entries found
                  </p>
                  <p className={`text-sm ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                    Try adjusting your search criteria
                  </p>
                </div>
              ) : (
                <div className="border-1 border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden flex-1">
                  <div className="h-full overflow-y-auto overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                      <thead className={`${darkMode ? 'bg-gray-700/50' : 'bg-gray-100'}`}>
                        <tr>
                          <th className={`px-2 py-3 text-left text-[10px] font-semibold uppercase tracking-wider ${darkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                            Select
                          </th>
                          <th className={`px-2 sm:px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider ${darkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                            Reference No
                          </th>
                          <th className={`px-2 sm:px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider ${darkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                            PO Number
                          </th>
                          <th className={`px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider ${darkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                            Vendor
                          </th>
                          <th className={`px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider ${darkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                            Date Received
                          </th>
                           <th className={`px-2 sm:px-4 py-3 text-center text-[10px] font-semibold uppercase tracking-wider ${darkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                             Status
                           </th>
                        </tr>
                      </thead>
                      <tbody className={`${darkMode ? 'bg-gray-800/50 divide-gray-700' : 'bg-white divide-gray-100'}`}>
                        {entries.map((entry) => {
                          const isSelected = localSelectedEntry?.id === entry.id;
                          return (
                            <tr
                              key={entry.id}
                              onClick={() => handleSelectEntry(entry)}
                              className={`cursor-pointer transition-all duration-200 ${isSelected
                                ? (darkMode ? 'bg-blue-900/30 border-l-4 border-l-blue-500' : 'bg-blue-50 border-l-4 border-l-blue-500')
                                : (darkMode ? 'hover:bg-gray-700/50' : 'hover:bg-gray-50')
                                }`}>
                              <td className="px-2 sm:px-4 py-2">
                                <div className="relative">
                                  <input
                                    type="checkbox"
                                    checked={isSelected}
                                     onChange={() => handleSelectEntry(entry)}
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
                                <div className={`text-[10px] sm:text-xs font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                                  {entry.referenceNo}
                                </div>
                              </td>
                              <td className="px-2 sm:px-4 py-2">
                                <div className={`text-[10px] sm:text-xs ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                  {entry.poNumber || '-'}
                                </div>
                              </td>
                              <td className="px-4 py-3.5">
                                <div className={`text-xs sm:text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                  {entry.vendName || entry.vendorId || '-'}
                                </div>
                              </td>
                              <td className="px-4 py-3.5">
                                <div className={`text-xs sm:text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                  {formatDate(entry.dateReceived)}
                                </div>
                              </td>
                              <td className="px-2 sm:px-4 py-2 text-center">
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(entry.postStatus)}`}>
                                  {getStatusText(entry.postStatus, entry.hasDA)}
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
                 <div className={`text-sm text-center sm:text-left ${darkMode ? 'text-gray-400' : 'text-white/70'}`}>
                   {isSelected && (
                     <span className="flex items-center gap-2">
                       <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse"></span>
                       1 entry selected
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
                    onClick={() => {
                      if (localSelectedEntry) {
                        onDone(localSelectedEntry);
                      }
                      onClose();
                    }}
                    className="px-4 py-2 bg-white/20 backdrop-blur-sm border border-white/30 rounded-lg text-sm font-medium text-white hover:bg-white/30 transition-all duration-200 order-1 sm:order-2"
                  >
                    Done {isSelected ? '(1 selected)' : ''}
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

export default SearchReceivingModal;