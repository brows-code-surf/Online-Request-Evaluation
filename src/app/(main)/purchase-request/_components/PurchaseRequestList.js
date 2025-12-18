'use client';

import { useState, useMemo } from 'react';
import { useAuth } from '../../../../utils/authContext';

const STATUS_OPTIONS = [
  { value: 'FOR CONFIRMATION', label: 'For Confirmation', color: 'bg-blue-100 text-blue-800' },
  { value: 'FOR REQUEST APPROVAL', label: 'For Request Approval', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'FOR PURCHASING LEAD TIME', label: 'For Purchasing Lead Time', color: 'bg-orange-100 text-orange-800' },
  { value: 'COMPLETED', label: 'Completed', color: 'bg-green-100 text-green-800' },
  { value: 'REJECTED', label: 'Rejected', color: 'bg-red-100 text-red-800' }
];

const REQUEST_TYPE_OPTIONS = [
  { value: 'CAPEX', label: 'CAPEX' },
  { value: 'OPEX', label: 'OPEX' },
  { value: 'REVENUE', label: 'REVENUE' }
];

const SORT_OPTIONS = [
  { value: 'dateCreated_desc', label: 'Date Created (Newest)' },
  { value: 'dateCreated_asc', label: 'Date Created (Oldest)' },
  { value: 'referenceNo_desc', label: 'Reference No (Z-A)' },
  { value: 'referenceNo_asc', label: 'Reference No (A-Z)' },
  { value: 'company_asc', label: 'Company (A-Z)' },
  { value: 'company_desc', label: 'Company (Z-A)' }
];

