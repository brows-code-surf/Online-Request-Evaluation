'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
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
  getCanvassingRequestByPQCode,
  approveCanvassingRequest,
  postCanvassingRequest,
  deleteCanvassingRequest
} from './_actions';

function CanvassingContent() {
  const { darkMode, user } = useAuth();
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

  // Confirmation modal states
  const [showPostConfirmModal, setShowPostConfirmModal] = useState(false);
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
  const [pendingPostPQCode, setPendingPostPQCode] = useState(null);
  const [pendingDeletePQCode, setPendingDeletePQCode] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Filter canvassing requests based on search term
  const filteredCanvassingRequests = canvassingRequests.filter((request) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      request.pqCode?.toLowerCase().includes(searchLower) ||
      request.company?.toLowerCase().includes(searchLower) ||
      request.createdBy?.toLowerCase().includes(searchLower) ||
      request.postStatus === 0 && 'not posted'.includes(searchLower) ||
      request.postStatus === 1 && 'posted'.includes(searchLower) ||
      request.postStatus === 2 && 'approved'.includes(searchLower) ||
      request.postStatus === 3 && 'completed'.includes(searchLower)
    );
  });

  // Function to reload canvassing requests data without page refresh
  const reloadCanvassingRequestsData = async () => {
    try {
      const filters = {};
      const data = await getAllCanvassingRequests(filters, user);
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

  useEffect(() => {
    const loadCanvassingRequests = async () => {
      if (!user?.empName) return;

      setLoading(true);
      try {
        const result = await getAllCanvassingRequests({}, user);
        if (result.success) {
          setCanvassingRequests(result.canvassingRequests);
        }
      } catch (error) {
        console.error('Failed to load canvassing requests:', error);
      } finally {
        setLoading(false);
      }
    };

    loadCanvassingRequests();
  }, [user?.empName]);

  const handleApproveCanvassingRequest = async (pqCode) => {
    try {
      const result = await approveCanvassingRequest(pqCode, user?.empName);
      if (result.success) {
        setSuccessMessage({
          title: 'Canvassing Request Approved',
          message: 'The canvassing request has been approved successfully.'
        });
        setShowSuccessModal(true);
        await reloadCanvassingRequestsData();
      } else {
        toast.error('Failed to approve canvassing request: ' + result.message);
      }
    } catch (error) {
      console.error('Error approving canvassing request:', error);
      toast.error('Failed to approve canvassing request');
    }
  };

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

  const getStatusColor = (status) => {
    switch (status) {
      case 'NOT POSTED':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'POSTED':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'APPROVED':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'COMPLETED':
        return 'bg-purple-100 text-purple-800 border-purple-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
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
        <div className="max-w-7xl mx-auto p-6">

          {/* Header Section */}
          <div className="mb-8">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h1 className={`text-3xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  Canvassing Management
                </h1>
                <p className={`text-lg mt-2 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                  Manage vendor quotations and pricing for procurement requests
                </p>
              </div>
              <div className="flex space-x-4">
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors duration-200 flex items-center space-x-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  <span>New Canvassing Request</span>
                </button>
              </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
              <div className={`rounded-lg shadow-sm p-6 ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                  </div>
                  <div className="ml-4">
                    <p className={`text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Total Requests</p>
                    <p className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{filteredCanvassingRequests.length}</p>
                  </div>
                </div>
              </div>

              <div className={`rounded-lg shadow-sm p-6 ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-yellow-500 rounded-full flex items-center justify-center">
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                    </div>
                  </div>
                  <div className="ml-4">
                    <p className={`text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Not Posted</p>
                    <p className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                      {canvassingRequests.filter(cr => cr.postStatus === 0).length}
                    </p>
                  </div>
                </div>
              </div>

              <div className={`rounded-lg shadow-sm p-6 ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center">
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                  </div>
                  <div className="ml-4">
                    <p className={`text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Posted</p>
                    <p className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                      {canvassingRequests.filter(cr => cr.postStatus === 1).length}
                    </p>
                  </div>
                </div>
              </div>

              <div className={`rounded-lg shadow-sm p-6 ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  </div>
                  <div className="ml-4">
                    <p className={`text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Approved</p>
                    <p className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                      {canvassingRequests.filter(cr => cr.postStatus === 2).length}
                    </p>
                  </div>
                </div>
              </div>

              <div className={`rounded-lg shadow-sm p-6 ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center">
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                    </div>
                  </div>
                  <div className="ml-4">
                    <p className={`text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Completed</p>
                    <p className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                      {canvassingRequests.filter(cr => cr.postStatus === 3).length}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Main Content Area */}
          {currentView === 'dashboard' && (
            <div className={`rounded-lg shadow-sm overflow-hidden ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
              <div className={`px-6 py-4 border-b ${darkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-gray-50'}`}>
                <div className="flex justify-between items-center">
                  <h2 className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>Recent Canvassing Requests</h2>
                  <div className="flex items-center space-x-4">
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="Search requests by PQ code, company, creator, or status..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className={`w-80 px-3 py-2 pl-10 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${darkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'bg-white border-gray-300 placeholder-gray-500'
                          }`}
                      />
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <svg className={`w-5 h-5 ${darkMode ? 'text-gray-400' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto">
                {filteredCanvassingRequests.length > 0 ? (
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className={`${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                      <tr>
                        <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${darkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                          PQ Code
                        </th>
                        <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${darkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                          Company
                        </th>
                        <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${darkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                          Created By
                        </th>
                        <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${darkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                          Date Requested
                        </th>
                        <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${darkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                          Status
                        </th>
                        <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${darkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className={`${darkMode ? 'bg-gray-800 divide-gray-700' : 'bg-white divide-gray-200'}`}>
                      {filteredCanvassingRequests.slice(0, 10).map((request, index) => (
                        <tr key={request.id || index} className={`${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-50'}`}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className={`text-sm font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                              {request.pqCode}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className={`text-sm ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                              {request.company}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className={`text-sm ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                              {request.createdBy}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className={`text-sm ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                              {new Date(request.dateRequested).toLocaleDateString()}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${request.postStatus === 0 ? 'bg-yellow-100 text-yellow-800' :
                                request.postStatus === 1 ? 'bg-blue-100 text-blue-800' :
                                request.postStatus === 2 ? 'bg-green-100 text-green-800' :
                                  'bg-gray-100 text-gray-800'
                              }`}>
                              {request.postStatus === 0 ? 'NOT POSTED' :
                                request.postStatus === 1 ? 'POSTED' :
                                request.postStatus === 2 ? 'APPROVED' : 'COMPLETED'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <div className="flex items-center space-x-2">
                              <button
                                onClick={() => {
                                  setSelectedPQCode(request.pqCode);
                                  setShowDetailsModal(true);
                                }}
                                className="p-1 text-blue-600 hover:text-blue-900 hover:bg-blue-50 rounded transition-colors duration-200"
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
                                    className="p-1 text-purple-600 hover:text-purple-900 hover:bg-purple-50 rounded transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                                    title="Post Request"
                                  >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                                    </svg>
                                  </button>
                                  <button
                                    onClick={() => handleDeleteClick(request.pqCode)}
                                    disabled={isProcessing}
                                    className="p-1 text-red-600 hover:text-red-900 hover:bg-red-50 rounded transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                                    title="Delete Request"
                                  >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                  </button>
                                </>
                              )}
                              {request.postStatus === 1 && (
                                <button
                                  onClick={() => handleApproveCanvassingRequest(request.pqCode)}
                                  className="p-1 text-green-600 hover:text-green-900 hover:bg-green-50 rounded transition-colors duration-200"
                                  title="Approve Request"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                  </svg>
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="text-center py-12">
                    <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <h3 className={`mt-2 text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-900'}`}>No canvassing requests</h3>
                    <p className={`mt-1 text-sm ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                      Get started by creating a new canvassing request.
                    </p>
                    <div className="mt-6">
                      <button
                        onClick={() => setShowCreateModal(true)}
                        className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                      >
                        <svg className="-ml-1 mr-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        New Request
                      </button>
                    </div>
                  </div>
                )}
              </div>
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
