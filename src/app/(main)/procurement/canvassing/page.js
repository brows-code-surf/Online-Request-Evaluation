'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../../../utils/authContext';
import ProtectedRoute from '@/utils/protectedRoute';
import HeaderNavBar from '@/app/_components/headerNavBar';
import SuccessModal from '@/app/(main)/_components/successModal';
import ConfirmModal from '@/app/(main)/_components/confirmModal';
import Loader from '@/app/_components/loader';
import CreateCanvassingModal from './_components/CreateCanvassingModal';
import CanvassingDetailsModal from './_components/CanvassingDetailsModal';
import { ToastContainer, toast } from 'react-toastify';
import {
  getAllCanvassingRequests,
  postCanvassingRequest,
  deleteCanvassingRequest,
  getCanvassingStats
} from './_actions';

function CanvassingContent() {
  const { darkMode, user, isAdmin } = useAuth();
  const loadingRef = useRef(false);

  const [canvassingRequests, setCanvassingRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState({ title: '', message: '' });
  const [currentView, setCurrentView] = useState('dashboard'); // 'dashboard', 'list', 'create'
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedPQCode, setSelectedPQCode] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);

  // Stats from server
  const [stats, setStats] = useState({
    postStatus: {},
    approvalStatus: {},
    total: 0
  });

  // Confirmation modal states
  const [showPostConfirmModal, setShowPostConfirmModal] = useState(false);
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
  const [pendingPostPQCode, setPendingPostPQCode] = useState(null);
  const [pendingDeletePQCode, setPendingDeletePQCode] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Filter states
  const [statusFilter, setStatusFilter] = useState('all');
  const [postStatusFilter, setPostStatusFilter] = useState('all');

  // Quick filter options
  const statusFilters = [
    { value: 'all', label: 'All Status' },
    { value: 'PENDING', label: 'Pending' },
    { value: 'SELECTED', label: 'Selected' },
    { value: 'NOT SELECTED', label: 'Not Selected' },
    { value: 'REJECTED', label: 'Rejected' },
  ];

  const postStatusFilters = [
    { value: 'all', label: 'All Post Status' },
    { value: '0', label: 'Not Posted' },
    { value: '1', label: 'Posted' },
  ];

  // Filter canvassing requests based on search term and filters
  const filteredCanvassingRequests = canvassingRequests.filter((request) => {
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = !searchTerm || (
      request.pqCode?.toLowerCase().includes(searchLower) ||
      request.createdBy?.toLowerCase().includes(searchLower) ||
      request.prBy?.toLowerCase().includes(searchLower) ||
      request.prId?.toLowerCase().includes(searchLower) ||
      request.itemDescription?.toLowerCase().includes(searchLower) ||
      request.canvassedBy?.toLowerCase().includes(searchLower)
    );

    const matchesStatusFilter = statusFilter === 'all' || request.approvalStatus === statusFilter;
    const matchesPostStatusFilter = postStatusFilter === 'all' ||
      (postStatusFilter === '0' && request.postStatus === 0) ||
      (postStatusFilter === '1' && request.postStatus === 1);

    return matchesSearch && matchesStatusFilter && matchesPostStatusFilter;
  });

  // Pagination calculations
  const totalPages = Math.ceil(filteredCanvassingRequests.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedRequests = filteredCanvassingRequests.slice(startIndex, endIndex);

  // Reset to page 1 when search term changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  // Reset to page 1 when items per page changes
  useEffect(() => {
    setCurrentPage(1);
  }, [itemsPerPage]);

  // Function to reload canvassing requests data without page refresh
  const reloadCanvassingRequestsData = async () => {
    try {
      const filters = {};
      const adminStatus = isAdmin ? isAdmin() : false;
      const data = await getAllCanvassingRequests(filters, user, adminStatus);
      if (data.success) {
        setCanvassingRequests(data.canvassingRequests);
        return { success: true };
      }
      return { success: false };
    } catch (error) {
      console.error('Failed to reload canvassing requests:', error);
      return { success: false };
    }
  };

  // Function to reload stats data without page refresh
  const reloadStatsData = async () => {
    try {
      const result = await getCanvassingStats(user);
      if (result.success) {
        setStats(result.stats);
        return { success: true };
      }
      return { success: false };
    } catch (error) {
      console.error('Failed to reload stats:', error);
      return { success: false };
    }
  };

  useEffect(() => {
    const loadCanvassingRequests = async () => {
      if (!user?.empName) return;

      setLoading(true);
      try {
        const result = await getAllCanvassingRequests({}, user, isAdmin ? isAdmin() : false);
        if (result.success) {
          setCanvassingRequests(result.canvassingRequests);
        }
      } catch (error) {
        console.error('Failed to load canvassing requests:', error);
      } finally {
        setLoading(false);
      }
    };

    const loadStats = async () => {
      if (!user?.empName) return;

      try {
        const result = await getCanvassingStats(user);
        if (result.success) {
          setStats(result.stats);
        }
      } catch (error) {
        console.error('Failed to load stats:', error);
      }
    };

    loadCanvassingRequests();
    loadStats();
  }, [user?.empName]);

  // Confirmation modal handlers
  const handlePostClick = (pqCode) => {
    setPendingPostPQCode(pqCode);
    setShowPostConfirmModal(true);
  };

  const handleDeleteClick = (pqCode) => {
    setPendingDeletePQCode(pqCode);
    setShowDeleteConfirmModal(true);
  };

  const handleConfirmPost = async () => {
    if (!pendingPostPQCode) return;

    setIsProcessing(true);
    setShowPostConfirmModal(false);

    try {
      const result = await postCanvassingRequest(pendingPostPQCode, user?.empName);
      if (result.success) {
        setSuccessMessage({
          title: 'Canvassing Request Posted',
          message: 'The canvassing request has been posted successfully.'
        });
        setShowSuccessModal(true);
        await reloadCanvassingRequestsData();
      } else {
        toast.error('Failed to post canvassing request: ' + result.message);
      }
    } catch (error) {
      console.error('Error posting canvassing request:', error);
      toast.error('Failed to post canvassing request');
    } finally {
      setIsProcessing(false);
      setPendingPostPQCode(null);
    }
  };

  const handleConfirmDelete = async () => {
    if (!pendingDeletePQCode) return;

    setIsProcessing(true);
    setShowDeleteConfirmModal(false);

    try {
      const result = await deleteCanvassingRequest(pendingDeletePQCode, user?.empName);
      if (result.success) {
        setSuccessMessage({
          title: 'Canvassing Request Deleted',
          message: 'The canvassing request has been deleted successfully.'
        });
        setShowSuccessModal(true);
        await reloadCanvassingRequestsData();
      } else {
        toast.error('Failed to delete canvassing request: ' + result.message);
      }
    } catch (error) {
      console.error('Error deleting canvassing request:', error);
      toast.error('Failed to delete canvassing request');
    } finally {
      setIsProcessing(false);
      setPendingDeletePQCode(null);
    }
  };

  const handleCancelPost = () => {
    setShowPostConfirmModal(false);
    setPendingPostPQCode(null);
  };

  const handleCancelDelete = () => {
    setShowDeleteConfirmModal(false);
    setPendingDeletePQCode(null);
  };

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
        <div className="w-full mx-auto p-3 sm:p-4 md:p-6">

          {/* Header Section */}
          <div className={`mb-8 rounded-2xl ${darkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'} shadow-lg relative overflow-hidden`}>
            {/* Decorative gradient background */}
            {/* <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500`}></div> */}

            <div className="p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex-1">
                  <h1 className={`text-xl sm:text-2xl font-bold ${darkMode ? 'text-white' : 'text-blue-900'} mb-1`}>
                    Canvass of Quotation
                  </h1>
                </div>

                {/* Floating Action Button */}
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="group bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl font-medium transition-all duration-200 flex items-center space-x-2 shadow-lg hover:shadow-xl transform hover:scale-105 hover:-translate-y-0.5 w-full sm:w-auto justify-center"
                >
                  <svg className="w-5 h-5 group-hover:rotate-90 transition-transform duration-200 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  <span className="whitespace-nowrap">New Canvass of Quotation</span>
                </button>
              </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4 px-4 sm:px-6 pb-6">
              <button
                onClick={() => { setStatusFilter('all'); setPostStatusFilter('all'); setSearchTerm(''); }}
                className={`group rounded-xl p-3 sm:p-4 text-left transition-all duration-300 hover:shadow-lg hover:-translate-y-1 w-full ${darkMode ? 'bg-gray-700/50 border border-gray-600' : 'bg-white border border-gray-200 shadow-sm'} ${statusFilter === 'all' && postStatusFilter === 'all' ? 'ring-2 ring-indigo-500' : ''}`}
              >
                <div className="flex items-center justify-between mb-2 sm:mb-3">
                  <div className={`p-2 rounded-lg shadow-md group-hover:scale-110 transition-transform duration-300 ${statusFilter === 'all' && postStatusFilter === 'all' ? 'bg-gradient-to-br from-indigo-500 to-purple-600' : 'bg-gradient-to-br from-blue-500 to-blue-600'}`}>
                    <svg className="w-4 sm:w-5 h-4 sm:h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <svg className={`w-3 h-3 sm:w-4 sm:h-4 ${darkMode ? 'text-gray-500' : 'text-gray-400'} group-hover:text-indigo-500 transition-colors hidden sm:block`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </div>
                <p className={`text-xs font-bold uppercase tracking-wider ${darkMode ? 'text-gray-400' : 'text-gray-500'} mb-0.5 sm:mb-1`}>All</p>
                <p className={`text-2xl sm:text-3xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{canvassingRequests.length}</p>
              </button>

              <button
                onClick={() => { setPostStatusFilter(postStatusFilter === '0' ? 'all' : '0'); setStatusFilter('all'); }}
                className={`group rounded-xl p-3 sm:p-4 text-left transition-all duration-300 hover:shadow-lg hover:-translate-y-1 w-full ${darkMode ? 'bg-gray-700/50 border border-gray-600' : 'bg-white border border-gray-200 shadow-sm'} ${postStatusFilter === '0' ? 'ring-2 ring-yellow-500' : ''}`}
              >
                <div className="flex items-center justify-between mb-2 sm:mb-3">
                  <div className={`p-2 rounded-lg shadow-md group-hover:scale-110 transition-transform duration-300 ${postStatusFilter === '0' ? 'bg-gradient-to-br from-yellow-400 to-orange-500' : 'bg-gradient-to-br from-yellow-400 to-yellow-500'}`}>
                    <svg className="w-4 sm:w-5 h-4 sm:h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                  </div>
                  <svg className={`w-3 h-3 sm:w-4 sm:h-4 ${darkMode ? 'text-gray-500' : 'text-gray-400'} group-hover:text-yellow-500 transition-colors hidden sm:block`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                </div>
                <p className={`text-xs font-bold uppercase tracking-wider ${darkMode ? 'text-gray-400' : 'text-gray-500'} mb-0.5 sm:mb-1`}>Not Posted</p>
                <p className={`text-2xl sm:text-3xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  {canvassingRequests.filter(cr => cr.postStatus === 0).length}
                </p>
              </button>

              <button
                onClick={() => { setStatusFilter(statusFilter === 'PENDING' ? 'all' : 'PENDING'); setPostStatusFilter('all'); }}
                className={`group rounded-xl p-3 sm:p-4 text-left transition-all duration-300 hover:shadow-lg hover:-translate-y-1 w-full ${darkMode ? 'bg-gray-700/50 border border-gray-600' : 'bg-white border border-gray-200 shadow-sm'} ${statusFilter === 'PENDING' ? 'ring-2 ring-amber-500' : ''}`}
              >
                <div className="flex items-center justify-between mb-2 sm:mb-3">
                  <div className={`p-2 rounded-lg shadow-md group-hover:scale-110 transition-transform duration-300 ${statusFilter === 'PENDING' ? 'bg-gradient-to-br from-amber-400 to-amber-600' : 'bg-gradient-to-br from-amber-500 to-orange-500'}`}>
                    <svg className="w-4 sm:w-5 h-4 sm:h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <svg className={`w-3 h-3 sm:w-4 sm:h-4 ${darkMode ? 'text-gray-500' : 'text-gray-400'} group-hover:text-amber-500 transition-colors hidden sm:block`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <p className={`text-xs font-bold uppercase tracking-wider ${darkMode ? 'text-gray-400' : 'text-gray-500'} mb-0.5 sm:mb-1`}>Pending</p>
                <p className={`text-2xl sm:text-3xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  {canvassingRequests.filter(cr => cr.approvalStatus === 'PENDING').length}
                </p>
              </button>

              <button
                onClick={() => { setStatusFilter(statusFilter === 'SELECTED' ? 'all' : 'SELECTED'); setPostStatusFilter('all'); }}
                className={`group rounded-xl p-3 sm:p-4 text-left transition-all duration-300 hover:shadow-lg hover:-translate-y-1 w-full ${darkMode ? 'bg-gray-700/50 border border-gray-600' : 'bg-white border border-gray-200 shadow-sm'} ${statusFilter === 'SELECTED' ? 'ring-2 ring-emerald-500' : ''}`}
              >
                <div className="flex items-center justify-between mb-2 sm:mb-3">
                  <div className={`p-2 rounded-lg shadow-md group-hover:scale-110 transition-transform duration-300 ${statusFilter === 'SELECTED' ? 'bg-gradient-to-br from-emerald-400 to-green-600' : 'bg-gradient-to-br from-emerald-500 to-green-500'}`}>
                    <svg className="w-4 sm:w-5 h-4 sm:h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <svg className={`w-3 h-3 sm:w-4 sm:h-4 ${darkMode ? 'text-gray-500' : 'text-gray-400'} group-hover:text-emerald-500 transition-colors hidden sm:block`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <p className={`text-xs font-bold uppercase tracking-wider ${darkMode ? 'text-gray-400' : 'text-gray-500'} mb-0.5 sm:mb-1`}>Selected</p>
                <p className={`text-2xl sm:text-3xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  {stats.approvalStatus['SELECTED'] || 0}
                </p>
              </button>

              <button
                onClick={() => { setStatusFilter(statusFilter === 'NOT SELECTED' ? 'all' : 'NOT SELECTED'); setPostStatusFilter('all'); }}
                className={`group rounded-xl p-3 sm:p-4 text-left transition-all duration-300 hover:shadow-lg hover:-translate-y-1 w-full ${darkMode ? 'bg-gray-700/50 border border-gray-600' : 'bg-white border border-gray-200 shadow-sm'} ${statusFilter === 'NOT SELECTED' ? 'ring-2 ring-orange-500' : ''}`}
              >
                <div className="flex items-center justify-between mb-2 sm:mb-3">
                  <div className={`p-2 rounded-lg shadow-md group-hover:scale-110 transition-transform duration-300 ${statusFilter === 'NOT SELECTED' ? 'bg-gradient-to-br from-orange-400 to-red-600' : 'bg-gradient-to-br from-orange-500 to-red-500'}`}>
                    <svg className="w-4 sm:w-5 h-4 sm:h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </div>
                  <svg className={`w-3 h-3 sm:w-4 sm:h-4 ${darkMode ? 'text-gray-500' : 'text-gray-400'} group-hover:text-orange-500 transition-colors hidden sm:block`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                  </svg>
                </div>
                <p className={`text-xs font-bold uppercase tracking-wider ${darkMode ? 'text-gray-400' : 'text-gray-500'} mb-0.5 sm:mb-1`}>Not Selected</p>
                <p className={`text-2xl sm:text-3xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  {stats.approvalStatus['NOT SELECTED'] || 0}
                </p>
              </button>

              <button
                onClick={() => { setStatusFilter(statusFilter === 'REJECTED' ? 'all' : 'REJECTED'); setPostStatusFilter('all'); }}
                className={`group rounded-xl p-3 sm:p-4 text-left transition-all duration-300 hover:shadow-lg hover:-translate-y-1 w-full ${darkMode ? 'bg-gray-700/50 border border-gray-600' : 'bg-white border border-gray-200 shadow-sm'} ${statusFilter === 'REJECTED' ? 'ring-2 ring-rose-500' : ''}`}
              >
                <div className="flex items-center justify-between mb-2 sm:mb-3">
                  <div className={`p-2 rounded-lg shadow-md group-hover:scale-110 transition-transform duration-300 ${statusFilter === 'REJECTED' ? 'bg-gradient-to-br from-rose-400 to-red-700' : 'bg-gradient-to-br from-red-500 to-rose-600'}`}>
                    <svg className="w-4 sm:w-5 h-4 sm:h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <svg className={`w-3 h-3 sm:w-4 sm:h-4 ${darkMode ? 'text-gray-500' : 'text-gray-400'} group-hover:text-rose-500 transition-colors hidden sm:block`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <p className={`text-xs font-bold uppercase tracking-wider ${darkMode ? 'text-gray-400' : 'text-gray-500'} mb-0.5 sm:mb-1`}>Rejected</p>
                <p className={`text-2xl sm:text-3xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  {stats.approvalStatus['REJECTED'] || 0}
                </p>
              </button>
            </div>
          </div>

          {/* Main Content Area */}
          {currentView === 'dashboard' && (
            <div className={`rounded-2xl shadow-lg overflow-hidden ${darkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'}`}>
              {/* Table Header */}
              <div className={`px-6 py-5 border-b ${darkMode ? 'border-gray-700 bg-gray-800/50' : 'border-gray-200 bg-gray-50'}`}>
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg">
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <div>
                      <h2 className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                        Canvass of Quotation(s) Table
                      </h2>
                      <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        {filteredCanvassingRequests.length} total records
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                    {/* Search Input */}
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="Search..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className={`w-full sm:w-64 pl-10 pr-4 py-2.5 text-sm border rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200 ${darkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'bg-white border-gray-300 placeholder-gray-500'}
                          `}
                      />
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <svg className={`w-4 h-4 ${darkMode ? 'text-gray-400' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                      </div>
                      {searchTerm && (
                        <button
                          onClick={() => setSearchTerm('')}
                          className="absolute inset-y-0 right-0 pr-3 flex items-center"
                        >
                          <svg className={`w-4 h-4 ${darkMode ? 'text-gray-400 hover:text-white' : 'text-gray-400 hover:text-gray-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto">
                {filteredCanvassingRequests.length > 0 ? (
                  <div className="min-w-full">
                    {/* Desktop Table */}
                    <table className="hidden md:table min-w-full divide-y divide-gray-200">
                      <thead className={`${darkMode ? 'bg-gray-750' : 'bg-gray-50'}`}>
                        <tr>
                          <th className={`px-4 py-2 text-left text-xs font-bold uppercase tracking-wider ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                            <span className="hidden sm:inline">PR By</span>
                            <span className="sm:hidden">By</span>
                          </th>
                          <th className={`px-4 py-2 text-left text-xs font-bold uppercase tracking-wider ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                            <span className="hidden sm:inline">PR ID</span>
                            <span className="sm:hidden">ID</span>
                          </th>
                          <th className={`px-4 py-2 text-left text-xs font-bold uppercase tracking-wider ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                            Item
                          </th>
                          <th className={`px-4 py-2 text-left text-xs font-bold uppercase tracking-wider ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                            <span className="hidden md:inline">PR Approval Date</span>
                            <span className="md:hidden">Date</span>
                          </th>
                          <th className={`px-4 py-2 text-left text-xs font-bold uppercase tracking-wider ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                            <span className="hidden lg:inline">Canvassed By</span>
                            <span className="lg:hidden">By</span>
                          </th>
                          <th className={`px-4 py-2 text-left text-xs font-bold uppercase tracking-wider ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                            <span className="hidden lg:inline">CQ ID</span>
                            <span className="lg:hidden">CQ</span>
                          </th>
                          <th className={`px-4 py-2 text-left text-xs font-bold uppercase tracking-wider ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                            <span className="hidden lg:inline">Canvass Post Date</span>
                            <span className="lg:hidden">Post</span>
                          </th>
                          <th className={`px-4 py-2 text-left text-xs font-bold uppercase tracking-wider ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                            Status
                          </th>
                          <th className={`px-4 py-2 text-left text-xs font-bold uppercase tracking-wider ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className={`${darkMode ? 'bg-gray-800 divide-gray-700' : 'bg-white divide-gray-200'}`}>
                        {paginatedRequests.map((request, index) => (
                          <tr key={`${request.pqCode}-${request.prId || index}-${index}`} className={`transition-colors duration-150 ${darkMode ? 'hover:bg-gray-700/70' : 'hover:bg-gray-50'} ${index % 2 === 0 ? (darkMode ? 'bg-gray-800/50' : 'bg-white') : (darkMode ? 'bg-gray-800' : 'bg-gray-50/50')}`}>
                            <td className="px-4 py-3 whitespace-nowrap align-top">
                              <div className={`text-sm font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                                {request.prBy || 'N/A'}
                              </div>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap align-top">
                              <div className={`text-sm font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                                {request.prId || 'N/A'}
                              </div>
                            </td>
                            <td className="px-4 py-3 align-top">
                              <div className={`text-sm ${darkMode ? 'text-white' : 'text-gray-900'} break-words max-w-xs`}>
                                {request.itemDescription || 'N/A'}
                              </div>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap align-top">
                              <div className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                                {request.prApprovalDate ? new Date(request.prApprovalDate).toISOString().split('T')[0] : 'N/A'}
                              </div>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap align-top">
                              <div className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                                {request.canvassedBy || 'N/A'}
                              </div>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap align-top">
                              <div className={`text-sm font-semibold ${darkMode ? 'text-indigo-400' : 'text-indigo-600'}`}>
                                {request.pqCode}
                              </div>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap align-top">
                              <div className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                                {request.postStatus === 0 ? '-' : (request.dateModified ? new Date(request.dateModified).toISOString().split('T')[0] : 'N/A')}
                              </div>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap align-top">
                              {request.approvalStatus ? (
                                <span className={`px-2.5 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${darkMode ? 'border' : ''} ${request.approvalStatus === 'PENDING' ? 'bg-amber-100 text-amber-800 border-amber-200' :
                                    request.approvalStatus === 'SELECTED' ? 'bg-emerald-100 text-emerald-800 border-emerald-200' :
                                      request.approvalStatus === 'NOT SELECTED' ? 'bg-orange-100 text-orange-800 border-orange-200' :
                                        request.approvalStatus === 'REJECTED' ? 'bg-rose-100 text-rose-800 border-rose-200' :
                                          'bg-gray-100 text-gray-800 border-gray-200'
                                  }`}>
                                  {request.approvalStatus}
                                </span>
                              ) : (
                                <span className={`px-2.5 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${darkMode ? 'border' : ''} ${request.postStatus === 1 ? 'bg-blue-100 text-blue-800 border-blue-200' : 'bg-yellow-100 text-yellow-800 border-yellow-200'
                                  }`}>
                                  {request.postStatus === 1 ? 'POSTED' : 'NOT POSTED'}
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm font-medium">
                              <div className="flex items-center space-x-1">
                                <button
                                  onClick={() => {
                                    setSelectedPQCode(request.pqCode);
                                    setShowDetailsModal(true);
                                  }}
                                  className="p-2 text-indigo-600 hover:text-indigo-900 hover:bg-indigo-50 rounded-lg transition-all duration-200"
                                  title="View Details"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                  </svg>
                                </button>
                                {(request.postStatus === 0 && request.approvalStatus !== 'NOT SELECTED' && request.approvalStatus !== 'REJECTED' && request.approvalStatus !== 'SELECTED') && (
                                  <>
                                    <button
                                      onClick={() => handlePostClick(request.pqCode)}
                                      disabled={isProcessing}
                                      className="p-2 text-emerald-600 hover:text-emerald-900 hover:bg-emerald-50 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                                      title="Post Request"
                                    >
                                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                                      </svg>
                                    </button>
                                    <button
                                      onClick={() => handleDeleteClick(request.pqCode)}
                                      disabled={isProcessing}
                                      className="p-2 text-rose-600 hover:text-rose-900 hover:bg-rose-50 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                                      title="Delete Request"
                                    >
                                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                      </svg>
                                    </button>
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>

                    {/* Mobile Card View */}
                    <div className="md:hidden space-y-3 p-3">
                      {paginatedRequests.map((request, index) => (
                        <div key={`${request.pqCode}-${request.prId || index}-${index}`} className={`rounded-xl p-4 ${darkMode ? 'bg-gray-700/50 border border-gray-600' : 'bg-white border border-gray-200 shadow-sm'}`}>
                          <div className="flex items-start justify-between mb-3">
                            <div>
                              <p className={`text-xs font-medium uppercase tracking-wider ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>CQ ID</p>
                              <p className={`text-sm font-bold ${darkMode ? 'text-indigo-400' : 'text-indigo-600'}`}>{request.pqCode}</p>
                            </div>
                            {request.approvalStatus ? (
                              <span className={`px-2 py-1 text-xs font-semibold rounded-full ${request.approvalStatus === 'PENDING' ? 'bg-amber-100 text-amber-800' :
                                  request.approvalStatus === 'SELECTED' ? 'bg-emerald-100 text-emerald-800' :
                                    request.approvalStatus === 'NOT SELECTED' ? 'bg-orange-100 text-orange-800' :
                                      request.approvalStatus === 'REJECTED' ? 'bg-rose-100 text-rose-800' :
                                        'bg-gray-100 text-gray-800'
                                }`}>
                                {request.approvalStatus}
                              </span>
                            ) : (
                              <span className={`px-2 py-1 text-xs font-semibold rounded-full ${request.postStatus === 1 ? 'bg-blue-100 text-blue-800' : 'bg-yellow-100 text-yellow-800'}`}>
                                {request.postStatus === 1 ? 'POSTED' : 'NOT POSTED'}
                              </span>
                            )}
                          </div>
                          
                          <div className="grid grid-cols-2 gap-3 mb-3">
                            <div>
                              <p className={`text-xs font-medium uppercase tracking-wider ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>PR By</p>
                              <p className={`text-sm ${darkMode ? 'text-white' : 'text-gray-900'}`}>{request.prBy || 'N/A'}</p>
                            </div>
                            <div>
                              <p className={`text-xs font-medium uppercase tracking-wider ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>PR ID</p>
                              <p className={`text-sm ${darkMode ? 'text-white' : 'text-gray-900'}`}>{request.prId || 'N/A'}</p>
                            </div>
                            <div>
                              <p className={`text-xs font-medium uppercase tracking-wider ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Canvassed By</p>
                              <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>{request.canvassedBy || 'N/A'}</p>
                            </div>
                            <div>
                              <p className={`text-xs font-medium uppercase tracking-wider ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>PR Date</p>
                              <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>{request.prApprovalDate ? new Date(request.prApprovalDate).toISOString().split('T')[0] : 'N/A'}</p>
                            </div>
                          </div>
                          
                          <div className="mb-3">
                            <p className={`text-xs font-medium uppercase tracking-wider ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Item</p>
                            <p className={`text-sm ${darkMode ? 'text-white' : 'text-gray-900'} line-clamp-2`}>{request.itemDescription || 'N/A'}</p>
                          </div>
                          
                          <div className="flex items-center justify-between pt-3 border-t ${darkMode ? 'border-gray-600' : 'border-gray-200'}">
                            <div>
                              <p className={`text-xs font-medium uppercase tracking-wider ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Post Date</p>
                              <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                                {request.postStatus === 0 ? '-' : (request.dateModified ? new Date(request.dateModified).toISOString().split('T')[0] : 'N/A')}
                              </p>
                            </div>
                            <div className="flex items-center space-x-1">
                              <button
                                onClick={() => {
                                  setSelectedPQCode(request.pqCode);
                                  setShowDetailsModal(true);
                                }}
                                className="p-2 text-indigo-600 hover:text-indigo-900 hover:bg-indigo-50 rounded-lg transition-all duration-200"
                                title="View Details"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                </svg>
                              </button>
                              {request.postStatus === 0 && (
                                <>
                                  <button
                                    onClick={() => handlePostClick(request.pqCode)}
                                    disabled={isProcessing}
                                    className="p-2 text-emerald-600 hover:text-emerald-900 hover:bg-emerald-50 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                                    title="Post Request"
                                  >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                                    </svg>
                                  </button>
                                  <button
                                    onClick={() => handleDeleteClick(request.pqCode)}
                                    disabled={isProcessing}
                                    className="p-2 text-rose-600 hover:text-rose-900 hover:bg-rose-50 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                                    title="Delete Request"
                                  >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-16">
                    <div className="mx-auto h-24 w-24 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center mb-4">
                      <svg className="h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <h3 className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-900'} mb-2`}>No canvassing requests found</h3>
                    <p className={`text-sm max-w-sm mx-auto mb-6 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      {searchTerm || statusFilter !== 'all' || postStatusFilter !== 'all'
                        ? 'Try adjusting your search or filters to find what you\'re looking for.'
                        : 'Get started by creating a new canvassing request to begin the procurement process.'}
                    </p>
                    <button
                      onClick={() => setShowCreateModal(true)}
                      className="inline-flex items-center px-5 py-2.5 border border-transparent text-sm font-medium rounded-xl text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg hover:shadow-xl transition-all duration-200"
                    >
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      New Canvass of Quotation
                    </button>
                  </div>
                )}
              </div>

              {/* Pagination Controls */}
              {filteredCanvassingRequests.length > 0 && (
                <div className={`flex flex-col sm:flex-row items-center justify-between gap-3 px-4 sm:px-6 py-4 ${darkMode ? 'bg-gray-800/50 border-t border-gray-700' : 'bg-gray-50 border-t border-gray-200'}`}>
                  <div className="flex items-center space-x-2 order-2 sm:order-1">
                    <span className={`text-xs sm:text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Show</span>
                    <select
                      value={itemsPerPage}
                      onChange={(e) => setItemsPerPage(Number(e.target.value))}
                      className={`px-2 sm:px-3 py-1.5 text-xs sm:text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-700'}`}
                    >
                      <option value={10}>10</option>
                      <option value={20}>20</option>
                      <option value={50}>50</option>
                      <option value={100}>100</option>
                    </select>
                    <span className={`text-xs sm:text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>per page</span>
                  </div>
                  <div className={`text-xs sm:text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    Showing <span className="font-semibold text-indigo-500">{startIndex + 1}</span> to <span className="font-semibold text-indigo-500">{Math.min(endIndex, filteredCanvassingRequests.length)}</span> of <span className="font-semibold text-indigo-500">{filteredCanvassingRequests.length}</span> results
                  </div>
                  <div className="flex items-center space-x-1 order-3">
                    <button
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                      className={`p-1.5 sm:p-2 rounded-lg text-sm font-medium transition-all duration-200 ${currentPage === 1
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        : darkMode
                          ? 'bg-gray-700 text-gray-300 hover:bg-gray-600 hover:text-white'
                          : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 hover:text-gray-900'
                        }`}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                    </button>
                    {totalPages <= 7 ? (
                      Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                        <button
                          key={page}
                          onClick={() => setCurrentPage(page)}
                          className={`w-8 h-8 sm:w-9 sm:h-9 rounded-lg text-xs sm:text-sm font-medium transition-all duration-200 ${currentPage === page
                            ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-md'
                            : darkMode
                              ? 'bg-gray-700 text-gray-300 hover:bg-gray-600 hover:text-white'
                              : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 hover:text-gray-900'
                            }`}
                        >
                          {page}
                        </button>
                      ))
                    ) : (
                      <>
                        {[1, 2].map(page => (
                          <button
                            key={page}
                            onClick={() => setCurrentPage(page)}
                            className={`w-8 h-8 sm:w-9 sm:h-9 rounded-lg text-xs sm:text-sm font-medium transition-all duration-200 ${currentPage === page
                              ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-md'
                              : darkMode
                                ? 'bg-gray-700 text-gray-300 hover:bg-gray-600 hover:text-white'
                                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 hover:text-gray-900'
                              }`}
                          >
                            {page}
                          </button>
                        ))}
                        <span className={`px-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>...</span>
                        {[totalPages - 1, totalPages].map(page => (
                          <button
                            key={page}
                            onClick={() => setCurrentPage(page)}
                            className={`w-8 h-8 sm:w-9 sm:h-9 rounded-lg text-xs sm:text-sm font-medium transition-all duration-200 ${currentPage === page
                              ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-md'
                              : darkMode
                                ? 'bg-gray-700 text-gray-300 hover:bg-gray-600 hover:text-white'
                                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 hover:text-gray-900'
                              }`}
                          >
                            {page}
                          </button>
                        ))}
                      </>
                    )}
                    <button
                      onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                      disabled={currentPage === totalPages}
                      className={`p-1.5 sm:p-2 rounded-lg text-sm font-medium transition-all duration-200 ${currentPage === totalPages
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        : darkMode
                          ? 'bg-gray-700 text-gray-300 hover:bg-gray-600 hover:text-white'
                          : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 hover:text-gray-900'
                        }`}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  </div>
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

      {/* Create Canvassing Modal */}
      <CreateCanvassingModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        darkMode={darkMode}
        user={user}
        onSuccess={reloadCanvassingRequestsData}
      />

      {/* Canvassing Details Modal */}
      <CanvassingDetailsModal
        isOpen={showDetailsModal}
        onClose={() => {
          setShowDetailsModal(false);
          setSelectedPQCode(null);
        }}
        pqCode={selectedPQCode}
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

      {/* Post Confirmation Modal */}
      <ConfirmModal
        isOpen={showPostConfirmModal}
        title="Confirm Post Request"
        message="Are you sure you want to post this canvassing request? Once posted, it will be available for approval and cannot be edited or deleted."
        confirmButtonText="Post Request"
        confirmButtonColor="blue"
        onConfirm={handleConfirmPost}
        onCancel={handleCancelPost}
        isLoading={isProcessing}
      />

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={showDeleteConfirmModal}
        title="Confirm Delete Request"
        message="Are you sure you want to delete this canvassing request? This action cannot be undone and all associated data will be permanently removed."
        confirmButtonText="Delete Request"
        confirmButtonColor="red"
        onConfirm={handleConfirmDelete}
        onCancel={handleCancelDelete}
        isLoading={isProcessing}
      />
    </div>
  );
}

export default function CanvassingPage() {
  return (
    <ProtectedRoute>
      <CanvassingContent />
    </ProtectedRoute>
  );
}
