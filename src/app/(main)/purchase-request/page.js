'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '../../../utils/authContext';
import ProtectedRoute from '@/utils/protectedRoute';
import HeaderNavBar from '@/app/_components/headerNavBar';
import ContentLeftPanel from '../_components/contentLeftPanel';
import PurchaseRequestForm from './_components/PurchaseRequestForm';
import PurchaseRequestDetails from './_components/PurchaseRequestDetails';
import SearchModal from '../_components/SearchModal';

import SuccessModal from '@/app/(main)/_components/successModal';
import SideNotchOpenLeftPanel from '../_components/sideNotchOpenLeftPanel';
import Loader from '@/app/_components/loader';
import { SkeletonRequestEvaluationDetail } from '@/app/_components/skeletonLoader';
import { ToastContainer, toast } from 'react-toastify';
import { useSocketMultiple } from '@/hooks/useSocketMultiple';
import {
  getAllPurchaseRequests,
  getPurchaseRequestByReferenceNo,
  createPurchaseRequest,
  updatePurchaseRequest,
  postPurchaseRequest,
  cancelPurchaseRequest
} from './_actions';

function PurchaseRequestContent() {
  const { darkMode, user, isAdmin } = useAuth();
  const searchParams = useSearchParams();
  const formRef = useRef(null);
  const loadingRef = useRef(false);

  const [purchaseRequests, setPurchaseRequests] = useState([]);
  const [selectedPurchaseRequest, setSelectedPurchaseRequest] = useState(null);
  const [purchaseRequestDetails, setPurchaseRequestDetails] = useState([]);
  const [approvals, setApprovals] = useState([]);
  const [loading, setLoading] = useState(false);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsReloadKey, setDetailsReloadKey] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('date');
  const [filterStatus, setFilterStatus] = useState('');
  const [currentView, setCurrentView] = useState('list'); // 'list', 'create', 'edit'
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState({ title: '', message: '' });
  const [addItemButtonVisible, setAddItemButtonVisible] = useState(true);
  const [showSearchModal, setShowSearchModal] = useState(false);

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
          title: `${pr.company} - ${pr.requestStatus}`,
          requester: pr.requestStatus,
          status: pr.status,
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
            title: pr.company,
            requester: pr.requestedBy,
            status: pr.requestStatus,
            requestDate: pr.dateRequested,
            department: pr.company,
            isRead: pr.isRead ? 'READ' : 'NOT READ',
            isRush: pr.isRush
          }));
          setApprovals(approvalsData);

          // Only set initial selection if we don't have one already
          if (!selectedPurchaseRequest) {
            const id = searchParams.get('id');
            let selectApproval = null;
            if (purchaseRequestsData.length > 0) {
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
        }
      } catch (error) {
        console.error('Failed to load purchase requests:', error);
      } finally {
        setLoading(false);
      }
    };

    loadPurchaseRequests();
  }, [user?.empName]); // Removed selectedPurchaseRequest from dependencies

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
      // Prevent concurrent loads
      if (loadingRef.current || !selectedPurchaseRequest?.referenceNo) return;

      loadingRef.current = true;
      setDetailsLoading(true);

      try {
        console.log(`Loading details for PR: ${selectedPurchaseRequest.referenceNo}, reload key: ${detailsReloadKey}`);

        // Add cache-busting timestamp to ensure fresh data
        const cacheBust = Date.now();
        const details = await getPurchaseRequestByReferenceNo(
          selectedPurchaseRequest.referenceNo,
          user,
          isAdmin(),
          { cacheBust }
        );

        console.log('API Response:', details);

        // Only update if this is still the selected request
        if (details.success && details.purchaseRequest && details.purchaseRequest.header) {
          console.log('Updating purchase request details:', details.purchaseRequest.details);
          console.log('Updating purchase request header:', details.purchaseRequest.header);

          setPurchaseRequestDetails(details.purchaseRequest.details || []);
          setSelectedPurchaseRequest({
            ...selectedPurchaseRequest,
            details: details.purchaseRequest.details || [],
            // Update fields from header object
            requestStatus: details.purchaseRequest.header.requestStatus || selectedPurchaseRequest.requestStatus,
            dateReviewed: details.purchaseRequest.header.dateReviewed || selectedPurchaseRequest.dateReviewed,
            dateApproved: details.purchaseRequest.header.dateApproved || selectedPurchaseRequest.dateApproved,
            reviewer: details.purchaseRequest.header.reviewer || selectedPurchaseRequest.reviewer,
            approver: details.purchaseRequest.header.approver || selectedPurchaseRequest.approver,
            dateReceived: details.purchaseRequest.header.dateReceived || selectedPurchaseRequest.dateReceived,
            addressedTo: details.purchaseRequest.header.addressedTo || selectedPurchaseRequest.addressedTo,
            cancelRemarks: details.purchaseRequest.header.cancelRemarks,
            // Also update other header fields that might be relevant
            reviewedBy: details.purchaseRequest.header.reviewedBy || selectedPurchaseRequest.reviewedBy,
            approvedBy: details.purchaseRequest.header.approvedBy || selectedPurchaseRequest.approver,
            receivedBy: details.purchaseRequest.header.receivedBy || selectedPurchaseRequest.receivedBy
          });
        } else {
          console.error('API response structure unexpected:', details);
        }
      } catch (error) {
        console.error('Failed to load purchase request details:', error);
        setPurchaseRequestDetails([]);
      } finally {
        setDetailsLoading(false);
        loadingRef.current = false;
      }
    };

    loadDetails();
  }, [selectedPurchaseRequest?.referenceNo, detailsReloadKey]);

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



  // Handle purchase request selection with fresh data loading
  const handleSelectPurchaseRequest = (approval) => {
    // Always update the selection and force reload of details
    setSelectedPurchaseRequest(approval);
    setCurrentView('list');

    // Force reload of details by clearing the current details first
    setPurchaseRequestDetails([]);
    setDetailsLoading(true);

    // Increment reload key to trigger useEffect even for same PR
    setDetailsReloadKey(prev => prev + 1);
  };

  // Intersection Observer for Add Item button visibility
  useEffect(() => {
    if (currentView !== 'create' && currentView !== 'edit') return;

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

      // Extract request status from title (format: "COMPANY - REQUESTSTATUS")
      const titleParts = approval.title.split(' - ');
      const requestStatus = titleParts.length > 1 ? titleParts[1] : '';

      const matchesStatus = filterStatus === 'all' || filterStatus === '' ||
                (filterStatus === 'RUSH' ? approval.isRush :
                 filterStatus === 'POSTED' || filterStatus === 'NOT POSTED' ? approval.status === filterStatus :
                 requestStatus === filterStatus);

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
        let message = `Purchase request ${result.referenceNo} has been created successfully.`;
        if (result.referenceNumberChanged) {
          message += `\n\nNote: The reference number was automatically changed from ${result.originalReferenceNo} to ${result.referenceNo} due to a conflict with another request.`;
        }

        setSuccessMessage({
          title: 'Purchase Request Created',
          message: message
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

  const handleCancelPurchaseRequest = async (referenceNo, cancelReason = '') => {
    console.log('handleCancelPurchaseRequest called with:', { referenceNo, cancelReason });
    try {
      const result = await cancelPurchaseRequest(referenceNo, user?.empName, cancelReason);
      console.log('Cancel result:', result);
      if (result.success) {
        setSuccessMessage({
          title: 'Purchase Request Cancelled',
          message: 'The purchase request has been cancelled successfully.'
        });
        setShowSuccessModal(true);
        setSelectedPurchaseRequest(null);
        await reloadPurchaseRequestsData();
      } else {
        toast.error('Failed to cancel purchase request: ' + result.message);
      }
    } catch (error) {
      console.error('Error canceling purchase request:', error);
      toast.error('Failed to cancel purchase request');
    }
  };

  const handleEditPurchaseRequest = (purchaseRequest) => {
    // Switch to create view with edit data
    setCurrentView('edit');
    // The form will receive the editData prop
  };

  const handleUpdatePurchaseRequest = async (headerData, detailsData) => {
    try {
      const result = await updatePurchaseRequest(selectedPurchaseRequest.referenceNo, headerData, detailsData, user?.empName);
      if (result.success) {
        setSuccessMessage({
          title: 'Purchase Request Updated',
          message: `Purchase request ${selectedPurchaseRequest.referenceNo} has been updated successfully.`
        });
        setShowSuccessModal(true);
        setCurrentView('list');
        await reloadPurchaseRequestsData();
        // Keep the updated request selected
        const updatedSelected = approvals.find(approval => approval.id === selectedPurchaseRequest.referenceNo);
        if (updatedSelected) {
          setSelectedPurchaseRequest(updatedSelected);
        }
      } else {
        toast.error('Failed to update purchase request: ' + result.message);
      }
    } catch (error) {
      console.error('Error updating purchase request:', error);
      toast.error('Failed to update purchase request');
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

  // Real-time updates from request-evaluation page
  useSocketMultiple("request-evaluation-broadcast", {
    "request-approved": useCallback(
      (data) => {
        console.log("Request approved event received in purchase requests:", data);
        reloadPurchaseRequestsData();
      },
      []
    ),

    "request-rejected": useCallback(
      (data) => {
        console.log("Request rejected event received in purchase requests:", data);
        reloadPurchaseRequestsData();
      },
      []
    ),

    "request-changed": useCallback(
      (data) => {
        console.log("Request changed event received in purchase requests:", data);
        reloadPurchaseRequestsData();
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
          {(currentView === 'create' || currentView === 'edit') && (
            <div className={`p-6 border-b ${darkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'}`}>
              <div className="flex items-center justify-between">
                <div>
                  <h1 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    {currentView === 'edit' ? 'Edit Purchase Request' : 'Create Purchase Request'}
                  </h1>
                  <p className={`text-md ${darkMode ? 'text-gray-300' : 'text-gray-600'} mt-1`}>
                    {currentView === 'edit' ? 'Update the purchase request details' : 'Fill in the details to create a new purchase request'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Main Content Area */}
          <div className="flex-1 overflow-y-auto">
            {(currentView === 'create' || currentView === 'edit') ? (
              <div className="p-6">
                <PurchaseRequestForm
                  ref={formRef}
                  onSubmit={currentView === 'edit' ? handleUpdatePurchaseRequest : handleCreatePurchaseRequest}
                  onCancel={() => setCurrentView('list')}
                  loading={false}
                  editData={currentView === 'edit' ? selectedPurchaseRequest : null}
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
                onPost={handlePostPurchaseRequest}
                onCancel={handleCancelPurchaseRequest}
                onEdit={handleEditPurchaseRequest}
                onDataRefresh={() => {
                  // Trigger reload of details for the current purchase request
                  setDetailsReloadKey(prev => prev + 1);
                }}
                loading={false}
              />
                )}
              </div>
            ) : (
              <div className="flex items-center justify-center h-full">
                <div className={`text-center ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  <svg className="w-16 h-16 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-lg font-medium">Select a purchase request to view details</p>
                  <p className="text-sm mt-2">Click on any request from the list on the left to see its details.</p>
                </div>
              </div>
            )}
          </div>

          {/* Floating Add Item Button (only when form Add Item button is not visible) */}
          {(currentView === 'create' || currentView === 'edit') && !addItemButtonVisible && (
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

          {/* Floating Action Buttons - Only show when not creating or editing */}
          {currentView !== 'create' && currentView !== 'edit' && (
            <div className="fixed bottom-6 right-6 flex flex-col gap-3 z-50">
              {/* Search Button - Admin Only */}
              {user && isAdmin() && (
                <button
                  onClick={() => setShowSearchModal(true)}
                  className="bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white p-4 rounded-full shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-purple-500 focus:ring-opacity-50"
                  title="Search Purchase Requests"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </button>
              )}

              {/* Create Button */}
              <button
                onClick={() => setCurrentView('create')}
                className="bg-gradient-to-r from-blue-600 to-green-600 hover:from-blue-700 hover:to-green-700 text-white p-4 rounded-full shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-blue-500 focus:ring-opacity-50"
                title="Create Purchase Request"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </button>
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
          setSelectedPurchaseRequest(null); // Unselect the approval after action
          reloadPurchaseRequestsData();
        }}
        autoCloseDelay={3000}
      />

      {/* Search Modal */}
      <SearchModal
        isOpen={showSearchModal}
        onClose={() => setShowSearchModal(false)}
        onSelect={handleSelectPurchaseRequest}
        darkMode={darkMode}
        type="purchase-request"
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
