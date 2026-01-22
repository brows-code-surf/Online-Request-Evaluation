'use client';

import { useState, useEffect, useCallback } from 'react';
import HeaderNavBar from '../../../_components/headerNavBar';
import Loader from '@/app/_components/loader';
import ProtectedRoute from '@/utils/protectedRoute';
import { useAuth } from '../../../../utils/authContext';

import Pagination from '../../_components/Pagination';
import ConfirmModal from '../../_components/confirmModal';
import AddItemModal from './_components/AddItemModal';
import EditItemModal from './_components/EditItemModal';
import { getAllItems, addItem, updateItem, searchItems, activateItem, deactivateItem } from './_actions';

function ItemMasterfileContent() {
    const { user, loading, darkMode } = useAuth();
    const [pageLoading, setPageLoading] = useState(true);
    const [items, setItems] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [sortBy, setSortBy] = useState('itemNumber');

    // Pagination states
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);

    // Modal states
    const [showAddModal, setShowAddModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showActivateModal, setShowActivateModal] = useState(false);
    const [showDeactivateModal, setShowDeactivateModal] = useState(false);
    const [selectedItem, setSelectedItem] = useState(null);

    // Form states
    const [formData, setFormData] = useState({
        itemNumber: '',
        itemDesc: '',
        locationCode: ''
    });
    const [formErrors, setFormErrors] = useState({});
    const [formLoading, setFormLoading] = useState(false);

    // Messages
    const [successMessage, setSuccessMessage] = useState('');
    const [errorMessage, setErrorMessage] = useState('');

    useEffect(() => {
        if (loading) return;
        loadItems();
    }, [loading]);

    const loadItems = async () => {
        setPageLoading(true);
        try {
            const result = await getAllItems();
            if (result.success) {
                setItems(result.data);
            } else {
                setErrorMessage(result.message);
            }
        } catch (error) {
            console.error('Error loading items:', error);
            setErrorMessage('Failed to load items');
        } finally {
            setPageLoading(false);
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));

        // Clear error for this field
        if (formErrors[name]) {
            setFormErrors(prev => ({ ...prev, [name]: '' }));
        }
    };

    const validateForm = () => {
        const errors = {};

        if (!formData.itemNumber?.trim()) {
            errors.itemNumber = 'Item number is required';
        }

        setFormErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleAddItem = async () => {
        if (!validateForm()) return;

        setFormLoading(true);
        setSuccessMessage('');
        setErrorMessage('');

        try {
            const result = await addItem(formData, user.empName);
            if (result.success) {
                setSuccessMessage('Item added successfully!');
                setShowAddModal(false);
                resetForm();
                loadItems();
                setTimeout(() => setSuccessMessage(''), 3000);
            } else {
                setErrorMessage(result.message);
            }
        } catch (error) {
            setErrorMessage('Failed to add item');
        } finally {
            setFormLoading(false);
        }
    };

    const handleEditItem = async () => {
        if (!validateForm() || !selectedItem) return;

        setFormLoading(true);
        setSuccessMessage('');
        setErrorMessage('');

        try {
            const result = await updateItem(selectedItem.ITEMNMBR, formData, user.empName);
            if (result.success) {
                setSuccessMessage('Item updated successfully!');
                setShowEditModal(false);
                resetForm();
                loadItems();
                setTimeout(() => setSuccessMessage(''), 3000);
            } else {
                setErrorMessage(result.message);
            }
        } catch (error) {
            setErrorMessage('Failed to update item');
        } finally {
            setFormLoading(false);
        }
    };



    const resetForm = () => {
        setFormData({
            itemNumber: '',
            itemDesc: '',
            locationCode: ''
        });
        setFormErrors({});
        setSelectedItem(null);
    };

    const openEditModal = (item) => {
        setSelectedItem(item);
        setFormData({
            itemNumber: item.ITEMNMBR,
            itemDesc: item.ITEMDESC || '',
            locationCode: item.LOCNCODE || ''
        });
        setShowEditModal(true);
    };

    const handleActivateItem = async (item) => {
        setFormLoading(true);
        try {
            const result = await activateItem(item.ITEMNMBR, user.empName);
            if (result.success) {
                setSuccessMessage('Item activated successfully!');
                loadItems();
                setTimeout(() => setSuccessMessage(''), 3000);
            } else {
                setErrorMessage(result.message);
            }
        } catch (error) {
            setErrorMessage('Failed to activate item');
        } finally {
            setFormLoading(false);
        }
    };

    const handleDeactivateItem = async (item) => {
        setFormLoading(true);
        try {
            const result = await deactivateItem(item.ITEMNMBR, user.empName);
            if (result.success) {
                setSuccessMessage('Item deactivated successfully!');
                loadItems();
                setTimeout(() => setSuccessMessage(''), 3000);
            } else {
                setErrorMessage(result.message);
            }
        } catch (error) {
            setErrorMessage('Failed to deactivate item');
        } finally {
            setFormLoading(false);
        }
    };



    const formatDate = (dateValue) => {
        if (!dateValue) return 'N/A';
        try {
            const date = new Date(dateValue);
            if (isNaN(date.getTime())) {
                return 'Invalid Date';
            }
            return date.toLocaleDateString();
        } catch (error) {
            return 'Invalid Date';
        }
    };

    // Reset to page 1 when search or sort changes
    useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery, sortBy]);

    const filteredItems = items
        .filter(item => {
            const matchesSearch = item.ITEMNMBR.toLowerCase().includes(searchQuery.toLowerCase()) ||
                (item.ITEMDESC && item.ITEMDESC.toLowerCase().includes(searchQuery.toLowerCase())) ||
                (item.LOCNCODE && item.LOCNCODE.toLowerCase().includes(searchQuery.toLowerCase()));
            return matchesSearch;
        })
        .sort((a, b) => {
            if (sortBy === 'itemNumber') {
                return a.ITEMNMBR.localeCompare(b.ITEMNMBR);
            } else if (sortBy === 'itemDesc') {
                return (a.ITEMDESC || '').localeCompare(b.ITEMDESC || '');
            } else if (sortBy === 'locationCode') {
                return (a.LOCNCODE || '').localeCompare(b.LOCNCODE || '');
            } else if (sortBy === 'dateModified') {
                return new Date(b.DATEMODIFIED || 0) - new Date(a.DATEMODIFIED || 0);
            }
            return 0;
        });

    // Pagination calculations
    const totalItems = filteredItems.length;
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedItems = filteredItems.slice(startIndex, endIndex);

    // Handle page changes
    const handlePageChange = (page) => {
        if (page >= 1 && page <= totalPages) {
            setCurrentPage(page);
        }
    };

    const handleItemsPerPageChange = (newItemsPerPage) => {
        setItemsPerPage(newItemsPerPage);
        setCurrentPage(1);
    };

    if (loading) {
        return (
            <div className={`flex flex-col h-screen ${darkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
                <Loader loading={true} />
                <HeaderNavBar />
            </div>
        );
    }

    return (
        <div className={`flex flex-col min-h-screen ${darkMode ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'}`}>
            <HeaderNavBar />

            <div className="flex flex-1 pt-16">
                <div className="flex-1 flex flex-col">
                    <div className="flex-1 p-8">
                        <div className="max-w-7xl mx-auto space-y-8">

                            {/* Header Section */}
                            <div className={`${darkMode ? 'bg-gray-800/50' : 'bg-white/50'} backdrop-blur-sm rounded-2xl border ${darkMode ? 'border-gray-700/50' : 'border-gray-200/50'} p-8 shadow-xl`}>
                                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-4 mb-4">
                                            <div className={`p-3 rounded-xl ${darkMode ? 'bg-blue-600/20' : 'bg-blue-50'}`}>
                                                <svg className={`w-8 h-8 ${darkMode ? 'text-blue-400' : 'text-blue-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                                                </svg>
                                            </div>
                                            <div>
                                                <h1 className="text-3xl font-bold bg-blue-600 bg-clip-text text-transparent">
                                                    Item Masterfile
                                                </h1>
                                                <p className={`text-sm mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                                    Comprehensive inventory management system
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex flex-col sm:flex-row gap-3">
                                        <div className={`px-4 py-3 rounded-xl border ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-100 border-gray-200'}`}>
                                            <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">Total Items</div>
                                            <div className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{items.length}</div>
                                        </div>
                                        <div className={`px-4 py-3 rounded-xl border ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-100 border-gray-200'}`}>
                                            <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">Active</div>
                                            <div className="text-2xl font-bold text-green-600">{items.filter(item => item.ACTIVE).length}</div>
                                        </div>
                                        <button
                                            onClick={() => setShowAddModal(true)}
                                            className="bg-blue-700 hover:from-blue-700 hover:via-blue-800 hover:to-purple-800 text-white px-6 py-3 rounded-xl font-semibold transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 flex items-center justify-center gap-2"
                                        >
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                            </svg>
                                            Add New Item
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Messages */}
                            {successMessage && (
                                <div className={`mb-6 p-4 ${darkMode ? 'bg-green-900 border-green-700' : 'bg-green-50 border-green-200'} border rounded-lg flex items-center gap-3`}>
                                    <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                    <p className={`font-medium ${darkMode ? 'text-green-300' : 'text-green-800'}`}>{successMessage}</p>
                                </div>
                            )}

                            {errorMessage && (
                                <div className={`mb-6 p-4 ${darkMode ? 'bg-red-900 border-red-700' : 'bg-red-50 border-red-200'} border rounded-lg flex items-center gap-3`}>
                                    <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                    <p className={`font-medium ${darkMode ? 'text-red-300' : 'text-red-800'}`}>{errorMessage}</p>
                                </div>
                            )}

                            {/* Search and Filters */}
                            <div className={`${darkMode ? 'bg-gray-800/50' : 'bg-white/50'} backdrop-blur-sm rounded-2xl border ${darkMode ? 'border-gray-700/50' : 'border-gray-200/50'} p-6 shadow-lg`}>
                                <div className="flex flex-col lg:flex-row gap-6">
                                    <div className="flex-1">
                                        <div className="relative">
                                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                                <svg className={`w-5 h-5 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                                </svg>
                                            </div>
                                            <input
                                                type="text"
                                                placeholder="Search by item number, description, or location..."
                                                value={searchQuery}
                                                onChange={(e) => setSearchQuery(e.target.value)}
                                                className={`w-full pl-12 pr-10 py-3 text-sm border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all ${darkMode ? 'border-gray-600 bg-gray-700/50 text-white placeholder-gray-400' : 'border-gray-300 bg-white/50 text-gray-900 placeholder-gray-500'} backdrop-blur-sm`}
                                            />
                                            {searchQuery && (
                                                <button
                                                    onClick={() => setSearchQuery('')}
                                                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
                                                >
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                    </svg>
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="flex items-center gap-2">
                                            <svg className={`w-4 h-4 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                                            </svg>
                                            <select
                                                value={sortBy}
                                                onChange={(e) => setSortBy(e.target.value)}
                                                className={`px-4 py-3 text-sm border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all ${darkMode ? 'border-gray-600 bg-gray-700/50 text-white' : 'border-gray-300 bg-white/50 text-gray-900'} backdrop-blur-sm`}
                                            >
                                                <option value="itemNumber">Item Number</option>
                                                <option value="itemDesc">Description</option>
                                                <option value="locationCode">Location</option>
                                                <option value="dateModified">Last Modified</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Items Table */}
                            <div className={`${darkMode ? 'bg-gray-800/50' : 'bg-white/50'} backdrop-blur-sm rounded-2xl border ${darkMode ? 'border-gray-700/50' : 'border-gray-200/50'} overflow-hidden shadow-lg`}>
                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead className={`${darkMode ? 'bg-gray-800/60' : 'bg-gray-50/60'} backdrop-blur-sm`}>
                                            <tr>
                                                <th className={`px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                                                    Item Number
                                                </th>
                                                <th className={`px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                                                    Description
                                                </th>
                                                <th className={`px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                                                    Location Code
                                                </th>
                                                <th className={`px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                                                    Status
                                                </th>
                                                <th className={`px-6 py-4 text-right text-xs font-semibold uppercase tracking-wider ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                                                    Actions
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody className={`${darkMode ? 'bg-gray-800/30' : 'bg-white/30'} backdrop-blur-sm`}>
                                            {paginatedItems.length === 0 ? (
                                                <tr>
                                                    <td colSpan="5" className={`px-6 py-16 text-center ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                                        <div className="flex flex-col items-center">
                                                            <div className={`p-4 rounded-full ${darkMode ? 'bg-gray-700/50' : 'bg-gray-100/50'} mb-4`}>
                                                                <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-5.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                                                                </svg>
                                                            </div>
                                                            <h3 className="text-lg font-semibold mb-2">No items found</h3>
                                                            <p className="text-sm max-w-sm">Get started by adding your first item to the masterfile. All items will appear here once created.</p>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ) : (
                                                paginatedItems.map((item, index) => (
                                                    <tr key={item.ITEMNMBR} className={`group ${index % 2 === 0 ? (darkMode ? 'bg-gray-800/20' : 'bg-white/40') : (darkMode ? 'bg-gray-700/10' : 'bg-gray-50/30')} hover:${darkMode ? 'bg-gray-700/30' : 'bg-blue-50/50'} transition-all duration-200 border-b ${darkMode ? 'border-gray-700/30' : 'border-gray-200/30'} backdrop-blur-sm`}>
                                                        <td className={`px-6 py-5 whitespace-nowrap text-sm font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                                                            <div className="flex items-center">
                                                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold mr-3 ${darkMode ? 'bg-blue-600/20 text-blue-400' : 'bg-blue-100 text-blue-800'}`}>
                                                                    {item.ITEMNMBR.charAt(0).toUpperCase()}
                                                                </div>
                                                                {item.ITEMNMBR}
                                                            </div>
                                                        </td>
                                                        <td className={`px-6 py-5 text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'} max-w-xs truncate`}>
                                                            <div className="flex items-center">
                                                                <span className="truncate" title={item.ITEMDESC || 'No description'}>
                                                                    {item.ITEMDESC || 'No description'}
                                                                </span>
                                                            </div>
                                                        </td>
                                                        <td className={`px-6 py-5 whitespace-nowrap text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                                            <div className="flex items-center">
                                                                <svg className={`w-4 h-4 mr-2 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                                                </svg>
                                                                {item.LOCNCODE || 'No location'}
                                                            </div>
                                                        </td>
                                                        <td className={`px-6 py-5 whitespace-nowrap text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                                            <span className={`inline-flex items-center px-3 py-1.5 text-xs font-semibold rounded-full transition-all duration-200 ${
                                                                item.ACTIVE
                                                                    ? (darkMode ? 'bg-green-900/60 text-green-300 border border-green-700/50' : 'bg-green-100 text-green-800 border border-green-200')
                                                                    : (darkMode ? 'bg-red-900/60 text-red-300 border border-red-700/50' : 'bg-red-100 text-red-800 border border-red-200')
                                                            }`}>
                                                                <span className={`w-1.5 h-1.5 rounded-full mr-2 ${item.ACTIVE ? 'bg-green-500' : 'bg-red-500'}`}></span>
                                                                {item.ACTIVE ? 'Active' : 'Inactive'}
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-5 whitespace-nowrap text-right text-sm font-medium">
                                                            <div className="flex justify-end gap-1">
                                                                <button
                                                                    onClick={() => openEditModal(item)}
                                                                    className={`p-2 rounded-lg transition-all duration-200 ${darkMode ? 'hover:bg-blue-600/20 text-blue-400 hover:text-blue-300' : 'hover:bg-blue-100 text-blue-600 hover:text-blue-700'} group-hover:opacity-100`}
                                                                    title="Edit Item"
                                                                >
                                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                                    </svg>
                                                                </button>
                                                                {item.ACTIVE ? (
                                                                    <button
                                                                        onClick={() => {
                                                                            setSelectedItem(item);
                                                                            setShowDeactivateModal(true);
                                                                        }}
                                                                        className={`p-2 rounded-lg transition-all duration-200 ${darkMode ? 'hover:bg-orange-600/20 text-orange-400 hover:text-orange-300' : 'hover:bg-orange-100 text-orange-600 hover:text-orange-700'} group-hover:opacity-100`}
                                                                        title="Deactivate Item"
                                                                        disabled={formLoading}
                                                                    >
                                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                                                                        </svg>
                                                                    </button>
                                                                ) : (
                                                                    <button
                                                                        onClick={() => {
                                                                            setSelectedItem(item);
                                                                            setShowActivateModal(true);
                                                                        }}
                                                                        className={`p-2 rounded-lg transition-all duration-200 ${darkMode ? 'hover:bg-green-600/20 text-green-400 hover:text-green-300' : 'hover:bg-green-100 text-green-600 hover:text-green-700'} group-hover:opacity-100`}
                                                                        title="Activate Item"
                                                                        disabled={formLoading}
                                                                    >
                                                                        <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                                        </svg>
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* Pagination */}
                            {totalPages > 1 && (
                                <div className="mt-6">
                                    <Pagination
                                        currentPage={currentPage}
                                        totalPages={totalPages}
                                        itemsPerPage={itemsPerPage}
                                        totalItems={totalItems}
                                        onPageChange={handlePageChange}
                                        onItemsPerPageChange={handleItemsPerPageChange}
                                        darkMode={darkMode}
                                    />
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Add Item Modal */}
            <AddItemModal
                isOpen={showAddModal}
                onClose={() => { setShowAddModal(false); resetForm(); }}
                formData={formData}
                formErrors={formErrors}
                formLoading={formLoading}
                onInputChange={handleInputChange}
                onSubmit={handleAddItem}
                darkMode={darkMode}
            />

            {/* Edit Item Modal */}
            <EditItemModal
                isOpen={showEditModal}
                onClose={() => { setShowEditModal(false); resetForm(); }}
                formData={formData}
                formErrors={formErrors}
                formLoading={formLoading}
                onInputChange={handleInputChange}
                onSubmit={handleEditItem}
                darkMode={darkMode}
            />

            {/* Activate Item Confirmation Modal */}
            <ConfirmModal
                isOpen={showActivateModal}
                title="Activate Item"
                message={`Are you sure you want to activate the item "${selectedItem?.ITEMNMBR}"? The item will become active and available for use.`}
                confirmButtonText="Activate"
                confirmButtonColor="green"
                onConfirm={() => {
                    handleActivateItem(selectedItem);
                    setShowActivateModal(false);
                    setSelectedItem(null);
                }}
                onCancel={() => {
                    setShowActivateModal(false);
                    setSelectedItem(null);
                }}
                isLoading={formLoading}
            />

            {/* Deactivate Item Confirmation Modal */}
            <ConfirmModal
                isOpen={showDeactivateModal}
                title="Deactivate Item"
                message={`Are you sure you want to deactivate the item "${selectedItem?.ITEMNMBR}"? The item will become inactive and unavailable for use.`}
                confirmButtonText="Deactivate"
                confirmButtonColor="orange"
                onConfirm={() => {
                    handleDeactivateItem(selectedItem);
                    setShowDeactivateModal(false);
                    setSelectedItem(null);
                }}
                onCancel={() => {
                    setShowDeactivateModal(false);
                    setSelectedItem(null);
                }}
                isLoading={formLoading}
            />

        </div>
    );
}

export default function ItemMasterfilePage() {
    return (
        <ProtectedRoute>
            <ItemMasterfileContent />
        </ProtectedRoute>
    );
}
