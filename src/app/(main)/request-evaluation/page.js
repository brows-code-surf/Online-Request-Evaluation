'use client';

import { useState, useEffect } from 'react';
import HeaderNavBar from '../../_components/headerNavBar';
import Loader from '@/app/_components/loader';
import ProtectedRoute from '@/utils/protectedRoute';

// Mock data for approvals
const mockApprovals = [
    {
        id: 1,
        title: 'Account Creation Request',
        requester: 'Jairus Valencia',
        email: 'j.valencia@santehfeeds.com',
        status: 'pending',
        requestDate: '2024-01-15',
        department: 'IT',
        jobTitle: 'System Administrator',
        location: 'Manila',
        description: 'Request for new employee account creation for IT department.',
        attachments: [
            { id: 1, name: 'employment_contract.pdf', size: '2.5 MB' },
            { id: 2, name: 'id_verification.pdf', size: '1.8 MB' }
        ]
    },
    {
        id: 2,
        title: 'Department Transfer Request',
        requester: 'Maria Santos',
        email: 'm.santos@santehfeeds.com',
        status: 'pending',
        requestDate: '2024-01-14',
        department: 'HR',
        jobTitle: 'HR Manager',
        location: 'Cebu',
        description: 'Transfer request from Sales to Human Resources department.',
        attachments: [
            { id: 1, name: 'transfer_approval.pdf', size: '0.9 MB' }
        ]
    },
    {
        id: 3,
        title: 'Leave of Absence Request',
        requester: 'John Doe',
        email: 'j.doe@santehfeeds.com',
        status: 'approved',
        requestDate: '2024-01-13',
        department: 'Finance',
        jobTitle: 'Finance Officer',
        location: 'Manila',
        description: 'Request for 2 weeks leave starting January 20, 2024.',
        attachments: []
    },
    {
        id: 4,
        title: 'Salary Review Request',
        requester: 'Jane Smith',
        email: 'j.smith@santehfeeds.com',
        status: 'rejected',
        requestDate: '2024-01-12',
        department: 'Operations',
        jobTitle: 'Operations Lead',
        location: 'Davao',
        description: 'Annual salary review request for performance evaluation period.',
        attachments: [
            { id: 1, name: 'performance_review.pdf', size: '1.2 MB' }
        ]
    },
    {
        id: 5,
        title: 'Equipment Request',
        requester: 'Robert Johnson',
        email: 'r.johnson@santehfeeds.com',
        status: 'pending',
        requestDate: '2024-01-11',
        department: 'IT',
        jobTitle: 'IT Support',
        location: 'Manila',
        description: 'Request for new laptop and monitor for enhanced productivity.',
        attachments: [
            { id: 1, name: 'equipment_specs.pdf', size: '0.7 MB' }
        ]
    },
];

