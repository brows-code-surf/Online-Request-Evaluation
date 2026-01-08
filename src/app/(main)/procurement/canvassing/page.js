'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '../../../../utils/authContext';
import ProtectedRoute from '@/utils/protectedRoute';
import HeaderNavBar from '@/app/_components/headerNavBar';
import SuccessModal from '@/app/(main)/_components/successModal';
import Loader from '@/app/_components/loader';
import CreateCanvassingModal from './_components/CreateCanvassingModal';
import CreateOption2 from './_components/CreateOption2';
import { ToastContainer, toast } from 'react-toastify';
import {
  getAllCanvassingRequests,
  getCanvassingRequestByPQCode,
  approveCanvassingRequest,
  postCanvassingRequest
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
  const [showCreateModal2, setShowCreateModal2] = useState(false);


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

  const handlePostCanvassingRequest = async (pqCode) => {
    try {
      const result = await postCanvassingRequest(pqCode, user?.empName);
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
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'FOR CANVASSING':
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
                  onClick={() => setShowCreateModal2(true)}
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
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
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
                    <p className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{canvassingRequests.length}</p>
                  </div>
                </div>
              </div>

              <div className={`rounded-lg shadow-sm p-6 ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-yellow-500 rounded-full flex items-center justify-center">
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                  </div>
                  <div className="ml-4">
                    <p className={`text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>For Canvassing</p>
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
                <h2 className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>Recent Canvassing Requests</h2>
              </div>

              <div className="overflow-x-auto">
                {canvassingRequests.length > 0 ? (
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
                      {canvassingRequests.slice(0, 10).map((request, index) => (
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
                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${request.postStatus === 1 ? 'bg-blue-100 text-blue-800' :
                                request.postStatus === 2 ? 'bg-green-100 text-green-800' :
                                  'bg-gray-100 text-gray-800'
                              }`}>
                              {request.postStatus === 1 ? 'FOR CANVASSING' :
                                request.postStatus === 2 ? 'APPROVED' : 'COMPLETED'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                            <button
                              onClick={() => {
                                // Navigate to detail view
                                window.location.href = `/procurement/canvassing?id=${request.pqCode}`;
                              }}
                              className="text-blue-600 hover:text-blue-900 transition-colors duration-200"
                            >
                              View Details
                            </button>
                            {request.postStatus === 1 && (
                              <>
                                <button
                                  onClick={() => handlePostCanvassingRequest(request.pqCode)}
                                  className="text-purple-600 hover:text-purple-900 transition-colors duration-200"
                                >
                                  Post
                                </button>
                                <button
                                  onClick={() => handleApproveCanvassingRequest(request.pqCode)}
                                  className="text-green-600 hover:text-green-900 transition-colors duration-200"
                                >
                                  Approve
                                </button>
                              </>
                            )}
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

      <CreateOption2
        isOpen={showCreateModal2}
        onClose={() => setShowCreateModal2(false)}
        darkMode={darkMode}
        user={user}
        onSuccess={reloadCanvassingRequestsData}
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
