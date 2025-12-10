'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '../../../../utils/authContext';
import HeaderNavBar from '@/app/_components/headerNavBar';
import Loader from '@/app/_components/loader';
import { getUserActivityLogs } from '../_actions';

export default function ActivityLogsPage() {
    const { user, darkMode } = useAuth();
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filteredLogs, setFilteredLogs] = useState([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const logsPerPage = 20;

    useEffect(() => {
        loadActivityLogs();
    }, [user]);

    useEffect(() => {
        filterLogs();
    }, [logs, searchTerm]);

    const loadActivityLogs = async () => {
        if (!user?.empName) return;

        try {
            // Load more logs for pagination
            const result = await getUserActivityLogs(user.empName, 100, 0); // Load 100 logs initially
            if (result.success) {
                setLogs(result.logs);
                setTotalPages(Math.ceil(result.logs.length / logsPerPage));
            }
        } catch (error) {
            console.error('Error loading activity logs:', error);
        } finally {
            setLoading(false);
        }
    };

    const filterLogs = () => {
        let filtered = logs;

        if (searchTerm) {
            filtered = logs.filter(log =>
                log.activity.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }

        setFilteredLogs(filtered);
        setTotalPages(Math.ceil(filtered.length / logsPerPage));
        setCurrentPage(1); // Reset to first page when filtering
    };

    const paginatedLogs = filteredLogs.slice(
        (currentPage - 1) * logsPerPage,
        currentPage * logsPerPage
    );

    const handlePageChange = (page) => {
        setCurrentPage(page);
    };

    if (loading) {
        return <Loader />;
    }

    return (
        <div className={`min-h-screen ${darkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
            <HeaderNavBar />
            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

                {/* Header */}
                <div className="mb-8 mt-10">
                    <nav className="flex mb-4" aria-label="Breadcrumb">
                        <ol className="inline-flex items-center space-x-1 md:space-x-3">
                            <li className="inline-flex items-center">
                                <a href="/settings" className={`inline-flex items-center text-sm font-medium ${darkMode ? 'text-gray-300 hover:text-blue-400' : 'text-gray-700 hover:text-blue-600'}`}>
                                    Settings
                                </a>
                            </li>
                            <li>
                                <div className="flex items-center">
                                    <span className={`text-sm font-medium ${darkMode ? 'text-gray-400' : 'text-gray-500'} md:text-base`}> / Activity Logs</span>
                                </div>
                            </li>
                        </ol>
                    </nav>
                    <h1 className={`text-3xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>Activity Logs</h1>
                    <p className={`mt-2 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>View your complete activity history and system events</p>
                </div>

                {/* Search and Filters */}
                <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-md p-6 mb-6`}>
                    <div className="flex flex-col sm:flex-row gap-4">
                        <div className="flex-1">
                            <label htmlFor="search" className={`block text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'} mb-2`}>
                                Search Activity Logs
                            </label>
                            <input
                                type="text"
                                id="search"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder="Search by activity description..."
                                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${darkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'border-gray-300'}`}
                            />
                        </div>
                        <div className="flex items-end">
                            <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                Total: {filteredLogs.length} logs
                            </div>
                        </div>
                    </div>
                </div>

                {/* Activity Logs List */}
                <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-md overflow-hidden`}>
                    <div className={`px-6 py-4 border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                        <h2 className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>Your Activity History</h2>
                    </div>

                    <div className={`divide-y ${darkMode ? 'divide-gray-700' : 'divide-gray-200'}`}>
                        {paginatedLogs.length > 0 ? (
                            paginatedLogs.map((log) => (
                                <div key={log.id} className={`px-6 py-4 ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-50'} transition-colors`}>
                                    <div className="flex items-start space-x-4">
                                        <div className="flex-shrink-0">
                                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-400 to-blue-500 flex items-center justify-center text-white text-sm font-medium">
                                                {log.createdBy.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 3)}
                                            </div>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className={`text-sm ${darkMode ? 'text-white' : 'text-gray-900'} font-medium`}>
                                                {log.activity}
                                            </p>
                                            <div className="flex items-center space-x-4 mt-1">
                                                <span className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                                    {new Date(log.dateCreated).toLocaleString('en-US', {
                                                        year: 'numeric',
                                                        month: 'short',
                                                        day: 'numeric',
                                                        hour: '2-digit',
                                                        minute: '2-digit',
                                                        second: '2-digit'
                                                    })}
                                                </span>
                                                <span className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                                                    ID: {log.id}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="px-6 py-12 text-center">
                                <div className={`${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                                    <svg className="mx-auto h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 48 48">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 00-2 2v10a2 2 0 002 2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 001.414 0l5.414-5.414A1 1 0 0027.414 35H33a2 2 0 002-2V19a2 2 0 00-2-2h-5M9 12V9a3 3 0 013-3h14a3 3 0 013 3v3M9 12h15" />
                                    </svg>
                                </div>
                                <h3 className={`mt-2 text-sm font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>No activity logs found</h3>
                                <p className={`mt-1 text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                    {searchTerm ? 'No logs match your search criteria.' : 'You haven\'t performed any activities yet.'}
                                </p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className={`flex items-center justify-between ${darkMode ? 'bg-gray-800' : 'bg-white'} px-6 py-3 rounded-lg shadow-md mt-6`}>
                        <div className={`flex items-center text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                            Showing {((currentPage - 1) * logsPerPage) + 1} to {Math.min(currentPage * logsPerPage, filteredLogs.length)} of {filteredLogs.length} results
                        </div>
                        <div className="flex items-center space-x-2">
                            <button
                                onClick={() => handlePageChange(currentPage - 1)}
                                disabled={currentPage === 1}
                                className={`px-3 py-1 text-sm border rounded-md disabled:opacity-50 disabled:cursor-not-allowed ${darkMode ? 'border-gray-600 hover:bg-gray-700 text-gray-300' : 'border-gray-300 hover:bg-gray-50'}`}
                            >
                                Previous
                            </button>

                            {/* Page Numbers */}
                            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                let pageNum;
                                if (totalPages <= 5) {
                                    pageNum = i + 1;
                                } else if (currentPage <= 3) {
                                    pageNum = i + 1;
                                } else if (currentPage >= totalPages - 2) {
                                    pageNum = totalPages - 4 + i;
                                } else {
                                    pageNum = currentPage - 2 + i;
                                }

                                return (
                                    <button
                                        key={pageNum}
                                        onClick={() => handlePageChange(pageNum)}
                                        className={`px-3 py-1 text-sm border rounded-md ${
                                            currentPage === pageNum
                                                ? 'bg-blue-600 text-white border-blue-600'
                                                : (darkMode ? 'border-gray-600 hover:bg-gray-700 text-gray-300' : 'border-gray-300 hover:bg-gray-50')
                                        }`}
                                    >
                                        {pageNum}
                                    </button>
                                );
                            })}

                            <button
                                onClick={() => handlePageChange(currentPage + 1)}
                                disabled={currentPage === totalPages}
                                className={`px-3 py-1 text-sm border rounded-md disabled:opacity-50 disabled:cursor-not-allowed ${darkMode ? 'border-gray-600 hover:bg-gray-700 text-gray-300' : 'border-gray-300 hover:bg-gray-50'}`}
                            >
                                Next
                            </button>
                        </div>
                    </div>
                )}

            </div>
        </div>
    );
}
