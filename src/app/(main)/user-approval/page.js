'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import HeaderNavBar from '../../_components/headerNavBar';
import Loader from '@/app/_components/loader';
import ProtectedRoute from '@/utils/protectedRoute';
import { useAuth } from '../../../utils/authContext';
import ContentLeftPanel from '../_components/contentLeftPanel';
import RejectRequestModal from '../_components/rejectRequestModal';
import ConfirmModal from '../_components/confirmModal';
import { getPendingApprovals, approveUserAccount, rejectUserAccount } from './_actions';

function RequestEvaluationContent() {
    const router = useRouter();
    const { user, isAdmin, loading } = useAuth();
    const [selectedApproval, setSelectedApproval] = useState(null);
    const [approvals, setApprovals] = useState([]);
    const [pageLoading, setPageLoading] = useState(true);
    const [detailsLoading, setDetailsLoading] = useState(false);
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [sortBy, setSortBy] = useState('date');
    const [filterStatus, setFilterStatus] = useState('all');
    const [showRejectModal, setShowRejectModal] = useState(false);
    const [rejectRemarks, setRejectRemarks] = useState('');
    const [rejectingId, setRejectingId] = useState(null);
    const [isRejectingLoading, setIsRejectingLoading] = useState(false);
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [approvingId, setApprovingId] = useState(null);
    const [isApprovingLoading, setIsApprovingLoading] = useState(false);

    useEffect(() => {
        if (loading) return;

        if (!isAdmin()) {
            router.push('/request-evaluation');
            return;
        }
        
        fetchApprovals();
    }, [loading]);

    const fetchApprovals = async () => {
        setPageLoading(true);
        try {
            const result = await getPendingApprovals();
            if (result.success) {
                setApprovals(result.data);
                if (result.data.length > 0) {
                    setSelectedApproval(result.data[0]);
                }
            }
        } catch (error) {
            console.error('Error fetching approvals:', error);
        } finally {
            setPageLoading(false);
        }
    };

    // Handle approval selection
    const handleSelectApproval = (approval) => {
        setDetailsLoading(true);
        setTimeout(() => {
            setSelectedApproval(approval);
            setDetailsLoading(false);
        }, 300);
    };

    // Filter and sort approvals
    const filteredApprovals = approvals
        .filter(approval => {
            const matchesSearch = approval.requester.toLowerCase().includes(searchQuery.toLowerCase()) ||
                approval.title.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesStatus = filterStatus === 'all' || approval.status === filterStatus;
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
    

    const handleApproveClick = (id) => {
        setApprovingId(id);
        setShowConfirmModal(true);
    }

    // Handle approve/reject actions
    const handleApprove = async () => {
        setIsApprovingLoading(true);
        const approval = approvals.find(a => a.id === approvingId);
        if (approval) {
            const result = await approveUserAccount(approvingId, approval.email, approval.requester, user?.empName || 'Admin');
            if (result.success) {
                setApprovals(approvals.map(a =>
                    a.id === approvingId ? { ...a, status: 'approved', dateProcessed: new Date().toISOString().split('T')[0], processedBy: user?.empName, remarks: 'Validated and approved' } : a
                ));
                const updated = approvals.find(a => a.id === approvingId);
                if (updated) {
                    setSelectedApproval({ ...updated, status: 'approved', dateProcessed: new Date().toISOString().split('T')[0], processedBy: user?.empName, remarks: 'Validated and approved' });
                }
                setShowConfirmModal(false);
                setApprovingId(null);
            }
        }
        setIsApprovingLoading(false);
    };

    const handleRejectClick = (id) => {
        setRejectingId(id);
        setRejectRemarks('');
        setShowRejectModal(true);
    };

    const handleConfirmReject = async () => {
        if (!rejectRemarks.trim()) {
            alert('Please provide remarks for rejection');
            return;
        }

        setIsRejectingLoading(true);
        const approval = approvals.find(a => a.id === rejectingId);
        if (approval) {
            const result = await rejectUserAccount(rejectingId, approval.email, approval.requester, user?.empName || 'Admin', rejectRemarks);
            if (result.success) {
                setApprovals(approvals.map(a =>
                    a.id === rejectingId ? { ...a, status: 'rejected', dateProcessed: new Date().toISOString().split('T')[0], processedBy: user?.empName } : a
                ));
                const updated = approvals.find(a => a.id === rejectingId);
                if (updated) {
                    setSelectedApproval({ ...updated, status: 'rejected', dateProcessed: new Date().toISOString().split('T')[0], processedBy: user?.empName });
                }
                setShowRejectModal(false);
                setRejectRemarks('');
                setRejectingId(null);
            }
        }
        setIsRejectingLoading(false);
    };

    const handleCancelReject = () => {
        setShowRejectModal(false);
        setRejectRemarks('');
        setRejectingId(null);
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'approved':
                return 'bg-green-100 text-green-800 border-green-300';
            case 'rejected':
                return 'bg-red-100 text-red-800 border-red-300';
            case 'pending':
                return 'bg-yellow-100 text-yellow-800 border-yellow-300';
            default:
                return 'bg-gray-100 text-gray-800 border-gray-300';
        }
    };

    if (loading || pageLoading) {
        return (
            <div className="flex flex-col h-screen bg-gray-50">
                <Loader />
                <HeaderNavBar />
            </div>
        );
    }

    return (
        <div className="flex flex-col h-screen bg-gray-50">
            <Loader />
            <HeaderNavBar />

            <div className="flex flex-1 overflow-hidden pt-14">

                {/* Left Panel - Approvals List */}
                <ContentLeftPanel
                    sidebarOpen={sidebarOpen}
                    onSidebarClose={() => setSidebarOpen(false)}
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
                />

                {/* Right Panel - Details */}
                <div className="flex-1 flex flex-col overflow-hidden">
                    {!sidebarOpen && (
                        <button
                            onClick={() => setSidebarOpen(true)}
                            className="md:hidden absolute top-20 left-4 bg-blue-600 text-white p-2 rounded-lg shadow-lg z-40"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                        </button>
                    )}

                    {selectedApproval ? (
                        <div className="flex-1 overflow-y-auto">
                            {detailsLoading ? (
                                <Loader />
                            ) : (
                                <div className="p-6">
                                    <div className="mb-6">
                                        <div className="flex items-start justify-between mb-4">
                                            <div className="flex-1">
                                                <h1 className="text-3xl font-bold text-gray-900 mb-2">
                                                    {selectedApproval.title}
                                                </h1>
                                                <div className="flex items-center gap-3">
                                                    <span className={`px-4 py-1 rounded-full text-sm font-semibold border ${getStatusColor(selectedApproval.status)}`}>
                                                        {selectedApproval.status.charAt(0).toUpperCase() + selectedApproval.status.slice(1)}
                                                    </span>
                                                    <span className="text-sm text-gray-600">
                                                        Requested on {new Date(selectedApproval.requestDate).toLocaleDateString('en-US', {
                                                            year: 'numeric',
                                                            month: 'long',
                                                            day: 'numeric'
                                                        })}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Requester Info */}
                                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg mb-6 border border-blue-200">
                                        <h3 className="font-semibold text-gray-900 mb-3">Requester Information</h3>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <p className="text-xs text-gray-600 font-medium mb-1">Name</p>
                                                <p className="text-sm text-gray-900">{selectedApproval.requester}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-gray-600 font-medium mb-1">Employee ID</p>
                                                <p className="text-sm text-gray-900 font-bold">{selectedApproval.employeeID}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-gray-600 font-medium mb-1">Email</p>
                                                <p className="text-sm text-blue-600">{selectedApproval.email}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-gray-600 font-medium mb-1">Location</p>
                                                <p className="text-sm text-gray-900">{selectedApproval.location}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-gray-600 font-medium mb-1">Job Title</p>
                                                <p className="text-sm text-gray-900">{selectedApproval.jobTitle}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-gray-600 font-medium mb-1">Department</p>
                                                <p className="text-sm text-gray-900">{selectedApproval.department}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-gray-600 font-medium mb-1">Request Date</p>
                                                <p className="text-sm text-gray-900">{new Date(selectedApproval.requestDate).toLocaleDateString()}</p>
                                            </div>
                                            {selectedApproval.dateProcessed && (
                                                <>
                                                    <div>
                                                        <p className="text-xs text-gray-600 font-medium mb-1">Processed Date</p>
                                                        <p className="text-sm text-gray-900">{new Date(selectedApproval.dateProcessed).toLocaleDateString()}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-xs text-gray-600 font-medium mb-1">Processed By</p>
                                                        <p className="text-sm text-gray-900">{selectedApproval.processedBy}</p>
                                                    </div>
                                                    {selectedApproval.remarks && (
                                                        <div>
                                                            <p className="text-xs text-gray-600 font-medium mb-1">Remarks</p>
                                                            <p className="text-sm text-gray-900">{selectedApproval.remarks}</p>
                                                        </div>
                                                    )}
                                                </>
                                            )}
                                        </div>
                                    </div>

                                    {/* Description */}
                                    <div className="mb-6">
                                        <h3 className="font-semibold text-gray-900 mb-3">Description</h3>
                                        <p className="text-gray-700 leading-relaxed bg-gray-50 p-4 rounded-lg border border-gray-200">
                                            {selectedApproval.description}
                                        </p>
                                    </div>

                                    {/* Attachments */}
                                    {selectedApproval.attachments.length > 0 && (
                                        <div className="mb-6">
                                            <h3 className="font-semibold text-gray-900 mb-3">Attachments</h3>
                                            <div className="space-y-2">
                                                {selectedApproval.attachments.map(attachment => (
                                                    <div
                                                        key={attachment.id}
                                                        className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition cursor-pointer"
                                                    >
                                                        <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                        </svg>
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-sm font-medium text-gray-900 truncate">
                                                                {attachment.name}
                                                            </p>
                                                            <p className="text-xs text-gray-500">
                                                                {attachment.size}
                                                            </p>
                                                        </div>
                                                        <button className="p-1 hover:bg-gray-200 rounded transition">
                                                            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                                            </svg>
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Actions */}
                                    {selectedApproval.status === 'pending' && (
                                        <div className="flex gap-3 pt-6 border-t border-gray-200">
                                            <button
                                                onClick={() => handleApproveClick(selectedApproval.id)}
                                                className="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-4 rounded-lg transition flex items-center justify-center gap-2"
                                            >
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                </svg>
                                                Approve
                                            </button>
                                            <button
                                                onClick={() => handleRejectClick(selectedApproval.id)}
                                                className="flex-1 bg-red-600 hover:bg-red-700 text-white font-semibold py-3 px-4 rounded-lg transition flex items-center justify-center gap-2"
                                            >
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                </svg>
                                                Reject
                                            </button>
                                        </div>
                                    )}

                                    {selectedApproval.status !== 'pending' && (
                                        <div className="pt-6 border-t border-gray-200">
                                            <p className="text-sm text-gray-600 text-center">
                                                This request has been {selectedApproval.status}.
                                            </p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="flex items-center justify-center h-full">
                            <div className="text-center text-gray-500">
                                <svg className="w-16 h-16 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <p className="text-lg font-medium">Select a request to view details</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Reject Modal */}
            <RejectRequestModal
                isOpen={showRejectModal}
                remarks={rejectRemarks}
                onRemarksChange={setRejectRemarks}
                onConfirm={handleConfirmReject}
                onCancel={handleCancelReject}
                isLoading={isRejectingLoading}
            />

            <ConfirmModal
                isOpen={showConfirmModal}
                onConfirm={handleApprove}
                onCancel={() => {
                    setShowConfirmModal(false);
                    setApprovingId(null);
                }}
                isLoading={isApprovingLoading}
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
