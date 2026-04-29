'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/utils/authContext';
import HeaderNavBar from '@/app/_components/headerNavBar.js';
import { getReceivingEntryDetails, getDistributionAccounts, unpostDistributionAccounts } from './_actions/index.js';
import SearchReceivingModal from '../delete-receiving/_components/SearchReceivingModal.js';
import { Search, AlertTriangle, RotateCcw } from 'lucide-react';
import ConfirmModal from '../../../_components/confirmModal.js';
import SuccessModal from '../../../_components/successModal.js';

export default function DistributionOfAccounts() {
  const { darkMode, user, isAdmin } = useAuth();
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [selectedEntryDetails, setSelectedEntryDetails] = useState(null);
  const [distributions, setDistributions] = useState([]);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [unpostConfirm, setUnpostConfirm] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    const fetchEntryDetails = async () => {
      if (!selectedEntry?.referenceNo) {
        setSelectedEntryDetails(null);
        setDistributions([]);
        return;
      }

      setDetailsLoading(true);
      try {
        const detailsResult = await getReceivingEntryDetails(selectedEntry.referenceNo, user, isAdmin());
        if (detailsResult.success) {
          setSelectedEntryDetails(detailsResult.data);
        } else {
          setSelectedEntryDetails(null);
        }

        const distResult = await getDistributionAccounts(selectedEntry.referenceNo);
        if (distResult.success) {
          setDistributions(distResult.data);
        } else {
          setDistributions([]);
        }
      } catch (error) {
        console.error('Error fetching entry details:', error);
        setSelectedEntryDetails(null);
        setDistributions([]);
      }
      setDetailsLoading(false);
    };

    fetchEntryDetails();
  }, [selectedEntry]);

  const handleClearSelection = () => {
    setSelectedEntry(null);
  };

  const handleRemoveEntry = () => {
    setSelectedEntry(null);
  };

  const handleUnpost = async (referenceNo) => {
    setActionLoading(true);
    try {
      const result = await unpostDistributionAccounts(referenceNo, user.empName);
      if (result.success) {
        setSelectedEntry(null);
        setUnpostConfirm(null);
        setShowSuccess(true);
      } else {
        alert('Error unposting DA: ' + result.error);
      }
    } catch (error) {
      alert('Error unposting DA: ' + error.message);
    }
    setActionLoading(false);
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

  if (!user || !isAdmin()) {
    return (
      <div className={`min-h-screen mt-15 ${darkMode ? 'bg-gray-900 dark' : 'bg-white'}`}>
        <HeaderNavBar />
        <div className="p-4 sm:p-6">
          <div className="max-w-4xl mx-auto text-center">
            <AlertTriangle className={`mx-auto h-12 w-12 ${darkMode ? 'text-yellow-400' : 'text-yellow-600'} mb-4`} />
            <h1 className={`text-2xl font-bold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              Access Denied
            </h1>
            <p className={`text-lg ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
              You do not have permission to access this utility.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen mt-15 ${darkMode ? 'bg-gray-900 dark' : 'bg-white'}`}>
      <HeaderNavBar />
      <div className="p-4 sm:p-6">
        <div className="max-w-7xl mx-auto">
          <div className="mb-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className={`text-2xl font-bold mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  Unpost Distribution of Accounts
                </h1>
                <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                  Select receiving entries with posted DA to unpost their distribution of accounts.
                </p>
              </div>
              <button
                onClick={() => setShowSearchModal(true)}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                <Search className="h-4 w-4" />
                <span>Search & Select Entries</span>
              </button>
            </div>
          </div>

          {/* Selected Entry */}
          <div className={`rounded-lg border p-4 mb-6 ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
            <div className="flex items-center justify-between mb-4">
              <h2 className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                Selected Entry
              </h2>
              {selectedEntry && (
                <button
                  onClick={handleClearSelection}
                  className={`flex items-center space-x-2 px-3 py-1 rounded-md text-sm ${
                    darkMode ? 'bg-gray-700 text-white hover:bg-gray-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <span>Clear</span>
                </button>
              )}
            </div>

            {!selectedEntry ? (
              <div className="text-center py-8">
                <Search className={`mx-auto h-12 w-12 ${darkMode ? 'text-gray-400' : 'text-gray-300'} mb-4`} />
                <h3 className={`text-lg font-medium ${darkMode ? 'text-gray-300' : 'text-gray-600'} mb-2`}>
                  No entry selected
                </h3>
                <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  Click "Search & Select Entries" to find receiving entries with posted DA.
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {detailsLoading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                    <p className={`text-sm mt-2 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Loading details...</p>
                  </div>
                ) : (
                  <>
                    {/* Basic Info */}
                    <div className={`p-4 rounded-lg border ${darkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'}`}>
                      <h3 className={`text-md font-semibold mb-3 ${darkMode ? 'text-white' : 'text-gray-900'}`}>Basic Information</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div>
                          <label className={`block text-xs font-medium uppercase tracking-wide ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                            Reference No
                          </label>
                          <p className={`text-sm font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                            {selectedEntry.referenceNo}
                          </p>
                        </div>
                        <div>
                          <label className={`block text-xs font-medium uppercase tracking-wide ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                            PO Number
                          </label>
                          <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                            {selectedEntry.poNumber || '-'}
                          </p>
                        </div>
                        <div>
                          <label className={`block text-xs font-medium uppercase tracking-wide ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                            Vendor
                          </label>
                          <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                            {selectedEntry.vendName || selectedEntry.vendorId || '-'}
                          </p>
                        </div>
                        <div>
                          <label className={`block text-xs font-medium uppercase tracking-wide ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                            Date Received
                          </label>
                          <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                            {formatDate(selectedEntry.dateReceived)}
                          </p>
                        </div>
                        <div>
                          <label className={`block text-xs font-medium uppercase tracking-wide ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                            Status
                          </label>
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(selectedEntry.postStatus)}`}>
                            {getStatusText(selectedEntry.postStatus, selectedEntry.hasDA)}
                          </span>
                        </div>
                        <div>
                          <label className={`block text-xs font-medium uppercase tracking-wide ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                            Items Count
                          </label>
                          <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                            {selectedEntry.itemCount}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Distributions */}
                    {distributions.length > 0 && (
                      <div className={`p-4 rounded-lg border ${darkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'}`}>
                        <h3 className={`text-md font-semibold mb-3 ${darkMode ? 'text-white' : 'text-gray-900'}`}>Distribution of Accounts</h3>
                        <div className="overflow-x-auto">
                          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-600">
                            <thead className={`${darkMode ? 'bg-gray-600' : 'bg-gray-100'}`}>
                              <tr>
                                <th className={`px-4 py-2 text-left text-xs font-medium uppercase tracking-wider ${darkMode ? 'text-gray-300' : 'text-gray-500'}`}>Account No</th>
                                <th className={`px-4 py-2 text-left text-xs font-medium uppercase tracking-wider ${darkMode ? 'text-gray-300' : 'text-gray-500'}`}>Account Name</th>
                                <th className={`px-4 py-2 text-left text-xs font-medium uppercase tracking-wider ${darkMode ? 'text-gray-300' : 'text-gray-500'}`}>Type</th>
                                <th className={`px-4 py-2 text-right text-xs font-medium uppercase tracking-wider ${darkMode ? 'text-gray-300' : 'text-gray-500'}`}>Debit</th>
                                <th className={`px-4 py-2 text-right text-xs font-medium uppercase tracking-wider ${darkMode ? 'text-gray-300' : 'text-gray-500'}`}>Credit</th>
                              </tr>
                            </thead>
                            <tbody className={`divide-y ${darkMode ? 'divide-gray-600' : 'divide-gray-200'}`}>
                              {distributions.map((dist) => (
                                <tr key={dist.id}>
                                  <td className={`px-4 py-2 text-sm ${darkMode ? 'text-gray-300' : 'text-gray-900'}`}>{dist.acctNo}</td>
                                  <td className={`px-4 py-2 text-sm ${darkMode ? 'text-gray-300' : 'text-gray-900'}`}>{dist.acctName}</td>
                                  <td className={`px-4 py-2 text-sm ${darkMode ? 'text-gray-300' : 'text-gray-900'}`}>{dist.accountType}</td>
                                  <td className={`px-4 py-2 text-sm text-right ${darkMode ? 'text-gray-300' : 'text-gray-900'}`}>{dist.debitAmount?.toFixed(2)}</td>
                                  <td className={`px-4 py-2 text-sm text-right ${darkMode ? 'text-gray-300' : 'text-gray-900'}`}>{dist.creditAmount?.toFixed(2)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex justify-end space-x-3">
                      <button
                        onClick={() => setUnpostConfirm(selectedEntry)}
                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 transition-colors"
                        disabled={actionLoading}
                      >
                        <RotateCcw className="h-4 w-4 mr-2" />
                        {actionLoading ? 'Unposting...' : 'Unpost DA'}
                      </button>
                      <button
                        onClick={handleRemoveEntry}
                        className={`inline-flex items-center px-4 py-2 border border-transparent text-sm leading-4 font-medium rounded-md ${
                          darkMode ? 'text-gray-300 bg-gray-600 hover:bg-gray-500' : 'text-gray-700 bg-gray-200 hover:bg-gray-300'
                        } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors`}
                      >
                        Remove Selection
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Search Modal */}
          <SearchReceivingModal
            isOpen={showSearchModal}
            onClose={() => setShowSearchModal(false)}
            darkMode={darkMode}
            user={user}
            isAdmin={isAdmin}
            onDone={(entry) => {
              setSelectedEntry(entry);
              setShowSearchModal(false);
            }}
            filters={{postStatus: 1, hasDA: true}}
          />

          <ConfirmModal
            isOpen={!!unpostConfirm}
            title="Confirm Unpost DA"
            message={`Are you sure you want to unpost the Distribution of Accounts for receiving entry ${unpostConfirm?.referenceNo}? This will set the DA post status back to unposted.`}
            confirmButtonText="Unpost DA"
            onConfirm={() => handleUnpost(unpostConfirm?.referenceNo)}
            onCancel={() => setUnpostConfirm(null)}
            isLoading={actionLoading}
            confirmButtonColor="orange"
          />

          <SuccessModal
            isOpen={showSuccess}
            title="Success"
            message="Distribution of Accounts unposted successfully"
            onClose={() => setShowSuccess(false)}
            autoCloseDelay={3000}
          />
        </div>
      </div>
    </div>
  );
}