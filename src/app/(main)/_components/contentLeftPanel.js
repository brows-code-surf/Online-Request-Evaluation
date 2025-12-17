'use client';

import { useState, useEffect, useRef } from 'react';
import { SkeletonApprovalItem } from '../../_components/skeletonLoader';
import { useAuth } from '../../../utils/authContext';

export default function ContentLeftPanel({
    sidebarOpen,
    onSidebarClose,
    headerTitle,
    searchQuery,
    onSearchChange,
    filterStatus,
    onFilterStatusChange,
    sortBy,
    onSortByChange,
    approvals,
    selectedApprovalId,
    onApprovalSelect,
    getStatusColor,
    filterType,
    enableReadStatus = false,
    onMarkAsRead,
    isLoading = false
}) {
    const { darkMode } = useAuth();
    const [showNotch, setShowNotch] = useState(false);
    const [lastScrollY, setLastScrollY] = useState(0);
    const touchStartX = useRef(0);

    const requestEvalApprovalPage = window.location.pathname === '/request-evaluation';
    const userAccount = window.location.pathname === '/user-accounts';

    useEffect(() => {
        const handleScroll = () => {
            const currentScrollY = window.scrollY;
            setShowNotch(currentScrollY < lastScrollY && currentScrollY > 50);
            setLastScrollY(currentScrollY);
        };

        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, [lastScrollY]);

    const handleTouchStart = (e) => {
        touchStartX.current = e.touches[0].clientX;
    };

    const handleTouchEnd = (e) => {
        const touchEndX = e.changedTouches[0].clientX;
        const diff = touchEndX - touchStartX.current;

        // Swipe right to open panel
        if (diff > 50 && !sidebarOpen) {
            // onSidebarOpen would be called here, but we use onSidebarClose toggle
            // This assumes the parent component handles the state
            window.dispatchEvent(new CustomEvent('openSidebar'));
        }
    };

    const handleApprovalSelect = (approval) => {
        onApprovalSelect(approval);
        if (enableReadStatus && approval.isRead === 'NOT READ' && onMarkAsRead) {
            onMarkAsRead(approval.id);
        }
        // Close panel on mobile after selection
        if (window.innerWidth < 768) {
            onSidebarClose();
        }
    };

    return (
        <>

            {/* Notch for opening on desktop */}
            {!sidebarOpen && (
                <button
                    onClick={() => window.dispatchEvent(new CustomEvent('openSidebar'))}
                    className="hidden md:flex fixed top-1/2 left-0 transform -translate-y-1/2 w-5 h-20 bg-blue-600 hover:bg-blue-700 text-white items-center justify-center rounded-r-2xl shadow-lg transition-all duration-300 z-50"
                    title="Click to open panel"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                </button>
            )}

            {/* Left Panel */}
            <div
                className={`${sidebarOpen ? 'w-full md:w-96' : 'w-0 md:w-0'} ${darkMode ? 'bg-gray-800' : 'bg-white'} border-r ${darkMode ? 'border-gray-700' : 'border-gray-200'} flex flex-col transition-all duration-300 overflow-hidden relative`}
                onTouchStart={handleTouchStart}
                onTouchEnd={handleTouchEnd}
            >

                {/* Header */}
                <div className={`p-4 border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'} bg-gradient-to-r from-blue-500 to-blue-600`}>
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-bold text-white">{headerTitle}</h2>
                        <button
                            onClick={onSidebarClose}
                            className="text-white hover:bg-blue-700 p-1 rounded transition-all"
                            title="Close Panel"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
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
                            onChange={(e) => onSearchChange(e.target.value)}
                            className="w-full pl-9 pr-3 py-2 bg-blue-400 text-white placeholder-blue-200 rounded-lg focus:outline-none focus:bg-blue-300"
                        />
                    </div>
                </div>

                {/* Filters */}
                <div className={`p-3 ${darkMode ? 'bg-gray-700' : 'bg-gray-50'} border-b ${darkMode ? 'border-gray-600' : 'border-gray-200'} flex gap-2`}>
                    {/* User Accounts Filters */}
                    {filterType === 'accounts' && (
                        <>
                            <select
                                value={filterStatus}
                                onChange={(e) => onFilterStatusChange(e.target.value)}
                                className={`flex-1 px-2 py-1 text-xs border ${darkMode ? 'text-white bg-gray-700 border-gray-600' : 'text-black border-gray-300'} rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500`}
                            >
                                <option value="all">All Status</option>
                                <option value="ACTIVE">Active</option>
                                <option value="INACTIVE">Inactive</option>
                            </select>

                            <select
                                value={sortBy}
                                onChange={(e) => onSortByChange(e.target.value)}
                                className={`flex-1 px-2 py-1 text-xs ${darkMode ? 'text-white bg-gray-700 border-gray-600' : 'text-black border-gray-300'} border rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500`}
                            >
                                <option value="date">Sort by Date</option>
                                <option value="requester">Sort by Name</option>
                                <option value="status">Sort by Status</option>
                            </select>
                        </>
                    )}

                    {filterType === 'user-accounts-approval' && (
                        <>
                            <select
                                value={filterStatus}
                                onChange={(e) => onFilterStatusChange(e.target.value)}
                                className={`flex-1 px-2 py-1 text-xs border ${darkMode ? 'text-white bg-gray-700 border-gray-600' : 'text-black border-gray-300'} rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500`}
                            >
                                <option value="all">All Status</option>
                                <option value="PENDING">Pending</option>
                                <option value="APPROVED">Approved</option>
                                <option value="REJECTED">Rejected</option>
                            </select>

                            <select
                                value={sortBy}
                                onChange={(e) => onSortByChange(e.target.value)}
                                className={`flex-1 px-2 py-1 text-xs ${darkMode ? 'text-white bg-gray-700 border-gray-600' : 'text-black border-gray-300'} border rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500`}
                            >
                                <option value="date">Sort by Date</option>
                                <option value="requester">Sort by Name</option>
                                <option value="status">Sort by Status</option>
                            </select>
                        </>
                    )}

                    {/* Approval Filters */}
                    {filterType === 'request-evaluation' && (
                        <>
                            <select
                                value={filterStatus || ''}
                                onChange={(e) => onFilterStatusChange(e.target.value)}
                                className={`flex-1 px-2 py-1 text-xs border ${darkMode ? 'text-white bg-gray-700 border-gray-600' : 'text-black border-gray-300'} rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500`}
                            >
                                <option value="all">Select Status</option>
                                <option value="RUSH">Rush</option>
                                <option value="REJECTED">Rejected</option>
                            </select>

                            <select
                                value={sortBy}
                                onChange={(e) => onSortByChange(e.target.value)}
                                className={`flex-1 px-2 py-1 text-xs ${darkMode ? 'text-white bg-gray-700 border-gray-600' : 'text-black border-gray-300'} border rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500`}
                            >
                                <option value="date">Sort by Date</option>
                                <option value="requester">Sort by Name</option>
                                <option value="status">Sort by Status</option>
                            </select>
                        </>
                    )}

                    {filterType === 'purchase-request' && (
                        <>
                            <select
                                value={filterStatus || ''}
                                onChange={(e) => onFilterStatusChange(e.target.value)}
                                className={`flex-1 px-2 py-1 text-xs border ${darkMode ? 'text-white bg-gray-700 border-gray-600' : 'text-black border-gray-300'} rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500`}
                            >
                                <option value="all">Select Status</option>
                                <option value="POSTED">Posted</option>
                                <option value="FOR CONFIRMATION">For Confirmation</option>
                                <option value="FOR REQUEST APPROVAL">For Request Approval</option>
                                <option value="FOR PURCHASING LEAD TIME">For Purchasing Lead Time</option>
                                <option value="FOR CANVASSING">For Canvassing</option>
                                <option value="RUSH">Rush</option>
                                <option value="REJECTED">Rejected</option>
                            </select>

                            <select
                                value={sortBy}
                                onChange={(e) => onSortByChange(e.target.value)}
                                className={`flex-1 px-2 py-1 text-xs ${darkMode ? 'text-white bg-gray-700 border-gray-600' : 'text-black border-gray-300'} border rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500`}
                            >
                                <option value="date">Sort by Date</option>
                                <option value="requester">Sort by Name</option>
                                <option value="status">Sort by Status</option>
                            </select>
                        </>
                    )}
                </div>

                {/* Approvals List */}
                <div className="flex-1 overflow-y-auto">
                    {isLoading ? (
                        Array(5).fill().map((_, i) => <SkeletonApprovalItem key={i} />)
                    ) : approvals.length > 0 ? (
                        approvals.map(approval => (
                            <div
                                key={approval.id}
                                onClick={() => handleApprovalSelect(approval)}
                                className={`p-4 border-b ${darkMode ? 'border-gray-700' : 'border-gray-100'} cursor-pointer transition-all ${selectedApprovalId === approval.id
                                    ? (darkMode ? 'bg-blue-900/50 border-r-2 border-r-blue-300' : 'bg-blue-50 border-r-2 border-r-blue-200')
                                    : enableReadStatus && approval.isRead === 'NOT READ'
                                        ? (darkMode ? 'bg-blue-900/20 border-l-4 border-l-blue-400 hover:bg-blue-800/30' : 'bg-blue-50/30 border-l-4 border-l-blue-500 hover:bg-blue-100/50')
                                        : (darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-50')
                                    }`}
                            >
                                <div className="flex items-start justify-between mb-2">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            {enableReadStatus && approval.isRead === 'NOT READ' && (
                                                <span className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0"></span>
                                            )}
                                            <h3 className={`text-sm leading-tight ${enableReadStatus && approval.isRead === 'NOT READ' ? 'font-bold text-blue-400' : `font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}`}>
                                                {approval.title}
                                            </h3>
                                        </div>
                                    </div>
                                    <div className="ml-2 flex items-center gap-1">
                                        {approval.isRush && (
                                            <span className={`text-xs px-2 py-1 rounded-full ${darkMode ? 'bg-red-900 text-red-300' : 'bg-red-100 text-red-700'} font-semibold whitespace-nowrap`}>
                                                RUSH
                                            </span>
                                        )}
                                        <span className={`text-xs px-2 py-1 rounded whitespace-nowrap ${getStatusColor(approval.status)}`}>
                                            {approval.status}
                                        </span>
                                    </div>
                                </div>

                                <div className="flex item-start justify-between mb-2">
                                    {!userAccount && (
                                        <p className={`text-xs ${darkMode ? 'text-gray-300' : 'text-gray-600'} mb-2 ${enableReadStatus && approval.isRead === 'NOT READ' ? 'font-bold' : ''}`}>
                                            {approval.requester}
                                        </p>
                                    )}
                                    {userAccount && approval.email && (
                                        <p className={`text-xs ${darkMode ? 'text-gray-300' : 'text-gray-600'} mb-2 ${enableReadStatus && approval.isRead === 'NOT READ' ? 'font-bold' : 'font-semibold'}`}>
                                            {approval.jobTitle}
                                        </p>
                                    )}
                                    {requestEvalApprovalPage && approval.id && (
                                        <p className={`text-xs ${darkMode ? 'text-gray-300' : 'text-gray-600'} mb-2 ${enableReadStatus && approval.isRead === 'NOT READ' ? 'font-bold' : 'font-semibold'}`}>
                                            {approval.id}
                                        </p>
                                    )}
                                    {approval.employeeID && (
                                        <p className={`text-xs ${darkMode ? 'text-gray-300' : 'text-gray-600'} mb-2 ${enableReadStatus && approval.isRead === 'NOT READ' ? 'font-bold' : 'font-semibold'}`}>
                                            {approval.employeeID}
                                        </p>
                                    )}
                                </div>

                                <div className="flex items-center justify-between">
                                    {userAccount && (
                                        <>
                                            <span className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                                {approval.dateRequested ? new Date(approval.dateRequested).toLocaleDateString() : 'N/A'}
                                            </span>
                                            {console.log(approval.dateRequested)}
                                        </>
                                    )}
                                    {!userAccount && (
                                        <span className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                            {new Date(approval.requestDate).toLocaleDateString()}
                                        </span>
                                    )}
                                    <span className={`text-xs ${darkMode ? 'bg-blue-600 text-blue-100' : 'bg-blue-300 text-gray-700'} px-2 py-1 font-semibold rounded`}>
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
        </>
    );
}
