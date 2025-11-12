'use client';

export default function ContentLeftPanel({
    sidebarOpen,
    onSidebarClose,
    searchQuery,
    onSearchChange,
    filterStatus,
    onFilterStatusChange,
    sortBy,
    onSortByChange,
    approvals,
    selectedApprovalId,
    onApprovalSelect,
    getStatusColor
}) {
    return (
        <div className={`${sidebarOpen ? 'w-full md:w-96' : 'w-0'} md:w-96 bg-white border-r border-gray-200 flex flex-col transition-all duration-300 overflow-hidden`}>

            {/* Header */}
            <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-blue-500 to-blue-600">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-bold text-white">Requests</h2>
                    <button
                        onClick={onSidebarClose}
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
                        onChange={(e) => onSearchChange(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 bg-blue-400 text-white placeholder-blue-200 rounded-lg focus:outline-none focus:bg-blue-300"
                    />
                </div>
            </div>

            {/* Filters */}
            <div className="p-3 bg-gray-50 border-b border-gray-200 flex gap-2">
                <select
                    value={filterStatus}
                    onChange={(e) => onFilterStatusChange(e.target.value)}
                    className="flex-1 px-2 py-1 text-xs border text-black border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                    <option value="all">All Status</option>
                    <option value="pending">Pending</option>
                    <option value="approved">Approved</option>
                    <option value="rejected">Rejected</option>
                </select>

                <select
                    value={sortBy}
                    onChange={(e) => onSortByChange(e.target.value)}
                    className="flex-1 px-2 py-1 text-xs text-black border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                    <option value="date">Sort by Date</option>
                    <option value="requester">Sort by Name</option>
                    <option value="status">Sort by Status</option>
                </select>
            </div>

            {/* Approvals List */}
            <div className="flex-1 overflow-y-auto">
                {approvals.length > 0 ? (
                    approvals.map(approval => (
                        <div
                            key={approval.id}
                            onClick={() => onApprovalSelect(approval)}
                            className={`p-4 border-b border-gray-100 cursor-pointer transition-all ${selectedApprovalId === approval.id
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
    );
}
