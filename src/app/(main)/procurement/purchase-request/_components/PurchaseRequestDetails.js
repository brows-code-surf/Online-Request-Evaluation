'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../../../../../utils/authContext';
import { useSocketMultiple } from '@/hooks/useSocketMultiple';
import RejectRequestModal from '@/app/(main)/_components/rejectRequestModal';
import ConfirmModal from '@/app/(main)/_components/confirmModal';
import { PurchaseRequestPrintModal } from './PurchaseRequestPrintModal';
import { hasReceivingForPR, cancelPurchaseRequestItem } from '../_actions';

const STATUS_OPTIONS = [
  { value: 'POSTED', label: 'Posted', color: 'bg-purple-100 text-purple-800' },
  { value: 'FOR CONFIRMATION', label: 'For Confirmation', color: 'bg-blue-100 text-blue-800' },
  { value: 'FOR REQUEST APPROVAL', label: 'For Request Approval', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'FOR PURCHASING LEAD TIME', label: 'For Purchasing Lead Time', color: 'bg-orange-100 text-orange-800' },
  { value: 'COMPLETED', label: 'Completed', color: 'bg-green-100 text-green-800' },
  { value: 'REJECTED', label: 'Rejected', color: 'bg-red-100 text-red-800' },
  { value: 'FOR CANVASSING', label: 'For Canvassing', color: 'bg-sky-100 text-sky-800' },
  { value: 'PARTIALLY SERVED', label: 'Partially Served', color: 'bg-orange-100 text-orange-800 border-orange-300' },
  { value: 'SERVED', label: 'Served', color: 'bg-green-100 text-green-800' },
  { value: 'FOR P.O.', label: 'For P.O.', color: 'bg-fuchsia-100 text-fuchsia-800' },
  { value: 'P.O. PROCESSING', label: 'P.O. Processing', color: 'bg-blue-100 text-blue-800' },
  { value: 'FOR P.O. CONFIRMATION', label: 'For P.O. Confirmation', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'FOR P.O. APPROVAL', label: 'For P.O. Approval', color: 'bg-yellow-200 text-yellow-900' },
  { value: 'P.O. APPROVED', label: 'P.O. Approved', color: 'bg-green-100 text-green-800' }
];