export default function PurchaseRequestList({ purchaseRequests = [], onPurchaseRequestClick, loading = false }) {
  const { darkMode } = useAuth();
  const [filters, setFilters] = useState({
    status: '',
    requestType: '',
    company: '',
    search: '',
    isRush: ''
  });
  const [sortBy, setSortBy] = useState('dateCreated_desc');

  const filteredAndSortedPurchaseRequests = useMemo(() => {
    let filtered = purchaseRequests.filter(pr => {
      const matchesStatus = !filters.status || pr.requestStatus === filters.status;
      const matchesRequestType = !filters.requestType || pr.requestType === filters.requestType;
      const matchesCompany = !filters.company || pr.company === filters.company;
      const matchesRush = !filters.isRush || pr.isRush === (filters.isRush === 'true');
      const matchesSearch = !filters.search ||
        pr.referenceNo.toLowerCase().includes(filters.search.toLowerCase()) ||
        pr.company.toLowerCase().includes(filters.search.toLowerCase()) ||
        pr.requestedBy.toLowerCase().includes(filters.search.toLowerCase());

      return matchesStatus && matchesRequestType && matchesCompany && matchesRush && matchesSearch;
    });

    // Sort purchase requests
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'dateCreated_desc':
          return new Date(b.dateCreated) - new Date(a.dateCreated);
        case 'dateCreated_asc':
          return new Date(a.dateCreated) - new Date(b.dateCreated);
        case 'referenceNo_asc':
          return a.referenceNo.localeCompare(b.referenceNo);
        case 'referenceNo_desc':
          return b.referenceNo.localeCompare(a.referenceNo);
        case 'company_asc':
          return a.company.localeCompare(b.company);
        case 'company_desc':
          return b.company.localeCompare(a.company);
        default:
          return 0;
      }
    });

    return filtered;
  }, [purchaseRequests, filters, sortBy]);

  const uniqueCompanies = useMemo(() => {
    const companies = [...new Set(purchaseRequests.map(pr => pr.company))];
    return companies.sort();
  }, [purchaseRequests]);

  const handleFilterChange = (filterType, value) => {
    setFilters(prev => ({ ...prev, [filterType]: value }));
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
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
      <div className={`${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-xl shadow-lg border p-6`}>
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
    <div className={`${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-xl shadow-lg border overflow-hidden`}>
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-green-300 px-6 py-4 rounded-t-xl">
        <h2 className="text-3xl font-bold text-white">Purchase Requests</h2>
        <p className="text-blue-100 mt-1">Manage and track all purchase requests</p>
      </div>

      {/* Filters and Search */}
      <div className={`px-8 py-6 border-b ${darkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-gray-50'}`}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
          {/* Search */}
          <div>
            <label className={`block text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'} mb-2`}>
              Search
            </label>
            <input
              type="text"
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              placeholder="Reference No, Company..."
              className={`w-full px-4 py-2 border ${darkMode ? 'border-gray-600 bg-gray-700 text-white' : 'border-gray-300'} rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
            />
          </div>

          {/* Status Filter */}
          <div>
            <label className={`block text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'} mb-2`}>
              Status
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

          {/* Request Type Filter */}
          <div>
            <label className={`block text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'} mb-2`}>
              Request Type
            </label>
            <select
              value={filters.requestType}
              onChange={(e) => handleFilterChange('requestType', e.target.value)}
              className={`w-full px-4 py-2 border ${darkMode ? 'border-gray-600 bg-gray-700 text-white' : 'border-gray-300'} rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
            >
              <option value="">All Types</option>
              {REQUEST_TYPE_OPTIONS.map(type => (
                <option key={type.value} value={type.value} className={darkMode ? 'bg-gray-700' : ''}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>

          {/* Company Filter */}
          <div>
            <label className={`block text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'} mb-2`}>
              Company
            </label>
            <select
              value={filters.company}
              onChange={(e) => handleFilterChange('company', e.target.value)}
              className={`w-full px-4 py-2 border ${darkMode ? 'border-gray-600 bg-gray-700 text-white' : 'border-gray-300'} rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
            >
              <option value="">All Companies</option>
              {uniqueCompanies.map(company => (
                <option key={company} value={company} className={darkMode ? 'bg-gray-700' : ''}>
                  {company}
                </option>
              ))}
            </select>
          </div>

          {/* Rush Filter */}
          <div>
            <label className={`block text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'} mb-2`}>
              Rush Status
            </label>
            <select
              value={filters.isRush}
              onChange={(e) => handleFilterChange('isRush', e.target.value)}
              className={`w-full px-4 py-2 border ${darkMode ? 'border-gray-600 bg-gray-700 text-white' : 'border-gray-300'} rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
            >
              <option value="">All</option>
              <option value="true" className={darkMode ? 'bg-gray-700' : ''}>Rush</option>
              <option value="false" className={darkMode ? 'bg-gray-700' : ''}>Normal</option>
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
          Showing {filteredAndSortedPurchaseRequests.length} of {purchaseRequests.length} purchase requests
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto border border-gray-200 rounded-lg">
        <table className="w-full">
          <thead className="bg-gray-100 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Reference No
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Company
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Type
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Requested By
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Created
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Rush
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredAndSortedPurchaseRequests.length === 0 ? (
              <tr>
                <td colSpan="7" className="px-4 py-12 text-center text-gray-500">
                  <div className="flex flex-col items-center">
                    <svg className="w-12 h-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <p className="text-lg font-medium text-gray-900">No purchase requests found</p>
                    <p className="text-sm text-gray-600">Try adjusting your filters or create a new purchase request.</p>
                  </div>
                </td>
              </tr>
            ) : (
              filteredAndSortedPurchaseRequests.map((pr) => (
                <tr
                  key={pr.id}
                  onClick={() => onPurchaseRequestClick(pr)}
                  className="hover:bg-gray-50 cursor-pointer transition-colors duration-150"
                >
                  <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                    {pr.referenceNo}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                    {pr.company}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                    {pr.requestType}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadge(pr.requestStatus)}`}>
                      {pr.requestStatus}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                    {pr.requestedBy}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                    {formatDate(pr.dateCreated)}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-center">
                    {pr.isRush ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                        <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                        </svg>
                        Rush
                      </span>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
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
