'use client';

import { useState, useEffect, useRef } from 'react';
import { toast } from 'react-toastify';
import { useAuth } from '@/utils/authContext';
import { SkeletonRequestEvaluationDetail } from '@/app/_components/skeletonLoader';
import { postReceivingEntryWithNotifications, deleteReceivingEntry, checkUserHasRRAuthorization, getDistributionsByReferenceNo } from '../_actions';
import { handlePrintReceivingEntry } from './ReceivingEntryPrintModal';
import ConfirmModal from '@/app/(main)/_components/confirmModal';
import EditReceivingEntryModal from './EditReceivingEntryModal';
import AssignDistributionModal from './AssignDistributionModal';

function ReceivingEntryDetails({ receivingEntry, onClose, onDelete, onEdit, onDataRefresh, onRefreshList, darkMode = false, loading = false, isModal = false }) {
  const { user } = useAuth();
  const [deleting, setDeleting] = useState(false);
  const [posting, setPosting] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showPostModal, setShowPostModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [showActionMenu, setShowActionMenu] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [hasRRAuthorization, setHasRRAuthorization] = useState(false);
  const [distributions, setDistributions] = useState([]);
  const [isDAPosted, setIsDAPosted] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const menuRef = useRef(null);
  const modalRef = useRef(null);
  const dragRef = useRef(null);

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

  // Drag functionality for modal
  useEffect(() => {
    if (isModal && showAssignModal) {
      setDragOffset({ x: 0, y: 0 });
    }
  }, [isModal, showAssignModal]);

  // Responsive positioning
  useEffect(() => {
    const updatePosition = () => {
      if (modalRef.current && isModal) {
        const isMobile = window.innerWidth < 1024;
        if (isMobile) {
          modalRef.current.style.left = '5%';
          modalRef.current.style.right = '5%';
          modalRef.current.style.top = showAssignModal ? '45%' : '50%';
          modalRef.current.style.transform = 'translateY(-50%)';
          modalRef.current.style.maxWidth = '90%';
        } else {
          modalRef.current.style.left = showAssignModal ? '5%' : '50%';
          modalRef.current.style.right = 'auto';
          modalRef.current.style.top = '50%';
          modalRef.current.style.transform = showAssignModal ? 'translateY(-50%)' : 'translate(-50%, -50%)';
          modalRef.current.style.maxWidth = showAssignModal ? '50%' : '1480px';
          modalRef.current.style.maxHeight = '90vh';
        }
      }
    };

    updatePosition();
    window.addEventListener('resize', updatePosition);
    return () => window.removeEventListener('resize', updatePosition);
  }, [isModal, showAssignModal]);

  const handleMouseDown = (e) => {
    if (!dragRef.current?.contains(e.target)) return;

    setIsDragging(true);
    const rect = modalRef.current.getBoundingClientRect();
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    });
  };

  const handleMouseMove = (e) => {
    if (!isDragging || !modalRef.current) return;

    const newX = e.clientX - dragOffset.x;
    const newY = e.clientY - dragOffset.y;

    modalRef.current.style.left = `${newX}px`;
    modalRef.current.style.top = `${newY}px`;
    modalRef.current.style.transform = 'none';
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    } else {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragOffset]);

  // Check RR Distribution authorization
  useEffect(() => {
    const checkAuthorization = async () => {
      if (user?.empName) {
        try {
          const result = await checkUserHasRRAuthorization(user.empName);
          if (result.success) {
            setHasRRAuthorization(result.hasAuthorization);
          }
        } catch (error) {
          console.error('Error checking RR authorization:', error);
        }
      }
    };

    checkAuthorization();
  }, [user?.empName]);

  // Fetch distributions
  useEffect(() => {
    const fetchDistributions = async () => {
      if (receivingEntry?.header?.referenceNo) {
        try {
          const result = await getDistributionsByReferenceNo(receivingEntry.header.referenceNo);
          if (result.success) {
            const dists = result.distributions || [];
            setDistributions(dists);
            setIsDAPosted(dists.some(d => d.postStatus === 1));
          }
        } catch (error) {
          console.error('Error fetching distributions:', error);
        }
      }
    };

    fetchDistributions();
  }, [receivingEntry?.header?.referenceNo]);



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

  const getStatusText = (status, isDAPosted = false) => {
    const s = Number(status);
    if (isNaN(s)) return 'Unknown';
    switch (s) {
      case 1:
        return isDAPosted ? 'Posted w/ DA' : 'Posted';
      case 0:
        return 'Not Posted';
      default:
        return 'Unknown';
    }
  };

  const handleDelete = () => {
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = async () => {
    setDeleting(true);
    try {
      const result = await deleteReceivingEntry(receivingEntry.header.referenceNo, user?.empName);
      if (result.success) {
        toast.success('Receiving entry deleted successfully');
        setShowDeleteModal(false);
        onRefreshList?.();
      } else {
        toast.error(result.message || 'Failed to delete receiving entry');
      }
    } catch (error) {
      console.error('Error deleting receiving entry:', error);
      toast.error('Failed to delete receiving entry');
    } finally {
      setDeleting(false);
    }
  };

  const handlePost = () => {
    setShowPostModal(true);
  };

  const handlePostConfirm = async () => {
    setPosting(true);
    try {
      const result = await postReceivingEntryWithNotifications(receivingEntry.header.referenceNo, user?.empName);
      if (result.success) {
        toast.success('Receiving entry posted successfully');
        setShowPostModal(false);
        onRefreshList?.();
        onDataRefresh?.();
        onClose?.();
      } else {
        toast.error(result.message || 'Failed to post receiving entry');
      }
    } catch (error) {
      console.error('Error posting receiving entry:', error);
      toast.error('Failed to post receiving entry');
    } finally {
      setPosting(false);
    }
  };

  const handleEditSuccess = () => {
    onRefreshList?.();
    onDataRefresh?.();
  };

  const handleAssignDistribution = () => {
    setShowAssignModal(true);
  };

  let content;

  if (loading) {
    content = (
      <div className="p-4">
        <SkeletonRequestEvaluationDetail />
      </div>
    );
  } else if (!receivingEntry) {
    content = (
      <div className="flex items-center justify-center h-full">
        <div className={`text-center ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
          <svg className="w-16 h-16 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p className="text-lg font-medium">Select a receiving entry to view details</p>
          <p className="text-sm mt-2">Click on any receiving entry from the list on the left to see its details.</p>
        </div>
      </div>
    );
  } else {
    const { header, details } = receivingEntry;

    const isEditDisabled = loading || actionLoading || header.postStatus === 1;

    const parseDate = (dateValue) => {
      if (!dateValue) return null;
      if (dateValue instanceof Date) return isNaN(dateValue.getTime()) ? null : dateValue;
      if (typeof dateValue === 'number') return new Date(dateValue);
      if (typeof dateValue === 'string') {
        // Convert "YYYY-MM-DD HH:MM:SS" to ISO format
        const iso = dateValue.replace(' ', 'T');
        const date = new Date(iso);
        return isNaN(date.getTime()) ? null : date;
      }
      return null;
    };

    const formatDateOnly = (dateValue) => {
      const date = parseDate(dateValue);
      if (!date) return 'N/A';
      const month = date.getMonth() + 1;
      const day = date.getDate();
      const year = date.getFullYear();
      return `${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}-${year}`;
    };

    const formatDate = (dateValue) => {
      if (!dateValue) return '-';
      const date = parseDate(dateValue);
      if (!date) return '-';
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
      return `Created on ${formatDateOnly(header.dateCreated)}`;
    };

    const dateReceived = header.dateReceived ? formatDateOnly(header.dateReceived) : 'N/A';

    const totalQtyReceived = details.reduce((sum, item) => sum + (item.quantity || 0), 0);
    const totalExtdCost = details.reduce((sum, item) => sum + ((item.extdCost || 0) || (item.unitCost || 0) * (item.quantity || 0)), 0);
    const currency = header.currency || 'PHP';

    content = (
      <div className="space-y-2">
        <div className={`px-4 rounded-lg`}>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <span className={`text-xs sm:text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                Receiving No.
              </span>
              <h4 className={`text-xl sm:text-2xl font-bold ${darkMode ? 'text-blue-300' : 'text-blue-700'}`}>
                {header.referenceNo}
              </h4>
              <span className={`px-4 py-1 rounded-full text-sm font-semibold border ${getStatusColor(header.postStatus)}`}>
                {getStatusText(header.postStatus, isDAPosted)}
              </span>
              <span className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                {getDateCreated()}
              </span>
            </div>
          </div>
        </div>

        <div className={`${darkMode ? 'bg-gray-800/50 border-gray-600' : 'bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200'} p-4 rounded-lg mb-6 border`}>
          <h3 className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'} mb-3`}>Receiving Header</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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

              </div>
            </div>

            <div>
              <h3 className={`text-sm font-bold mb-3 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                PO Reference
              </h3>
              <div className="space-y-2">
                <div>
                  <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Purchase Order No:</span>
                  <span className={`ml-2 text-sm font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>{header.poNumber || 'N/A'}</span>
                </div>
                <div>
                  <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Vendor Doc No:</span>
                  <span className={`ml-2 text-sm font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>{header.vndDocNm || 'N/A'}</span>
                </div>
              </div>
            </div>

            <div>
              <h3 className={`text-sm font-bold mb-3 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                Receiving Details
              </h3>
              <div className="space-y-2">
                <div>
                  <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Location:</span>
                  <span className={`ml-2 text-sm font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>{header.locnCode || 'N/A'}</span>
                </div>
                <div>
                  <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Receipt Type:</span>
                  <span className={`ml-2 text-sm font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>{header.receiptType || 'N/A'}</span>
                </div>
              </div>
            </div>

            <div>
              <h3 className={`text-sm font-bold mb-3 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                Processing Information
              </h3>
              <div className="space-y-2">
                <div>
                  <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Received By:</span>
                  <span className={`ml-2 text-sm font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>{header.createdBy || 'N/A'}</span>
                </div>
                <div>
                  <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Received Date:</span>
                  <span className={`ml-2 text-sm font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    {dateReceived}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {header.remarks && (
            <div className="mt-6">
              <h3 className={`text-sm font-bold mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Remarks</h3>
              <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>{header.remarks}</p>
            </div>
          )}
        </div>

        <div className={`${darkMode ? 'bg-gray-800/50 border-gray-600' : 'bg-white border-gray-200'} rounded-lg border overflow-hidden`}>
          <div className="p-4 border-b border-gray-200 dark:border-gray-600">
            <div className="flex items-center justify-between">
              <h3 className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>Item Details</h3>
              <div className="flex gap-4 text-sm">
                <span>
                  <span className={`${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Total Items: </span>
                  <span className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>{details.length}</span>
                </span>
                <span>
                  <span className={`${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Total Qty: </span>
                  <span className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>{totalQtyReceived}</span>
                </span>
                <span>
                  <span className={`${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Total Amount: </span>
                  <span className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>{totalExtdCost.toLocaleString('en-US', { style: 'currency', currency: currency })}</span>
                </span>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className={`w-full ${darkMode ? 'text-gray-300' : 'text-gray-900'}`}>
              <thead className={`${darkMode ? 'bg-gray-700' : 'bg-gray-50'} text-xs uppercase`}>
                <tr>
                  <th className="px-4 py-3 text-left font-semibold">Item No.</th>
                  <th className="px-4 py-3 text-left font-semibold">Item Description</th>
                  <th className="px-4 py-3 text-left font-semibold">UOFM</th>
                  <th className="px-4 py-3 text-right font-semibold">Inventory Qty</th>
                  <th className="px-4 py-3 text-right font-semibold">Qty Received</th>
                  <th className="px-4 py-3 text-right font-semibold">Unit Cost</th>
                  <th className="px-4 py-3 text-right font-semibold">Extended Cost</th>
                </tr>
              </thead>
              <tbody className={`divide-y ${darkMode ? 'divide-gray-700' : 'divide-gray-200'}`}>
                {details.map((detail, index) => (
                  <tr key={index} className={`${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-50'}`}>
                    <td className="px-4 py-3 text-sm">{detail.itemNmbr || '-'}</td>
                    <td className="px-4 py-3 text-sm">{detail.itemDesc || '-'}</td>
                    <td className="px-4 py-3 text-sm">{detail.uofm || '-'}</td>
                    <td className="px-4 py-3 text-sm text-right">{detail.inventoryQuantity || 0}</td>
                    <td className="px-4 py-3 text-sm text-right">{detail.quantity || 0}</td>
                     <td className="px-4 py-3 text-sm text-right">{detail.unitCost?.toLocaleString('en-US', { style: 'currency', currency: currency }) || '-'}</td>
                     <td className="px-4 py-3 text-sm text-right">{(detail.extdCost || (detail.unitCost || 0) * (detail.quantity || 0)).toLocaleString('en-US', { style: 'currency', currency: currency })}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>



        <ConfirmModal
          isOpen={showDeleteModal}
          onCancel={() => setShowDeleteModal(false)}
          onConfirm={handleConfirmDelete}
          title="Delete Receiving Entry"
          message={`Are you sure you want to delete receiving entry ${header.referenceNo}? This action cannot be undone.`}
          confirmText="Delete"
          confirmVariant="danger"
          isLoading={deleting}
          hasBackdrop={false}
        />

        <ConfirmModal
          isOpen={showPostModal}
          onCancel={() => setShowPostModal(false)}
          onConfirm={handlePostConfirm}
          title="Post Receiving Entry"
          message={`Are you sure you want to post receiving entry ${header.referenceNo}? This action cannot be undone.`}
          confirmText="Post"
          confirmVariant="success"
          isLoading={posting}
          hasBackdrop={false}
        />
      </div>
    );
  }

  let modalButtons;
  if (receivingEntry) {
    const isEditDisabled = loading || actionLoading || receivingEntry.header.postStatus === 1;
    modalButtons = (
      <div className="flex items-center gap-4">
        {receivingEntry.header.postStatus === 0 && (
          <>
            <button
              onClick={() => setShowEditModal(true)}
              disabled={isEditDisabled}
              className={`inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:bg-blue-700 active:bg-blue-800 rounded-md shadow-sm transition-all duration-200 ease-in-out transform hover:scale-105 focus:scale-105 disabled:transform-none disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-gray-900 min-w-[120px]`}
              aria-label="Edit receiving entry"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Edit
            </button>
            <button
              onClick={() => handlePost()}
              disabled={isEditDisabled}
              className={`inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:bg-green-700 active:bg-green-800 rounded-md shadow-sm transition-all duration-200 ease-in-out transform hover:scale-105 focus:scale-105 disabled:transform-none disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-gray-900 min-w-[120px]`}
              aria-label="Post receiving entry"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Post
            </button>
            <button
              onClick={() => handleDelete()}
              disabled={isEditDisabled}
              className={`inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:bg-red-700 active:bg-red-800 rounded-md shadow-sm transition-all duration-200 ease-in-out transform hover:scale-105 focus:scale-105 disabled:transform-none disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-gray-900 min-w-[120px]`}
              aria-label="Delete receiving entry"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Delete
            </button>
          </>
        )}
        {Number(receivingEntry.header.postStatus) === 1 && (
          <>
            <button
              onClick={() => handlePrintReceivingEntry(receivingEntry)}
              className={`inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-gray-600 hover:bg-gray-700 focus:bg-gray-700 active:bg-gray-800 rounded-md shadow-sm transition-all duration-200 ease-in-out transform hover:scale-105 focus:scale-105 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-gray-900 min-w-[120px]`}
              aria-label="Print receiving entry"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2h-2m-4 6h4m0 0H9m4 0v4m0-4V5a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2h4m10-10V7a2 2 0 012-2h4a2 2 0 012 2v6a2 2 0 01-2 2h-4a2 2 0 01-2-2z" />
              </svg>
              Print
            </button>
            {hasRRAuthorization && (
              <button
                onClick={handleAssignDistribution}
                className={`inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:bg-blue-700 active:bg-blue-800 rounded-md shadow-sm transition-all duration-200 ease-in-out transform hover:scale-105 focus:scale-105 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-gray-900 min-w-[120px]`}
                aria-label="Assign distribution of account"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                {distributions.length > 0 ? (isDAPosted ? 'View Distribution of Accounts' : 'Edit / Post DA') : 'Assign Distribution'}
              </button>
            )}
          </>
        )}
        <button
          onClick={onClose}
          className={`p-2 rounded-lg ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    );
  } else {
    modalButtons = (
      <div className="flex items-center gap-4">
        <button
          onClick={onClose}
          className={`p-2 rounded-lg ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    );
  }

  const editModal = showEditModal && (
    <EditReceivingEntryModal
      isOpen={showEditModal}
      onClose={() => setShowEditModal(false)}
      darkMode={darkMode}
      user={user}
      receivingEntry={receivingEntry}
      onSuccess={handleEditSuccess}
    />
  );

  const assignModal = showAssignModal && (
    <AssignDistributionModal
      isOpen={showAssignModal}
      onClose={() => setShowAssignModal(false)}
      darkMode={darkMode}
      receivingEntry={receivingEntry}
      user={user}
      isViewMode={isDAPosted}
    />
  );

  if (isModal) {
    return (
      <>
        {!showAssignModal && !showDeleteModal && !showPostModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="fixed inset-0 bg-black/50" onClick={onClose} />
          </div>
        )}
        <div
          ref={modalRef}
          className={`fixed w-full overflow-hidden rounded-lg shadow-xl z-50 ${darkMode ? 'bg-gray-800' : 'bg-white'}`}
          style={{
            position: 'fixed',
            maxHeight: '90vh'
          }}
        >
          <div
            ref={dragRef}
            className={`space-x-2 px-6 py-4 border-b ${darkMode ? 'border-gray-600' : 'border-gray-200'} flex items-center justify-between gap-3 cursor-move`}
            onMouseDown={handleMouseDown}
          >
            <div className="flex items-center gap-3">
              <h2 className={`text-xl font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                Receiving Entry Details
              </h2>
            </div>
            {modalButtons}
          </div>
          <div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)]">
            {content}
          </div>
        </div>
        {editModal}
        {assignModal}
      </>
    );
  }

  return (
    <>
      {content}
      {editModal}
      {assignModal}
    </>
  );
}

export default ReceivingEntryDetails;