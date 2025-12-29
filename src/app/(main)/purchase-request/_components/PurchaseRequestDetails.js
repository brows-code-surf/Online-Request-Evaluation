'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../../../../utils/authContext';
import { useSocketMultiple } from '@/hooks/useSocketMultiple';
import RejectRequestModal from '@/app/(main)/_components/rejectRequestModal';
import ConfirmModal from '@/app/(main)/_components/confirmModal';
import { PurchaseRequestPrintModal } from './PurchaseRequestPrintModal';

const STATUS_OPTIONS = [
  { value: 'POSTED', label: 'Posted', color: 'bg-purple-100 text-purple-800' },
  { value: 'FOR CONFIRMATION', label: 'For Confirmation', color: 'bg-blue-100 text-blue-800' },
  { value: 'FOR REQUEST APPROVAL', label: 'For Request Approval', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'FOR PURCHASING LEAD TIME', label: 'For Purchasing Lead Time', color: 'bg-orange-100 text-orange-800' },
  { value: 'COMPLETED', label: 'Completed', color: 'bg-green-100 text-green-800' },
  { value: 'REJECTED', label: 'Rejected', color: 'bg-red-100 text-red-800' }
];

const ITEM_STATUS_OPTIONS = [
  { value: 'FOR CONFIRMATION', label: 'For Confirmation', color: 'bg-blue-100 text-blue-800' },
  { value: 'FOR REQUEST APPROVAL', label: 'For Request Approval', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'FOR PURCHASING LEAD TIME', label: 'For Purchasing Lead Time', color: 'bg-orange-100 text-orange-800' },
  { value: 'COMPLETED', label: 'Completed', color: 'bg-green-100 text-green-800' },
  { value: 'REJECTED', label: 'Rejected', color: 'bg-red-100 text-red-800' }
];

