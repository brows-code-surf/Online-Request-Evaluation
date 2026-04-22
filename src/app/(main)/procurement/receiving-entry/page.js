'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/utils/authContext';
import ProtectedRoute from '@/utils/protectedRoute';
import HeaderNavBar from '@/app/_components/headerNavBar';
import ReceivingEntryDetails from './_components/ReceivingEntryDetails';
import CreateReceivingEntryModal from './_components/CreateReceivingEntryModal';
import EditReceivingEntryModal from './_components/EditReceivingEntryModal';
import Loader from '@/app/_components/loader';
import { SkeletonRequestEvaluationDetail } from '@/app/_components/skeletonLoader';
import { ToastContainer, toast } from 'react-toastify';
import { useSocketMultiple } from '@/hooks/useSocketMultiple';
import {
  getAllReceivingEntries,
  getReceivingEntryByNumber,
  deleteReceivingEntry
} from './_actions';

function ReceivingEntryContent() {
  const { darkMode, user, isAdmin } = useAuth();
  const searchParams = useSearchParams();
  const loadingRef = useRef(false);

  const [receivingEntries, setReceivingEntries] = useState([]);
  const [selectedReceivingEntry, setSelectedReceivingEntry] = useState(null);
  const [receivingEntryDetails, setReceivingEntryDetails] = useState(null);
  const [loading, setLoading] = useState(false);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsReloadKey, setDetailsReloadKey] = useState(0);
  const [detailsError, setDetailsError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('date');
  const [filterStatus, setFilterStatus] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [editReceivingEntry, setEditReceivingEntry] = useState(null);
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  const reloadReceivingEntriesData = useCallback(async () => {
    try {
      const filters = {};
      if (filterStatus && filterStatus !== 'all') {
        filters.status = filterStatus;
      }

      const data = await getAllReceivingEntries(filters, user, isAdmin);
      if (data.success) {
        setReceivingEntries(data.receivingEntries);
        return { success: true };
      }
      return { success: false };
    } catch (error) {
      console.error('Failed to reload receiving entries:', error);
      return { success: false };
    }
  }, [filterStatus, user, isAdmin]);

  useEffect(() => {
    const loadReceivingEntries = async () => {
      if (!user?.empName) return;

      setLoading(true);
      try {
        const result = await reloadReceivingEntriesData();
        if (result.success && receivingEntries.length > 0) {
          const id = searchParams.get('id');
          if (id) {
            const urlSelected = receivingEntries.find(e => e.referenceNo === id);
            setSelectedReceivingEntry(urlSelected || receivingEntries[0]);
          } else {
            setSelectedReceivingEntry(receivingEntries[0]);
          }
        }
      } catch (error) {
        console.error('Failed to load receiving entries:', error);
      } finally {
        setLoading(false);
      }
    };

    loadReceivingEntries();
  }, [user?.empName]);

  useEffect(() => {
    const loadDetails = async () => {
      if (loadingRef.current || !selectedReceivingEntry?.referenceNo) return;

      loadingRef.current = true;
      setDetailsLoading(true);
      setDetailsError(null);

      try {
        const details = await getReceivingEntryByNumber(
          selectedReceivingEntry.referenceNo,
          user,
          isAdmin()
        );

        if (details.success && details.receivingEntry) {
          setReceivingEntryDetails(details.receivingEntry);
          setDetailsError(null);
        } else {
          setReceivingEntryDetails(null);
          setDetailsError(details.message || 'Failed to load details');
        }
      } catch (error) {
        console.error('Failed to load receiving entry details:', error);
        setReceivingEntryDetails(null);
        setDetailsError('Failed to load receiving entry details');
      } finally {
        setDetailsLoading(false);
        loadingRef.current = false;
      }
    };

    loadDetails();
  }, [selectedReceivingEntry?.referenceNo, detailsReloadKey]);

  const handleSelectReceivingEntry = (entry) => {
    setSelectedReceivingEntry(entry);
    setShowDetailsModal(true);
  };

  const filteredEntries = receivingEntries
    .filter(entry => {
      const matchesSearch = searchQuery === '' ||
        [entry.createdBy, entry.referenceNo, entry.postStatus, entry.vendName, entry.poNumber].some(field =>
          field?.toString().toLowerCase().includes(searchQuery.toLowerCase())
        );

      const statusMatch = filterStatus !== '' && String(entry.postStatus) === filterStatus;
      const matchesStatus = filterStatus === '' || statusMatch;

      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      if (sortBy === 'date') {
        return new Date(b.dateCreated) - new Date(a.dateCreated);
      } else if (sortBy === 'vendor') {
        return (a.vendName || '').localeCompare(b.vendName || '');
      } else if (sortBy === 'status') {
        return (a.postStatus || '').localeCompare(b.postStatus || '');
      }
      return 0;
    });

  const handleCreateReceivingEntry = async () => {
    await reloadReceivingEntriesData();
    setShowCreateModal(false);
  };

  const handleEditReceivingEntry = (receivingEntry) => {
    setEditReceivingEntry(receivingEntry);
    setShowEditModal(true);
  };

  const handleEditSuccess = async () => {
    await reloadReceivingEntriesData();
    setShowEditModal(false);
    setEditReceivingEntry(null);
    if (selectedReceivingEntry?.referenceNo === editReceivingEntry?.header?.referenceNo) {
      setDetailsReloadKey(prev => prev + 1);
    }
  };

  const handleDeleteReceivingEntry = async (referenceNo) => {
    try {
      const result = await deleteReceivingEntry(referenceNo, user?.empName);
      if (result.success) {
        toast.success('Receiving entry deleted successfully');
        await reloadReceivingEntriesData();
        if (selectedReceivingEntry?.referenceNo === referenceNo) {
          setSelectedReceivingEntry(null);
          setReceivingEntryDetails(null);
        }
      } else {
        toast.error('Failed to delete receiving entry: ' + result.message);
      }
    } catch (error) {
      console.error('Error deleting receiving entry:', error);
      toast.error('Failed to delete receiving entry');
    }
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

  const getStatusText = (status) => {
    const s = Number(status);
    if (isNaN(s)) return 'Unknown';
    switch (s) {
      case 1:
        return 'POSTED';
      case 0:
        return 'NOT POSTED';
      default:
        return 'Unknown';
    }
  };

  useSocketMultiple("receiving-entry-broadcast", {
    "receiving-entry-created": useCallback(() => {
      reloadReceivingEntriesData();
    }, [reloadReceivingEntriesData]),
    "receiving-entry-updated": useCallback(() => {
      reloadReceivingEntriesData();
    }, [reloadReceivingEntriesData]),
    "receiving-entry-deleted": useCallback(() => {
      reloadReceivingEntriesData();
    }, [reloadReceivingEntriesData]),
  });

  if (loading) {
    return (
      <div className={`flex flex-col h-screen ${darkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
        <Loader loading={true} />
        <HeaderNavBar />
      </div>
    );
  }

  return (
    <div className={`flex flex-col h-screen ${darkMode ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'}`}>
      <Loader loading={loading} />
      <HeaderNavBar />

      <div className="flex-1 overflow-y-auto pt-14 pb-6">
        <div className="w-full px-3 sm:px-4 py-4 sm:py-6">

          {/* Header Section */}
          <div className="mb-6 sm:mb-8">
            <div className={`relative overflow-hidden rounded-2xl ${darkMode ? 'bg-gradient-to-br from-gray-700 to-gray-900' : 'bg-gradient-to-br from-green-600 to-teal-700'} p-5 sm:p-8 shadow-xl`}>
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2"></div>
              <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full translate-y-1/2 -translate-x-1/2"></div>

              <div className="relative z-10">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-2 tracking-tight">
                      Receiving Entries
                    </h1>
                    <p className="text-blue-100 text-sm sm:text-lg max-w-xl">
                      Track and manage received items from purchase orders.
                    </p>
                  </div>
                  <div className="hidden sm:flex items-center gap-3">
                    <div className="bg-white/20 backdrop-blur-sm rounded-xl px-4 py-3">
                      <div className="text-2xl font-bold text-white">{filteredEntries.length}</div>
                      <div className="text-blue-100 text-xs uppercase tracking-wider">Total</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className={`rounded-2xl shadow-lg overflow-hidden ${darkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'}`}>

            {/* Filter Section */}
            <div className={`${darkMode ? 'bg-gray-800 border-b border-gray-700' : 'bg-gray-50 border-b border-gray-200'} px-4 sm:px-6 py-4`}>
              <div className="sm:hidden">
                <button
                  onClick={() => setShowMobileFilters(!showMobileFilters)}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border ${darkMode ? 'border-gray-600 bg-gray-700 text-white' : 'border-gray-300 bg-white text-gray-900'} transition-colors`}
                >
                  <div className="flex items-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                    </svg>
                    <span className="font-medium">Filters & Search</span>
                    {(searchQuery || sortBy || filterStatus) && (
                      <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                    )}
                  </div>
                  <svg className={`w-5 h-5 transition-transform ${showMobileFilters ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
              </div>

              <div className={`${showMobileFilters ? 'block' : 'hidden'} sm:block mt-4 sm:mt-0`}>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="flex items-center gap-2">
                    <h2 className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                      Receiving Entries
                    </h2>
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${darkMode ? 'bg-blue-900/50 text-blue-300' : 'bg-blue-100 text-blue-700'}`}>
                      {filteredEntries.length} {filteredEntries.length === 1 ? 'entry' : 'entries'}
                    </span>
                  </div>
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:space-x-3">
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <svg className={`h-4 w-4 ${darkMode ? 'text-gray-400' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                      </div>
                      <input
                        type="text"
                        placeholder="Search entries..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className={`w-full sm:w-56 lg:w-64 pl-10 pr-4 py-2.5 text-sm border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${darkMode
                          ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                          : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'}`}
                      />
                    </div>

                    <select
                      value={filterStatus}
                      onChange={(e) => setFilterStatus(e.target.value)}
                      className={`px-4 py-2.5 text-sm border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all cursor-pointer ${darkMode
                        ? 'bg-gray-700 border-gray-600 text-white'
                        : 'bg-white border-gray-300 text-gray-900'}`}
                    >
                      <option value="">All Status</option>
                      <option value="1">POSTED</option>
                      <option value="0">NOT POSTED</option>
                    </select>

                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value)}
                      className={`px-4 py-2.5 text-sm border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all cursor-pointer ${darkMode
                        ? 'bg-gray-700 border-gray-600 text-white'
                        : 'bg-white border-gray-300 text-gray-900'}`}
                    >
                      <option value="date">Sort by Date</option>
                      <option value="vendor">Sort by Vendor</option>
                      <option value="status">Sort by Status</option>
                    </select>

                    {(searchQuery || sortBy || filterStatus) && (
                      <button
                        onClick={() => {
                          setSearchQuery('');
                          setSortBy('date');
                          setFilterStatus('');
                        }}
                        className={`px-3 py-2 text-sm font-medium rounded-xl transition-colors ${darkMode
                          ? 'text-gray-300 hover:bg-gray-600'
                          : 'text-gray-600 hover:bg-gray-100'}`}
                      >
                        Clear
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Table */}
            {filteredEntries.length === 0 ? (
              <div className={`p-12 text-center ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                <svg className="w-16 h-16 mx-auto mb-4 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p className="text-lg font-medium">No receiving entries found</p>
                <p className="text-sm mt-1">Create your first receiving entry to get started.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className={`${darkMode ? 'bg-gray-700/50' : 'bg-gray-50'} text-xs uppercase`}>
                    <tr>
                      <th className={`px-6 py-4 text-left font-semibold ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Receiving No.</th>
                      <th className={`px-6 py-4 text-left font-semibold ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>PO Number</th>
                      <th className={`px-6 py-4 text-left font-semibold ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Vendor</th>
                      <th className={`px-6 py-4 text-left font-semibold ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Received By</th>
                      <th className={`px-6 py-4 text-center font-semibold ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Items</th>
                      <th className={`px-6 py-4 text-left font-semibold ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Date</th>
                      <th className={`px-6 py-4 text-center font-semibold ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Status</th>
                    </tr>
                  </thead>
                  <tbody className={`divide-y ${darkMode ? 'divide-gray-700' : 'divide-gray-200'}`}>
                    {filteredEntries.map((entry) => (
                      <tr
                        key={entry.referenceNo}
                        onClick={() => handleSelectReceivingEntry(entry)}
                        className={`cursor-pointer transition-all duration-200 ${darkMode
                            ? 'hover:bg-gray-700/50'
                            : 'hover:bg-blue-50'
                          } ${selectedReceivingEntry?.referenceNo === entry.referenceNo
                            ? (darkMode ? 'bg-blue-900/30' : 'bg-blue-50')
                            : ''}`}
                      >
                        <td className="px-6 py-4">
                          <span className={`font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                            {entry.referenceNo}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={darkMode ? 'text-gray-300' : 'text-gray-700'}>
                            {entry.poNumber || 'N/A'}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                              <svg className={`w-4 h-4 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                              </svg>
                            </div>
                            <span className={darkMode ? 'text-gray-300' : 'text-gray-700'}>
                              {entry.vendName || 'Unknown'}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={darkMode ? 'text-gray-300' : 'text-gray-700'}>
                            {entry.createdBy || 'N/A'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className={`px-2.5 py-1 rounded-lg text-sm font-medium ${darkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-700'}`}>
                            {entry.itemCount || 0}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={darkMode ? 'text-gray-400' : 'text-gray-500'}>
                            {entry.dateCreated ? new Date(entry.dateCreated).toLocaleDateString() : '-'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${getStatusColor(entry.postStatus)}`}>
                            {getStatusText(entry.postStatus)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>



          <button
            onClick={() => setShowCreateModal(true)}
            className="fixed bottom-6 right-6 bg-gradient-to-r from-blue-600 to-green-600 hover:from-blue-700 hover:to-green-700 text-white p-4 rounded-full shadow-lg hover:shadow-2xl transform hover:scale-110 transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-blue-500 focus:ring-opacity-50"
            title="Create Receiving Entry"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </button>
        </div>
      </div>

      <CreateReceivingEntryModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        darkMode={darkMode}
        user={user}
        onSuccess={handleCreateReceivingEntry}
      />

      <EditReceivingEntryModal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setEditReceivingEntry(null);
        }}
        darkMode={darkMode}
        user={user}
        receivingEntry={editReceivingEntry}
        onSuccess={handleEditSuccess}
        receivingEntries={receivingEntries}
      />

      {showDetailsModal && (
        <ReceivingEntryDetails
          receivingEntry={receivingEntryDetails}
          onClose={() => setShowDetailsModal(false)}
          onDelete={handleDeleteReceivingEntry}
          onEdit={handleEditReceivingEntry}
          onDataRefresh={() => setDetailsReloadKey(prev => prev + 1)}
          onRefreshList={reloadReceivingEntriesData}
          darkMode={darkMode}
          loading={loading || detailsLoading}
          isModal={true}
        />
      )}

      <ToastContainer
        position="top-center"
        autoClose={5000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme={darkMode ? "dark" : "light"}
      />
    </div>
  );
}

export default function ReceivingEntryPage() {
  return (
    <ProtectedRoute>
      <ReceivingEntryContent />
    </ProtectedRoute>
  );
}