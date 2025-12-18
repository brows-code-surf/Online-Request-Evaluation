'use client';

import { useState } from 'react';
import { useAuth } from '../../../../utils/authContext';
import RejectRequestModal from '@/app/(main)/_components/rejectRequestModal';
import ConfirmModal from '@/app/(main)/_components/confirmModal';

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
  loading = false
}) {
  const { user, darkMode } = useAuth();
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
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

  const canPost = () => {
    return purchaseRequest.requestedBy?.toUpperCase() === user?.empName?.toUpperCase() &&
      purchaseRequest.requestStatus === 'FOR CONFIRMATION' || 'FOR POSTING';
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
          <div className="flex gap-2">
            {!purchaseRequest.isPosted && purchaseRequest.requestedBy?.toUpperCase() === user?.empName?.toUpperCase() && (
              <button
                onClick={() => onEdit && onEdit(purchaseRequest)}
                disabled={loading || actionLoading}
                className="bg-amber-600 hover:bg-amber-700 text-white font-semibold py-2 px-4 rounded-lg transition flex items-center justify-center gap-2 disabled:opacity-50"
              >
                Edit Request
              </button>
            )}
            {canPost() && (
              <button
                onClick={() => handleAction('post')}
                disabled={loading || actionLoading}
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition flex items-center justify-center gap-2 disabled:opacity-50"
              >
                Post Request
              </button>
            )}
            {!purchaseRequest.isPosted && purchaseRequest.requestStatus !== 'CANCELLED' && purchaseRequest.requestedBy?.toUpperCase() === user?.empName?.toUpperCase() && (
              <button
                onClick={() => setShowCancelModal(true)}
                disabled={loading || actionLoading}
                className="bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-4 rounded-lg transition flex items-center justify-center gap-2 disabled:opacity-50"
              >
                Cancel Request
              </button>
            )}
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
    </div>
  );
}
