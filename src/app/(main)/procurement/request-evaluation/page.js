'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/utils/authContext';
import HeaderNavBar from '../../../_components/headerNavBar';
import Loader from '@/app/_components/loader';
import ProtectedRoute from '@/utils/protectedRoute';
import ContentLeftPanel from '../../_components/contentLeftPanel';
import { fetchEvaluationLeftPanel, fetchEvaluationDetails, approveEvaluation, rejectEvaluation, fetchUserAvailableStatuses, markAsRead, fetchPurchaseOrderEvaluationsLeftPanel, fetchPurchaseOrderDetails, confirmPurchaseOrder, approvePurchaseOrder, rejectPurchaseOrder } from './_actions/index';
import { useSocketMultiple } from '@/hooks/useSocketMultiple';
import SideNotchOpenLeftPanel from '../../_components/sideNotchOpenLeftPanel';
import PurchaseRequestDetails from './_components/PurchaseRequestDetails';
import PurchaseOrderDetails from './_components/PurchaseOrderDetails';

function RequestEvaluationContent() {
    //#region EVENTS AND STATES
    const { user, darkMode, isAdmin } = useAuth();
    const router = useRouter();
    const searchParams = useSearchParams();
    const loadingRef = useRef(false);
    const [selectedApproval, setSelectedApproval] = useState(null);
    const [approvalDetails, setApprovalDetails] = useState([]);
    const [approvals, setApprovals] = useState([]);
    const [loading, setLoading] = useState(false);
    const [detailsLoading, setDetailsLoading] = useState(false);
    const [isInitialLoad, setIsInitialLoad] = useState(true);
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [sortBy, setSortBy] = useState('date');
    const [filterStatus, setFilterStatus] = useState('');
    const [filterDepartment, setFilterDepartment] = useState('');
    const [filterLocation, setFilterLocation] = useState('');
    const [filterStartDate, setFilterStartDate] = useState('');
    const [filterEndDate, setFilterEndDate] = useState('');
    const [showApproveModal, setShowApproveModal] = useState(false);
    const [showRejectModal, setShowRejectModal] = useState(false);
    const [rejectionRemarks, setRejectionRemarks] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [successMessage, setSuccessMessage] = useState({ title: '', message: '' });
    const [showSearchModal, setShowSearchModal] = useState(false);

    // Helper function to format date and time
    const formatDateTime = (date) => {
        if (!date) return '-';
        return new Date(date).toLocaleString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            timeZone: 'UTC'
        });
    };

    // Function to reload approvals data without page refresh
    const reloadApprovalsData = async () => {
        try {
            const filters = {
                status: 'all',
                department: filterDepartment,
                location: filterLocation,
                startDate: filterStartDate,
                endDate: filterEndDate
            };
            // Fetch both purchase requests and purchase orders
            const [requestData, poData] = await Promise.all([
                fetchEvaluationLeftPanel(user?.empName, 'all', filters, isAdmin()),
                fetchPurchaseOrderEvaluationsLeftPanel(user?.empName, 'all', isAdmin())
            ]);
            
            // Merge and deduplicate the lists
            const combinedData = [...requestData, ...poData];
            setApprovals(combinedData);
            
            // Update selectedApproval to match refreshed data or leave as is if not found
            if (selectedApproval) {
                const refreshedSelected = combinedData.find(approval => approval.id === selectedApproval.id);
                if (refreshedSelected) {
                    setSelectedApproval(refreshedSelected);
                }
                // If not found, keep the current selectedApproval to stay on it
            }
        } catch (error) {
            console.error('Failed to reload approvals:', error);
        }
    };

    useEffect(() => {
        const loadApprovals = async () => {
            if (!user?.empName) return;
            try {
                const filters = {
                    status: 'all',
                    department: filterDepartment,
                    location: filterLocation,
                    startDate: filterStartDate,
                    endDate: filterEndDate
                };
                
                // Fetch both purchase requests and purchase orders in parallel
                const [requestData, poData] = await Promise.all([
                    fetchEvaluationLeftPanel(user?.empName, 'all', filters, isAdmin()),
                    fetchPurchaseOrderEvaluationsLeftPanel(user?.empName, 'all', isAdmin())
                ]);
                
                console.log('Request data:', requestData?.length || 0, 'PO data:', poData?.length || 0);
                
                // Merge and deduplicate the lists
                const combinedData = [...requestData, ...poData];
                console.log('Combined data:', combinedData.length);
                if (combinedData.length > 0) {
                    console.log('First item:', combinedData[0].id, combinedData[0].status);
                }
                setApprovals(combinedData);

                // Check URL parameter for initial selection or maintain current selection
                const id = searchParams.get('id');
                // Only set initial selection if we don't have one already
                if (!selectedApproval && combinedData.length > 0) {
                    const id = searchParams.get('id');
                    let selectApproval = combinedData[0];
                    if (id) {
                        const urlSelected = combinedData.find(approval => approval.id === id);
                        if (urlSelected) {
                            selectApproval = urlSelected;
                        }
                    }
                    setSelectedApproval(selectApproval);
                }
            } catch (error) {
                console.error('Failed to load approvals:', error);
            } finally {
                setLoading(false);
            }
        };

        loadApprovals();
    }, [user?.empName, filterDepartment, filterLocation, filterStartDate, filterEndDate, selectedApproval?.id, isAdmin]); // Added selectedApproval?.id back to dependencies

    // Initialize filter status based on user's available statuses
    useEffect(() => {
        const initializeFilterStatus = async () => {
            if (user?.empName) {
                try {
                    const availableStatuses = await fetchUserAvailableStatuses(user.empName);
                    if (availableStatuses && availableStatuses.length > 0) {
                        // For request-evaluation page, set filter to 'all' to show all relevant requests
                        setFilterStatus('all');
                    }
                } catch (error) {
                    console.error('Failed to fetch user statuses:', error);
                    setFilterStatus('all'); // fallback
                }
            }
        };

        initializeFilterStatus();
    }, [user?.empName]);

    useEffect(() => {
        const loadDetails = async () => {
            // Prevent concurrent loads
            if (loadingRef.current || !selectedApproval) return;

            // Do not fetch details for requests/POs not in For Confirmation, For Request Approval, For Purchasing Lead Time, or PO statuses
            const allowedStatuses = ['FOR CONFIRMATION', 'FOR REQUEST APPROVAL', 'FOR PURCHASING LEAD TIME', 'FOR P.O. CONFIRMATION', 'FOR P.O. APPROVAL'];
            if (!allowedStatuses.includes(selectedApproval.status)) {
                setApprovalDetails([]);
                setDetailsLoading(false);
                loadingRef.current = false;
                return;
            }

            loadingRef.current = true;
            // Show loader on initial load when entering the page
            if (isInitialLoad) {
                setIsInitialLoad(false);
            }
            setDetailsLoading(true);

            try {
                if (selectedApproval.header) {
                    // It's a purchase order
                    const poData = await fetchPurchaseOrderDetails(selectedApproval.id);
                    if (poData) {
                        // Update selectedApproval with the detailed PO data, keeping the id
                        setSelectedApproval({ ...poData, id: selectedApproval.id });
                        // For approvalDetails, try to fetch request details if prList exists
                        if (poData.header.prList && poData.header.prList.trim()) {
                            const prNumbers = poData.header.prList.split(',').map(pr => pr.trim()).filter(pr => pr);
                            if (prNumbers.length > 0) {
                                const requestDetails = await fetchEvaluationDetails(prNumbers[0]);
                                setApprovalDetails(requestDetails);
                            } else {
                                setApprovalDetails([]);
                            }
                        } else {
                            setApprovalDetails([]);
                        }
                    } else {
                        setApprovalDetails([]);
                    }
                } else {
                    // It's a purchase request
                    const details = await fetchEvaluationDetails(selectedApproval.id);
                    setApprovalDetails(details);
                }
            } catch (error) {
                console.error('Failed to load approval details:', error);
                setApprovalDetails([]);
            } finally {
                setDetailsLoading(false);
                loadingRef.current = false;
            }
        };

        loadDetails();
    }, [selectedApproval?.id]);

    // Handle approval selection without redundant loading
    const handleSelectApproval = (approval) => {
        setSelectedApproval(approval);
        // Update URL with selected id to persist selection
        router.replace(`?id=${encodeURIComponent(approval.id)}`);
        // Details will be loaded by useEffect
    };

    // Filter and sort approvals - only show requests/POs that need evaluation
    const filteredApprovals = approvals
        .filter(approval => {
            // Only show requests/POs in evaluation statuses
            const allowedStatuses = ['FOR CONFIRMATION', 'FOR REQUEST APPROVAL', 'FOR PURCHASING LEAD TIME', 'FOR P.O. CONFIRMATION', 'FOR P.O. APPROVAL'];
            const isEvaluationStatus = allowedStatuses.includes(approval.status);

            const matchesSearch = searchQuery === '' ||
                [approval.requester, approval.title, approval.id, approval.status, approval.department, approval.location, approval.employeeID, approval.description, approval.isRush, approval.requestDate?.toString()].some(field =>
                    field?.toString().toLowerCase().includes(searchQuery.toLowerCase())
                );

            const matchesStatus = filterStatus === 'all' || filterStatus === '' ||
                (filterStatus === 'RUSH' ? approval.isRush : approval.status === filterStatus);

            return isEvaluationStatus && matchesSearch && matchesStatus;
        })
        .sort((a, b) => {
            if (sortBy === 'date') {
                const dateA = a.requestDate || a.dateCreated;
                const dateB = b.requestDate || b.dateCreated;
                return new Date(dateB) - new Date(dateA);
            } else if (sortBy === 'requester') {
                return (a.requester || '').localeCompare(b.requester || '');
            } else if (sortBy === 'status') {
                return a.status.localeCompare(b.status);
            } else if (sortBy === 'referenceNo') {
                return (a.referenceNo || a.id || '').localeCompare(b.referenceNo || b.id || '');
            }
            return 0;
        });

    const handleApproveClick = () => {
        setShowApproveModal(true);
    };

    const handleApproveConfirm = async () => {
        if (!selectedApproval || !user?.empName) return;

        setIsSubmitting(true);
        try {
            let result;
            if (selectedApproval.header) {
                // It's a purchase order - normalize status for comparison
                let poStatus = String(selectedApproval.header.poStatus || '').trim().toUpperCase();
                console.log('PO Status for approval (raw):', poStatus);
                
                // Handle potential database duplication issue
                // If status appears twice consecutively, return just once
                const statusPatterns = [
                    'FOR P.O. CONFIRMATION',
                    'FOR P.O. APPROVAL',
                    'P.O. APPROVED',
                    'PENDING'
                ];

                for (const pattern of statusPatterns) {
                    if (poStatus === pattern + pattern || poStatus === pattern + ' ' + pattern || poStatus === pattern + ',' + pattern) {
                        poStatus = pattern;
                        break;
                    }
                }

                // If comma-separated duplicates, take the first unique part
                if (poStatus.includes(',')) {
                    const parts = poStatus.split(',').map(p => p.trim());
                    const uniqueParts = [...new Set(parts)];
                    if (uniqueParts.length === 1) {
                        poStatus = uniqueParts[0];
                    }
                }

                console.log('PO Status for approval (normalized):', poStatus);
                
                if (poStatus === 'FOR P.O. CONFIRMATION') {
                    result = await confirmPurchaseOrder(selectedApproval.id, user.empName, isAdmin());
                } else if (poStatus === 'FOR P.O. APPROVAL') {
                    result = await approvePurchaseOrder(selectedApproval.id, user.empName);
                } else {
                    console.error('Unknown PO status:', poStatus);
                    setSuccessMessage({
                        title: 'Approval Error',
                        message: `Cannot approve purchase order with status: ${poStatus}. Expected 'FOR P.O. CONFIRMATION' or 'FOR P.O. APPROVAL'.`
                    });
                    setShowSuccessModal(true);
                }
            }

            console.log('Approval result:', result);

            if (result && (result.headerUpdated || result.success)) {
                setSuccessMessage({
                    title: selectedApproval.header ? 'Purchase Order Approved' : 'Request Approved',
                    message: `The ${selectedApproval.header ? 'purchase order' : 'request'} has been successfully approved and moved to the next stage.`
                });
                setShowSuccessModal(true);
                // Re-fetch the updated data
                await reloadApprovalsData();
                // Re-fetch the details for the current selected approval
                if (selectedApproval.header) {
                    const poData = await fetchPurchaseOrderDetails(selectedApproval.id);
                    if (poData) {
                        setSelectedApproval({ ...poData, id: selectedApproval.id });
                    }
                } else {
                    const details = await fetchEvaluationDetails(selectedApproval.id);
                    setApprovalDetails(details);
                }
            } else if (result) {
                // Result exists but doesn't have expected properties
                console.error('Unexpected result structure:', result);
                setSuccessMessage({
                    title: 'Approval Issue',
                    message: result.message || 'The approval was processed but the response was unexpected. Please refresh to see the updated status.'
                });
                setShowSuccessModal(true);
                await reloadApprovalsData();
            }
        } catch (error) {
            console.error('Error approving:', error);
            setSuccessMessage({
                title: 'Approval Failed',
                message: `An error occurred while approving: ${error.message || 'Unknown error'}. Please try again.`
            });
            setShowSuccessModal(true);
        } finally {
            setIsSubmitting(false);
            setShowApproveModal(false);

        }
    };

    const handleRejectClick = () => {
        setShowRejectModal(true);
    };

    const handleRejectConfirm = async () => {
        if (!selectedApproval || !user?.empName) return;

        setIsSubmitting(true);
        try {
            let result;
            if (selectedApproval.header) {
                // It's a purchase order
                result = await rejectPurchaseOrder(selectedApproval.id, user.empName, rejectionRemarks);
            } else {
                // It's a purchase request
                result = await rejectEvaluation(selectedApproval.id, user.empName, rejectionRemarks);
            }

            if (result && (result.headerUpdated || result.success)) {
                setSuccessMessage({
                    title: selectedApproval.header ? 'Purchase Order Rejected' : 'Request Rejected',
                    message: `The ${selectedApproval.header ? 'purchase order' : 'request'} has been successfully rejected.`
                });
                setShowSuccessModal(true);
                // Re-fetch the updated data
                await reloadApprovalsData();
            }
        } catch (error) {
            console.error('Error rejecting:', error);
        } finally {
            setIsSubmitting(false);
            setShowRejectModal(false);
            setRejectionRemarks('');
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'APPROVED':
                return 'bg-green-100 text-green-800 border-green-300';
            case 'REJECTED':
                return 'bg-red-100 text-red-800 border-red-300';
            case 'FOR REQUEST APPROVAL':
                return 'bg-yellow-100 text-yellow-800 border-yellow-300';
            case 'FOR CONFIRMATION':
                return 'bg-blue-100 text-blue-800 border-blue-300';
            case 'FOR PURCHASING LEAD TIME':
                return 'bg-orange-100 text-orange-800 border-orange-300';
            case 'FOR P.O. CONFIRMATION':
                return 'bg-blue-100 text-blue-800 border-blue-300';
            case 'FOR P.O. APPROVAL':
                return 'bg-orange-100 text-orange-800 border-orange-300';
            default:
                return 'bg-gray-100 text-gray-800 border-gray-300';
        }
    };

    const handleMarkAsRead = async (referenceNo) => {
        // Optimistic update: update local state first
        setApprovals(prevApprovals =>
            prevApprovals.map(approval =>
                approval.id === referenceNo ? { ...approval, isRead: 'READ' } : approval
            )
        );

        try {
            await markAsRead(referenceNo, user?.empName);
        } catch (error) {
            // Revert on error
            setApprovals(prevApprovals =>
                prevApprovals.map(approval =>
                    approval.id === referenceNo ? { ...approval, isRead: 'NOT READ' } : approval
                )
            );
            console.error('Failed to mark as read:', error);
        }
    };

    useSocketMultiple("request-evaluation-broadcast", {
        "request-approved": useCallback(
            (data) => {
                console.log("Request approved event received:", data);
                reloadApprovalsData();
            },
            [filterStatus, filterDepartment, filterLocation, filterStartDate, filterEndDate, user?.empName]
        ),

        "request-rejected": useCallback(
            (data) => {
                console.log("Request rejected event received:", data);
                reloadApprovalsData();
            },
            [filterStatus, filterDepartment, filterLocation, filterStartDate, filterEndDate, user?.empName]
        ),

        "request-changed": useCallback(
            (data) => {
                console.log("Request changed event received:", data);
                reloadApprovalsData();
            },
            [filterStatus, filterDepartment, filterLocation, filterStartDate, filterEndDate, user?.empName]
        ),

        "purchase-request-posted": useCallback(
            (data) => {
                console.log("Purchase request posted event received:", data);
                reloadApprovalsData();
            },
            [filterStatus, filterDepartment, filterLocation, filterStartDate, filterEndDate, user?.empName]
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
    //#endregion

    return (
        <div className={`flex flex-col h-screen ${darkMode ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'}`}>
            <Loader loading={loading} />
            <HeaderNavBar />
            <div className="flex flex-1 overflow-hidden pt-14">

                {/* Left Panel - Using ContentLeftPanel Component */}
                <ContentLeftPanel
                    sidebarOpen={sidebarOpen}
                    onSidebarClose={() => setSidebarOpen(false)}
                    headerTitle="Online Requests for Evaluation"
                    searchQuery={searchQuery}
                    onSearchChange={setSearchQuery}
                    filterStatus={filterStatus}
                    onFilterStatusChange={setFilterStatus}
                    sortBy={sortBy}
                    onSortByChange={setSortBy}
                    approvals={filteredApprovals}
                    selectedApprovalId={selectedApproval?.id}
                    onApprovalSelect={handleSelectApproval}
                    getStatusColor={getStatusColor}
                    filterType="request-evaluation"
                    enableReadStatus={true}
                    onMarkAsRead={handleMarkAsRead}
                    isLoading={loading}
                />

                {/* Right Panel - Details */}
                <div className="flex-1 flex flex-col overflow-hidden">
                    <SideNotchOpenLeftPanel
                        sidebarOpen={sidebarOpen}
                        setSidebarOpen={setSidebarOpen}
                    />

                    {/* Check if it's a purchase order (has poNumber or header) */}
                    {selectedApproval?.header ? (
                        <PurchaseOrderDetails
                            selectedApproval={selectedApproval}
                            approvalDetails={approvalDetails}
                            detailsLoading={detailsLoading}
                            darkMode={darkMode}
                            user={user}
                            isAdmin={isAdmin}
                            showApproveModal={showApproveModal}
                            showRejectModal={showRejectModal}
                            showSuccessModal={showSuccessModal}
                            rejectionRemarks={rejectionRemarks}
                            successMessage={successMessage}
                            isSubmitting={isSubmitting}
                            formatDateTime={formatDateTime}
                            getStatusColor={getStatusColor}
                            handleApproveClick={handleApproveClick}
                            handleApproveConfirm={handleApproveConfirm}
                            handleRejectClick={handleRejectClick}
                            handleRejectConfirm={handleRejectConfirm}
                            handleSelectApproval={handleSelectApproval}
                            setShowApproveModal={setShowApproveModal}
                            setShowRejectModal={setShowRejectModal}
                            setShowSuccessModal={setShowSuccessModal}
                            setRejectionRemarks={setRejectionRemarks}
                            setSelectedApproval={setSelectedApproval}
                        />
                    ) : (
                        <PurchaseRequestDetails
                            selectedApproval={selectedApproval}
                            approvalDetails={approvalDetails}
                            detailsLoading={detailsLoading}
                            darkMode={darkMode}
                            user={user}
                            isAdmin={isAdmin}
                            showApproveModal={showApproveModal}
                            showRejectModal={showRejectModal}
                            showSuccessModal={showSuccessModal}
                            showSearchModal={showSearchModal}
                            rejectionRemarks={rejectionRemarks}
                            successMessage={successMessage}
                            isSubmitting={isSubmitting}
                            formatDateTime={formatDateTime}
                            getStatusColor={getStatusColor}
                            handleApproveClick={handleApproveClick}
                            handleApproveConfirm={handleApproveConfirm}
                            handleRejectClick={handleRejectClick}
                            handleRejectConfirm={handleRejectConfirm}
                            handleSelectApproval={handleSelectApproval}
                            setShowApproveModal={setShowApproveModal}
                            setShowRejectModal={setShowRejectModal}
                            setShowSuccessModal={setShowSuccessModal}
                            setShowSearchModal={setShowSearchModal}
                            setRejectionRemarks={setRejectionRemarks}
                            setSelectedApproval={setSelectedApproval}
                        />
                    )}
                </div>
            </div>

        </div>
    );
}

export default function RequestEvaluationPage() {
    return (
        <ProtectedRoute>
            <RequestEvaluationContent />
        </ProtectedRoute>
    );
}
