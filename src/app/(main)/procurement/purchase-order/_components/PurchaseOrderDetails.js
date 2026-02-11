'use client';

import { useState, useEffect, useRef } from 'react';
import { toast } from 'react-toastify';
import { useAuth } from '../../../../../utils/authContext';
import { PurchaseOrderPrintModal } from './PurchaseOrderPrintModal';
import ConfirmModal from '../../../_components/confirmModal';
import { submitPurchaseOrderForProcessing } from '../_actions';

function PurchaseOrderDetails({ purchaseOrder, onPost, onDelete, onEdit, onDataRefresh, loading = false }) {
  const { user, darkMode, isAdmin } = useAuth();
  const [posting, setPosting] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [showActionMenu, setShowActionMenu] = useState(false);
  const [showPostModal, setShowPostModal] = useState(false);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const menuRef = useRef(null);

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

  const getStatusColor = (status) => {
    switch (status) {
      case 'P.O. APPROVED':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'FOR P.O. CONFIRMATION':
      case 'FOR P.O. APPROVAL':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getStatusText = (status) => {
    if (!status) return 'PENDING';

    // Ensure status is a string before calling trim()
    const statusStr = String(status);

    // Clean up the status text (trim whitespace)
    const cleanStatus = statusStr.trim();

    // Handle potential database duplication issue
    // If status appears twice consecutively, return just once
    const statusPatterns = [
      'FOR P.O. CONFIRMATION',
      'P.O. APPROVED',
      'PENDING'
    ];

    for (const pattern of statusPatterns) {
      if (cleanStatus === pattern + pattern || cleanStatus === pattern + ' ' + pattern) {
        return pattern;
      }
    }

    return cleanStatus;
  };

  const handleSubmit = () => {
    setShowSubmitModal(true);
  };

  const handleConfirmSubmit = async () => {
    setSubmitting(true);
    try {
      const result = await submitPurchaseOrderForProcessing(
        purchaseOrder.header.poNumber,
        user.empName
      );

      if (result.success) {
        toast.success('Purchase order submitted for processing');
        setShowSubmitModal(false);
        await onDataRefresh?.();
      } else {
        toast.error(result.message || 'Failed to submit purchase order');
      }
    } catch (error) {
      console.error('Error submitting purchase order:', error);
      toast.error('Failed to submit purchase order for processing');
    } finally {
      setSubmitting(false);
    }
  };

  const handlePost = () => {
    setShowPostModal(true);
  };

  const handleConfirmPost = async () => {
    setPosting(true);
    try {
      await onPost?.(purchaseOrder.header.poNumber);
      setShowPostModal(false);
    } catch (error) {
      console.error('Error posting purchase order:', error);
      toast.error('Failed to post purchase order');
    } finally {
      setPosting(false);
    }
  };

  const handleDelete = () => {
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = async () => {
    setDeleting(true);
    try {
      await onDelete?.(purchaseOrder.header.poNumber, '');
      setShowDeleteModal(false);
    } catch (error) {
      console.error('Error deleting purchase order:', error);
      toast.error('Failed to delete purchase order');
    } finally {
      setDeleting(false);
    }
  };

  if (!purchaseOrder) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className={`text-center ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
          <svg className="w-16 h-16 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p className="text-lg font-medium">Select a purchase order to view details</p>
          <p className="text-sm mt-2">Click on any purchase order from the list on the left to see its details.</p>
        </div>
      </div>
    );
  }

  const { header, details } = purchaseOrder;

  const isEditDisabled = loading || actionLoading ||
    ['FOR P.O. CONFIRMATION', 'FOR P.O. APPROVAL', 'P.O. APPROVED'].includes(header.poStatus);

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

  const getDateCreated = () => {
    return `Created on ${formatDate(header.dateCreated)}`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className={`p-4 rounded-lg`}>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h4 className={`text-xl font-semibold ${darkMode ? 'text-white' : 'text-gray-900'} mb-2`}>
              Purchase Order No: <span className={`text-3xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{header.poNumber}</span>
            </h4>
            <div className="flex items-center gap-3">
              <span className={`px-4 py-1 rounded-full text-sm font-semibold border ${getStatusColor(header.poStatus)}`}>
                {getStatusText(header.poStatus)}
              </span>
              <span className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                {getDateCreated()}
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
                aria-label="Print purchase order"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
                Print
              </button>
              {header.postStatus === 0 && (
                <>
                  <button
                    onClick={() => onEdit?.(purchaseOrder)}
                    disabled={isEditDisabled}
                    className={`inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:bg-blue-700 active:bg-blue-800 rounded-md shadow-sm transition-all duration-200 ease-in-out transform hover:scale-105 focus:scale-105 disabled:transform-none disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-gray-900 min-w-[120px] ${actionLoading ? 'cursor-wait' : 'cursor-pointer'
                      }`}
                    aria-label="Edit purchase order"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    Edit
                  </button>
                  {header.poStatus === 'P.O. APPROVED' ? (
                    <button
                      onClick={() => handlePost()}
                      disabled={loading || actionLoading}
                      className={`inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:bg-green-700 active:bg-green-800 rounded-md shadow-sm transition-all duration-200 ease-in-out transform hover:scale-105 focus:scale-105 disabled:transform-none disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-gray-900 min-w-[120px] ${actionLoading ? 'cursor-wait' : 'cursor-pointer'
                        }`}
                      aria-label="Post purchase order"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                      </svg>
                      Post
                    </button>
                  ) : (
                    <button
                      onClick={() => handleSubmit()}
                      disabled={loading || actionLoading || header.poStatus === 'FOR P.O. CONFIRMATION'}
                      className={`inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:bg-green-700 active:bg-green-800 rounded-md shadow-sm transition-all duration-200 ease-in-out transform hover:scale-105 focus:scale-105 disabled:transform-none disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-gray-900 min-w-[120px] ${actionLoading ? 'cursor-wait' : 'cursor-pointer'
                        }`}
                      aria-label="Submit purchase order for processing"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                      </svg>
                      {header.poStatus?.trim() === 'FOR P.O. CONFIRMATION' ? 'Submitted' : 'Submit for Processing'}
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete()}
                    disabled={isEditDisabled}
                    className={`inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:bg-red-700 active:bg-red-800 rounded-md shadow-sm transition-all duration-200 ease-in-out transform hover:scale-105 focus:scale-105 disabled:transform-none disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-gray-900 min-w-[120px] ${actionLoading ? 'cursor-wait' : 'cursor-pointer'
                      }`}
                    aria-label="Delete purchase order"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    Delete
                  </button>
                </>
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
                    aria-label="Print purchase order"
                  >
                    <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                    </svg>
                    <span className="truncate">Print Order</span>
                  </button>
                  {header.postStatus === 0 && (
                    <>
                      <button
                        onClick={() => {
                          onEdit?.(purchaseOrder);
                          setShowActionMenu(false);
                        }}
                        disabled={isEditDisabled}
                        className={`w-full inline-flex items-center gap-3 text-left px-4 py-3.5 text-sm font-medium transition-all duration-150 ease-in-out ${darkMode
                          ? 'text-blue-400 hover:bg-blue-900/20 hover:text-blue-300 focus:bg-blue-900/20 focus:text-blue-300'
                          : 'text-blue-700 hover:bg-blue-50 hover:text-blue-800 focus:bg-blue-50 focus:text-blue-800'
                          } disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500 ${actionLoading ? 'cursor-wait' : 'cursor-pointer'
                          }`}
                        role="menuitem"
                        aria-label="Edit purchase order"
                      >
                        <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                        <span className="truncate">Edit Order</span>
                      </button>
                      {header.poStatus === 'P.O. APPROVED' ? (
                        <button
                          onClick={() => {
                            handlePost();
                            setShowActionMenu(false);
                          }}
                          disabled={loading || actionLoading}
                          className={`w-full inline-flex items-center gap-3 text-left px-4 py-3.5 text-sm font-medium transition-all duration-150 ease-in-out ${darkMode
                            ? 'text-green-400 hover:bg-green-900/20 hover:text-green-300 focus:bg-green-900/20 focus:text-green-300'
                            : 'text-green-700 hover:bg-green-50 hover:text-green-800 focus:bg-green-50 focus:text-green-800'
                            } disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-inset focus:ring-green-500 ${actionLoading ? 'cursor-wait' : 'cursor-pointer'
                            }`}
                          role="menuitem"
                          aria-label="Post purchase order"
                        >
                          <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                          </svg>
                          <span className="truncate">Post Order</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => {
                            handleSubmit();
                            setShowActionMenu(false);
                          }}
                          disabled={loading || actionLoading || header.poStatus === 'FOR P.O. CONFIRMATION'}
                          className={`w-full inline-flex items-center gap-3 text-left px-4 py-3.5 text-sm font-medium transition-all duration-150 ease-in-out ${darkMode
                            ? 'text-green-400 hover:bg-green-900/20 hover:text-green-300 focus:bg-green-900/20 focus:text-green-300'
                            : 'text-green-700 hover:bg-green-50 hover:text-green-800 focus:bg-green-50 focus:text-green-800'
                            } disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-inset focus:ring-green-500 ${actionLoading ? 'cursor-wait' : 'cursor-pointer'
                            }`}
                          role="menuitem"
                          aria-label="Submit purchase order for processing"
                        >
                          <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                          </svg>
                          <span className="truncate">{header.poStatus?.trim() === 'FOR P.O. CONFIRMATION' ? 'Submitted' : 'Submit for Processing'}</span>
                        </button>
                      )}
                      <button
                        onClick={() => {
                          handleDelete();
                          setShowActionMenu(false);
                        }}
                        disabled={isEditDisabled}
                        className={`w-full inline-flex items-center gap-3 text-left px-4 py-3.5 text-sm font-medium transition-all duration-150 ease-in-out ${darkMode
                          ? 'text-red-400 hover:bg-red-900/20 hover:text-red-300 focus:bg-red-900/20 focus:text-blue-300'
                          : 'text-red-700 hover:bg-red-50 hover:text-red-800 focus:bg-red-50 focus:text-red-800'
                          } border-b ${darkMode ? 'border-gray-600' : 'border-gray-200'} disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-inset focus:ring-red-500 ${actionLoading ? 'cursor-wait' : 'cursor-pointer'
                          }`}
                        role="menuitem"
                        aria-label="Delete purchase order"
                      >
                        <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        <span className="truncate">Delete Order</span>
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Header Information */}
      <div className={`${darkMode ? 'bg-gray-800/50 border-gray-600' : 'bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200'} p-4 rounded-lg mb-6 border`}>
        <h3 className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'} mb-3`}>Order Information</h3>

        {/* PO Details Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div>
            <h3 className={`text-sm font-bold mb-3 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              Supplier Information
            </h3>
            <div className="space-y-2">
              <div>
                <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Vendor ID:</span>
                <span className={`ml-2 text-sm font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>{header.vendorId || 'N/A'}</span>
              </div>
              <div>
                <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Vendor Name:</span>
                <span className={`ml-2 text-sm font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>{header.vendName || 'N/A'}</span>
              </div>
              <div>
                <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Contact Person:</span>
                <span className={`ml-2 text-sm font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>{header.contactPerson || 'N/A'}</span>
              </div>
              <div>
                <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Payment Terms:</span>
                <span className={`ml-2 text-sm font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>{header.pymtrmid || 'N/A'}</span>
              </div>
              <div>
                <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Delivery To:</span>
                <span className={`ml-2 text-sm font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>{header.deliveryTo || 'N/A'}</span>
              </div>
            </div>
          </div>

          <div>
            <h3 className={`text-sm font-bold mb-3 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              Order Information
            </h3>
            <div className="space-y-2">
              <div>
                <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Date Needed:</span>
                <span className={`ml-2 text-sm font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  {header.dateNeeded ? new Date(header.dateNeeded).toLocaleDateString() : 'N/A'}
                </span>
              </div>
              {header.promisedDate && (
                <div>
                  <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Expected Date:</span>
                  <span className={`ml-2 text-sm font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    {new Date(header.promisedDate).toLocaleDateString()}
                  </span>
                </div>
              )}
              {header.promisedShipDate && (
                <div>
                  <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Expected Ship Date:</span>
                  <span className={`ml-2 text-sm font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    {new Date(header.promisedShipDate).toLocaleDateString()}
                  </span>
                </div>
              )}
              <div>
                <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Reference Document Type:</span>
                <span className={`ml-2 text-sm font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>{header.refDocType || 'N/A'}</span>
              </div>
            </div>
          </div>

          <div>
            <h3 className={`text-sm font-bold mb-3 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              Processing Information
            </h3>
            <div className="space-y-2">

              <div>
                <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Created By:</span>
                <span className={`ml-2 text-sm font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>{header.createdBy || 'N/A'}</span>
              </div>
              <div>
                <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Canvassed By:</span>
                <span className={`ml-2 text-sm font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>{header.canvassedBy || 'N/A'}</span>
              </div>
              {header.confirmedBy && (
                <div>
                  <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    {header.dateConfirmed ? 'Confirmed By:' : 'For Confirmation:'}
                  </span>
                  <span className={`ml-2 text-sm font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>{header.confirmedBy}</span>
                </div>
              )}
              {header.approvedBy && (
                <div>
                  <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    {header.dateApproved ? 'Approved By:' : 'For Approval:'}
                  </span>
                  <span className={`ml-2 text-sm font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>{header.approvedBy}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Flags */}
        <div className="mt-6">
          {(header.isBudgetNo === 1 || header.isPrNo === 1 || header.capex === 1 || header.isPerAdvise === 1) && (
            <h3 className={`text-sm font-bold mb-3 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              Order Flags
            </h3>
          )}
          <div className="flex flex-wrap gap-2">
            {header.isBudgetNo === 1 && (
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800`}>
                Budget No.
              </span>
            )}
            {header.isPrNo === 1 && (
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800`}>
                PR No.
              </span>
            )}
            {header.capex === 1 && (
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800`}>
                CAPEX
              </span>
            )}
            {header.isPerAdvise === 1 && (
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800`}>
                Per Advise
              </span>
            )}
          </div>
        </div>

        {/* Remarks */}
        {(header.remarks || (header.isBudgetNo === 1 && header.budgetNoList) || (header.isPrNo === 1 && header.prList)) && (
          <div className="mt-6">
            <h3 className={`text-sm font-bold mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              Remarks:
            </h3>
            <div className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'} space-y-2`}>
              {header.remarks && (
                <p>{header.remarks}</p>
              )}
              {header.isBudgetNo === 1 && header.budgetNoList && (
                <div>
                  <span className="ml-2">{header.budgetNoList}</span>
                </div>
              )}
              {header.isPrNo === 1 && header.prList && (
                <div>
                  <span className="ml-2">{header.prList}</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Items Section */}
      <div className={`rounded-lg border ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className={`text-lg font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            Order Items ({details.length})
          </h3>
        </div>

        {/* Desktop Table View */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className={`${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
              <tr>
                <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${darkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                  Item Details
                </th>
                <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${darkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                  Quantity
                </th>
                <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${darkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                  Unit Cost
                </th>
                <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${darkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                  Extended Cost
                </th>
                <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${darkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                  Status
                </th>
              </tr>
            </thead>
            <tbody className={`${darkMode ? 'bg-gray-800 divide-gray-700' : 'bg-white divide-gray-200'}`}>
              {details.map((item, index) => (
                <tr key={item.rid} className={`${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-50'}`}>
                  <td className="px-6 py-4">
                    <div>
                      <div className={`text-sm font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                        {item.itemDesc}
                      </div>
                      <div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        Item No: {item.itemNmbr}
                      </div>
                      <div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        Budget: {item.budgetNo}
                      </div>
                      {(item.brand || item.origin) && (
                        <div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                          {item.brand && `Brand: ${item.brand}`}
                          {item.brand && item.origin && ' • '}
                          {item.origin && `Origin: ${item.origin}`}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`text-sm ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                      {item.qtyOrder} {item.uofm}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`text-sm ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                      ₱{item.unitCost?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`text-sm font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                      ₱{item.extdCost?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-2">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${!item.itemStatus || item.itemStatus === 'PENDING'
                        ? 'bg-yellow-100 text-yellow-800'
                        : item.itemStatus === 'DELIVERED'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                        }`}>
                        {item.itemStatus || 'PENDING'}
                      </span>
                      <div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        Served: {item.qtyServed || 0}
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className={`${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
              <tr>
                <td colSpan="3" className={`px-6 py-4 text-right text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Subtotal:
                </td>
                <td className={`px-6 py-4 text-sm font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  ₱{header.subtotal?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
                </td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Mobile Card View */}
        <div className="sm:hidden space-y-4 p-4">
          {details.map((item, index) => (
            <div key={item.rid} className={`p-4 rounded-lg border ${darkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'}`}>
              <div className="space-y-3">
                <div>
                  <div className={`text-sm font-medium ${darkMode ? 'text-white' : 'text-gray-900'} mb-2`}>
                    {item.itemDesc}
                  </div>
                  <div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'} space-y-1`}>
                    <div>Item No: {item.itemNmbr}</div>
                    <div>Budget: {item.budgetNo}</div>
                    {(item.brand || item.origin) && (
                      <div>
                        {item.brand && `Brand: ${item.brand}`}
                        {item.brand && item.origin && ' • '}
                        {item.origin && `Origin: ${item.origin}`}
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className={`text-xs font-medium uppercase tracking-wider ${darkMode ? 'text-gray-400' : 'text-gray-500'} mb-1`}>
                      Quantity
                    </div>
                    <div className={`text-sm ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                      {item.qtyOrder} {item.uofm}
                    </div>
                  </div>
                  <div>
                    <div className={`text-xs font-medium uppercase tracking-wider ${darkMode ? 'text-gray-400' : 'text-gray-500'} mb-1`}>
                      Unit Cost
                    </div>
                    <div className={`text-sm ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                      ₱{item.unitCost?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
                    </div>
                  </div>
                  <div>
                    <div className={`text-xs font-medium uppercase tracking-wider ${darkMode ? 'text-gray-400' : 'text-gray-500'} mb-1`}>
                      Extended Cost
                    </div>
                    <div className={`text-sm font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                      ₱{item.extdCost?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
                    </div>
                  </div>
                  <div>
                    <div className={`text-xs font-medium uppercase tracking-wider ${darkMode ? 'text-gray-400' : 'text-gray-500'} mb-1`}>
                      Status
                    </div>
                    <div className="flex flex-col space-y-1">
                      <span className={`inline-flex items-center w-fit px-2.5 py-0.5 rounded-full text-xs font-medium ${!item.itemStatus || item.itemStatus === 'PENDING'
                        ? 'bg-yellow-100 text-yellow-800'
                        : item.itemStatus === 'DELIVERED'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                        }`}>
                        {item.itemStatus || 'PENDING'}
                      </span>
                      <div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        Served: {item.qtyServed || 0}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}

          {/* Mobile Subtotal */}
          <div className={`p-4 rounded-lg border ${darkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'}`}>
            <div className="flex justify-between items-center">
              <span className={`text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                Subtotal:
              </span>
              <span className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                ₱{header.subtotal?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Print Modal */}
      <PurchaseOrderPrintModal
        isOpen={showPrintModal}
        onClose={() => setShowPrintModal(false)}
        purchaseOrder={purchaseOrder}
      />

      {/* Submit Modal */}
      <ConfirmModal
        isOpen={showSubmitModal}
        title="Submit for Processing"
        message="Are you sure you want to submit this purchase order for processing?"
        confirmButtonText="Submit"
        onConfirm={handleConfirmSubmit}
        onCancel={() => setShowSubmitModal(false)}
        isLoading={submitting}
        confirmButtonColor="green"
      />

      {/* Post Modal */}
      <ConfirmModal
        isOpen={showPostModal}
        title="Confirm Post"
        message="Are you sure you want to post this purchase order? This action cannot be undone."
        confirmButtonText="Post Order"
        onConfirm={handleConfirmPost}
        onCancel={() => setShowPostModal(false)}
        isLoading={posting}
        confirmButtonColor="green"
      />

      {/* Delete Modal */}
      <ConfirmModal
        isOpen={showDeleteModal}
        title="Confirm Delete"
        message="Are you sure you want to delete this purchase order? This action cannot be undone."
        confirmButtonText="Delete Order"
        onConfirm={handleConfirmDelete}
        onCancel={() => setShowDeleteModal(false)}
        isLoading={deleting}
        confirmButtonColor="red"
      />
    </div>
  );
}

export default PurchaseOrderDetails;