const ITEM_STATUS_OPTIONS = [
  { value: 'FOR CONFIRMATION', label: 'For Confirmation', color: 'bg-blue-100 text-blue-800' },
  { value: 'FOR REQUEST APPROVAL', label: 'For Request Approval', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'FOR PURCHASING LEAD TIME', label: 'For Purchasing Lead Time', color: 'bg-orange-100 text-orange-800' },
  { value: 'COMPLETED', label: 'Completed', color: 'bg-green-100 text-green-800' },
  { value: 'REJECTED', label: 'Rejected', color: 'bg-red-100 text-red-800' },
  { value: 'FOR CANVASSING', label: 'For Canvassing', color: 'bg-sky-100 text-sky-800' },
  { value: 'PARTIALLY SERVED', label: 'Partially Served', color: 'bg-orange-100 text-orange-800 border-orange-300' },
  { value: 'SERVED', label: 'Served', color: 'bg-green-100 text-green-800' },
  { value: 'FOR P.O.', label: 'For P.O.', color: 'bg-fuchsia-100 text-fuchsia-800' },
  { value: 'P.O. PROCESSING', label: 'P.O. Processing', color: 'bg-blue-100 text-blue-800' },
  { value: 'FOR P.O. CONFIRMATION', label: 'For P.O. Confirmation', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'FOR P.O. APPROVAL', label: 'For P.O. Approval', color: 'bg-yellow-200 text-yellow-900' },
  { value: 'P.O. APPROVED', label: 'P.O. Approved', color: 'bg-green-100 text-green-800' }
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
  const { user, darkMode, isAdmin } = useAuth();
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showCancelItemModal, setShowCancelItemModal] = useState(false);
  const [cancelItemRid, setCancelItemRid] = useState('');
  const [cancelItemQuantity, setCancelItemQuantity] = useState(0);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [showActionMenu, setShowActionMenu] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [pendingAction, setPendingAction] = useState(null);
  const [cancelRemarks, setCancelRemarks] = useState('');
  const [cancelItemRemarks, setCancelItemRemarks] = useState('');
  const [hasReceiving, setHasReceiving] = useState(false);
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

    "purchase-request-status-updated": useCallback(
      (data) => {
        // Check if this status update event is for the current purchase request
        if (data && data.referenceNo === purchaseRequest?.referenceNo) {
          console.log("Purchase request status updated - updating details:", data);
          // Small delay to ensure database transaction is committed
          setTimeout(() => {
            onDataRefresh && onDataRefresh();
          }, 1000); // 1 second delay
        }
      },
      [purchaseRequest?.referenceNo, onDataRefresh]
    ),
  });

  // Real-time updates from canvass-approval page
  useSocketMultiple("canvass-approval-broadcast", {
    "canvass-approved": useCallback(
      (data) => {
        console.log("Canvass approved event received in purchase request details:", data);
        setTimeout(() => {
          onDataRefresh && onDataRefresh();
        }, 1000);
      },
      [onDataRefresh]
    ),
    "canvass-rejected": useCallback(
      (data) => {
        console.log("Canvass rejected event received in purchase request details:", data);
        setTimeout(() => {
          onDataRefresh && onDataRefresh();
        }, 1000);
      },
      [onDataRefresh]
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

  // Check if there is existing receiving for this PR
  useEffect(() => {
    const checkReceiving = async () => {
      if (purchaseRequest?.referenceNo) {
        try {
          const result = await hasReceivingForPR(purchaseRequest.referenceNo);
          setHasReceiving(result.hasReceiving);
        } catch (error) {
          console.error('Error checking receiving:', error);
          setHasReceiving(false);
        }
      }
    };
    checkReceiving();
  }, [purchaseRequest?.referenceNo]);

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
      (purchaseRequest.requestedBy?.toUpperCase() === user?.empName?.toUpperCase() || isAdmin()) &&
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
    console.log('Canceling with remarks:', cancelRemarks);
    setShowCancelModal(false);
    setActionLoading(true);

    try {
      if (onCancel) {
        await onCancel(purchaseRequest.referenceNo, cancelRemarks);
      }
    } catch (error) {
      console.error('Error canceling purchase request:', error);
    } finally {
      setActionLoading(false);
      setCancelRemarks('');
    }
  };

  const handleCancelItemConfirm = async () => {
    console.log('Canceling item with quantity:', cancelItemQuantity, 'remarks:', cancelItemRemarks);
    setShowCancelItemModal(false);
    setActionLoading(true);

    try {
      await cancelPurchaseRequestItem(purchaseRequest.referenceNo, cancelItemRid, user?.empName, cancelItemQuantity, cancelItemRemarks);
      onDataRefresh && onDataRefresh();
    } catch (error) {
      console.error('Error canceling purchase request item:', error);
    } finally {
      setActionLoading(false);
      setCancelItemRemarks('');
      setCancelItemQuantity(0);
      setCancelItemRid('');
    }
  };

  const getDateRequested = () => {
    return `Requested on ${formatDate(purchaseRequest.dateRequested)}`;
  };

  const showItemStatusColumn = purchaseRequest.requestStatus !== 'FOR CONFIRMATION' && purchaseRequest.requestStatus !== 'FOR REQUEST APPROVAL' && purchaseRequest.requestStatus !== 'FOR PURCHASING LEAD TIME';
  const showActionsColumn = purchaseRequest.details && purchaseRequest.details.some(item =>
    item.itemStatus !== 'SERVED' && purchaseRequest.requestStatus !== 'CANCELLED' &&
    (purchaseRequest.requestedBy?.toUpperCase() === user?.empName?.toUpperCase() || isAdmin()) &&
    !item.hasPO
  );

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
                className={`inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium ${darkMode ? 'text-gray-300 bg-gray-700 hover:bg-gray-600' : 'text-gray-700 bg-gray-100 hover:bg-gray-200'} rounded-md shadow-sm transition-all duration-200 ease-in-out transform hover:scale-105 focus:scale-105 disabled:transform-none disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-gray-900 min-w-[100px] ${actionLoading ? 'cursor-wait' : 'cursor-pointer'
                  }`}
                aria-label="Print purchase request"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
                Print
              </button>
              {!purchaseRequest.isPosted && (purchaseRequest.requestedBy?.toUpperCase() === user?.empName?.toUpperCase() || isAdmin()) && (
                <button
                  onClick={() => onEdit && onEdit(purchaseRequest)}
                  disabled={loading || actionLoading}
                  className={`inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-amber-600 hover:bg-amber-700 focus:bg-amber-700 active:bg-amber-800 rounded-md shadow-sm transition-all duration-200 ease-in-out transform hover:scale-105 focus:scale-105 disabled:transform-none disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-gray-900 min-w-[120px] ${actionLoading ? 'cursor-wait' : 'cursor-pointer'
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
                  className={`inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:bg-green-700 active:bg-green-800 rounded-md shadow-sm transition-all duration-200 ease-in-out transform hover:scale-105 focus:scale-105 disabled:transform-none disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-gray-900 min-w-[120px] ${actionLoading ? 'cursor-wait' : 'cursor-pointer'
                    }`}
                  aria-label="Post purchase request"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                  Post
                </button>
              )}
              {purchaseRequest.requestStatus !== 'CANCELLED' && (purchaseRequest.requestedBy?.toUpperCase() === user?.empName?.toUpperCase() || isAdmin()) && !hasReceiving && (
                <button
                  onClick={() => setShowCancelModal(true)}
                  disabled={loading || actionLoading}
                  className={`inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:bg-red-700 active:bg-red-800 rounded-md shadow-sm transition-all duration-200 ease-in-out transform hover:scale-105 focus:scale-105 disabled:transform-none disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-gray-900 min-w-[120px] ${actionLoading ? 'cursor-wait' : 'cursor-pointer'
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
                className={`inline-flex items-center justify-center p-3 rounded-lg border transition-all duration-200 ease-in-out ${darkMode
                  ? 'border-gray-600 hover:bg-gray-700 hover:border-gray-500 focus:bg-gray-700 focus:border-gray-500 focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 focus:ring-offset-gray-900'
                  : 'border-gray-300 hover:bg-gray-50 hover:border-gray-400 focus:bg-gray-50 focus:border-gray-400 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-white'
                  } disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none ${actionLoading ? 'cursor-wait' : 'cursor-pointer'
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
                    className={`w-full inline-flex items-center gap-3 text-left px-4 py-3.5 text-sm font-medium transition-all duration-150 ease-in-out ${darkMode
                      ? 'text-gray-300 hover:bg-gray-700 hover:text-white focus:bg-gray-700 focus:text-white'
                      : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900 focus:bg-gray-50 focus:text-gray-900'
                      } border-b ${darkMode ? 'border-gray-600' : 'border-gray-200'} first:rounded-t-lg disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-inset focus:ring-gray-500 ${actionLoading ? 'cursor-wait' : 'cursor-pointer'
                      }`}
                    role="menuitem"
                    aria-label="Print purchase request"
                  >
                    <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                    </svg>
                    <span className="truncate">Print Request</span>
                  </button>
                  {!purchaseRequest.isPosted && (purchaseRequest.requestedBy?.toUpperCase() === user?.empName?.toUpperCase() || isAdmin()) && (
                    <button
                      onClick={() => {
                        onEdit && onEdit(purchaseRequest);
                        setShowActionMenu(false);
                      }}
                      disabled={loading || actionLoading}
                      className={`w-full inline-flex items-center gap-3 text-left px-4 py-3.5 text-sm font-medium transition-all duration-150 ease-in-out ${darkMode
                        ? 'text-amber-400 hover:bg-amber-900/20 hover:text-amber-300 focus:bg-amber-900/20 focus:text-amber-300'
                        : 'text-amber-700 hover:bg-amber-50 hover:text-amber-800 focus:bg-amber-50 focus:text-amber-800'
                        } border-b ${darkMode ? 'border-gray-600' : 'border-gray-200'} disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-inset focus:ring-amber-500 ${actionLoading ? 'cursor-wait' : 'cursor-pointer'
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
                      className={`w-full inline-flex items-center gap-3 text-left px-4 py-3.5 text-sm font-medium transition-all duration-150 ease-in-out ${darkMode
                        ? 'text-green-400 hover:bg-green-900/20 hover:text-green-300 focus:bg-green-900/20 focus:text-green-300'
                        : 'text-green-700 hover:bg-green-50 hover:text-green-800 focus:bg-green-50 focus:text-green-800'
                        } border-b ${darkMode ? 'border-gray-600' : 'border-gray-200'} disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-inset focus:ring-green-500 ${actionLoading ? 'cursor-wait' : 'cursor-pointer'
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
                  {purchaseRequest.requestStatus !== 'CANCELLED' && (purchaseRequest.requestedBy?.toUpperCase() === user?.empName?.toUpperCase() || isAdmin()) && !hasReceiving && (
                    <button
                      onClick={() => {
                        setShowCancelModal(true);
                        setShowActionMenu(false);
                      }}
                      disabled={loading || actionLoading}
                      className={`w-full inline-flex items-center gap-3 text-left px-4 py-3.5 text-sm font-medium transition-all duration-150 ease-in-out ${darkMode
                        ? 'text-red-400 hover:bg-red-900/20 hover:text-red-300 focus:bg-red-900/20 focus:text-red-300'
                        : 'text-red-700 hover:bg-red-50 hover:text-red-800 focus:bg-red-50 focus:text-red-800'
                        } last:rounded-b-lg disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-inset focus:ring-red-500 ${actionLoading ? 'cursor-wait' : 'cursor-pointer'
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
              <p className={`text-xs ${darkMode ? 'text-gray-300' : 'text-gray-600'} font-medium mb-1`}>Company / Location</p>
              <p className={`text-sm font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{purchaseRequest.company} - {purchaseRequest.locationCode}</p>
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

        {/* Cancel Remarks */}
        {(purchaseRequest.requestStatus === 'REJECTED' || purchaseRequest.requestStatus === 'CANCELLED') && (
          <div className="mb-6">
            <h3 className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'} mb-3`}>
              {purchaseRequest.requestStatus === 'REJECTED' ? 'Rejection Reason' : 'Cancellation Reason'}
            </h3>
            <div className={`leading-relaxed p-4 rounded-lg border ${darkMode ? 'text-gray-300 bg-red-900/20 border-red-600' : 'text-gray-700 bg-red-50 border-red-200'}`}>
              <div className="flex items-start gap-3">
                <svg className={`w-5 h-5 mt-0.5 flex-shrink-0 ${purchaseRequest.requestStatus === 'REJECTED' ? 'text-red-500' : 'text-orange-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                <p className="flex-1">
                  {purchaseRequest.cancelRemarks && purchaseRequest.cancelRemarks.trim()
                    ? purchaseRequest.cancelRemarks
                    : 'No reason provided'
                  }
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Items Table / Cards */}
        <div className="mb-6">
          <h3 className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'} mb-3`}>Request Items</h3>

          {/* Desktop Table View */}
          <div className={`hidden sm:block overflow-x-auto border ${darkMode ? 'border-gray-600' : 'border-gray-200'} rounded-lg`}>
            <table className="w-full">
              <thead className={`${darkMode ? 'bg-gray-700' : 'bg-gray-100'} border-b ${darkMode ? 'border-gray-600' : 'border-gray-200'}`}>
                <tr>
                  <th className={`px-4 py-3 text-left text-xs font-semibold ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>Item Code</th>
                  <th className={`px-2 py-3 text-left text-xs font-semibold ${darkMode ? 'text-gray-200' : 'text-gray-700'} ${showItemStatusColumn ? 'w-80' : ' '}`}>Item Description</th>
                  <th className={`px-1 py-3 text-left text-xs font-semibold ${darkMode ? 'text-gray-200' : 'text-gray-700'} w-15`}>UOFM</th>
                  <th className={`px-2 py-3 text-right text-xs font-semibold ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>Quantity</th>
                  <th className={`px-2 py-3 text-right text-xs font-semibold ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>Qty Cancel</th>
                  <th className={`px-2 py-3 text-left text-xs font-semibold ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>Budget Code</th>
                  <th className={`px-2 py-3 text-left text-xs font-semibold ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>Date Needed</th>
                  {showItemStatusColumn && (
                    <th className={`px-4 py-3 text-left text-xs font-semibold ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>Item Status</th>
                  )}
                  <th className={`px-2 py-3 text-left text-xs font-semibold ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>Remarks</th>
                  {showActionsColumn && (
                    <th className={`px-2 py-3 text-left text-xs font-semibold ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>Actions</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {purchaseRequest.details && purchaseRequest.details.length > 0 ? (
                  purchaseRequest.details.map((item, index) => (
                    <tr key={index} className={`border-b ${darkMode ? 'border-gray-600' : 'border-gray-200'} ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-50'} transition`}>
                      <td className={`px-4 py-3 text-sm ${darkMode ? 'text-white' : 'text-gray-900'}`}>{item.itemNumber || '-'}</td>
                      <td className={`px-2 py-3 text-sm ${darkMode ? 'text-white' : 'text-gray-900'} ${showItemStatusColumn ? 'w-80' : ' '}`} title={item.itemDescription}>{item.itemDescription || '-'}</td>
                      <td className={`px-1 py-3 text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'} w-15`}>{item.unitOfMeasure || '-'}</td>
                      <td className={`px-2 py-3 text-sm ${darkMode ? 'text-white' : 'text-gray-900'} text-right font-semibold`}>{item.quantity || 0}</td>
                      <td className={`px-2 py-3 text-sm ${darkMode ? 'text-white' : 'text-gray-900'} text-right font-semibold`}>{item.qtyCancel || 0}</td>
                      <td className={`px-2 py-3 text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>{item.budgetCode || '-'}</td>
                      <td className={`px-2 py-3 text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'} font-semibold`}>
                        {item.dateNeeded ? new Date(item.dateNeeded).toLocaleDateString() : '-'}
                      </td>
                      {showItemStatusColumn && (
                        <td className={`px-2 py-3 text-sm`}>
                          <span className={`px-2 py-1 rounded-full text-xs font-semibold border ${getStatusBadge(item.itemStatus, 'item')}`}>
                            {item.itemStatus || '-'}
                          </span>
                        </td>
                      )}
                       <td className={`px-4 py-3 text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>{item.remarks || '-'}</td>
                        {showActionsColumn && (
                          <td className={`px-2 py-3 text-sm`}>
                          {item.itemStatus !== 'SERVED' && purchaseRequest.requestStatus !== 'CANCELLED' && (purchaseRequest.requestedBy?.toUpperCase() === user?.empName?.toUpperCase() || isAdmin()) && !item.hasPO && (
                            <button
                              onClick={() => {
                                setCancelItemRid(item.rid);
                                setCancelItemQuantity(Math.max(1, item.quantity - (item.qtyCancel || 0))); // Default to available quantity
                                setShowCancelItemModal(true);
                              }}
                                disabled={actionLoading}
                                className={`inline-flex items-center justify-center gap-1 px-2 py-1 text-xs font-medium text-white bg-red-600 hover:bg-red-700 rounded transition-all duration-200 ease-in-out transform hover:scale-105 focus:scale-105 disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-gray-900 ${actionLoading ? 'cursor-wait' : 'cursor-pointer'
                                  }`}
                                aria-label="Cancel item"
                              >
                                Cancel
                              </button>
                            )}
                          </td>
                        )}
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={8 + (showItemStatusColumn ? 1 : 0) + (showActionsColumn ? 1 : 0)} className={`px-4 py-6 text-center ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      No items found for this request
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View */}
          <div className="sm:hidden space-y-4">
            {purchaseRequest.details && purchaseRequest.details.length > 0 ? (
              purchaseRequest.details.map((item, index) => (
                <div key={index} className={`p-4 border ${darkMode ? 'border-gray-600 bg-gray-800' : 'border-gray-200 bg-white'} rounded-lg shadow-sm`}>
                  <div className="space-y-3">
                    {/* Item Code and Status */}
                    <div className="flex items-center justify-between">
                      <span className={`text-sm font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                        {item.itemNumber || '-'}
                      </span>
                      {showItemStatusColumn && (
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold border ${getStatusBadge(item.itemStatus, 'item')}`}>
                          {item.itemStatus || '-'}
                        </span>
                      )}
                    </div>

                    {/* Item Description */}
                    <div>
                      <p className={`text-xs ${darkMode ? 'text-gray-300' : 'text-gray-600'} font-medium mb-1`}>Description</p>
                      <p className={`text-sm leading-relaxed ${darkMode ? 'text-white' : 'text-gray-900'} break-words`}>
                        {item.itemDescription || '-'}
                      </p>
                    </div>

                    {/* Quantity and UOFM */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div>
                          <p className={`text-xs ${darkMode ? 'text-gray-300' : 'text-gray-600'} font-medium`}>Quantity</p>
                          <p className={`text-sm font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{item.quantity || 0}</p>
                        </div>
                        <div>
                          <p className={`text-xs ${darkMode ? 'text-gray-300' : 'text-gray-600'} font-medium`}>UOFM</p>
                          <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>{item.unitOfMeasure || '-'}</p>
                        </div>
                        {showItemStatusColumn && item.qtyCancel > 0 && (
                          <div>
                            <p className={`text-xs ${darkMode ? 'text-red-400' : 'text-red-600'} font-medium`}>Qty Cancel</p>
                            <p className={`text-sm font-semibold ${darkMode ? 'text-red-400' : 'text-red-600'}`}>{item.qtyCancel || 0}</p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Budget Code and Date Needed */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className={`text-xs ${darkMode ? 'text-gray-300' : 'text-gray-600'} font-medium mb-1`}>Budget Code</p>
                        <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>{item.budgetCode || '-'}</p>
                      </div>
                      <div>
                        <p className={`text-xs ${darkMode ? 'text-gray-300' : 'text-gray-600'} font-medium mb-1`}>Date Needed</p>
                        <p className={`text-sm font-semibold ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                          {item.dateNeeded ? new Date(item.dateNeeded).toLocaleDateString() : '-'}
                        </p>
                      </div>
                    </div>

                    {/* Remarks */}
                    {item.remarks && (
                      <div>
                        <p className={`text-xs ${darkMode ? 'text-gray-300' : 'text-gray-600'} font-medium mb-1`}>Remarks</p>
                        <p className={`text-sm leading-relaxed ${darkMode ? 'text-gray-300' : 'text-gray-600'} break-words`}>
                          {item.remarks}
                        </p>
                      </div>
                    )}

                     {/* Actions */}
                     {item.itemStatus !== 'SERVED' && purchaseRequest.requestStatus !== 'CANCELLED' && (purchaseRequest.requestedBy?.toUpperCase() === user?.empName?.toUpperCase() || isAdmin()) && !item.hasPO && (
                       <div className="pt-2 border-t border-gray-200 dark:border-gray-600">
                         <button
                           onClick={() => {
                             setCancelItemRid(item.rid);
                             setCancelItemQuantity(Math.max(1, item.quantity - (item.qtyCancel || 0))); // Default to available quantity
                             setShowCancelItemModal(true);
                           }}
                           disabled={actionLoading}
                           className={`inline-flex items-center justify-center gap-1 px-3 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded transition-all duration-200 ease-in-out transform hover:scale-105 focus:scale-105 disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-gray-900 ${actionLoading ? 'cursor-wait' : 'cursor-pointer'
                             }`}
                           aria-label="Cancel item"
                         >
                           Cancel Item
                         </button>
                       </div>
                     )}
                  </div>
                </div>
              ))
            ) : (
              <div className={`p-8 text-center border ${darkMode ? 'border-gray-600 bg-gray-800' : 'border-gray-200 bg-gray-50'} rounded-lg`}>
                <p className={`${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  No items found for this request
                </p>
              </div>
            )}
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
      <RejectRequestModal
        isOpen={showCancelModal}
        remarks={cancelRemarks}
        onRemarksChange={setCancelRemarks}
        onConfirm={handleCancelConfirm}
        onCancel={() => {
          setShowCancelModal(false);
          setCancelRemarks('');
        }}
        isLoading={actionLoading}
        title="Cancel Purchase Request"
        message="Please provide a reason for cancelling this purchase request. This will be recorded and displayed to relevant parties."
        label="Cancellation Remarks"
        placeholder="Enter reason for cancellation..."
        confirmButtonText="Confirm Cancel"
        confirmButtonColor="red"
        iconPath="M6 18L18 6M6 6l12 12"
      />

      {/* Cancel Item Modal */}
      <RejectRequestModal
        isOpen={showCancelItemModal}
        remarks={cancelItemRemarks}
        onRemarksChange={setCancelItemRemarks}
        onConfirm={handleCancelItemConfirm}
        onCancel={() => {
          setShowCancelItemModal(false);
          setCancelItemRemarks('');
          setCancelItemQuantity(0);
          setCancelItemRid('');
        }}
        isLoading={actionLoading}
        title="Cancel Purchase Request Item"
        message="Please specify the quantity to cancel and provide additional remarks. Remarks will be appended to existing item remarks."
        label="Additional Remarks"
        placeholder="Enter additional remarks for this cancellation..."
        confirmButtonText="Confirm Cancel Item"
        confirmButtonColor="red"
        iconPath="M6 18L18 6M6 6l12 12"
        showQuantity={true}
        quantity={cancelItemQuantity}
        onQuantityChange={setCancelItemQuantity}
        quantityLabel="Quantity to Cancel"
        maxQuantity={purchaseRequest.details?.find(item => item.rid === cancelItemRid)?.quantity - (purchaseRequest.details?.find(item => item.rid === cancelItemRid)?.qtyCancel || 0)}
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
