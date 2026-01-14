'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '../../../../utils/authContext';
import ProtectedRoute from '@/utils/protectedRoute';
import HeaderNavBar from '@/app/_components/headerNavBar';
import SuccessModal from '@/app/(main)/_components/successModal';
import ConfirmModal from '@/app/(main)/_components/confirmModal';
import RejectRequestModal from '@/app/(main)/_components/rejectRequestModal';
import Loader from '@/app/_components/loader';
import { ToastContainer, toast } from 'react-toastify';
import { useSocketMultiple } from '@/hooks/useSocketMultiple';
import {
  getAllCanvassingItemsForApproval,
  approveCanvassingItem,
  rejectCanvassingItem
} from './_actions';
import CanvassingDetailsModal from '../canvassing/_components/CanvassingDetailsModal';

function CanvassApprovalContent() {
  const { darkMode, user } = useAuth();

  const [canvassingItems, setCanvassingItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentView, setCurrentView] = useState('dashboard'); // 'dashboard', 'list', 'create'
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState({ title: '', message: '' });
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);

  // Confirmation modal states
  const [showApproveConfirmModal, setShowApproveConfirmModal] = useState(false);
  const [showRejectConfirmModal, setShowRejectConfirmModal] = useState(false);
  const [pendingApproveItem, setPendingApproveItem] = useState(null);
  const [pendingRejectItem, setPendingRejectItem] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // Function to reload canvassing items data without page refresh
  const reloadCanvassingItemsData = async () => {
    try {
      const data = await getAllCanvassingItemsForApproval(user);
      if (data.success) {
        setCanvassingItems(data.items);
        return { success: true };
      }
      return { success: false };
    } catch (error) {
      console.error('Failed to reload canvassing items:', error);
      return { success: false };
    }
  };

  useEffect(() => {
    const loadCanvassingItems = async () => {
      if (!user?.empName) return;

      setLoading(true);
      try {
        const result = await getAllCanvassingItemsForApproval(user);
        if (result.success) {
          setCanvassingItems(result.items);
        }
      } catch (error) {
        console.error('Failed to load canvassing items:', error);
      } finally {
        setLoading(false);
      }
    };

    loadCanvassingItems();
  }, [user?.empName]);



  const handleApproveCanvassingItem = async (item) => {
    try {
      const result = await approveCanvassingItem(item.id, user?.empName);
      if (result.success) {
        setSuccessMessage({
          title: 'Canvassing Item Approved',
          message: `The item "${item.itemDescription}" has been approved successfully.`
        });
        setShowSuccessModal(true);
        await reloadCanvassingItemsData();
      } else {
        toast.error('Failed to approve canvassing item: ' + result.message);
      }
    } catch (error) {
      console.error('Error approving canvassing item:', error);
      toast.error('Failed to approve canvassing item');
    } finally {
      setIsProcessing(false);
      setPendingApproveItem(null);
    }
  };

  // Confirmation modal handlers
  const handleApproveClick = (item) => {
    setPendingApproveItem(item);
    setShowApproveConfirmModal(true);
  };

  const handleConfirmApprove = async () => {
    if (!pendingApproveItem) return;

    setIsProcessing(true);
    setShowApproveConfirmModal(false);

    await handleApproveCanvassingItem(pendingApproveItem);
  };

  const handleCancelApprove = () => {
    setShowApproveConfirmModal(false);
    setPendingApproveItem(null);
  };

  const handleRejectCanvassingItem = async (item, reason) => {
    try {
      const result = await rejectCanvassingItem(item.id, user?.empName, reason);
      if (result.success) {
        setSuccessMessage({
          title: 'Canvassing Item Rejected',
          message: `The item "${item.itemDescription}" has been rejected successfully.`
        });
        setShowSuccessModal(true);
        await reloadCanvassingItemsData();
      } else {
        toast.error('Failed to reject canvassing item: ' + result.message);
      }
    } catch (error) {
      console.error('Error rejecting canvassing item:', error);
      toast.error('Failed to reject canvassing item');
    } finally {
      setIsProcessing(false);
      setPendingRejectItem(null);
      setRejectReason('');
    }
  };

  // Reject modal handlers
  const handleRejectClick = (item) => {
    setPendingRejectItem(item);
    setRejectReason('');
    setShowRejectConfirmModal(true);
  };

  const handleConfirmReject = async () => {
    if (!pendingRejectItem) return;

    setIsProcessing(true);
    setShowRejectConfirmModal(false);

    await handleRejectCanvassingItem(pendingRejectItem, rejectReason);
  };

  const handleCancelReject = () => {
    setShowRejectConfirmModal(false);
    setPendingRejectItem(null);
    setRejectReason('');
  };



  // Filter items based on search term
  const filteredItems = canvassingItems.filter((item) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      item.pqCode?.toLowerCase().includes(searchLower) ||
      item.itemNumber?.toLowerCase().includes(searchLower) ||
      item.itemDescription?.toLowerCase().includes(searchLower) ||
      item.createdBy?.toLowerCase().includes(searchLower) ||
      item.vendorName?.toLowerCase().includes(searchLower)
    );
  });

  const getStatusColor = (status) => {
    switch (status) {
      case 'POSTED':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  // Real-time updates from canvassing page
  useSocketMultiple("canvassing-posted", {
    "canvassing-posted": useCallback(
      (data) => {
        console.log("Canvassing posted event received in approval page:", data);
        reloadCanvassingItemsData();
      },
      []
    ),
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

      <div className="flex-1 overflow-y-auto pt-14">
        <div className="max-w-7xl mx-auto p-6">

          {/* Header Section */}
          <div className={`mb-8 p-6 rounded-xl ${darkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'} shadow-sm relative`}>
            <div className="flex-1">
              <h1 className={`text-3xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'} mb-2`}>
                Canvass Approval Management
              </h1>
              <p className={`text-lg ${darkMode ? 'text-gray-300' : 'text-gray-600'} mb-4`}>
                Review and approve canvassing requests for procurement items
              </p>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className={`rounded-lg shadow-sm p-6 ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
                <div className="ml-4">
                  <p className={`text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>For Approval</p>
                  <p className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{filteredItems.length}</p>
                </div>
              </div>
            </div>

            <div className={`rounded-lg shadow-sm p-6 ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                </div>
                <div className="ml-4">
                  <p className={`text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Approved Today</p>
                  <p className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>0</p>
                </div>
              </div>
            </div>

            <div className={`rounded-lg shadow-sm p-6 ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </div>
                </div>
                <div className="ml-4">
                  <p className={`text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Rejected Today</p>
                  <p className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>0</p>
                </div>
              </div>
            </div>

            <div className={`rounded-lg shadow-sm p-6 ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                </div>
                <div className="ml-4">
                  <p className={`text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Pending Items</p>
                  <p className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{filteredItems.length}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Main Content Area */}
          {currentView === 'dashboard' && (
            <div className={`rounded-xl shadow-sm overflow-hidden ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
              <div className={`px-6 py-5 border-b ${darkMode ? 'border-blue-700 bg-blue-900' : 'border-blue-200 bg-blue-50'}`}>
                <div className="flex justify-between items-center">
                  <div>
                    <h2 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'} mb-1`}>
                      Items for Approval
                    </h2>
                    <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                      Review and approve individual canvassing items ({filteredItems.length} total)
                    </p>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="Search items by PQ code, item number, description..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className={`w-80 px-4 py-2 pl-10 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200 ${darkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'bg-white border-gray-300 placeholder-gray-500'
                          }`}
                      />
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <svg className={`w-5 h-5 ${darkMode ? 'text-gray-400' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto">
                {filteredItems.length > 0 ? (
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className={`${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                      <tr>
                        <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${darkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                          Item Details
                        </th>
                        <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${darkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                          Supplier
                        </th>
                        <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${darkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                          Agreed Price
                        </th>
                        <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${darkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                          Quantity
                        </th>
                        <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${darkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                          Requested By
                        </th>
                        <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${darkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className={`${darkMode ? 'bg-gray-800 divide-gray-700' : 'bg-white divide-gray-200'}`}>
                      {filteredItems.slice(0, 10).map((item, index) => (
                        <tr key={item.id || `${item.pqCode}-${index}`} className={`${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-50'}`}>
                          <td className="px-6 py-4">
                            <div className="max-w-xs">
                              <div className={`text-sm font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                                {item.itemNumber}
                              </div>
                              <div className={`text-sm ${darkMode ? 'text-white' : 'text-gray-900'} truncate`}>
                                {item.itemDescription}
                              </div>
                              <div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                {item.unitOfMeasure} | {item.budgetCode}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className={`text-sm ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                              {item.vendorName || 'N/A'}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className={`text-sm font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                              ₱{item.finalPrice ? item.finalPrice.toLocaleString() : '0'}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className={`text-sm ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                              {item.quantity}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className={`text-sm ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                              {item.createdBy}
                            </div>
                            <div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                              {new Date(item.dateRequested).toISOString().split('T')[0]}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <div className="flex items-center space-x-2">
                              <button
                                onClick={() => {
                                  setSelectedItem(item);
                                  setShowDetailsModal(true);
                                }}
                                className="p-1 text-blue-600 hover:text-blue-900 hover:bg-blue-50 rounded transition-colors duration-200"
                                title="View Details"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                </svg>
                              </button>
                              <button
                                onClick={() => handleApproveClick(item)}
                                disabled={isProcessing}
                                className="p-1 text-green-600 hover:text-green-900 hover:bg-green-50 rounded transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                                title="Approve Item"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                              </button>
                              <button
                                onClick={() => handleRejectClick(item)}
                                disabled={isProcessing}
                                className="p-1 text-red-600 hover:text-red-900 hover:bg-red-50 rounded transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                                title="Reject Item"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="text-center py-12">
                    <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <h3 className={`mt-2 text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-900'}`}>No items for approval</h3>
                    <p className={`mt-1 text-sm ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                      All canvassing items have been processed or there are no pending requests.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Success Modal */}
      <SuccessModal
        isOpen={showSuccessModal}
        title={successMessage.title}
        message={successMessage.message}
        onClose={() => {
          setShowSuccessModal(false);
          setSuccessMessage({ title: '', message: '' });
        }}
        autoCloseDelay={3000}
      />

      {/* Item Details Modal */}
      <CanvassingDetailsModal
        isOpen={showDetailsModal}
        onClose={() => {
          setShowDetailsModal(false);
          setSelectedItem(null);
        }}
        pqCode={selectedItem?.pqCode}
        darkMode={darkMode}
        user={user}
      />

      {/* Toast Container */}
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

      {/* Approve Confirmation Modal */}
      <ConfirmModal
        isOpen={showApproveConfirmModal}
        title="Confirm Item Approval"
        message={`Are you sure you want to approve this item: "${pendingApproveItem?.itemDescription}"? Once approved, it will move to the approved status.`}
        confirmButtonText="Approve Item"
        confirmButtonColor="green"
        onConfirm={handleConfirmApprove}
        onCancel={handleCancelApprove}
        isLoading={isProcessing}
      />

      {/* Reject Confirmation Modal */}
      <RejectRequestModal
        isOpen={showRejectConfirmModal}
        title="Reject Canvassing Item"
        message={`Are you sure you want to reject this item: "${pendingRejectItem?.itemDescription}"? Please provide remarks for rejecting this item.`}
        remarks={rejectReason}
        onRemarksChange={setRejectReason}
        onConfirm={handleConfirmReject}
        onCancel={handleCancelReject}
        isLoading={isProcessing}
        confirmButtonText="Confirm Reject"
        confirmButtonColor="red"
        label="Rejection Remarks"
        placeholder="Enter reason for rejection..."
      />
    </div>
  );
}

export default function CanvassApprovalPage() {
  return (
    <ProtectedRoute>
      <CanvassApprovalContent />
    </ProtectedRoute>
  );
}
