import { useState, useEffect } from 'react';
import { getAllPurchaseRequests } from '../procurement/purchase-request/_actions';
import { fetchEvaluationLeftPanel } from '../procurement/request-evaluation/_actions';
import { getAllCanvassingItems } from '../procurement/canvass-approval/_actions';
import { useAuth } from '@/utils/authContext';
import SkeletonLoader from '../../_components/skeletonLoader';

export default function SearchModal({ isOpen, onClose, onSelect, darkMode, type = 'purchase-request' }) {
  const { user, isAdmin } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('date');
  const [filterStatus, setFilterStatus] = useState('');

  useEffect(() => {
    if (isOpen && isAdmin()) {
      loadItems();
    }
  }, [isOpen]);

  const loadItems = async () => {
    setLoading(true);
    try {
      let result;
      if (type === 'purchase-request') {
        result = await getAllPurchaseRequests({}, user, isAdmin());
        if (result.success) {
          setItems(result.purchaseRequests);
        }
      } else if (type === 'request-evaluation') {
        result = await fetchEvaluationLeftPanel(user?.empName, 'all', {}, true);
        setItems(result);
      } else if (type === 'canvassing-approval') {
        result = await getAllCanvassingItems(user);
        if (result.success) {
          // Only show approved and rejected items for canvassing search
          const approvedRejectedItems = result.items.filter(item =>
            item.status === 'APPROVED' || item.status === 'REJECTED'
          );
          setItems(approvedRejectedItems);
        }
      }
    } catch (error) {
      console.error('Error loading items:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredItems = items
    .filter(item => {
      // For request-evaluation, only show items in evaluation statuses
      if (type === 'request-evaluation') {
        const allowedStatuses = ['FOR CONFIRMATION', 'FOR REQUEST APPROVAL', 'FOR PURCHASING LEAD TIME'];
        if (!allowedStatuses.includes(item.status)) {
          return false;
        }
      }

      const matchesSearch = searchQuery === '' ||
        (type === 'purchase-request'
          ? [item.referenceNo, item.requestedBy, item.company, item.requestStatus, item.dateRequested].some(field =>
            field?.toString().toLowerCase().includes(searchQuery.toLowerCase())
          )
          : type === 'canvassing-approval'
            ? [item.pqCode, item.itemNumber, item.itemDescription, item.createdBy, item.vendorName, item.status, item.approvedBy, item.approvalRemarks, item.dateRequested?.toString()].some(field =>
              field?.toString().toLowerCase().includes(searchQuery.toLowerCase())
            )
            : [item.requester, item.title, item.id, item.status, item.department, item.location, item.employeeID, item.description, item.isRush, item.requestDate?.toString()].some(field =>
              field?.toString().toLowerCase().includes(searchQuery.toLowerCase())
            )
        );

      const matchesStatus = filterStatus === '' ||
        (type === 'purchase-request'
          ? item.requestStatus === filterStatus
          : type === 'canvassing-approval'
            ? (filterStatus === 'all' || item.status === filterStatus)
            : (filterStatus === 'all' || item.status === filterStatus)
        );

      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      if (sortBy === 'date') {
        const dateA = type === 'purchase-request' ? new Date(a.dateRequested) : type === 'canvassing-approval' ? new Date(a.dateRequested) : new Date(a.requestDate);
        const dateB = type === 'purchase-request' ? new Date(b.dateRequested) : type === 'canvassing-approval' ? new Date(b.dateRequested) : new Date(b.requestDate);
        return dateB - dateA;
      } else if (sortBy === 'requester') {
        const requesterA = type === 'purchase-request' ? a.requestedBy : type === 'canvassing-approval' ? a.createdBy : a.requester;
        const requesterB = type === 'purchase-request' ? b.requestedBy : type === 'canvassing-approval' ? b.createdBy : b.requester;
        return requesterA.localeCompare(requesterB);
      } else if (sortBy === 'status') {
        const statusA = type === 'purchase-request' ? a.requestStatus : a.status;
        const statusB = type === 'purchase-request' ? b.requestStatus : b.status;
        return statusA.localeCompare(statusB);
      } else if (sortBy === 'reference') {
        const refA = type === 'purchase-request' ? a.referenceNo : type === 'canvassing-approval' ? a.pqCode : a.id;
        const refB = type === 'purchase-request' ? b.referenceNo : type === 'canvassing-approval' ? b.pqCode : b.id;
        return refA.localeCompare(refB);
      }
      return 0;
    });

  const getStatusColor = (status) => {
    if (type === 'purchase-request') {
      switch (status) {
        case 'POSTED':
          return 'bg-purple-100 text-purple-800 border-purple-300';
        case 'FOR CONFIRMATION':
          return 'bg-blue-100 text-blue-800 border-blue-300';
        case 'FOR REQUEST APPROVAL':
          return 'bg-yellow-100 text-yellow-800 border-yellow-300';
        case 'FOR PURCHASING LEAD TIME':
          return 'bg-orange-100 text-orange-800 border-orange-300';
        case 'PARTIALLY_SERVED':
          return 'bg-indigo-100 text-indigo-800 border-indigo-300';
        case 'REJECTED':
          return 'bg-red-100 text-red-800 border-red-300';
        case 'CANCELLED':
          return 'bg-red-100 text-red-800 border-red-300';
        case 'FOR CANVASSING':
          return 'bg-sky-100 text-sky-800 border-sky-300';
        default:
          return 'bg-gray-100 text-gray-800 border-gray-300';
      }
    } else {
      switch (status) {
        case 'APPROVED':
          return 'bg-green-100 text-green-800 border-green-300';
        case 'REJECTED':
          return 'bg-red-100 text-red-800 border-red-300';
        case 'FOR REQUEST APPROVAL':
        case 'FOR CONFIRMATION':
        case 'FOR PURCHASING LEAD TIME':
          return 'bg-yellow-100 text-yellow-800 border-yellow-300';
        default:
          return 'bg-gray-100 text-gray-800 border-gray-300';
      }
    }
  };

  const handleRowDoubleClick = (item) => {
    if (type === 'purchase-request') {
      // Convert to the format expected by purchase request parent component
      const approval = {
        ...item,
        id: item.referenceNo,
        title: `${item.company} - ${item.requestStatus}`,
        requester: item.requestedBy,
        status: item.isPosted ? 'POSTED' : 'NOT POSTED',
        requestDate: item.dateRequested,
        department: item.company,
        isRead: item.isRead ? 'READ' : 'NOT READ',
        isRush: item.isRush
      };
      onSelect(approval);
    } else {
      // Request evaluation items are already in the right format
      onSelect(item);
    }
    onClose();
  };

  const getTitle = () => {
    if (type === 'purchase-request') return 'Search Purchase Requests';
    if (type === 'canvassing-approval') return 'Search Canvassing Items';
    return 'Search Request Evaluations';
  };

  const getPlaceholder = () => {
    if (type === 'purchase-request') return 'Search by reference, requester, company...';
    if (type === 'canvassing-approval') return 'Search by PQ code, item, vendor, status...';
    return 'Search by reference, requester, company...';
  };

  const getStatusOptions = () => {
    if (type === 'purchase-request') {
      return [
        { value: '', label: 'All Statuses' },
        { value: 'FOR CONFIRMATION', label: 'For Confirmation' },
        { value: 'FOR REQUEST APPROVAL', label: 'For Request Approval' },
        { value: 'FOR PURCHASING LEAD TIME', label: 'For Purchasing Lead Time' },
        { value: 'COMPLETED', label: 'Completed' },
        { value: 'REJECTED', label: 'Rejected' },
      ];
    } else if (type === 'canvassing-approval') {
      return [
        { value: '', label: 'All Statuses' },
        { value: 'APPROVED', label: 'Approved' },
        { value: 'REJECTED', label: 'Rejected' },
      ];
    } else {
      return [
        { value: 'all', label: 'All Statuses' },
        { value: 'FOR CONFIRMATION', label: 'For Confirmation' },
        { value: 'FOR REQUEST APPROVAL', label: 'For Request Approval' },
        { value: 'FOR PURCHASING LEAD TIME', label: 'For Purchasing Lead Time' },
        { value: 'APPROVED', label: 'Approved' },
        { value: 'REJECTED', label: 'Rejected' },
        { value: 'RUSH', label: 'Rush Requests' },
      ];
    }
  };

  const getTableHeaders = () => {
    if (type === 'canvassing-approval') {
      return [
        'PQ Code',
        'Item Description',
        'Vendor',
        'Status',
        'Requester',
        'Date Requested'
      ];
    }
    return [
      'Reference No',
      'Company',
      'Requester',
      'Status',
      'Date Requested',
      type === 'purchase-request' ? 'Rush' : 'Rush'
    ];
  };

  const renderTableRow = (item, index) => {
    if (type === 'purchase-request') {
      return (
        <tr
          key={item.referenceNo}
          onDoubleClick={() => handleRowDoubleClick(item)}
          className={`border-b ${darkMode ? 'border-gray-700 hover:bg-gray-700' : 'border-gray-200 hover:bg-gray-50'} cursor-pointer transition-colors`}
        >
          <td className="px-2 sm:px-4 py-2 sm:py-3 font-medium text-xs">{item.referenceNo}</td>
          <td className="px-2 sm:px-4 py-2 sm:py-3 text-xs">{item.company}</td>
          <td className="px-2 sm:px-4 py-2 sm:py-3 text-xs">{item.requestedBy}</td>
          <td className="px-2 sm:px-4 py-2 sm:py-3">
            <span className={`px-1 sm:px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(item.requestStatus)}`}>
              {item.requestStatus}
            </span>
          </td>
          <td className="px-2 sm:px-4 py-2 sm:py-3 text-xs">
            {new Date(item.dateRequested).toLocaleDateString()}
          </td>
          <td className="px-2 sm:px-4 py-2 sm:py-3">
            {item.isRush && (
              <span className="px-1 sm:px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs font-medium">
                RUSH
              </span>
            )}
          </td>
        </tr>
      );
    } else if (type === 'canvassing-approval') {
      return (
        <tr
          key={item.id}
          onDoubleClick={() => handleRowDoubleClick(item)}
          className={`border-b ${darkMode ? 'border-gray-700 hover:bg-gray-700' : 'border-gray-200 hover:bg-gray-50'} cursor-pointer transition-colors`}
        >
          <td className="px-2 sm:px-4 py-2 sm:py-3 font-medium text-xs">{item.pqCode}</td>
          <td className="px-2 sm:px-4 py-2 sm:py-3 text-xs">{item.itemDescription}</td>
          <td className="px-2 sm:px-4 py-2 sm:py-3 text-xs">{item.vendorName || 'N/A'}</td>
          <td className="px-2 sm:px-4 py-2 sm:py-3">
            <span className={`px-1 sm:px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(item.status)}`}>
              {item.status}
            </span>
          </td>
          <td className="px-2 sm:px-4 py-2 sm:py-3 text-xs">{item.createdBy}</td>
          <td className="px-2 sm:px-4 py-2 sm:py-3 text-xs">
            {new Date(item.dateRequested).toLocaleDateString()}
          </td>
        </tr>
      );
    } else {
      return (
        <tr
          key={item.id}
          onDoubleClick={() => handleRowDoubleClick(item)}
          className={`border-b ${darkMode ? 'border-gray-700 hover:bg-gray-700' : 'border-gray-200 hover:bg-gray-50'} cursor-pointer transition-colors`}
        >
          <td className="px-2 sm:px-4 py-2 sm:py-3 font-medium text-xs">{item.id}</td>
          <td className="px-2 sm:px-4 py-2 sm:py-3 text-xs">{item.department}</td>
          <td className="px-2 sm:px-4 py-2 sm:py-3 text-xs">{item.requester}</td>
          <td className="px-2 sm:px-4 py-2 sm:py-3">
            <span className={`px-1 sm:px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(item.status)}`}>
              {item.status}
            </span>
          </td>
          <td className="px-2 sm:px-4 py-2 sm:py-3 text-xs">
            {new Date(item.requestDate).toLocaleDateString()}
          </td>
          <td className="px-2 sm:px-4 py-2 sm:py-3">
            {item.isRush && (
              <span className="px-1 sm:px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs font-medium">
                RUSH
              </span>
            )}
          </td>
        </tr>
      );
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-[1000] p-2 sm:p-4">
      <div className={`w-full max-w-7xl max-h-[95vh] sm:max-h-[90vh] rounded-lg sm:rounded-xl shadow-xl ${darkMode ? 'bg-gray-800' : 'bg-white'} overflow-hidden`}>
        {/* Header */}
        <div className={`px-4 sm:px-6 py-3 sm:py-4 border-b ${darkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'}`}>
          <div className="flex items-center justify-between">
            <h2 className={`text-lg sm:text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              {getTitle()}
            </h2>
            <button
              onClick={onClose}
              className={`p-1.5 sm:p-2 rounded-full hover:${darkMode ? 'bg-gray-700' : 'bg-gray-100'} transition-colors`}
            >
              <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mt-3 sm:mt-4">
            <div className="flex-1 min-w-0">
              <input
                type="text"
                placeholder={getPlaceholder()}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`w-full px-2 sm:px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${darkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'bg-white border-gray-300 text-gray-900'
                  }`}
              />
            </div>

            <div className="flex flex-col sm:flex-row gap-2 sm:gap-2">
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className={`px-2 sm:px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-0 ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'
                  }`}
              >
                {getStatusOptions().map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>

              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className={`px-2 sm:px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-0 ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'
                  }`}
              >
                <option value="date">Sort by Date</option>
                <option value="requester">Sort by Requester</option>
                <option value="status">Sort by Status</option>
                <option value="reference">Sort by Reference</option>
              </select>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-[calc(90vh-200px)]">
          <div className="overflow-x-auto">
            <table className={`w-full ${darkMode ? 'text-gray-300' : 'text-gray-900'}`}>
              <thead className={`${darkMode ? 'bg-gray-700' : 'bg-gray-50'} border-b ${darkMode ? 'border-gray-600' : 'border-gray-200'}`}>
                <tr>
                  {getTableHeaders().map((header, index) => (
                    <th key={index} className="text-xs sm:text-sm px-2 sm:px-4 py-2 sm:py-3 text-left">{header}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  // Skeleton loading rows
                  Array(5).fill().map((_, index) => (
                    <tr key={`skeleton-${index}`} className={`border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                      <td className="px-4 py-3">
                        <SkeletonLoader height="h-4" width="w-20" />
                      </td>
                      <td className="px-4 py-3">
                        <SkeletonLoader height="h-4" width="w-24" />
                      </td>
                      <td className="px-4 py-3">
                        <SkeletonLoader height="h-4" width="w-16" />
                      </td>
                      <td className="px-4 py-3">
                        <SkeletonLoader height="h-6" width="w-20" className="rounded-full" />
                      </td>
                      <td className="px-4 py-3">
                        <SkeletonLoader height="h-4" width="w-16" />
                      </td>
                      <td className="px-4 py-3">
                        <SkeletonLoader height="h-6" width="w-12" className="rounded-full" />
                      </td>
                    </tr>
                  ))
                ) : (
                  <>
                    {filteredItems.map((item, index) => renderTableRow(item, index))}
                    {filteredItems.length === 0 && (
                      <tr>
                        <td colSpan={type === 'canvassing-approval' ? '6' : '6'} className="text-xs px-4 py-12 text-center">
                          <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                            No {type === 'purchase-request' ? 'purchase requests' : type === 'canvassing-approval' ? 'canvassing items' : 'request evaluations'} found
                          </p>
                        </td>
                      </tr>
                    )}
                  </>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer */}
        <div className={`px-2 sm:px-4 lg:px-8 py-3 sm:py-4 border-t ${darkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-gray-50'} flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 sm:gap-0`}>
          <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            Double-click on a row to view details and take actions
          </p>
          <div className="flex gap-2">
            <span className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              {filteredItems.length} of {items.length} {type === 'purchase-request' ? 'requests' : type === 'canvassing-approval' ? 'canvassing items' : 'evaluations'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
