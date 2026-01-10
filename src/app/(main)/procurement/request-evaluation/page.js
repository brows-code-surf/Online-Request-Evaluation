'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/utils/authContext';
import HeaderNavBar from '../../../_components/headerNavBar';
import Loader from '@/app/_components/loader';
import ProtectedRoute from '@/utils/protectedRoute';
import ContentLeftPanel from '../../_components/contentLeftPanel';
import { SkeletonRequestEvaluationDetail } from '../../../_components/skeletonLoader';
import ConfirmModal from '../../_components/confirmModal';
import RejectRequestModal from '../../_components/rejectRequestModal';
import SuccessModal from '../../_components/successModal';
import { fetchEvaluationLeftPanel, fetchEvaluationDetails, approveEvaluation, rejectEvaluation, fetchUserAvailableStatuses, markAsRead } from './_actions/index';
import { useSocketMultiple } from '@/hooks/useSocketMultiple';
import SideNotchOpenLeftPanel from '../../_components/sideNotchOpenLeftPanel';
import SearchModal from '../../_components/SearchModal';

function RequestEvaluationContent() {
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
            const data = await fetchEvaluationLeftPanel(user?.empName, 'all', filters, isAdmin());
            setApprovals(data);
            // Update selectedApproval to match refreshed data or leave as is if not found
            if (selectedApproval) {
                const refreshedSelected = data.find(approval => approval.id === selectedApproval.id);
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
                const data = await fetchEvaluationLeftPanel(user?.empName, 'all', filters, isAdmin());
                setApprovals(data);

                // Check URL parameter for initial selection or maintain current selection
                const id = searchParams.get('id');
                // Only set initial selection if we don't have one already
                if (!selectedApproval && data.length > 0) {
                    const id = searchParams.get('id');
                    let selectApproval = data[0];
                    if (id) {
                        const urlSelected = data.find(approval => approval.id === id);
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

        loadingRef.current = true;
        // Show loader on initial load when entering the page
        if (isInitialLoad) {
            setIsInitialLoad(false);
        }
        setDetailsLoading(true);

            try {
                const details = await fetchEvaluationDetails(selectedApproval.id);
                // Only update if this is still the selected approval
                setApprovalDetails(details);
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

    // Filter and sort approvals
    const filteredApprovals = approvals
        .filter(approval => {
            const matchesSearch = searchQuery === '' ||
                [approval.requester, approval.title, approval.id, approval.status, approval.department, approval.location, approval.employeeID, approval.description, approval.isRush , approval.requestDate?.toString()].some(field =>
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
            } else if (sortBy === 'referenceNo') {
                return a.referenceNo.localeCompare(b.referenceNo);
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
            const result = await approveEvaluation(selectedApproval.id, user.empName, selectedApproval.status);
            if (result.headerUpdated) {
                setSuccessMessage({
                    title: 'Request Approved',
                    message: `The request has been successfully approved and moved to the next stage.`
                });
                setShowSuccessModal(true);
                // Re-fetch the updated request data
                await reloadApprovalsData();
                // Re-fetch the details for the current selected approval
                const details = await fetchEvaluationDetails(selectedApproval.id);
                setApprovalDetails(details);
            }
        } catch (error) {
            console.error('Error approving evaluation:', error);
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
            const result = await rejectEvaluation(selectedApproval.id, user.empName, rejectionRemarks);
            if (result.headerUpdated) {
                setSuccessMessage({
                    title: 'Request Rejected',
                    message: `The request has been successfully rejected.`
                });
                setShowSuccessModal(true);
            }
        } catch (error) {
            console.error('Error rejecting evaluation:', error);
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
            case 'FOR CONFIRMATION':
            case 'FOR PURCHASING LEAD TIME':
                return 'bg-yellow-100 text-yellow-800 border-yellow-300';
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

                    {/* Admin Search Button */}
                    {user && isAdmin() && (
                        <div className="fixed bottom-6 right-6 z-50">
                            <button
                                onClick={() => setShowSearchModal(true)}
                                className="bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white p-4 rounded-full shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-purple-500 focus:ring-opacity-50"
                                title="Search All Request Evaluations"
                            >
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                            </button>
                        </div>
                    )}

                    {selectedApproval ? (
                        <div className="flex-1 overflow-y-auto">
                            {detailsLoading ? (
                                <SkeletonRequestEvaluationDetail />
                            ) : (
                                <div className="p-6">
                                    {/* Header Info */}
                                    <div className="mb-6">
                                        <div className="flex items-start justify-between mb-4">
                                            <div className="flex-1">
                                                <h1 className={`text-3xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'} mb-2`}>
                                                    {selectedApproval.title}
                                                </h1>
                                                <div className="flex items-center gap-3">
                                                    {selectedApproval.isRush && (
                                                        <span className={`text-xs px-4 py-2 rounded-full ${darkMode ? 'bg-red-900 text-red-300' : 'bg-red-100 text-red-700'} font-semibold whitespace-nowrap`}>
                                                            {selectedApproval.isRush ? 'RUSH' : ''}
                                                        </span>
                                                    )}
                                                    <span className={`px-4 py-1 rounded-full text-sm font-semibold border ${getStatusColor(selectedApproval.status)}`}>
                                                        {selectedApproval.status}
                                                    </span>
                                                    <span className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                                                        Requested on {new Date(selectedApproval.requestDate).toLocaleDateString('en-US', {
                                                            year: 'numeric',
                                                            month: 'long',
                                                            day: 'numeric'
                                                        })}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Request Details - Combined */}
                                        <div className={`${darkMode ? 'bg-gray-800/50 border-gray-600' : 'bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200'} p-4 rounded-lg mb-6 border`}>
                                            <h3 className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'} mb-3`}>Request Details</h3>

                                            {/* Request Information - 3 Column Grid Layout */}
                                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
                                                <div>
                                                    <p className={`text-xs ${darkMode ? 'text-gray-300' : 'text-gray-600'} font-medium mb-1`}>Reference Number</p>
                                                    <p className="text-sm font-semibold text-blue-600">{selectedApproval.id}</p>
                                                </div>
                                                <div>
                                                    <p className={`text-xs ${darkMode ? 'text-gray-300' : 'text-gray-600'} font-medium mb-1`}>Requested By</p>
                                                    <p className={`text-sm font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{selectedApproval.requester}</p>
                                                </div>
                                                <div>
                                                    <p className={`text-xs ${darkMode ? 'text-gray-300' : 'text-gray-600'} font-medium mb-1`}>Company / Location</p>
                                                    <p className={`text-sm font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{selectedApproval.department} - {selectedApproval.location}</p>
                                                </div>
                                            </div>

                                            {/* Assigned Persons - 3 Column Grid Layout */}
                                            {approvalDetails.length > 0 && (
                                                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                                    <div>
                                                        <p className={`text-xs ${darkMode ? 'text-gray-300' : 'text-gray-600'} font-medium mb-1`}>Reviewer</p>
                                                        <p className={`text-sm font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                                                            {approvalDetails[0]?.REVIEWER ? (
                                                                <>
                                                                    {approvalDetails[0].REVIEWER}
                                                                    {approvalDetails[0]?.DATEREVIEWED ? (
                                                                        <span className={`text-xs ${darkMode ? 'text-green-400' : 'text-green-600'} ml-2`}>
                                                                            [REVIEWED: {formatDateTime(approvalDetails[0].DATEREVIEWED)}]
                                                                        </span>
                                                                    ) : (
                                                                        <span className={`text-xs ${darkMode ? 'text-orange-400' : 'text-orange-600'} ml-2`}>
                                                                            [PENDING]
                                                                        </span>
                                                                    )}
                                                                </>
                                                            ) : (
                                                                <span className={`text-sm ${darkMode ? 'text-orange-400' : 'text-orange-600'}`}>
                                                                    [No Reviewer Assigned]
                                                                </span>
                                                            )}
                                                        </p>
                                                    </div>
                                                    <div>
                                                        <p className={`text-xs ${darkMode ? 'text-gray-300' : 'text-gray-600'} font-medium mb-1`}>Approver</p>
                                                        <p className={`text-sm font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                                                            {approvalDetails[0]?.APPROVER ? (
                                                                <>
                                                                    {approvalDetails[0].APPROVER}
                                                                    {approvalDetails[0]?.DATEAPPROVED ? (
                                                                        <span className={`text-xs ${darkMode ? 'text-green-400' : 'text-green-600'} ml-2`}>
                                                                            [APPROVED: {formatDateTime(approvalDetails[0].DATEAPPROVED)}]
                                                                        </span>
                                                                    ) : (
                                                                        <span className={`text-xs ${darkMode ? 'text-orange-400' : 'text-orange-600'} ml-2`}>
                                                                            [PENDING]
                                                                        </span>
                                                                    )}
                                                                </>
                                                            ) : (
                                                                <span className={`text-sm ${darkMode ? 'text-orange-400' : 'text-orange-600'}`}>
                                                                    [No Approver Assigned]
                                                                </span>
                                                            )}
                                                        </p>
                                                    </div>
                                                    <div>
                                                        <p className={`text-xs ${darkMode ? 'text-gray-300' : 'text-gray-600'} font-medium mb-1`}>Addressed To</p>
                                                        <p className={`text-sm font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                                                            {approvalDetails[0]?.ADDRESSEDTO ? (
                                                                <>
                                                                    {approvalDetails[0].ADDRESSEDTO}
                                                                    {approvalDetails[0]?.DATERECEIVED ? (
                                                                        <span className={`text-xs ${darkMode ? 'text-green-400' : 'text-green-600'} ml-2`}>
                                                                            [RECEIVED: {formatDateTime(approvalDetails[0].DATERECEIVED)}]
                                                                        </span>
                                                                    ) : (
                                                                        <span className={`text-xs ${darkMode ? 'text-orange-400' : 'text-orange-600'} ml-2`}>
                                                                            [PENDING]
                                                                        </span>
                                                                    )}
                                                                </>
                                                            ) : (
                                                                <span className={`text-sm ${darkMode ? 'text-orange-400' : 'text-orange-600'}`}>
                                                                    [No Recipient Assigned]
                                                                </span>
                                                            )}
                                                        </p>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                        </div>

                                        {/* Remarks */}
                                        {selectedApproval.description && (
                                            <div className="mb-6">
                                                <h3 className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'} mb-3`}>Remarks</h3>
                                                <p className={`leading-relaxed p-4 rounded-lg border ${darkMode ? 'text-gray-300 bg-gray-800 border-gray-600' : 'text-gray-700 bg-gray-50 border-gray-200'}`}>
                                                    {selectedApproval.description}
                                                </p>
                                            </div>
                                        )}

                                        {/* Cancel Remarks */}
                                        {(selectedApproval.status === 'REJECTED' || selectedApproval.status === 'CANCELLED') && (
                                            <div className="mb-6">
                                                <h3 className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'} mb-3`}>
                                                    {selectedApproval.status === 'REJECTED' ? 'Rejection Reason' : 'Cancellation Reason'}
                                                </h3>
                                                <div className={`leading-relaxed p-4 rounded-lg border ${darkMode ? 'text-gray-300 bg-red-900/20 border-red-600' : 'text-gray-700 bg-red-50 border-red-200'}`}>
                                                    <div className="flex items-start gap-3">
                                                        <svg className={`w-5 h-5 mt-0.5 flex-shrink-0 ${selectedApproval.status === 'REJECTED' ? 'text-red-500' : 'text-orange-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                                                        </svg>
                                                        <p className="flex-1">
                                                            {approvalDetails.length > 0 && approvalDetails[0].CANCELREMARKS && approvalDetails[0].CANCELREMARKS.trim()
                                                                ? approvalDetails[0].CANCELREMARKS
                                                                : 'No reason provided'
                                                            }
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {/* Items Table */}
                                        <div className="mb-6">
                                            <h3 className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'} mb-3`}>Request Items</h3>
                                            <div className={`overflow-x-auto border ${darkMode ? 'border-gray-600' : 'border-gray-200'} rounded-lg`}>
                                                <table className="w-full">
                                                    <thead className={`${darkMode ? 'bg-gray-700' : 'bg-gray-100'} border-b ${darkMode ? 'border-gray-600' : 'border-gray-200'}`}>
                                                        <tr>
                                                            <th className={`px-4 py-3 text-left text-xs font-semibold ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>Item Code</th>
                                                            <th className={`px-4 py-3 text-left text-xs font-semibold ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>Item Description</th>
                                                            <th className={`px-4 py-3 text-left text-xs font-semibold ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>UOFM</th>
                                                            <th className={`px-4 py-3 text-right text-xs font-semibold ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>Quantity</th>
                                                            <th className={`px-4 py-3 text-left text-xs font-semibold ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>Budget Code</th>
                                                            <th className={`px-4 py-3 text-left text-xs font-semibold ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>Date Needed</th>
                                                            <th className={`px-4 py-3 text-left text-xs font-semibold ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>Remarks</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {approvalDetails && approvalDetails.length > 0 ? (
                                                            approvalDetails.map((item, index) => (
                                                                <tr key={index} className={`border-b ${darkMode ? 'border-gray-600' : 'border-gray-200'} ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-50'} transition`}>
                                                                    <td className={`px-4 py-3 text-sm ${darkMode ? 'text-white' : 'text-gray-900'}`}>{item.ITEMNMBR || '-'}</td>
                                                                    <td className={`px-4 py-3 text-sm ${darkMode ? 'text-white' : 'text-gray-900'}`}>{item.ITEMDESC || '-'}</td>
                                                                    <td className={`px-4 py-3 text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>{item.UOFM || '-'}</td>
                                                                    <td className={`px-4 py-3 text-sm ${darkMode ? 'text-white' : 'text-gray-900'} text-right font-semibold`}>{item.QUANTITY || 0}</td>
                                                                    <td className={`px-4 py-3 text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>{item.BUDGETCODE || '-'}</td>
                                                                    <td className={`px-4 py-3 text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                                                                        {item.DATENEEDED ? new Date(item.DATENEEDED).toLocaleDateString('en-US', {
                                                                            year: 'numeric',
                                                                            month: 'short',
                                                                            day: 'numeric'
                                                                        }) : '-'}
                                                                    </td>
                                                                    <td className={`px-4 py-3 text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>{item.remarks || '-'}</td>
                                                                </tr>
                                                            ))
                                                        ) : (
                                                            <tr>
                                                                <td colSpan="8" className={`px-4 py-6 text-center ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                                                    No items found for this request
                                                                </td>
                                                            </tr>
                                                        )}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>

                                        {/* Actions */}
                                        {(selectedApproval.status === 'FOR REQUEST APPROVAL' || selectedApproval.status === 'FOR CONFIRMATION' || selectedApproval.status === 'FOR PURCHASING LEAD TIME') && (
                                            <div className={`flex gap-3 pt-6 border-t ${darkMode ? 'border-gray-600' : 'border-gray-200'}`}>
                                                <button
                                                    onClick={handleApproveClick}
                                                    className="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-4 rounded-lg transition flex items-center justify-center gap-2"
                                                >
                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                    </svg>
                                                    Approve
                                                </button>
                                                <button
                                                    onClick={handleRejectClick}
                                                    className="flex-1 bg-red-600 hover:bg-red-700 text-white font-semibold py-3 px-4 rounded-lg transition flex items-center justify-center gap-2"
                                                >
                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                    </svg>
                                                    Reject
                                                </button>
                                            </div>
                                        )}

                                        {(selectedApproval.status === 'APPROVED' || selectedApproval.status === 'REJECTED') && (
                                            <div className={`pt-6 border-t ${darkMode ? 'border-gray-600' : 'border-gray-200'}`}>
                                                <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'} text-center`}>
                                                    This request has been {selectedApproval.status.toLowerCase()}.
                                                </p>
                                            </div>
                                        )}
                                    </div>
                            )}
                        </div>
                    ) : (
                        <div className="flex items-center justify-center h-full">
                            <div className={`text-center ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                <svg className="w-16 h-16 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <p className="text-lg font-medium">Select a request to view details</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Modals */}
            <ConfirmModal
                isOpen={showApproveModal}
                title="Approve Request"
                message={`Are you sure you want to approve this request? It will move to the next stage in the workflow.`}
                confirmButtonText="Approve"
                confirmButtonColor="green"
                isLoading={isSubmitting}
                onConfirm={handleApproveConfirm}
                onCancel={() => setShowApproveModal(false)}
            />

            <RejectRequestModal
                isOpen={showRejectModal}
                remarks={rejectionRemarks}
                onRemarksChange={setRejectionRemarks}
                onConfirm={handleRejectConfirm}
                onCancel={() => {
                    setShowRejectModal(false);
                    setRejectionRemarks('');
                }}
                isLoading={isSubmitting}
            />

            <SuccessModal
                isOpen={showSuccessModal}
                title={successMessage.title}
                message={successMessage.message}
                onClose={() => {
                    setShowSuccessModal(false);
                    // Only unselect the approval after action if not an admin bypass
                    if (!isAdmin()) {
                        setSelectedApproval(null);
                    }
                    // reloadApprovalsData();
                }}
                autoCloseDelay={3000}
            />

            {/* Search Modal */}
            <SearchModal
                isOpen={showSearchModal}
                onClose={() => setShowSearchModal(false)}
                onSelect={handleSelectApproval}
                darkMode={darkMode}
                type="request-evaluation"
            />
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
