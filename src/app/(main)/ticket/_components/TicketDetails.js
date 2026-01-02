'use client';

import { useState } from 'react';
import { ToastContainer, toast } from 'react-toastify';
import { useAuth } from '../../../../utils/authContext';

const STATUS_OPTIONS = [
  { value: 'Open', label: 'Open', color: 'bg-blue-100 text-blue-800' },
  { value: 'In Progress', label: 'In Progress', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'Pending', label: 'Pending', color: 'bg-orange-100 text-orange-800' },
  { value: 'Resolved', label: 'Resolved', color: 'bg-green-100 text-green-800' },
  { value: 'Closed', label: 'Closed', color: 'bg-gray-100 text-gray-800' }
];

export default function TicketDetails({
  ticket,
  onClose,
  onEdit,
  onDelete,
  loading = false,
  user = null
}) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const { isAdmin, darkMode } = useAuth();

  if (!ticket) return null;

 const formatDate = (dateString) => {
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

  const getStatusBadge = (status) => {
    const statusOption = STATUS_OPTIONS.find(s => s.value === status);
    return statusOption ? statusOption.color : 'bg-gray-100 text-gray-800';
  };

  const handleDelete = async () => {
    if (showDeleteConfirm) {
      await onDelete(ticket.id);
      setShowDeleteConfirm(false);
    } else {
      setShowDeleteConfirm(true);
    }
  };

  return (
    <div className="fixed inset-0 bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto`}>
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-blue-700 px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-white">
                Ticket #{ticket.id}
              </h2>
              <p className="text-blue-100 mt-1">
                View and manage ticket details
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:bg-white/20 rounded-full p-2 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="px-8 py-8 space-y-6">
          {/* Subject */}
          <div>
            <label className={`block text-sm font-semibold ${darkMode ? 'text-gray-300' : 'text-gray-700'} mb-2`}>
              Subject
            </label>
            <div className={`${darkMode ? 'bg-gray-700' : 'bg-gray-50'} rounded-lg px-4 py-3`}>
              <p className={`${darkMode ? 'text-white' : 'text-gray-900'} font-medium`}>{ticket.subject}</p>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className={`block text-sm font-semibold ${darkMode ? 'text-gray-300' : 'text-gray-700'} mb-2`}>
              Description
            </label>
            <div className={`${darkMode ? 'bg-gray-700' : 'bg-gray-50'} rounded-lg px-4 py-3`}>
              <p className={`${darkMode ? 'text-white' : 'text-gray-900'}`}>
                {ticket.description || 'No description provided'}
              </p>
            </div>
          </div>

          {/* Category and Status */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className={`block text-sm font-semibold ${darkMode ? 'text-gray-300' : 'text-gray-700'} mb-2`}>
                Category
              </label>
              <div className={`${darkMode ? 'bg-gray-700' : 'bg-gray-50'} rounded-lg px-4 py-3`}>
                <p className={`${darkMode ? 'text-white' : 'text-gray-900'}`}>{ticket.category}</p>
              </div>
            </div>
            <div>
              <label className={`block text-sm font-semibold ${darkMode ? 'text-gray-300' : 'text-gray-700'} mb-2`}>
                Status
              </label>
              <div className={`${darkMode ? 'bg-gray-700' : 'bg-gray-50'} rounded-lg px-4 py-3`}>
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                  getStatusBadge(ticket.status) || (darkMode ? 'bg-gray-600 text-white' : 'bg-gray-100 text-gray-800')
                }`}>
                  {ticket.status}
                </span>
              </div>
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className={`block text-sm font-semibold ${darkMode ? 'text-gray-300' : 'text-gray-700'} mb-2`}>
                Date Created
              </label>
              <div className={`${darkMode ? 'bg-gray-700' : 'bg-gray-50'} rounded-lg px-4 py-3`}>
                <p className={`${darkMode ? 'text-white' : 'text-gray-900'}`}>{formatDate(ticket.dateCreated)}</p>
              </div>
            </div>
            <div>
              <label className={`block text-sm font-semibold ${darkMode ? 'text-gray-300' : 'text-gray-700'} mb-2`}>
                Last Modified
              </label>
              <div className={`${darkMode ? 'bg-gray-700' : 'bg-gray-50'} rounded-lg px-4 py-3`}>
                <p className={`${darkMode ? 'text-white' : 'text-gray-900'}`}>{ticket.dateModified ? formatDate(ticket.dateModified) : '-'}</p>
              </div>
            </div>
          </div>

          {/* Status History/Notes - Placeholder for future expansion */}
          <div>
            <label className={`block text-sm font-semibold ${darkMode ? 'text-gray-300' : 'text-gray-700'} mb-2`}>
              Notes
            </label>
            <div className={`${darkMode ? 'bg-gray-700' : 'bg-gray-50'} rounded-lg px-4 py-3 min-h-[100px]`}>
              <p className={`${darkMode ? 'text-gray-400' : 'text-gray-500'} italic`}>
                No additional notes available. This section can be expanded in future updates to include ticket history, comments, and attachments.
              </p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className={`px-8 py-6 border-t ${darkMode ? 'border-gray-700 bg-gray-700' : 'border-gray-200 bg-gray-50'} rounded-b-2xl`}>
          <div className="flex flex-col sm:flex-row gap-4 justify-end">
            {showDeleteConfirm ? (
              <>
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={loading}
                  className={`px-6 py-3 ${darkMode ? 'bg-gray-600 hover:bg-gray-500 text-white' : 'bg-gray-200 hover:bg-gray-300 text-gray-800'} font-semibold rounded-xl transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:opacity-50`}
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  disabled={loading}
                  className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-xl transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50"
                >
                  {loading ? (
                    <div className="flex items-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Deleting...
                    </div>
                  ) : (
                    'Confirm Delete'
                  )}
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => onDelete(ticket.id)}
                  disabled={loading}
                  className={`px-6 py-3 ${darkMode ? 'bg-red-800 hover:bg-red-700 text-red-100' : 'bg-red-100 hover:bg-red-200 text-red-700'} font-semibold rounded-xl transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50`}
                >
                  Delete Ticket
                </button>
                <button
                  onClick={() => {
                    if (!isAdmin()) {
                      toast.error('Only admin users can edit tickets');
                      return;
                    }
                    onEdit(ticket);
                  }}
                  disabled={loading || !isAdmin()}
                  className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold rounded-xl transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
                >
                  Edit Ticket
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
