'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
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
  getAllCanvassingItems,
  approveCanvassingItem,
  rejectCanvassingItem
} from './_actions';
import ItemDetailsModal from './_components/ItemDetailsModal';
import SearchModal from '@/app/(main)/_components/SearchModal';
import Pagination from '@/app/(main)/_components/Pagination';
import {
  IconView,
  IconCheck,
  IconX,
  IconSearch,
  IconCheckCircle,
  IconChevronDown,
  IconFilter
} from './_components/iconsComponents';
import getStatusColor from '@/utils/statusColor';


function CanvassApprovalContent() {
  const { darkMode, user } = useAuth();

  const [canvassingItems, setCanvassingItems] = useState([]);
  const [allItems, setAllItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [currentView, setCurrentView] = useState('dashboard');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState({ title: '', message: '' });
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [showApproveConfirmModal, setShowApproveConfirmModal] = useState(false);
  const [showRejectConfirmModal, setShowRejectConfirmModal] = useState(false);
  const [pendingApproveItem, setPendingApproveItem] = useState(null);
  const [pendingRejectItem, setPendingRejectItem] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);
  const [expandedRids, setExpandedRids] = useState({});
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  // Toggle accordion
  const toggleRid = (rid) => {
    setExpandedRids(prev => ({
      ...prev,
      [rid]: !prev[rid]
    }));
  };

  // Function to reload canvassing items data without page refresh
  const reloadCanvassingItemsData = async () => {
    try {
      const data = await getAllCanvassingItems(user);
      if (data.success) {
        // Store all items for stats calculation
        setAllItems(data.items);

        // Get RIDs that exist in QUOTATIONAPPROVALSTATUS (have APPROVED or REJECTED status)
        const ridsWithApproval = [...new Set(
          data.items
            .filter(item => item.status === 'APPROVED' || item.status === 'REJECTED')
            .map(item => item.rid)
        )];

        // Only show items where RID does NOT exist in QUOTATIONAPPROVALSTATUS
        // (i.e., only show items that have never been approved or rejected)
        const pendingItems = data.items.filter(item =>
          item.status === 'PENDING' && !ridsWithApproval.includes(item.rid)
        );
        setCanvassingItems(pendingItems);
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
        const result = await getAllCanvassingItems(user);
        if (result.success) {
          // Store all items for stats calculation
          setAllItems(result.items);

          // Get RIDs that exist in QUOTATIONAPPROVALSTATUS (have APPROVED or REJECTED status)
          const ridsWithApproval = [...new Set(
            result.items
              .filter(item => item.status === 'APPROVED' || item.status === 'REJECTED')
              .map(item => item.rid)
          )];

          // Only show items where RID does NOT exist in QUOTATIONAPPROVALSTATUS
          // (i.e., only show items that have never been approved or rejected)
          const pendingItems = result.items.filter(item =>
            item.status === 'PENDING' && !ridsWithApproval.includes(item.rid)
          );
          setCanvassingItems(pendingItems);
        }
      } catch (error) {
        console.error('Failed to load canvassing items:', error);
      } finally {
        setLoading(false);
      }
    };

    loadCanvassingItems();
  }, [user?.empName]);

  // Update expandedRids whenever canvassingItems changes
  useEffect(() => {
    if (canvassingItems.length > 0) {
      const uniqueRids = [...new Set(canvassingItems.map(item => item.rid || 'UNKNOWN'))];
      const expanded = {};
      uniqueRids.forEach(rid => {
        expanded[rid] = true;
      });
      setExpandedRids(expanded);
    }
  }, [canvassingItems]);


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



  // Calculate stats from all items
  const stats = {
    pending: allItems.filter(item => item.status === 'PENDING').length,
    approved: allItems.filter(item => item.status === 'APPROVED').length,
    rejected: allItems.filter(item => item.status === 'REJECTED').length,
    total: allItems.length
  };

  // Filter and sort canvassing items
  const filteredItems = canvassingItems
    .filter(item => {
      const matchesSearch = searchQuery === '' ||
        [item.rid, item.prCode, item.pqCode, item.itemNumber, item.itemDescription, item.createdBy, item.vendorName, item.status, item.approvedBy, item.approvalRemarks].some(field =>
          field?.toString().toLowerCase().includes(searchQuery.toLowerCase())
        );

      const matchesStatus = filterStatus === '' || filterStatus === 'all' ||
        item.status === filterStatus;

      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      if (sortBy === 'date') {
        return new Date(b.dateRequested) - new Date(a.dateRequested);
      } else if (sortBy === 'requester') {
        return a.createdBy.localeCompare(b.createdBy);
      } else if (sortBy === 'status') {
        return a.status.localeCompare(b.status);
      } else if (sortBy === 'reference') {
        return a.pqCode.localeCompare(b.pqCode);
      }
      return 0;
    });

  // Group items by rid
  const groupedItems = filteredItems.reduce((acc, item) => {
    const rid = item.rid || 'UNKNOWN';
    if (!acc[rid]) {
      acc[rid] = [];
    }
    acc[rid].push(item);
    return acc;
  }, {});

  // Get unique rids sorted in ascending order
  const uniqueRids = Object.keys(groupedItems).sort((a, b) => Number(a) - Number(b));

  // Pagination handlers
  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  const handleItemsPerPageChange = (newItemsPerPage) => {
    setItemsPerPage(newItemsPerPage);
    setCurrentPage(1); // Reset to first page when changing items per page
  };

  // Calculate paginated accordions (RID groups)
  const totalPages = Math.ceil(uniqueRids.length / itemsPerPage);
  const paginatedRids = uniqueRids.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Real-time updates from canvassing page and approval actions
  useSocketMultiple("canvass-approval-broadcast", {
    "canvass-posted": useCallback(
      (data) => {
        console.log("Canvass posted event received:", data);
        reloadCanvassingItemsData();
      },
      []
    ),
    "canvass-approved": useCallback(
      (data) => {
        console.log("Canvass approved event received:", data);
        reloadCanvassingItemsData();
      },
      []
    ),
    "canvass-rejected": useCallback(
      (data) => {
        console.log("Canvass rejected event received:", data);
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

      <div className="flex-1 overflow-y-auto pt-14 pb-6">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 py-4 sm:py-6">

          {/* Header Section - Modern & Clean */}
          <div className="mb-6 sm:mb-8">
            <div className={`relative overflow-hidden rounded-2xl ${darkMode ? 'bg-gradient-to-br from-gray-800 to-gray-900' : 'bg-gradient-to-br from-blue-600 to-blue-800'} p-5 sm:p-8 shadow-xl`}>
              {/* Decorative circles */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2"></div>
              <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full translate-y-1/2 -translate-x-1/2"></div>

              <div className="relative z-10">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-2 tracking-tight">
                      Canvass Evaluation
                    </h1>
                    <p className="text-blue-100 text-sm sm:text-lg max-w-xl">
                      Review and evaluate canvasses per purchase request.
                    </p>
                  </div>
                  <div className="hidden sm:flex items-center gap-3">
                    <div className="bg-white/20 backdrop-blur-sm rounded-xl px-4 py-3">
                      <div className="text-2xl font-bold text-white">{uniqueRids.length}</div>
                      <div className="text-blue-100 text-xs uppercase tracking-wider">Pending</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Main Content Area */}
          {currentView === 'dashboard' && (
            <div className={`rounded-2xl shadow-lg overflow-hidden ${darkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'}`}>
              {/* Filter Section */}
              <div className={`${darkMode ? 'bg-gray-800 border-b border-gray-700' : 'bg-gray-50 border-b border-gray-200'} px-4 sm:px-6 py-4`}>
                {/* Mobile Filter Toggle */}
                <div className="sm:hidden">
                  <button
                    onClick={() => setShowMobileFilters(!showMobileFilters)}
                    className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border ${darkMode ? 'border-gray-600 bg-gray-700 text-white' : 'border-gray-300 bg-white text-gray-900'} transition-colors`}
                  >
                    <div className="flex items-center gap-2">
                      <IconFilter className="w-5 h-5" />
                      <span className="font-medium">Filters & Search</span>
                      {(searchQuery || sortBy || filterStatus) && (
                        <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                      )}
                    </div>
                    <IconChevronDown className={`w-5 h-5 transition-transform ${showMobileFilters ? 'rotate-180' : ''}`} />
                  </button>
                </div>

                {/* Filter Content */}
                <div className={`${showMobileFilters ? 'block' : 'hidden'} sm:block mt-4 sm:mt-0`}>
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="flex items-center gap-2">
                      <h2 className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                        Canvasses for Approval
                      </h2>
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${darkMode ? 'bg-blue-900/50 text-blue-300' : 'bg-blue-100 text-blue-700'}`}>
                        {uniqueRids.length} {uniqueRids.length === 1 ? 'group' : 'groups'}
                      </span>
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${darkMode ? 'bg-yellow-900/50 text-yellow-300' : 'bg-yellow-100 text-yellow-700'}`}>
                        Review ({filteredItems.length})
                      </span>
                    </div>
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:space-x-3">
                      {/* Search Input */}
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <IconSearch className={`h-4 w-4 ${darkMode ? 'text-gray-400' : 'text-gray-400'}`} />
                        </div>
                        <input
                          type="text"
                          placeholder="Search items, vendors..."
                          value={searchQuery}
                          onChange={(e) => {
                            setSearchQuery(e.target.value);
                            setCurrentPage(1);
                          }}
                          className={`w-full sm:w-56 lg:w-64 pl-10 pr-4 py-2.5 text-sm border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${darkMode
                            ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                            : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'}`}
                        />
                      </div>

                      {/* Sort Dropdown */}
                      <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value)}
                        className={`px-4 py-2.5 text-sm border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all cursor-pointer ${darkMode
                          ? 'bg-gray-700 border-gray-600 text-white'
                          : 'bg-white border-gray-300 text-gray-900'}`}
                      >
                        <option value="">Sort by...</option>
                        <option value="date">Date</option>
                        <option value="requester">Requester</option>
                        <option value="status">Status</option>
                      </select>

                      {/* Clear Filters */}
                      {(searchQuery || sortBy || filterStatus) && (
                        <button
                          onClick={() => {
                            setSearchQuery('');
                            setSortBy('');
                            setFilterStatus('');
                            setCurrentPage(1);
                          }}
                          className={`px-3 py-2 text-sm font-medium rounded-xl transition-colors ${darkMode
                            ? 'text-gray-300 hover:bg-gray-600'
                            : 'text-gray-600 hover:bg-gray-100'}`}
                        >
                          Clear
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto p-4">
                {uniqueRids.length > 0 ? (
                  <div className="space-y-4">
                    {paginatedRids.map((rid) => (
                      <div key={rid} className={`rounded-xl border overflow-hidden transition-all duration-300 ${darkMode ? 'bg-gray-800 border-gray-700 shadow-lg shadow-black/20' : 'bg-white border-gray-200 shadow-md'}`}>
                        {/* Accordion Header - Enhanced Design */}
                        <button
                          onClick={() => toggleRid(rid)}
                          className={`w-full px-4 sm:px-6 py-4 sm:py-5 flex items-center justify-between ${darkMode ? 'hover:bg-gray-700/70' : 'hover:bg-gray-50'} transition-all duration-200 active:scale-[0.99]`}
                        >
                          <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1">
                            {/* RID Badge - More Prominent */}
                            <div className={`flex-shrink-0 w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center shadow-sm ${darkMode ? 'bg-gradient-to-br from-blue-600 to-blue-800' : 'bg-gradient-to-br from-blue-500 to-blue-700'}`}>
                              <span className="text-xs sm:text-sm font-bold text-white">
                                {rid.length > 4 ? rid.substring(0, 3) : rid}
                              </span>
                            </div>

                            {/* Content - Better Typography Hierarchy */}
                            <div className="text-left min-w-0 flex-1">
                              <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
                                <span className={`text-base sm:text-lg font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                                  Request ID: {rid}
                                </span>
                                {/* Item Count Badge */}
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-lg text-xs font-semibold w-fit ${darkMode ? 'bg-blue-900/60 text-blue-300 border border-blue-700' : 'bg-blue-100 text-blue-700 border border-blue-200'}`}>
                                  <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                    <path d="M7 3a1 1 0 000 2h6a1 1 0 100-2H7zM4 7a1 1 0 011-1h10a1 1 0 110 2H5a1 1 0 01-1-1zM2 11a2 2 0 012-2h12a2 2 0 012 2v4a2 2 0 01-2 2H4a2 2 0 01-2-2v-4z" />
                                  </svg>
                                  {groupedItems[rid].length} {groupedItems[rid].length === 1 ? 'canvass' : 'canvasses'}
                                </span>
                              </div>

                              {/* Item Description - Hidden on mobile, visible on desktop */}
                              <div className={`hidden sm:block text-xs sm:text-sm mt-1.5 font-medium line-clamp-1 ${darkMode ? 'text-blue-300' : 'text-blue-700'}`}>
                                {groupedItems[rid][0]?.itemDescription || 'No description'}
                              </div>

                              {/* Requester & Canvassed Info */}
                              <div className={`text-xs mt-1 ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                                <span>{groupedItems[rid][0]?.quantity} {groupedItems[rid][0]?.unitOfMeasure}</span>
                                <span className="mx-1.5">•</span>
                                <span className={`${darkMode ? 'text-blue-400' : 'text-blue-600'}`}>PR By: {groupedItems[rid][0]?.requestedBy || 'N/A'}</span>
                                <span className="mx-1.5">•</span>
                                <span className={`${darkMode ? 'text-green-400' : 'text-green-600'}`}>Canvassed by: {groupedItems[rid][0]?.createdBy || 'N/A'}</span>
                              </div>
                            </div>
                          </div>

                          {/* Expand/Collapse Indicator - More Prominent */}
                          <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                            <span className={`hidden sm:inline text-xs font-medium px-2 py-1 rounded-md ${expandedRids[rid] ? (darkMode ? 'bg-green-900/50 text-green-400' : 'bg-green-100 text-green-700') : (darkMode ? 'bg-gray-700 text-gray-400' : 'bg-gray-100 text-gray-600')}`}>
                              {expandedRids[rid] ? 'Expanded' : 'Collapsed'}
                            </span>
                            <div className={`p-2 rounded-lg transition-all duration-300 ${expandedRids[rid] ? (darkMode ? 'bg-blue-600 text-white rotate-180' : 'bg-blue-600 text-white rotate-180') : (darkMode ? 'bg-gray-700 text-gray-400' : 'bg-gray-200 text-gray-500')}`}>
                              <IconChevronDown
                                className={`w-4 h-4 sm:w-5 sm:h-5 transform transition-transform duration-300 ${expandedRids[rid] ? 'rotate-180' : ''}`}
                              />
                            </div>
                          </div>
                        </button>

                        {/* Accordion Content - Enhanced Design */}
                        {expandedRids[rid] && (
                          <div className={`border-t ${darkMode ? 'border-gray-700 bg-gray-800/50' : 'border-gray-200 bg-gray-50/50'} transition-all duration-300 ease-out`}>
                            {/* Desktop Table View - Enhanced */}
                            <div className="hidden lg:block overflow-x-auto">
                              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                                <thead className={`${darkMode ? 'bg-gray-700/30' : 'bg-gray-100'}`}>
                                  <tr>
                                    <th className={`px-6 py-4 text-left text-xs font-bold uppercase tracking-wider ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                                      <div className="flex items-center gap-2">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                        </svg>
                                        Supplier
                                      </div>
                                    </th>
                                    <th className={`px-6 py-4 text-right text-xs font-bold uppercase tracking-wider ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                                      <div className="flex items-center justify-end gap-2">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        Agreed Price / U of M
                                      </div>
                                    </th>
                                    <th className={`px-6 py-4 text-center text-xs font-bold uppercase tracking-wider ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                                      <div className="flex items-center justify-center gap-2">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                        </svg>
                                        Canvassed Date
                                      </div>
                                    </th>
                                    <th className={`px-6 py-4 text-center text-xs font-bold uppercase tracking-wider ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                                      <div className="flex items-center justify-center gap-2">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                        </svg>
                                        Actions
                                      </div>
                                    </th>
                                  </tr>
                                </thead>
                                <tbody className={`${darkMode ? 'bg-gray-800 divide-gray-700' : 'bg-white divide-gray-200'}`}>
                                  {groupedItems[rid].map((item, index) => (
                                    <tr key={item.id || `${item.pqCode}-${index}`} className={`${darkMode ? 'hover:bg-gray-700/60' : 'hover:bg-blue-50/70'} transition-all duration-200 group`}>

                                      <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center gap-3">
                                          <div className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                                            <span className={`text-xs font-bold ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                              {index + 1}
                                            </span>
                                          </div>
                                          <div className={`text-sm font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                                            {item.vendorName || 'N/A'}
                                          </div>
                                        </div>
                                      </td>
                                      <td className="px-6 py-4 whitespace-nowrap text-right">
                                        <div className={`text-sm font-bold ${darkMode ? 'text-green-400' : 'text-green-600'}`}>
                                          ₱{item.finalPrice ? item.finalPrice.toLocaleString() : '0'}<span className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}> / {item.unitOfMeasure}
                                          </span>
                                        </div>
                                      </td>
                                      <td className="px-6 py-4 whitespace-nowrap text-center">
                                        <div className={`inline-flex items-center px-3 py-1 rounded-lg text-xs font-medium ${darkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600'}`}>
                                          <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                          </svg>
                                          {new Date(item.dateRequested).toISOString().split('T')[0]}
                                        </div>
                                      </td>
                                      <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                                        <div className="flex items-center justify-center gap-1">
                                          <button
                                            onClick={() => {
                                              setSelectedItem(item);
                                              setShowDetailsModal(true);
                                            }}
                                            className={`p-2.5 rounded-xl transition-all duration-200 ${darkMode ? 'text-blue-400 hover:bg-blue-900/50' : 'text-blue-600 hover:bg-blue-50'} hover:scale-110 active:scale-95`}
                                            title="View Details"
                                          >
                                            <IconView className="w-4 h-4" />
                                          </button>
                                          {item.status === 'PENDING' && (
                                            <>
                                              <button
                                                onClick={() => handleApproveClick(item)}
                                                disabled={isProcessing}
                                                className={`p-2.5 rounded-xl transition-all duration-200 ${darkMode ? 'text-green-400 hover:bg-green-900/50' : 'text-green-600 hover:bg-green-50'} hover:scale-110 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100`}
                                                title="Approve"
                                              >
                                                <IconCheck className="w-4 h-4" />
                                              </button>
                                              <button
                                                onClick={() => handleRejectClick(item)}
                                                disabled={isProcessing}
                                                className={`p-2.5 rounded-xl transition-all duration-200 ${darkMode ? 'text-red-400 hover:bg-red-900/50' : 'text-red-600 hover:bg-red-50'} hover:scale-110 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100`}
                                                title="Reject"
                                              >
                                                <IconX className="w-4 h-4" />
                                              </button>
                                            </>
                                          )}
                                        </div>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>

                            {/* Mobile Card View - Enhanced Design */}
                            <div className="lg:hidden">
                              <div className={`divide-y ${darkMode ? 'divide-gray-700' : 'divide-gray-200'}`}>
                                {groupedItems[rid].map((item, index) => (
                                  <div
                                    key={item.id || `${item.pqCode}-${index}`}
                                    className={`p-4 sm:p-5 ${darkMode ? 'hover:bg-gray-700/30' : 'hover:bg-blue-50/50'} transition-all duration-200`}
                                  >
                                    {/* Card Header - Item Info */}
                                    <div className="flex items-start justify-between gap-3 mb-2">
                                      <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-2 mb-2">
                                          {item.status !== 'PENDING' && (
                                            <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold ${getStatusColor(item.status)}`}>
                                              {item.status}
                                            </span>
                                          )}
                                        </div>
                                        {/* Emphasized Item Description */}
                                        <div className={`text-base font-semibold leading-relaxed ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                                          {item.itemDescription}
                                        </div>
                                      </div>
                                      {/* Price & Quantity - Aligned */}
                                      <div className="flex flex-col items-end gap-1 flex-shrink-0">
                                        <div className="flex items-baseline gap-1">
                                          <span className={`text-xl font-bold ${darkMode ? 'text-green-400' : 'text-green-600'}`}>
                                            ₱{item.finalPrice ? item.finalPrice.toLocaleString() : '0'}
                                          </span>
                                          <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                            / {item.unitOfMeasure}
                                          </span>
                                        </div>
                                        <span className={`text-xs px-2 py-0.5 rounded-md ${darkMode ? 'bg-gray-700 text-gray-400' : 'bg-gray-100 text-gray-600'}`}>
                                          Qty: {item.quantity}
                                        </span>
                                      </div>
                                    </div>

                                    {/* Card Body - Supplier & Date Info */}
                                    <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-3 rounded-lg ${darkMode ? 'bg-gray-700/30' : 'bg-gray-50'} mb-3`}>
                                      <div className="flex flex-col gap-1.5">
                                        <div className={`flex items-center gap-2 text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                          </svg>
                                          <span className={`font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                            {item.vendorName || 'N/A'}
                                          </span>
                                        </div>
                                        <div className={`flex items-center gap-2 text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                          </svg>
                                          <span className={`font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                            {new Date(item.dateRequested).toISOString().split('T')[0]}
                                          </span>
                                        </div>
                                      </div>
                                      {/* Action Buttons - Larger Touch Targets */}
                                      <div className="flex items-center gap-2">
                                        <button
                                          onClick={() => {
                                            setSelectedItem(item);
                                            setShowDetailsModal(true);
                                          }}
                                          className={`flex-1 sm:flex-none px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 flex items-center justify-center gap-2 ${darkMode ? 'bg-blue-900/50 text-blue-300 hover:bg-blue-800/60 border border-blue-700' : 'bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200'} active:scale-95`}
                                          title="View Details"
                                        >
                                          <IconView className="w-4 h-4" />
                                          <span>View</span>
                                        </button>
                                        {item.status === 'PENDING' && (
                                          <>
                                            <button
                                              onClick={() => handleApproveClick(item)}
                                              disabled={isProcessing}
                                              className={`p-2.5 rounded-xl transition-all duration-200 ${darkMode ? 'text-green-400 hover:bg-green-900/50 border border-green-700' : 'text-green-600 hover:bg-green-50 border border-green-200'} hover:scale-105 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100`}
                                              title="Approve"
                                            >
                                              <IconCheck className="w-5 h-5" />
                                            </button>
                                            <button
                                              onClick={() => handleRejectClick(item)}
                                              disabled={isProcessing}
                                              className={`p-2.5 rounded-xl transition-all duration-200 ${darkMode ? 'text-red-400 hover:bg-red-900/50 border border-red-700' : 'text-red-600 hover:bg-red-50 border border-red-200'} hover:scale-105 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100`}
                                              title="Reject"
                                            >
                                              <IconX className="w-5 h-5" />
                                            </button>
                                          </>
                                        )}
                                      </div>
                                    </div>

                                    {/* Approval Info Footer */}
                                    {item.status === 'APPROVED' && item.approvedBy && (
                                      <div className={`flex items-center gap-2 text-xs mt-3 pt-3 border-t ${darkMode ? 'text-green-400 border-gray-700' : 'text-green-600 border-gray-200'}`}>
                                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                        </svg>
                                        <span className="font-medium">Approved by {item.approvedBy}</span>
                                      </div>
                                    )}
                                    {item.status === 'REJECTED' && item.approvalRemarks && (
                                      <div className={`flex items-start gap-2 text-xs mt-3 pt-3 border-t ${darkMode ? 'text-red-400 border-gray-700' : 'text-red-600 border-gray-200'}`}>
                                        <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                        </svg>
                                        <span><span className="font-medium">Reason:</span> {item.approvalRemarks}</span>
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-16 px-4">
                    <div className={`w-20 h-20 mx-auto mb-4 rounded-full flex items-center justify-center ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                      <IconCheckCircle className={`w-10 h-10 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`} />
                    </div>
                    <h3 className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-900'} mb-2`}>
                      All caught up!
                    </h3>
                    <p className={`text-sm max-w-sm mx-auto ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      No items pending approval. All canvassing items have been processed.
                    </p>
                  </div>
                )}
              </div>

              {/* Pagination */}
              {uniqueRids.length > 0 && (
                <div className={`px-4 sm:px-6 py-4 border-t ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                  <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    totalItems={uniqueRids.length}
                    itemsPerPage={itemsPerPage}
                    onPageChange={handlePageChange}
                    onItemsPerPageChange={handleItemsPerPageChange}
                  />
                </div>
              )}
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
      <ItemDetailsModal
        isOpen={showDetailsModal}
        onClose={() => {
          setShowDetailsModal(false);
          setSelectedItem(null);
        }}
        pqCode={selectedItem?.pqCode}
        selectedItem={selectedItem}
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

      {/* Search Modal */}
      <SearchModal
        isOpen={showSearchModal}
        onClose={() => setShowSearchModal(false)}
        onSelect={(item) => {
          setSelectedItem(item);
          setShowDetailsModal(true);
          setShowSearchModal(false);
        }}
        darkMode={darkMode}
        type="canvassing-approval"
      />

      {/* Floating Action Button - Search */}
      <button
        onClick={() => setShowSearchModal(true)}
        className="fixed bottom-6 right-6 z-50 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white p-4 rounded-full shadow-xl hover:shadow-2xl transform hover:scale-110 transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-blue-500/30 backdrop-blur-sm"
        title="Search Canvassing Items"
      >
        <IconSearch className="w-6 h-6" />
      </button>

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