function RequestEvaluationContent() {
    const [selectedApproval, setSelectedApproval] = useState(null);
    const [approvals, setApprovals] = useState(mockApprovals);
    const [loading, setLoading] = useState(false);
    const [detailsLoading, setDetailsLoading] = useState(false);
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [sortBy, setSortBy] = useState('date');
    const [filterStatus, setFilterStatus] = useState('all');

    useEffect(() => {
        setLoading(true);
        if (approvals.length > 0 && !selectedApproval) {
            setSelectedApproval(approvals[0]);
        }
        setLoading(false);
    }, []);

    // Handle approval selection
    const handleSelectApproval = (approval) => {
        setDetailsLoading(true);
        // Simulate API call delay
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

    // Handle approve/reject actions
    const handleApprove = (id) => {
        setApprovals(approvals.map(a =>
            a.id === id ? { ...a, status: 'approved' } : a
        ));
        const updated = approvals.find(a => a.id === id);
        if (updated) {
            setSelectedApproval({ ...updated, status: 'approved' });
        }
    };

    const handleReject = (id) => {
        setApprovals(approvals.map(a =>
            a.id === id ? { ...a, status: 'rejected' } : a
        ));
        const updated = approvals.find(a => a.id === id);
        if (updated) {
            setSelectedApproval({ ...updated, status: 'rejected' });
        }
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

    const getStatusBadge = (status) => {
        const baseClass = 'inline-block px-3 py-1 rounded-full text-xs font-semibold border';
        return baseClass + ' ' + getStatusColor(status);
    };

    return (
        <div className="flex flex-col h-screen bg-gray-50">
            <Loader loading={loading}/>
            <HeaderNavBar />
            <div className="flex flex-1 overflow-hidden pt-14">

                {/* Left Panel - Approvals List */}
                <div className={`${sidebarOpen ? 'w-full md:w-96' : 'w-0'} md:w-96 bg-white border-r border-gray-200 flex flex-col transition-all duration-300 overflow-hidden`}>

                    {/* Header */}
                    <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-blue-500 to-blue-600">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-bold text-white">Requests</h2>
                            <button
                                onClick={() => setSidebarOpen(false)}
                                className="md:hidden text-white hover:bg-blue-700 p-1 rounded"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                </svg>
                            </button>
                        </div>

                        {/* Search */}
                        <div className="relative">
                            <svg className="absolute left-3 top-3 w-4 h-4 text-blue-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                            <input
                                type="text"
                                placeholder="Search requests..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-9 pr-3 py-2 bg-blue-400 text-white placeholder-blue-200 rounded-lg focus:outline-none focus:bg-blue-300"
                            />
                        </div>
                    </div>

                    {/* Filters */}
                    <div className="p-3 bg-gray-50 border-b border-gray-200 flex gap-2">
                        <select
                            value={filterStatus}
                            onChange={(e) => setFilterStatus(e.target.value)}
                            className="flex-1 px-2 py-1 text-xs border text-black border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                        >
                            <option value="all">All Status</option>
                            <option value="pending">Pending</option>
                            <option value="approved">Approved</option>
                            <option value="rejected">Rejected</option>
                        </select>

                        <select
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value)}
                            className="flex-1 px-2 py-1 text-xs text-black border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                        >
                            <option value="date">Sort by Date</option>
                            <option value="requester">Sort by Name</option>
                            <option value="status">Sort by Status</option>
                        </select>
                    </div>

                    {/* Approvals List */}
                    <div className="flex-1 overflow-y-auto">
                        {filteredApprovals.length > 0 ? (
                            filteredApprovals.map(approval => (
                                <div
                                    key={approval.id}
                                    onClick={() => handleSelectApproval(approval)}
                                    className={`p-4 border-b border-gray-100 cursor-pointer transition-all ${selectedApproval?.id === approval.id
                                        ? 'bg-blue-50 border-l-4 border-l-blue-500'
                                        : 'hover:bg-gray-50'
                                        }`}
                                >
                                    <div className="flex items-start justify-between mb-2">
                                        <h3 className="font-semibold text-gray-900 text-sm leading-tight flex-1">
                                            {approval.title}
                                        </h3>
                                        <span className={`ml-2 text-xs ${getStatusColor(approval.status).replace('bg-', 'bg-').replace('text-', 'text-')}`}>
                                            {approval.status.charAt(0).toUpperCase() + approval.status.slice(1)}
                                        </span>
                                    </div>

                                    <p className="text-xs text-gray-600 mb-2">
                                        {approval.requester}
                                    </p>

                                    <div className="flex items-center justify-between">
                                        <span className="text-xs text-gray-500">
                                            {new Date(approval.requestDate).toLocaleDateString()}
                                        </span>
                                        <span className="text-xs bg-gray-200 text-gray-700 px-2 py-1 rounded">
                                            {approval.department}
                                        </span>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="flex items-center justify-center h-full text-gray-500">
                                <div className="text-center">
                                    <svg className="w-12 h-12 mx-auto mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                                    </svg>
                                    <p className="text-sm">No requests found</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

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
                                                <p className="text-xs text-gray-600 font-medium mb-1">Email</p>
                                                <p className="text-sm text-blue-600">{selectedApproval.email}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-gray-600 font-medium mb-1">Department</p>
                                                <p className="text-sm text-gray-900">{selectedApproval.department}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-gray-600 font-medium mb-1">Job Title</p>
                                                <p className="text-sm text-gray-900">{selectedApproval.jobTitle}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-gray-600 font-medium mb-1">Location</p>
                                                <p className="text-sm text-gray-900">{selectedApproval.location}</p>
                                            </div>
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
                                                onClick={() => handleApprove(selectedApproval.id)}
                                                className="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-4 rounded-lg transition flex items-center justify-center gap-2"
                                            >
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                </svg>
                                                Approve
                                            </button>
                                            <button
                                                onClick={() => handleReject(selectedApproval.id)}
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
