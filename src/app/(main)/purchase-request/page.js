'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '../../../utils/authContext';
import ProtectedRoute from '@/utils/protectedRoute';
import HeaderNavBar from '@/app/_components/headerNavBar';
import ContentLeftPanel from '../_components/contentLeftPanel';
import PurchaseRequestForm from './_components/PurchaseRequestForm';
import PurchaseRequestDetails from './_components/PurchaseRequestDetails';
import PurchaseRequestList from './_components/PurchaseRequestList';
import SuccessModal from '@/app/(main)/_components/successModal';
import SideNotchOpenLeftPanel from '../_components/sideNotchOpenLeftPanel';
import Loader from '@/app/_components/loader';
import { SkeletonRequestEvaluationDetail } from '@/app/_components/skeletonLoader';
import { ToastContainer, toast } from 'react-toastify';
import {
  getAllPurchaseRequests,
  getPurchaseRequestByReferenceNo,
  createPurchaseRequest,
  reviewPurchaseRequest,
  approvePurchaseRequest,
  receivePurchaseRequest,
  rejectPurchaseRequest,
  postPurchaseRequest
} from './_actions';

function PurchaseRequestContent() {
  const { darkMode, user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const formRef = useRef(null);

  const [purchaseRequests, setPurchaseRequests] = useState([]);
  const [selectedPurchaseRequest, setSelectedPurchaseRequest] = useState(null);
  const [purchaseRequestDetails, setPurchaseRequestDetails] = useState([]);
  const [approvals, setApprovals] = useState([]);
  const [loading, setLoading] = useState(false);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('date');
  const [filterStatus, setFilterStatus] = useState('');
  const [currentView, setCurrentView] = useState('list'); // 'list', 'create'
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState({ title: '', message: '' });
  const [addItemButtonVisible, setAddItemButtonVisible] = useState(true);

  // Function to reload purchase requests data without page refresh
  const reloadPurchaseRequestsData = async () => {
    try {
      const filters = {};
      const data = await getAllPurchaseRequests(filters, user);
      if (data.success) {
        setPurchaseRequests(data.purchaseRequests);
        const approvalsData = data.purchaseRequests.map(pr => ({
          ...pr,
          id: pr.referenceNo,
          title: `${pr.company} - ${pr.requestType}`,
          requester: pr.requestedBy,
          status: pr.isPosted ? 'POSTED' : pr.requestStatus,
          requestDate: pr.dateRequested,
          department: pr.company,
          isRead: pr.isRead ? 'READ' : 'NOT READ',
          isRush: pr.isRush
        }));
        setApprovals(approvalsData);
        // Update selectedPurchaseRequest to match refreshed data or leave as is if not found
        if (selectedPurchaseRequest) {
          const refreshedSelected = approvalsData.find(approval => approval.id === selectedPurchaseRequest.id);
          if (refreshedSelected) {
            setSelectedPurchaseRequest(refreshedSelected);
          }
        }
        return { success: true, approvalsData };
      }
      return { success: false };
    } catch (error) {
      console.error('Failed to reload purchase requests:', error);
      return { success: false };
    }
  };

  useEffect(() => {
    const loadPurchaseRequests = async () => {
      if (!user?.empName) return;

      setLoading(true);
      try {
        const result = await getAllPurchaseRequests({}, user);
        if (result.success) {
          const purchaseRequestsData = result.purchaseRequests;
          setPurchaseRequests(purchaseRequestsData);
          const approvalsData = purchaseRequestsData.map(pr => ({
            ...pr,
            id: pr.referenceNo,
            title: `${pr.company} - ${pr.requestType}`,
            requester: pr.requestedBy,
            status: pr.isPosted ? 'POSTED' : pr.requestStatus,
            requestDate: pr.dateRequested,
            department: pr.company,
            isRead: pr.isRead ? 'READ' : 'NOT READ',
            isRush: pr.isRush
          }));
          setApprovals(approvalsData);

          const id = searchParams.get('id');
          let selectApproval = null;
          if (purchaseRequestsData.length > 0 && !selectedPurchaseRequest) {
            selectApproval = purchaseRequestsData[0];
            if (id) {
              const urlSelected = purchaseRequestsData.find(pr => pr.referenceNo === id);
              if (urlSelected) {
                selectApproval = urlSelected;
              }
            }
            const approvalSelected = approvalsData.find(approval => approval.id === selectApproval.referenceNo);
            setSelectedPurchaseRequest(approvalSelected);
          }
        }
      } catch (error) {
        console.error('Failed to load purchase requests:', error);
      } finally {
        setLoading(false);
      }
    };

    loadPurchaseRequests();
  }, [user?.empName]);

  // Handle sidebar open event
  useEffect(() => {
    const handleOpenSidebar = () => {
      setSidebarOpen(true);
    };

    window.addEventListener('openSidebar', handleOpenSidebar);
    return () => window.removeEventListener('openSidebar', handleOpenSidebar);
  }, []);

  useEffect(() => {
    const loadDetails = async () => {
      if (selectedPurchaseRequest?.referenceNo) {
        setDetailsLoading(true);
        try {
        const details = await getPurchaseRequestByReferenceNo(selectedPurchaseRequest.referenceNo, user);
        if (details.success) {
          setPurchaseRequestDetails(details.purchaseRequest.details);
          setSelectedPurchaseRequest({ ...selectedPurchaseRequest, details: details.purchaseRequest.details });
        }
        } catch (error) {
          console.error('Failed to load purchase request details:', error);
          setPurchaseRequestDetails([]);
        } finally {
          setDetailsLoading(false);
        }
      }
    };
    loadDetails();
  }, [selectedPurchaseRequest?.referenceNo]);

  // Handle URL parameter changes to select purchase request
  useEffect(() => {
    const id = searchParams.get('id');
    if (id && approvals.length > 0) {
      const urlSelected = approvals.find(approval => approval.id === id);
      if (urlSelected && urlSelected.id !== selectedPurchaseRequest?.id) {
        setSelectedPurchaseRequest(urlSelected);
      }
    }
  }, [searchParams, approvals, selectedPurchaseRequest?.id]);



  // Handle purchase request selection without redundant loading
  const handleSelectPurchaseRequest = (approval) => {
    setSelectedPurchaseRequest(approval);
    setCurrentView('list');
  };

  // Intersection Observer for Add Item button visibility
  useEffect(() => {
    if (currentView !== 'create') return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          setAddItemButtonVisible(entry.isIntersecting);
        });
      },
      {
        root: null, // viewport
        rootMargin: '0px',
        threshold: 0.1 // 10% visible
      }
    );

    // Wait for the form to mount and get the button ref
    const timeoutId = setTimeout(() => {
      if (formRef.current && formRef.current.addItemButtonRef?.current) {
        observer.observe(formRef.current.addItemButtonRef.current);
      }
    }, 200);

    return () => {
      clearTimeout(timeoutId);
      observer.disconnect();
    };
  }, [currentView]);

  // Filter and sort approvals
  const filteredApprovals = approvals
    .filter(approval => {
      const matchesSearch = searchQuery === '' ||
        [approval.requester, approval.title, approval.id, approval.status, approval.isRush, approval.department].some(field =>
          field?.toString().toLowerCase().includes(searchQuery.toLowerCase())
        );
        
       const matchesStatus = filterStatus === 'all' || filterStatus === '' ||
                (filterStatus === 'RUSH' ? approval.isRush : approval.status === filterStatus);

      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      if (sortBy === 'date') {
        return new Date(b.requestDate) - new Date(a.requestDate);
      } else if (sortBy === 'requester') {
        return a.requester.localeCompare(b.requester);
      } else if (sortBy === 'status') {
        return a.status.localeCompare(b.status);
      }
      return 0;
    });

  const handleCreatePurchaseRequest = async (headerData, detailsData) => {
    try {
      const result = await createPurchaseRequest(headerData, detailsData, user?.empName);
      if (result.success) {
        setSuccessMessage({
          title: 'Purchase Request Created',
          message: `Purchase request ${result.referenceNo} has been created successfully.`
        });
        setShowSuccessModal(true);
        setCurrentView('list');
        const reloadResult = await reloadPurchaseRequestsData();
        if (reloadResult.success) {
          const newSelected = reloadResult.approvalsData.find(approval => approval.id === result.referenceNo);
          if (newSelected) {
            setSelectedPurchaseRequest(newSelected);
          }
        }
      } else {
        toast.error('Failed to create purchase request: ' + result.message);
      }
    } catch (error) {
      console.error('Error creating purchase request:', error);
      toast.error('Failed to create purchase request');
    }
  };

  const handleReviewPurchaseRequest = async (referenceNo) => {
    try {
      const result = await reviewPurchaseRequest(referenceNo, user?.empName);
      if (result.success) {
        setSuccessMessage({
          title: 'Purchase Request Reviewed',
          message: 'The purchase request has been reviewed and moved to the next stage.'
        });
        setShowSuccessModal(true);
        setSelectedPurchaseRequest(null);
        await reloadPurchaseRequestsData();
      } else {
        toast.error('Failed to review purchase request: ' + result.message);
      }
    } catch (error) {
      console.error('Error reviewing purchase request:', error);
      toast.error('Failed to review purchase request');
    }
  };

  const handleApprovePurchaseRequest = async (referenceNo) => {
    try {
      const result = await approvePurchaseRequest(referenceNo, user?.empName);
      if (result.success) {
        setSuccessMessage({
          title: 'Purchase Request Approved',
          message: 'The purchase request has been approved and moved to the next stage.'
        });
        setShowSuccessModal(true);
        setSelectedPurchaseRequest(null);
        await reloadPurchaseRequestsData();
      } else {
        toast.error('Failed to approve purchase request: ' + result.message);
      }
    } catch (error) {
      console.error('Error approving purchase request:', error);
      toast.error('Failed to approve purchase request');
    }
  };

  const handleReceivePurchaseRequest = async (referenceNo) => {
    try {
      const result = await receivePurchaseRequest(referenceNo, user?.empName);
      if (result.success) {
        setSuccessMessage({
          title: 'Purchase Request Received',
          message: 'The purchase request has been received and marked as completed.'
        });
        setShowSuccessModal(true);
        setSelectedPurchaseRequest(null);
        await reloadPurchaseRequestsData();
      } else {
        toast.error('Failed to receive purchase request: ' + result.message);
      }
    } catch (error) {
      console.error('Error receiving purchase request:', error);
      toast.error('Failed to receive purchase request');
    }
  };

  const handleRejectPurchaseRequest = async (referenceNo, reason) => {
    try {
      const result = await rejectPurchaseRequest(referenceNo, user?.empName, reason);
      if (result.success) {
        setSuccessMessage({
          title: 'Purchase Request Rejected',
          message: 'The purchase request has been rejected.'
        });
        setShowSuccessModal(true);
        setSelectedPurchaseRequest(null);
        await reloadPurchaseRequestsData();
      } else {
        toast.error('Failed to reject purchase request: ' + result.message);
      }
    } catch (error) {
      console.error('Error rejecting purchase request:', error);
      toast.error('Failed to reject purchase request');
    }
  };

  const handlePostPurchaseRequest = async (referenceNo) => {
    try {
      const result = await postPurchaseRequest(referenceNo, user?.empName);
      if (result.success) {
        setSuccessMessage({
          title: 'Purchase Request Posted',
          message: 'The purchase request has been posted and notifications have been sent.'
        });
        setShowSuccessModal(true);
        setSelectedPurchaseRequest(null);
        await reloadPurchaseRequestsData();
      } else {
        toast.error('Failed to post purchase request: ' + result.message);
      }
    } catch (error) {
      console.error('Error posting purchase request:', error);
      toast.error('Failed to post purchase request');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'POSTED':
        return 'bg-purple-100 text-purple-800 border-purple-300';
      case 'FOR CONFIRMATION':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'FOR REQUEST APPROVAL':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'FOR PURCHASING LEAD TIME':
        return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'COMPLETED':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'REJECTED':
        return 'bg-red-100 text-red-800 border-red-300';
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
      <div className="flex flex-1 overflow-hidden pt-14">

        {/* Left Panel - Using ContentLeftPanel Component */}
        <ContentLeftPanel
          sidebarOpen={sidebarOpen}
          onSidebarClose={() => setSidebarOpen(false)}
          headerTitle="Purchase Requests"
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          filterStatus={filterStatus}
          onFilterStatusChange={setFilterStatus}
          sortBy={sortBy}
          onSortByChange={setSortBy}
          approvals={filteredApprovals}
          selectedApprovalId={selectedPurchaseRequest?.id}
          onApprovalSelect={handleSelectPurchaseRequest}
          getStatusColor={getStatusColor}
          filterType="purchase-request"
          enableReadStatus={false}
          isLoading={loading}
        />

        {/* Right Panel - Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <SideNotchOpenLeftPanel
            sidebarOpen={sidebarOpen}
            setSidebarOpen={setSidebarOpen}
          />

          {/* Create Form Header */}
          {currentView === 'create' && (
            <div className={`p-6 border-b ${darkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'}`}>
              <div className="flex items-center justify-between">
                <div>
                  <h1 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    Create Purchase Request
                  </h1>
                  <p className={`text-md ${darkMode ? 'text-gray-300' : 'text-gray-600'} mt-1`}>
                    Fill in the details to create a new purchase request
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Main Content Area */}
          <div className="flex-1 overflow-y-auto">
            {currentView === 'create' ? (
              <div className="p-6">
                <PurchaseRequestForm
                  ref={formRef}
                  onSubmit={handleCreatePurchaseRequest}
                  onCancel={() => setCurrentView('list')}
                  loading={false}
                />
              </div>
            ) : selectedPurchaseRequest ? (
              <div className="p-6">
                {detailsLoading ? (
                  <SkeletonRequestEvaluationDetail />
                ) : (
                  <PurchaseRequestDetails
                    purchaseRequest={selectedPurchaseRequest}
                    onClose={() => setSelectedPurchaseRequest(null)}
                    onReview={handleReviewPurchaseRequest}
                    onApprove={handleApprovePurchaseRequest}
                    onReceive={handleReceivePurchaseRequest}
                    onReject={handleRejectPurchaseRequest}
                    onPost={handlePostPurchaseRequest}
                    loading={false}
                  />
                )}
              </div>
            ) : (
              <div className="p-6">
                <PurchaseRequestList
                  purchaseRequests={purchaseRequests}
                  onPurchaseRequestClick={(pr) => {
                    const approval = approvals.find(a => a.id === pr.referenceNo);
                    if (approval) {
                      handleSelectPurchaseRequest(approval);
                    }
                  }}
                  loading={loading}
                />
              </div>
            )}
          </div>

          {/* Floating Add Item Button (only when form Add Item button is not visible) */}
          {currentView === 'create' && !addItemButtonVisible && (
            <button
              onClick={() => formRef.current?.addItem()}
              className="fixed bottom-24 right-6 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white p-4 rounded-full shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-green-500 focus:ring-opacity-50 z-50"
              title="Add Item"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </button>
          )}

          {/* Floating Action Button - Only show when not creating */}
          {currentView !== 'create' && (
            <button
              onClick={() => setCurrentView('create')}
              className="fixed bottom-6 right-6 bg-gradient-to-r from-blue-600 to-green-600 hover:from-blue-700 hover:to-green-700 text-white p-4 rounded-full shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-blue-500 focus:ring-opacity-50 z-50"
              title="Create Purchase Request"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </button>
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
          setSelectedPurchaseRequest(null); // Unselect the approval after action
          reloadPurchaseRequestsData();
        }}
        autoCloseDelay={3000}
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

export default function PurchaseRequestPage() {
  return (
    <ProtectedRoute>
      <PurchaseRequestContent />
    </ProtectedRoute>
  );
}
