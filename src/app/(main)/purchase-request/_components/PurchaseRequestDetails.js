'use client';

import { useState } from 'react';
import { useAuth } from '../../../../utils/authContext';
import RejectRequestModal from '@/app/(main)/_components/rejectRequestModal';
import ConfirmModal from '@/app/(main)/_components/confirmModal';
import { SkeletonRequestEvaluationDetail } from '@/app/_components/skeletonLoader';
import { postPurchaseRequest } from '../_actions';

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
  onClose,
  onReview,
  onApprove,
  onReceive,
  onReject,
  onPost,
  loading = false
}) {
  const { user, darkMode } = useAuth();
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [pendingAction, setPendingAction] = useState(null);

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

  const canReview = () => {
    return purchaseRequest.requestStatus === 'FOR CONFIRMATION' &&
           purchaseRequest.reviewer?.toUpperCase() === user?.empName?.toUpperCase();
  };

  const canApprove = () => {
    return purchaseRequest.requestStatus === 'FOR REQUEST APPROVAL' &&
           purchaseRequest.approver?.toUpperCase() === user?.empName?.toUpperCase();
  };

  const canReceive = () => {
    return purchaseRequest.requestStatus === 'FOR PURCHASING LEAD TIME' &&
           purchaseRequest.addressedTo?.toUpperCase() === user?.empName?.toUpperCase();
  };

  const canReject = () => {
    return (purchaseRequest.requestStatus === 'FOR CONFIRMATION' &&
            purchaseRequest.reviewer?.toUpperCase() === user?.empName?.toUpperCase()) ||
           (purchaseRequest.requestStatus === 'FOR REQUEST APPROVAL' &&
            purchaseRequest.approver?.toUpperCase() === user?.empName?.toUpperCase());
  };

  const canPost = () => {
    return purchaseRequest.requestedBy?.toUpperCase() === user?.empName?.toUpperCase() &&
           purchaseRequest.requestStatus === 'FOR CONFIRMATION';
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

  const getWorkflowStep = () => {
    // Check if request is posted first
    if (purchaseRequest.isPosted) {
      return 'Posted - Awaiting Workflow';
    }

    switch (purchaseRequest.requestStatus) {
      case 'FOR CONFIRMATION':
        return 'Waiting for Review';
      case 'FOR REQUEST APPROVAL':
        return 'Waiting for Approval';
      case 'FOR PURCHASING LEAD TIME':
        return 'Ready for Processing';
      case 'COMPLETED':
        return 'Completed';
      case 'REJECTED':
        return 'Rejected';
      default:
        return 'Unknown Status';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-2xl shadow-lg border ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
        <div className="bg-gradient-to-r from-blue-600 to-green-300 px-8 py-6 rounded-t-2xl">
          <div>
            <h2 className="text-2xl font-bold text-white">
              Purchase Request {purchaseRequest.referenceNo}
            </h2>
            <p className="text-blue-100 mt-1">
              {getWorkflowStep()}
            </p>
            {purchaseRequest.isRush && (
              <div className="flex items-center mt-2">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                  <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                  RUSH REQUEST
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="px-8 py-8 space-y-6">
          {/* Header Information */}
          <div className={`${darkMode ? 'bg-gray-700' : 'bg-gray-50'} rounded-xl p-6`}>
            <h3 className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-900'} mb-4`}>Header Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className={`block text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'} mb-1`}>Reference No</label>
                <div className={`${darkMode ? 'bg-gray-600' : 'bg-gray-100'} rounded px-3 py-2`}>
                  <p className={`${darkMode ? 'text-white' : 'text-gray-900'} font-mono`}>{purchaseRequest.referenceNo}</p>
                </div>
              </div>
              <div>
                <label className={`block text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'} mb-1`}>Company</label>
                <div className={`${darkMode ? 'bg-gray-600' : 'bg-gray-100'} rounded px-3 py-2`}>
                  <p className={`${darkMode ? 'text-white' : 'text-gray-900'}`}>{purchaseRequest.company}</p>
                </div>
              </div>
              <div>
                <label className={`block text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'} mb-1`}>Request Type</label>
                <div className={`${darkMode ? 'bg-gray-600' : 'bg-gray-100'} rounded px-3 py-2`}>
                  <p className={`${darkMode ? 'text-white' : 'text-gray-900'}`}>{purchaseRequest.requestType}</p>
                </div>
              </div>
              <div>
                <label className={`block text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'} mb-1`}>Status</label>
                <div className={`${darkMode ? 'bg-gray-600' : 'bg-gray-100'} rounded px-3 py-2`}>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadge(purchaseRequest.requestStatus)}`}>
                    {purchaseRequest.requestStatus}
                  </span>
                </div>
              </div>
              <div>
                <label className={`block text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'} mb-1`}>Location Code</label>
                <div className={`${darkMode ? 'bg-gray-600' : 'bg-gray-100'} rounded px-3 py-2`}>
                  <p className={`${darkMode ? 'text-white' : 'text-gray-900'}`}>{purchaseRequest.locationCode}</p>
                </div>
              </div>
              <div>
                <label className={`block text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'} mb-1`}>Date Requested</label>
                <div className={`${darkMode ? 'bg-gray-600' : 'bg-gray-100'} rounded px-3 py-2`}>
                  <p className={`${darkMode ? 'text-white' : 'text-gray-900'}`}>{formatDate(purchaseRequest.dateRequested)}</p>
                </div>
              </div>
              <div>
                <label className={`block text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'} mb-1`}>Requested By</label>
                <div className={`${darkMode ? 'bg-gray-600' : 'bg-gray-100'} rounded px-3 py-2`}>
                  <p className={`${darkMode ? 'text-white' : 'text-gray-900'}`}>{purchaseRequest.requestedBy}</p>
                </div>
              </div>
              <div>
                <label className={`block text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'} mb-1`}>Reviewer</label>
                <div className={`${darkMode ? 'bg-gray-600' : 'bg-gray-100'} rounded px-3 py-2`}>
                  <p className={`${darkMode ? 'text-white' : 'text-gray-900'}`}>{purchaseRequest.reviewer || '-'}</p>
                </div>
              </div>
              <div>
                <label className={`block text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'} mb-1`}>Approver</label>
                <div className={`${darkMode ? 'bg-gray-600' : 'bg-gray-100'} rounded px-3 py-2`}>
                  <p className={`${darkMode ? 'text-white' : 'text-gray-900'}`}>{purchaseRequest.approver || '-'}</p>
                </div>
              </div>
              <div>
                <label className={`block text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'} mb-1`}>Addressed To</label>
                <div className={`${darkMode ? 'bg-gray-600' : 'bg-gray-100'} rounded px-3 py-2`}>
                  <p className={`${darkMode ? 'text-white' : 'text-gray-900'}`}>{purchaseRequest.addressedTo || '-'}</p>
                </div>
              </div>
              <div>
                <label className={`block text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'} mb-1`}>Date Reviewed</label>
                <div className={`${darkMode ? 'bg-gray-600' : 'bg-gray-100'} rounded px-3 py-2`}>
                  <p className={`${darkMode ? 'text-white' : 'text-gray-900'}`}>{formatDate(purchaseRequest.dateReviewed)}</p>
                </div>
              </div>
              <div>
                <label className={`block text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'} mb-1`}>Date Approved</label>
                <div className={`${darkMode ? 'bg-gray-600' : 'bg-gray-100'} rounded px-3 py-2`}>
                  <p className={`${darkMode ? 'text-white' : 'text-gray-900'}`}>{formatDate(purchaseRequest.dateApproved)}</p>
                </div>
              </div>
              <div>
                <label className={`block text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'} mb-1`}>Date Received</label>
                <div className={`${darkMode ? 'bg-gray-600' : 'bg-gray-100'} rounded px-3 py-2`}>
                  <p className={`${darkMode ? 'text-white' : 'text-gray-900'}`}>{formatDate(purchaseRequest.dateReceived)}</p>
                </div>
              </div>
              <div className="md:col-span-3">
                <label className={`block text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'} mb-1`}>Remarks</label>
                <div className={`${darkMode ? 'bg-gray-600' : 'bg-gray-100'} rounded px-3 py-2 min-h-[60px]`}>
                  <p className={`${darkMode ? 'text-white' : 'text-gray-900'}`}>{purchaseRequest.remarks || 'No remarks'}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Item Details */}
          <div className={`${darkMode ? 'bg-gray-700' : 'bg-gray-50'} rounded-xl p-6`}>
            <h3 className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-900'} mb-4`}>Item Details</h3>

            {/* Desktop Table View */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full">
                <thead className={`${darkMode ? 'bg-gray-600' : 'bg-gray-100'}`}>
                  <tr>
                    <th className={`px-4 py-3 text-left text-xs font-medium ${darkMode ? 'text-gray-300' : 'text-gray-500'} uppercase tracking-wider`}>Item No</th>
                    <th className={`px-4 py-3 text-left text-xs font-medium ${darkMode ? 'text-gray-300' : 'text-gray-500'} uppercase tracking-wider`}>Description</th>
                    <th className={`px-4 py-3 text-left text-xs font-medium ${darkMode ? 'text-gray-300' : 'text-gray-500'} uppercase tracking-wider`}>UOM</th>
                    <th className={`px-4 py-3 text-left text-xs font-medium ${darkMode ? 'text-gray-300' : 'text-gray-500'} uppercase tracking-wider`}>Quantity</th>
                    <th className={`px-4 py-3 text-left text-xs font-medium ${darkMode ? 'text-gray-300' : 'text-gray-500'} uppercase tracking-wider`}>Budget</th>
                    <th className={`px-4 py-3 text-left text-xs font-medium ${darkMode ? 'text-gray-300' : 'text-gray-500'} uppercase tracking-wider`}>Date Needed</th>
                    <th className={`px-4 py-3 text-left text-xs font-medium ${darkMode ? 'text-gray-300' : 'text-gray-500'} uppercase tracking-wider`}>Status</th>
                    <th className={`px-4 py-3 text-left text-xs font-medium ${darkMode ? 'text-gray-300' : 'text-gray-500'} uppercase tracking-wider`}>Remarks</th>
                  </tr>
                </thead>
                <tbody className={`${darkMode ? 'bg-gray-600 divide-gray-500' : 'bg-white divide-gray-200'} divide-y`}>
                  {purchaseRequest.details && purchaseRequest.details.map((item, index) => (
                    <tr key={item.id} className={darkMode ? 'hover:bg-gray-500' : 'hover:bg-gray-50'}>
                      <td className={`px-4 py-4 whitespace-nowrap text-sm font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                        {item.itemNumber}
                      </td>
                      <td className={`px-4 py-4 text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'} max-w-xs truncate`}>
                        {item.itemDescription}
                      </td>
                      <td className={`px-4 py-4 whitespace-nowrap text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                        {item.unitOfMeasure}
                      </td>
                      <td className={`px-4 py-4 whitespace-nowrap text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                        {item.quantity}
                      </td>
                      <td className={`px-4 py-4 whitespace-nowrap text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                        {item.budgetName}
                      </td>
                      <td className={`px-4 py-4 whitespace-nowrap text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                        {formatDate(item.dateNeeded)}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadge(item.itemStatus, 'item')}`}>
                          {item.itemStatus}
                        </span>
                      </td>
                      <td className={`px-4 py-4 text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'} max-w-xs truncate`}>
                        {item.remarks || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View */}
            <div className="lg:hidden space-y-4">
              {purchaseRequest.details && purchaseRequest.details.map((item, index) => (
                <div key={item.id} className={`${darkMode ? 'bg-gray-600' : 'bg-white'} rounded-lg p-4 border ${darkMode ? 'border-gray-500' : 'border-gray-200'}`}>
                  <div className="flex items-center justify-between mb-3">
                    <h4 className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>Item {index + 1}</h4>
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusBadge(item.itemStatus, 'item')}`}>
                      {item.itemStatus}
                    </span>
                  </div>

                  <div className="space-y-2">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <span className={`text-xs font-medium ${darkMode ? 'text-gray-400' : 'text-gray-500'} uppercase tracking-wider`}>Item No</span>
                        <p className={`text-sm font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>{item.itemNumber}</p>
                      </div>
                      <div>
                        <span className={`text-xs font-medium ${darkMode ? 'text-gray-400' : 'text-gray-500'} uppercase tracking-wider`}>UOM</span>
                        <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>{item.unitOfMeasure}</p>
                      </div>
                      <div>
                        <span className={`text-xs font-medium ${darkMode ? 'text-gray-400' : 'text-gray-500'} uppercase tracking-wider`}>Quantity</span>
                        <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>{item.quantity}</p>
                      </div>
                      <div>
                        <span className={`text-xs font-medium ${darkMode ? 'text-gray-400' : 'text-gray-500'} uppercase tracking-wider`}>Budget</span>
                        <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>{item.budgetName}</p>
                      </div>
                    </div>

                    <div>
                      <span className={`text-xs font-medium ${darkMode ? 'text-gray-400' : 'text-gray-500'} uppercase tracking-wider block mb-1`}>Description</span>
                      <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>{item.itemDescription}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <span className={`text-xs font-medium ${darkMode ? 'text-gray-400' : 'text-gray-500'} uppercase tracking-wider`}>Date Needed</span>
                        <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>{formatDate(item.dateNeeded)}</p>
                      </div>
                      <div>
                        <span className={`text-xs font-medium ${darkMode ? 'text-gray-400' : 'text-gray-500'} uppercase tracking-wider`}>Remarks</span>
                        <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>{item.remarks || '-'}</p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className={`px-8 py-6 border-t ${darkMode ? 'border-gray-700 bg-gray-700' : 'border-gray-200 bg-gray-50'} rounded-b-2xl`}>
          <div className="flex flex-col sm:flex-row gap-4 justify-end">
            <button
              onClick={onClose}
              disabled={loading || actionLoading}
              className={`px-6 py-3 ${darkMode ? 'bg-gray-600 hover:bg-gray-500 text-white' : 'bg-gray-200 hover:bg-gray-300 text-gray-800'} font-semibold rounded-xl transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:opacity-50`}
            >
              Close
            </button>

            {canPost() && (
              <button
                onClick={() => handleAction('post')}
                disabled={loading || actionLoading}
                className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-xl transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 disabled:opacity-50"
              >
                {actionLoading ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Posting...
                  </div>
                ) : (
                  'Post Request'
                )}
              </button>
            )}

            {canReject() && (
              <button
                onClick={() => setShowRejectModal(true)}
                disabled={loading || actionLoading}
                className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-xl transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50"
              >
                {actionLoading ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Rejecting...
                  </div>
                ) : (
                  'Reject'
                )}
              </button>
            )}

            {canReview() && (
              <button
                onClick={() => handleAction('review')}
                disabled={loading || actionLoading}
                className="px-6 py-3 bg-yellow-600 hover:bg-yellow-700 text-white font-semibold rounded-xl transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2 disabled:opacity-50"
              >
                {actionLoading ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Reviewing...
                  </div>
                ) : (
                  'Review'
                )}
              </button>
            )}

            {canApprove() && (
              <button
                onClick={() => handleAction('approve')}
                disabled={loading || actionLoading}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
              >
                {actionLoading ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Approving...
                  </div>
                ) : (
                  'Approve'
                )}
              </button>
            )}

            {canReceive() && (
              <button
                onClick={() => handleAction('receive')}
                disabled={loading || actionLoading}
                className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-xl transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50"
              >
                {actionLoading ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Receiving...
                  </div>
                ) : (
                  'Receive'
                )}
              </button>
            )}
          </div>
        </div>
      </div>

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
        confirmButtonColor="purple"
        onConfirm={handleConfirmAction}
        onCancel={() => setShowConfirmModal(false)}
        isLoading={actionLoading}
      />
    </div>
  );
}
