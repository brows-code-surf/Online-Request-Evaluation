'use client';

import { useState, useMemo } from 'react';
import { useAuth } from '../../../../utils/authContext';

const STATUS_OPTIONS = [
  { value: 'Open', label: 'Open', color: 'bg-blue-100 text-blue-800' },
  { value: 'In Progress', label: 'In Progress', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'Pending', label: 'Pending', color: 'bg-orange-100 text-orange-800' },
  { value: 'Resolved', label: 'Resolved', color: 'bg-green-100 text-green-800' },
  { value: 'Closed', label: 'Closed', color: 'bg-gray-100 text-gray-800' }
];

const SORT_OPTIONS = [
  { value: 'dateModified_desc', label: 'Last Modified (Newest)' },
  { value: 'dateModified_asc', label: 'Last Modified (Oldest)' },
  { value: 'dateCreated_desc', label: 'Date Created (Newest)' },
  { value: 'dateCreated_asc', label: 'Date Created (Oldest)' },
  { value: 'subject_asc', label: 'Subject (A-Z)' },
  { value: 'subject_desc', label: 'Subject (Z-A)' }
];

export default function TicketList({ tickets = [], onTicketClick, loading = false }) {
  const { darkMode } = useAuth();
  const [filters, setFilters] = useState({
    status: '',
    category: '',
    search: ''
  });
  const [sortBy, setSortBy] = useState('dateModified_desc');

  const filteredAndSortedTickets = useMemo(() => {
    let filtered = tickets.filter(ticket => {
      const matchesStatus = !filters.status || ticket.status === filters.status;
      const matchesCategory = !filters.category || ticket.category === filters.category;
      const matchesSearch = !filters.search ||
        ticket.subject.toLowerCase().includes(filters.search.toLowerCase());

      return matchesStatus && matchesCategory && matchesSearch;
    });

    // Sort tickets
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'dateModified_desc':
          return new Date(b.dateModified) - new Date(a.dateModified);
        case 'dateModified_asc':
          return new Date(a.dateModified) - new Date(b.dateModified);
        case 'dateCreated_desc':
          return new Date(b.dateCreated) - new Date(a.dateCreated);
        case 'dateCreated_asc':
          return new Date(a.dateCreated) - new Date(b.dateCreated);
        case 'subject_asc':
          return a.subject.localeCompare(b.subject);
        case 'subject_desc':
          return b.subject.localeCompare(a.subject);
        default:
          return 0;
      }
    });

    return filtered;
  }, [tickets, filters, sortBy]);

  const uniqueCategories = useMemo(() => {
    const categories = [...new Set(tickets.map(ticket => ticket.category))];
    return categories.sort();
  }, [tickets]);

  const handleFilterChange = (filterType, value) => {
    setFilters(prev => ({ ...prev, [filterType]: value }));
  };

 const formatDate = (dateString) => {
  const date = new Date(dateString);
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'UTC'
  });
};



  const getStatusBadge = (status) => {
    const statusOption = STATUS_OPTIONS.find(s => s.value === status);
    return statusOption ? statusOption.color : 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return (
      <div className={`${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-2xl shadow-lg border p-8`}>
        <div className="animate-pulse space-y-4">
          <div className={`${darkMode ? 'bg-gray-700' : 'bg-gray-200'} h-4 rounded w-1/4`}></div>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className={`${darkMode ? 'bg-gray-700' : 'bg-gray-200'} h-16 rounded-xl`}></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-2xl shadow-lg border overflow-hidden`}>
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-600 via-gray-600 to-slate-700 px-8 py-6">
        <h2 className="text-2xl font-bold text-white">Tickets</h2>
        <p className="text-slate-100 mt-2">Manage and track all support tickets</p>
      </div>

      {/* Filters and Search */}
      <div className={`px-8 py-6 border-b ${darkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-gray-50'}`}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Search */}
          <div>
            <label className={`block text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'} mb-2`}>
              Search by Subject
            </label>
            <input
              type="text"
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              placeholder="Search tickets..."
              className={`w-full px-4 py-2 border ${darkMode ? 'border-gray-600 bg-gray-700 text-white' : 'border-gray-300'} rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
            />
          </div>

          {/* Status Filter */}
          <div>
            <label className={`block text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'} mb-2`}>
              Filter by Status
            </label>
            <select
              value={filters.status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
              className={`w-full px-4 py-2 border ${darkMode ? 'border-gray-600 bg-gray-700 text-white' : 'border-gray-300'} rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
            >
              <option value="">All Statuses</option>
              {STATUS_OPTIONS.map(status => (
                <option key={status.value} value={status.value} className={darkMode ? 'bg-gray-700' : ''}>
                  {status.label}
                </option>
              ))}
            </select>
          </div>

          {/* Category Filter */}
          <div>
            <label className={`block text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'} mb-2`}>
              Filter by Category
            </label>
            <select
              value={filters.category}
              onChange={(e) => handleFilterChange('category', e.target.value)}
              className={`w-full px-4 py-2 border ${darkMode ? 'border-gray-600 bg-gray-700 text-white' : 'border-gray-300'} rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
            >
              <option value="">All Categories</option>
              {uniqueCategories.map(category => (
                <option key={category} value={category} className={darkMode ? 'bg-gray-700' : ''}>
                  {category}
                </option>
              ))}
            </select>
          </div>

          {/* Sort */}
          <div>
            <label className={`block text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'} mb-2`}>
              Sort by
            </label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className={`w-full px-4 py-2 border ${darkMode ? 'border-gray-600 bg-gray-700 text-white' : 'border-gray-300'} rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
            >
              {SORT_OPTIONS.map(option => (
                <option key={option.value} value={option.value} className={darkMode ? 'bg-gray-700' : ''}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Results Count */}
        <div className={`mt-4 text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
          Showing {filteredAndSortedTickets.length} of {tickets.length} tickets
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className={`${darkMode ? 'bg-gray-800' : 'bg-gray-50'}`}>
            <tr>
              <th className={`px-6 py-4 text-left text-xs font-medium ${darkMode ? 'text-gray-300' : 'text-gray-500'} uppercase tracking-wider`}>
                ID
              </th>
              <th className={`px-6 py-4 text-left text-xs font-medium ${darkMode ? 'text-gray-300' : 'text-gray-500'} uppercase tracking-wider`}>
                Subject
              </th>
              <th className={`px-6 py-4 text-left text-xs font-medium ${darkMode ? 'text-gray-300' : 'text-gray-500'} uppercase tracking-wider`}>
                Category
              </th>
              <th className={`px-6 py-4 text-left text-xs font-medium ${darkMode ? 'text-gray-300' : 'text-gray-500'} uppercase tracking-wider`}>
                Status
              </th>
              <th className={`px-6 py-4 text-left text-xs font-medium ${darkMode ? 'text-gray-300' : 'text-gray-500'} uppercase tracking-wider`}>
                Created
              </th>
              <th className={`px-6 py-4 text-left text-xs font-medium ${darkMode ? 'text-gray-300' : 'text-gray-500'} uppercase tracking-wider`}>
                Modified
              </th>
            </tr>
          </thead>
          <tbody className={`${darkMode ? 'bg-gray-800 divide-gray-700' : 'bg-white divide-gray-200'} divide-y`}>
            {filteredAndSortedTickets.length === 0 ? (
              <tr>
                <td colSpan="6" className={`px-6 py-12 text-center ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  <div className="flex flex-col items-center">
                    <svg className={`w-12 h-12 ${darkMode ? 'text-gray-500' : 'text-gray-400'} mb-4`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <p className={`text-lg font-medium ${darkMode ? 'text-gray-300' : 'text-gray-900'}`}>No tickets found</p>
                    <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Try adjusting your filters or create a new ticket.</p>
                  </div>
                </td>
              </tr>
            ) : (
              filteredAndSortedTickets.map((ticket) => (
                <tr
                  key={ticket.id}
                  onClick={() => onTicketClick(ticket)}
                  className={`${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-50'} cursor-pointer transition-colors duration-150`}
                >
                  <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    #{ticket.id}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className={`text-sm font-medium ${darkMode ? 'text-white' : 'text-gray-900'} truncate max-w-xs`}>
                      {ticket.subject}
                    </div>
                  </td>
                  <td className={`px-6 py-4 whitespace-nowrap text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                    {ticket.category}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadge(ticket.status)}`}>
                      {ticket.status}
                    </span>
                  </td>
                  <td className={`px-6 py-4 whitespace-nowrap text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                    {formatDate(ticket.dateCreated)}
                  </td>
                  <td className={`px-6 py-4 whitespace-nowrap text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                    {ticket.dateModified ? formatDate(ticket.dateModified) : '-'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