export default function PurchaseRequestDetails({
  purchaseRequest,
  onReview,
  onApprove,
  onReceive,
  onReject,
  onPost,
  onCancel,
  onEdit,
  onDataRefresh,
  loading = false
}) {
  const { user, darkMode } = useAuth();
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [showActionMenu, setShowActionMenu] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [pendingAction, setPendingAction] = useState(null);
  const menuRef = useRef(null);

  // Real-time updates for this specific purchase request
  useSocketMultiple("request-evaluation-broadcast", {
    "request-approved": useCallback(
      (data) => {
        // Check if this approval event is for the current purchase request
        if (data && data.referenceNo === purchaseRequest?.referenceNo) {
          console.log("Purchase request approved - updating details:", data);
          // Small delay to ensure database transaction is committed
          setTimeout(() => {
            onDataRefresh && onDataRefresh();
          }, 1000); // 1 second delay
        }
      },
      [purchaseRequest?.referenceNo, onDataRefresh]
    ),

    "request-rejected": useCallback(
      (data) => {
        // Check if this rejection event is for the current purchase request
        if (data && data.referenceNo === purchaseRequest?.referenceNo) {
          console.log("Purchase request rejected - updating details:", data);
          // Small delay to ensure database transaction is committed
          setTimeout(() => {
            onDataRefresh && onDataRefresh();
          }, 1000); // 1 second delay
        }
      },
      [purchaseRequest?.referenceNo, onDataRefresh]
    ),

    "request-changed": useCallback(
      (data) => {
        // Check if this change event is for the current purchase request
        if (data && data.referenceNo === purchaseRequest?.referenceNo) {
          console.log("Purchase request changed - updating details:", data);
          // Small delay to ensure database transaction is committed
          setTimeout(() => {
            onDataRefresh && onDataRefresh();
          }, 1000); // 1 second delay
        }
      },
      [purchaseRequest?.referenceNo, onDataRefresh]
    ),
  });

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setShowActionMenu(false);
      }
    };

    if (showActionMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showActionMenu]);

  if (!purchaseRequest) return null;

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'UTC'
    });
  };

  const getStatusBadge = (status, type = 'request') => {
    const options = type === 'item' ? ITEM_STATUS_OPTIONS : STATUS_OPTIONS;
    const statusOption = options.find(s => s.value === status);
    return statusOption ? statusOption.color : 'bg-gray-100 text-gray-800';
  };

  const canPost = () => {
    return !purchaseRequest.isPosted &&
      purchaseRequest.requestedBy?.toUpperCase() === user?.empName?.toUpperCase() &&
      (purchaseRequest.requestStatus === 'FOR CONFIRMATION' || purchaseRequest.requestStatus === 'FOR POSTING');
  };

  const handleAction = async (action, reason = '') => {
    // Show confirmation for post action
    if (action === 'post') {
      setPendingAction('post');
      setShowConfirmModal(true);
      return;
    }

    setActionLoading(true);
    try {
      switch (action) {
        case 'review':
          await onReview(purchaseRequest.referenceNo);
          break;
        case 'approve':
          await onApprove(purchaseRequest.referenceNo);
          break;
        case 'receive':
          await onReceive(purchaseRequest.referenceNo);
          break;
        case 'reject':
          await onReject(purchaseRequest.referenceNo, reason);
          setShowRejectModal(false);
          break;
      }
    } catch (error) {
      console.error(`Error ${action}ing purchase request:`, error);
    } finally {
      setActionLoading(false);
    }
  };

  const handleConfirmAction = async () => {
    setShowConfirmModal(false);
    setActionLoading(true);

    try {
      if (pendingAction === 'post' && onPost) {
        await onPost(purchaseRequest.referenceNo);
      }
    } catch (error) {
      console.error(`Error ${pendingAction}ing purchase request:`, error);
    } finally {
      setActionLoading(false);
      setPendingAction(null);
    }
  };

  const handleCancelConfirm = async () => {
    setShowCancelModal(false);
    setActionLoading(true);

    try {
      if (onCancel) {
        await onCancel(purchaseRequest.referenceNo);
      }
    } catch (error) {
      console.error('Error canceling purchase request:', error);
    } finally {
      setActionLoading(false);
    }
  };

  const getDateRequested = () => {
    return `Requested on ${formatDate(purchaseRequest.dateRequested)}`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className={`p-4 rounded-lg`}>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h1 className={`text-3xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'} mb-2`}>
              {purchaseRequest.company} {purchaseRequest.referenceNo}
            </h1>
            <div className="flex items-center gap-3">
              {purchaseRequest.isRush && (
                <span className={`text-xs px-4 py-2 rounded-full ${darkMode ? 'bg-red-900 text-red-300' : 'bg-red-100 text-red-700'} font-semibold whitespace-nowrap`}>
                  {purchaseRequest.isRush ? 'RUSH' : ''}
                </span>
              )}
              <span className={`px-4 py-1 rounded-full text-sm font-semibold border ${getStatusBadge(purchaseRequest.requestStatus)}`}>
                {purchaseRequest.requestStatus}
              </span>
              <span className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                {getDateRequested()}
              </span>
            </div>
          </div>
          <div className="relative">
            {/* Desktop buttons */}
            <div className="hidden sm:flex gap-3">
              <button
                onClick={() => setShowPrintModal(true)}
                disabled={loading || actionLoading}
                className={`inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium ${darkMode ? 'text-gray-300 bg-gray-700 hover:bg-gray-600' : 'text-gray-700 bg-gray-100 hover:bg-gray-200'} rounded-md shadow-sm transition-all duration-200 ease-in-out transform hover:scale-105 focus:scale-105 disabled:transform-none disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-gray-900 min-w-[100px] ${
                  actionLoading ? 'cursor-wait' : 'cursor-pointer'
                }`}
                aria-label="Print purchase request"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
                Print
              </button>
              {!purchaseRequest.isPosted && purchaseRequest.requestedBy?.toUpperCase() === user?.empName?.toUpperCase() && (
                <button
                  onClick={() => onEdit && onEdit(purchaseRequest)}
                  disabled={loading || actionLoading}
                  className={`inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-amber-600 hover:bg-amber-700 focus:bg-amber-700 active:bg-amber-800 rounded-md shadow-sm transition-all duration-200 ease-in-out transform hover:scale-105 focus:scale-105 disabled:transform-none disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-gray-900 min-w-[120px] ${
                    actionLoading ? 'cursor-wait' : 'cursor-pointer'
                  }`}
                  aria-label="Edit purchase request"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Edit
                </button>
              )}
              {canPost() && (
                <button
                  onClick={() => handleAction('post')}
                  disabled={loading || actionLoading}
                  className={`inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:bg-green-700 active:bg-green-800 rounded-md shadow-sm transition-all duration-200 ease-in-out transform hover:scale-105 focus:scale-105 disabled:transform-none disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-gray-900 min-w-[120px] ${
                    actionLoading ? 'cursor-wait' : 'cursor-pointer'
                  }`}
                  aria-label="Post purchase request"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                  Post
                </button>
              )}
              {!purchaseRequest.isPosted && purchaseRequest.requestStatus !== 'CANCELLED' && purchaseRequest.requestedBy?.toUpperCase() === user?.empName?.toUpperCase() && (
                <button
                  onClick={() => setShowCancelModal(true)}
                  disabled={loading || actionLoading}
                  className={`inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:bg-red-700 active:bg-red-800 rounded-md shadow-sm transition-all duration-200 ease-in-out transform hover:scale-105 focus:scale-105 disabled:transform-none disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-gray-900 min-w-[120px] ${
                    actionLoading ? 'cursor-wait' : 'cursor-pointer'
                  }`}
                  aria-label="Cancel purchase request"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Cancel
                </button>
              )}
            </div>

            {/* Mobile menu button */}
            <div className="sm:hidden" ref={menuRef}>
              <button
                onClick={() => setShowActionMenu(!showActionMenu)}
                className={`inline-flex items-center justify-center p-3 rounded-lg border transition-all duration-200 ease-in-out ${
                  darkMode
                    ? 'border-gray-600 hover:bg-gray-700 hover:border-gray-500 focus:bg-gray-700 focus:border-gray-500 focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 focus:ring-offset-gray-900'
                    : 'border-gray-300 hover:bg-gray-50 hover:border-gray-400 focus:bg-gray-50 focus:border-gray-400 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-white'
                } disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none ${
                  actionLoading ? 'cursor-wait' : 'cursor-pointer'
                }`}
                disabled={loading || actionLoading}
                aria-label="More actions"
                aria-expanded={showActionMenu}
                aria-haspopup="menu"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.75a.75.75 0 110-1.5.75.75 0 010 1.5zM12 12.75a.75.75 0 110-1.5.75.75 0 010 1.5zM12 18.75a.75.75 0 110-1.5.75.75 0 010 1.5z" />
                </svg>
              </button>

              {/* Mobile dropdown menu */}
              {showActionMenu && (
                <div
                  className={`absolute right-0 mt-3 w-56 ${darkMode ? 'bg-gray-800 border-gray-600' : 'bg-white border-gray-200'} rounded-lg shadow-xl border z-50`}
                  role="menu"
                  aria-orientation="vertical"
                >
                  <button
                    onClick={() => {
                      setShowPrintModal(true);
                      setShowActionMenu(false);
                    }}
                    disabled={loading || actionLoading}
                    className={`w-full inline-flex items-center gap-3 text-left px-4 py-3.5 text-sm font-medium transition-all duration-150 ease-in-out ${
                      darkMode
                        ? 'text-gray-300 hover:bg-gray-700 hover:text-white focus:bg-gray-700 focus:text-white'
                        : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900 focus:bg-gray-50 focus:text-gray-900'
                    } border-b ${darkMode ? 'border-gray-600' : 'border-gray-200'} first:rounded-t-lg disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-inset focus:ring-gray-500 ${
                      actionLoading ? 'cursor-wait' : 'cursor-pointer'
                    }`}
                    role="menuitem"
                    aria-label="Print purchase request"
                  >
                    <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                    </svg>
                    <span className="truncate">Print Request</span>
                  </button>
                  {!purchaseRequest.isPosted && purchaseRequest.requestedBy?.toUpperCase() === user?.empName?.toUpperCase() && (
                    <button
                      onClick={() => {
                        onEdit && onEdit(purchaseRequest);
                        setShowActionMenu(false);
                      }}
                      disabled={loading || actionLoading}
                      className={`w-full inline-flex items-center gap-3 text-left px-4 py-3.5 text-sm font-medium transition-all duration-150 ease-in-out ${
                        darkMode
                          ? 'text-amber-400 hover:bg-amber-900/20 hover:text-amber-300 focus:bg-amber-900/20 focus:text-amber-300'
                          : 'text-amber-700 hover:bg-amber-50 hover:text-amber-800 focus:bg-amber-50 focus:text-amber-800'
                      } border-b ${darkMode ? 'border-gray-600' : 'border-gray-200'} disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-inset focus:ring-amber-500 ${
                        actionLoading ? 'cursor-wait' : 'cursor-pointer'
                      }`}
                      role="menuitem"
                      aria-label="Edit purchase request"
                    >
                      <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                      <span className="truncate">Edit Request</span>
                    </button>
                  )}
                  {canPost() && (
                    <button
                      onClick={() => {
                        handleAction('post');
                        setShowActionMenu(false);
                      }}
                      disabled={loading || actionLoading}
                      className={`w-full inline-flex items-center gap-3 text-left px-4 py-3.5 text-sm font-medium transition-all duration-150 ease-in-out ${
                        darkMode
                          ? 'text-green-400 hover:bg-green-900/20 hover:text-green-300 focus:bg-green-900/20 focus:text-green-300'
                          : 'text-green-700 hover:bg-green-50 hover:text-green-800 focus:bg-green-50 focus:text-green-800'
                      } border-b ${darkMode ? 'border-gray-600' : 'border-gray-200'} disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-inset focus:ring-green-500 ${
                        actionLoading ? 'cursor-wait' : 'cursor-pointer'
                      }`}
                      role="menuitem"
                      aria-label="Post purchase request"
                    >
                      <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                      </svg>
                      <span className="truncate">Post Request</span>
                    </button>
                  )}
                  {!purchaseRequest.isPosted && purchaseRequest.requestStatus !== 'CANCELLED' && purchaseRequest.requestedBy?.toUpperCase() === user?.empName?.toUpperCase() && (
                    <button
                      onClick={() => {
                        setShowCancelModal(true);
                        setShowActionMenu(false);
                      }}
                      disabled={loading || actionLoading}
                      className={`w-full inline-flex items-center gap-3 text-left px-4 py-3.5 text-sm font-medium transition-all duration-150 ease-in-out ${
                        darkMode
                          ? 'text-red-400 hover:bg-red-900/20 hover:text-red-300 focus:bg-red-900/20 focus:text-red-300'
                          : 'text-red-700 hover:bg-red-50 hover:text-red-800 focus:bg-red-50 focus:text-red-800'
                      } last:rounded-b-lg disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-inset focus:ring-red-500 ${
                        actionLoading ? 'cursor-wait' : 'cursor-pointer'
                      }`}
                      role="menuitem"
                      aria-label="Cancel purchase request"
                    >
                      <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                      <span className="truncate">Cancel Request</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div>
        {/* Request Header Info */}
        <div className={`${darkMode ? 'bg-gray-800/50 border-gray-600' : 'bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200'} p-4 rounded-lg mb-6 border`}>
          <h3 className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'} mb-3`}>Request Information</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <p className={`text-xs ${darkMode ? 'text-gray-300' : 'text-gray-600'} font-medium mb-1`}>Requested By</p>
              <p className={`text-sm font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{purchaseRequest.requestedBy}</p>
            </div>
            <div>
              <p className={`text-xs ${darkMode ? 'text-gray-300' : 'text-gray-600'} font-medium mb-1`}>Reference Number</p>
              <p className="text-lg font-semibold text-blue-600">{purchaseRequest.referenceNo}</p>
            </div>
            <div>
              <p className={`text-xs ${darkMode ? 'text-gray-300' : 'text-gray-600'} font-medium mb-1`}>Company</p>
              <p className={`text-sm font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{purchaseRequest.company}</p>
            </div>
            <div>
              <p className={`text-xs ${darkMode ? 'text-gray-300' : 'text-gray-600'} font-medium mb-1`}>Location</p>
              <p className={`text-sm font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{purchaseRequest.locationCode}</p>
            </div>
            <div>
              <p className={`text-xs ${darkMode ? 'text-gray-300' : 'text-gray-600'} font-medium mb-1`}>Reviewer</p>
              <p className={`text-sm font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                {purchaseRequest.reviewer || '-'}
                {purchaseRequest.dateReviewed ? (
                  <span className={`text-xs ${darkMode ? 'text-green-400' : 'text-green-500'} ml-2`}>
                    [REVIEWED: {formatDate(purchaseRequest.dateReviewed)}]
                  </span>
                ) : (
                  <span className={`text-xs ${darkMode ? 'text-orange-400' : 'text-orange-600'} ml-2`}>
                    [PENDING]
                  </span>
                )}
              </p>
            </div>
            <div>
              <p className={`text-xs ${darkMode ? 'text-gray-300' : 'text-gray-600'} font-medium mb-1`}>Approver</p>
              <p className={`text-sm font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                {purchaseRequest.approver || '-'}
                {purchaseRequest.dateApproved ? (
                  <span className={`text-xs ${darkMode ? 'text-green-400' : 'text-green-500'} ml-2`}>
                    [APPROVED: {formatDate(purchaseRequest.dateApproved)}]
                  </span>
                ) : (
                  <span className={`text-xs ${darkMode ? 'text-orange-400' : 'text-orange-600'} ml-2`}>
                    [PENDING]
                  </span>
                )}
              </p>
            </div>
            <div>
              <p className={`text-xs ${darkMode ? 'text-gray-300' : 'text-gray-600'} font-medium mb-1`}>Addressed To</p>
              <p className={`text-sm font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                {purchaseRequest.addressedTo || '-'}
                {purchaseRequest.dateReceived ? (
                  <span className={`text-xs ${darkMode ? 'text-green-400' : 'text-green-500'} ml-2`}>
                    [RECEIVED: {formatDate(purchaseRequest.dateReceived)}]
                  </span>
                ) : (
                  <span className={`text-xs ${darkMode ? 'text-orange-400' : 'text-orange-600'} ml-2`}>
                    [PENDING]
                  </span>
                )}
              </p>
            </div>
          </div>
        </div>

        {/* Remarks */}
        {purchaseRequest.remarks && (
          <div className="mb-6">
            <h3 className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'} mb-3`}>Remarks</h3>
            <p className={`leading-relaxed p-4 rounded-lg border ${darkMode ? 'text-gray-300 bg-gray-800 border-gray-600' : 'text-gray-700 bg-gray-50 border-gray-200'}`}>
              {purchaseRequest.remarks}
            </p>
          </div>
        )}

        {/* Items Table */}
        <div className="mb-6">
          <h3 className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'} mb-3`}>Request Items</h3>
          <div className={`overflow-x-auto border ${darkMode ? 'border-gray-600' : 'border-gray-200'} rounded-lg`}>
            <table className="w-full">
              <thead className={`${darkMode ? 'bg-gray-700' : 'bg-gray-100'} border-b ${darkMode ? 'border-gray-600' : 'border-gray-200'}`}>
                <tr>
                  <th className={`px-4 py-3 text-left text-xs font-semibold ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>Item Code</th>
                  <th className={`px-4 py-3 text-left text-xs font-semibold ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>Item Description</th>
                  <th className={`px-4 py-3 text-left text-xs font-semibold ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>UOFM</th>
                  <th className={`px-4 py-3 text-right text-xs font-semibold ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>Quantity</th>
                  <th className={`px-4 py-3 text-left text-xs font-semibold ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>Budget Name</th>
                  <th className={`px-4 py-3 text-left text-xs font-semibold ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>Date Needed</th>
                  <th className={`px-4 py-3 text-left text-xs font-semibold ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>Remarks</th>
                </tr>
              </thead>
              <tbody>
                {purchaseRequest.details && purchaseRequest.details.length > 0 ? (
                  purchaseRequest.details.map((item, index) => (
                    <tr key={index} className={`border-b ${darkMode ? 'border-gray-600' : 'border-gray-200'} ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-50'} transition`}>
                      <td className={`px-4 py-3 text-sm ${darkMode ? 'text-white' : 'text-gray-900'}`}>{item.itemNumber || '-'}</td>
                      <td className={`px-4 py-3 text-sm ${darkMode ? 'text-white' : 'text-gray-900'}`}>{item.itemDescription || '-'}</td>
                      <td className={`px-4 py-3 text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>{item.unitOfMeasure || '-'}</td>
                      <td className={`px-4 py-3 text-sm ${darkMode ? 'text-white' : 'text-gray-900'} text-right font-semibold`}>{item.quantity || 0}</td>
                      <td className={`px-4 py-3 text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>{item.budgetName || '-'}</td>
                      <td className={`px-4 py-3 text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'} font-semibold`}>
                        {item.dateNeeded ? new Date(item.dateNeeded).toLocaleDateString() : '-'}
                      </td>
                      <td className={`px-4 py-3 text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>{item.remarks || '-'}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="7" className={`px-4 py-6 text-center ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      No items found for this request
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>



      {(purchaseRequest.requestStatus === 'COMPLETED' || purchaseRequest.requestStatus === 'APPROVED' || purchaseRequest.requestStatus === 'REJECTED') && (
        <div className={`pt-6 border-t ${darkMode ? 'border-gray-600' : 'border-gray-200'}`}>
          <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'} text-center`}>
            This request has been {purchaseRequest.requestStatus.toLowerCase()}.
          </p>
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && (
        <RejectRequestModal
          isOpen={showRejectModal}
          onClose={() => setShowRejectModal(false)}
          onConfirm={(reason) => handleAction('reject', reason)}
          loading={actionLoading}
          title="Reject Purchase Request"
          message="Please provide a reason for rejecting this purchase request:"
        />
      )}

      {/* Confirm Modal */}
      <ConfirmModal
        isOpen={showConfirmModal}
        title="Post Purchase Request"
        message={`Are you sure you want to post this purchase request? This will send notifications to the ${purchaseRequest.reviewer ? 'reviewer' : 'approver'} and start the approval workflow.`}
        confirmButtonText="Post Request"
        confirmButtonColor="green"
        onConfirm={handleConfirmAction}
        onCancel={() => setShowConfirmModal(false)}
        isLoading={actionLoading}
      />

      {/* Cancel Modal */}
      <ConfirmModal
        isOpen={showCancelModal}
        title="Cancel Purchase Request"
        message="Are you sure you want to cancel this purchase request? This action cannot be undone and will mark the request as cancelled."
        confirmButtonText="Cancel Request"
        confirmButtonColor="red"
        onConfirm={handleCancelConfirm}
        onCancel={() => setShowCancelModal(false)}
        isLoading={actionLoading}
      />

      {/* Print Modal */}
      <PurchaseRequestPrintModal
        isOpen={showPrintModal}
        onClose={() => setShowPrintModal(false)}
        purchaseRequest={purchaseRequest}
      />
    </div>
  );
}
