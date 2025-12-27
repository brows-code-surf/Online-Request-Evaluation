'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import HeaderNavBar from '../../_components/headerNavBar';
import Loader from '@/app/_components/loader';
import ProtectedRoute from '@/utils/protectedRoute';
import { useAuth } from '../../../utils/authContext';
import ConfirmModal from '../_components/confirmModal';
import { getAllModules, addModule, updateModule, deactivateModule, activateModule, checkModuleExists } from './_actions';
import AddModuleModal from './_components/AddModuleModal';
import AddSubmoduleModal from './_components/AddSubmoduleModal';
import EditModuleModal from './_components/EditModuleModal';

function SystemModulesContent() {
    const router = useRouter();
    const { user, loading, isAdmin, darkMode } = useAuth();
    const [pageLoading, setPageLoading] = useState(true);
    const [modules, setModules] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [sortBy, setSortBy] = useState('name');
    const [filterStatus, setFilterStatus] = useState('all');

    // Pagination states
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);

    // Modal states
    const [showAddModal, setShowAddModal] = useState(false);
    const [showAddSubmoduleModal, setShowAddSubmoduleModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [showActivateModal, setShowActivateModal] = useState(false);
    const [showQuickSetupModal, setShowQuickSetupModal] = useState(false);
    const [selectedModule, setSelectedModule] = useState(null);

    // Form states
    const [formData, setFormData] = useState({
        module: '',
        name: '',
        description: '',
        submodulename: '',
        submodule: ''
    });
    const [submodules, setSubmodules] = useState([]);
    const [currentSubmodule, setCurrentSubmodule] = useState('');
    const [formErrors, setFormErrors] = useState({});
    const [formLoading, setFormLoading] = useState(false);

    // Messages
    const [successMessage, setSuccessMessage] = useState('');
    const [errorMessage, setErrorMessage] = useState('');

    useEffect(() => {
        if (loading) return;
        if (!isAdmin()) {
            router.push('/request-evaluation');
            return;
        } else {
            loadModules();
        }
    }, [loading]);

    const loadModules = async () => {
        setPageLoading(true);
        try {
            const result = await getAllModules();
            if (result.success) {
                setModules(result.data);
            } else {
                setErrorMessage(result.message);
            }
        } catch (error) {
            console.error('Error loading modules:', error);
            setErrorMessage('Failed to load modules');
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

    const validateForm = (isSubmoduleForm = false) => {
        const errors = {};

        if (isSubmoduleForm) {
            // Validation for submodule creation
            if (!formData.submodule?.trim()) {
                errors.submodule = 'Parent module is required';
            }
            if (!formData.submodulename?.trim()) {
                errors.submodulename = 'Submodule name is required';
            }
            if (!formData.module?.trim()) {
                errors.module = 'Submodule identifier is required';
            } else {
                // Submodule identifiers should be lowercase with hyphens/underscores
                if (!/^[a-z0-9-_]+$/.test(formData.module)) {
                    errors.module = 'Submodule identifier must use lowercase letters, numbers, hyphens, and underscores';
                }
            }
        } else {
            // Validation for main modules or editing
            if (!formData.module?.trim()) {
                errors.module = 'Module identifier is required';
            } else if (!formData.submodule) {
                // Main module can have spaces and mixed case
                if (!/^[a-zA-Z0-9\s-_]+$/.test(formData.module)) {
                    errors.module = 'Module identifier can contain letters, numbers, spaces, hyphens, and underscores';
                }
            }

            if (!formData.name?.trim()) {
                errors.name = 'Module name is required';
            }

            // For submodules being edited, validate submodule name
            if (formData.submodule && !formData.submodulename?.trim()) {
                errors.submodulename = 'Submodule name is required when editing a submodule';
            }
        }

        setFormErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleAddModule = async () => {
        if (!validateForm()) return;

        setFormLoading(true);
        setSuccessMessage('');
        setErrorMessage('');

        try {
            // Prepare module data
            const moduleData = { ...formData };

            // Single module creation
            const result = await addModule(moduleData, user.empName);
            if (result.success) {
                setSuccessMessage('Module added successfully!');
                setShowAddModal(false);
                resetForm();
                loadModules();
                setTimeout(() => setSuccessMessage(''), 3000);
            } else {
                setErrorMessage(result.message);
            }
        } catch (error) {
            setErrorMessage('Failed to add module');
        } finally {
            setFormLoading(false);
        }
    };

    const handleAddSubmodule = async () => {
        if (!validateForm(true)) return;

        setFormLoading(true);
        setSuccessMessage('');
        setErrorMessage('');

        try {
            // Prepare submodule data
            const moduleData = { ...formData };

            // Single submodule creation
            const result = await addModule(moduleData, user.empName);
            if (result.success) {
                setSuccessMessage('Submodule added successfully!');
                setShowAddSubmoduleModal(false);
                resetForm();
                loadModules();
                setTimeout(() => setSuccessMessage(''), 3000);
            } else {
                setErrorMessage(result.message);
            }
        } catch (error) {
            setErrorMessage('Failed to add submodule');
        } finally {
            setFormLoading(false);
        }
    };

    const handleEditModule = async () => {
        if (!validateForm() || !selectedModule) return;

        setFormLoading(true);
        setSuccessMessage('');
        setErrorMessage('');

        try {
            // Check if module identifier conflicts with another module
            const existsResult = await checkModuleExists(formData.module);
            if (existsResult.success && existsResult.exists) {
                // Check if it's the same module we're editing
                if (formData.module !== selectedModule.MODULE) {
                    setFormErrors({ module: 'A module with this identifier already exists' });
                    return;
                }
            }

            const result = await updateModule(selectedModule.ROWID, formData, user.empName);
            if (result.success) {
                setSuccessMessage('Module updated successfully!');
                setShowEditModal(false);
                resetForm();
                loadModules();
                setTimeout(() => setSuccessMessage(''), 3000);
            } else {
                setErrorMessage(result.message);
            }
        } catch (error) {
            setErrorMessage('Failed to update module');
        } finally {
            setFormLoading(false);
        }
    };

    const handleDeactivateModule = async () => {
        if (!selectedModule) return;

        setFormLoading(true);
        try {
            const result = await deactivateModule(selectedModule.ROWID, user.empName);
            if (result.success) {
                setSuccessMessage('Module deactivated successfully!');
                setShowDeleteModal(false);
                setSelectedModule(null);
                loadModules();
                setTimeout(() => setSuccessMessage(''), 3000);
            } else {
                setErrorMessage(result.message);
            }
        } catch (error) {
            setErrorMessage('Failed to deactivate module');
        } finally {
            setFormLoading(false);
        }
    };

    const handleActivateModule = async () => {
        if (!selectedModule) return;

        setFormLoading(true);
        try {
            const result = await activateModule(selectedModule.ROWID, user.empName);
            if (result.success) {
                setSuccessMessage('Module activated successfully!');
                setShowActivateModal(false);
                setSelectedModule(null);
                loadModules();
                setTimeout(() => setSuccessMessage(''), 3000);
            } else {
                setErrorMessage(result.message);
            }
        } catch (error) {
            setErrorMessage('Failed to activate module');
        } finally {
            setFormLoading(false);
        }
    };

    const handleQuickSetup = async (template) => {
        setFormLoading(true);
        setSuccessMessage('');
        setErrorMessage('');

        try {
            let successCount = 0;
            let errorMessages = [];

            // Create submodules first (they reference the main module)
            for (const submodule of template.submodules) {
                try {
                    const moduleData = {
                        module: submodule.identifier,
                        name: submodule.name,
                        description: submodule.description,
                        submodule: template.mainModule.identifier
                    };

                    const result = await addModule(moduleData, user.empName);
                    if (result.success) {
                        successCount++;
                    } else {
                        errorMessages.push(`${submodule.identifier}: ${result.message}`);
                    }
                } catch (error) {
                    errorMessages.push(`${submodule.identifier}: ${error.message}`);
                }
            }

            if (successCount > 0) {
                setSuccessMessage(`${successCount} modules created successfully from ${template.name} template!`);
                if (errorMessages.length > 0) {
                    setErrorMessage(`Some modules failed: ${errorMessages.join(', ')}`);
                }
                setShowQuickSetupModal(false);
                loadModules();
                setTimeout(() => {
                    setSuccessMessage('');
                    setErrorMessage('');
                }, 5000);
            } else {
                setErrorMessage(`Failed to create modules: ${errorMessages.join(', ')}`);
            }
        } catch (error) {
            setErrorMessage('Failed to create quick setup');
        } finally {
            setFormLoading(false);
        }
    };

    const resetForm = () => {
        setFormData({ module: '', name: '', description: '', submodulename: '', submodule: '' });
        setSubmodules([]);
        setCurrentSubmodule('');
        setFormErrors({});
        setSelectedModule(null);
    };

    const openEditModal = (module) => {
        setSelectedModule(module);
        setFormData({
            module: module.MODULE,
            name: module.NAME,
            description: module.DESCRIPTION || '',
            submodulename: module.SUBMODULE ? module.NAME : '', // For child modules, submodulename is the child name
            submodule: module.SUBMODULE || ''
        });

        // Set submodules list if this is a parent module being edited
        if (!module.SUBMODULE) {
            // Get all parent modules for the submodule dropdown
            const parentModules = modules.filter(m => !m.SUBMODULE && m.ROWID !== module.ROWID);
            setSubmodules(parentModules);
        }

        setShowEditModal(true);
    };

    const openDeleteModal = (module) => {
        setSelectedModule(module);
        setShowDeleteModal(true);
    };

    const openActivateModal = (module) => {
        setSelectedModule(module);
        setShowActivateModal(true);
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

    const filteredModules = modules
        .filter(module => {
            const matchesSearch = module.NAME.toLowerCase().includes(searchQuery.toLowerCase()) ||
                module.MODULE.toLowerCase().includes(searchQuery.toLowerCase()) ||
                module.DESCRIPTION.toLowerCase().includes(searchQuery.toLowerCase());
            return matchesSearch;
        })
        .sort((a, b) => {
            if (sortBy === 'name') {
                return a.NAME.localeCompare(b.NAME);
            } else if (sortBy === 'module') {
                return a.MODULE.localeCompare(b.MODULE);
            } else if (sortBy === 'date') {
                return new Date(b.DATECREATED) - new Date(a.DATECREATED);
            }
            return 0;
        });

    // Pagination calculations
    const totalItems = filteredModules.length;
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedModules = filteredModules.slice(startIndex, endIndex);

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

    if (loading || pageLoading) {
        return (
            <div className={`flex flex-col h-screen ${darkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
                <Loader loading={true} />
                <HeaderNavBar />
            </div>
        );
    }

    return (
        <div className={`flex flex-col h-screen ${darkMode ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'}`}>
            <HeaderNavBar />

            <div className="flex flex-1 overflow-hidden pt-14">
                <div className="flex-1 flex flex-col overflow-hidden">
                    <div className="flex-1 overflow-y-auto">
                        <div className="p-6">

                            {/* Header */}
                            <div className="mb-6">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h1 className="text-3xl font-bold">System Modules Management</h1>
                                        <p className={`text-sm mt-2 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                                            Manage system modules that can be assigned to user roles
                                        </p>
                                    </div>
                                    <div className="flex gap-3">
                                        <button
                                            onClick={() => setShowAddModal(true)}
                                            className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-6 py-3 rounded-xl font-semibold transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 flex items-center gap-2"
                                        >
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                            </svg>
                                            Add Module
                                        </button>
                                        <button
                                            onClick={() => setShowAddSubmoduleModal(true)}
                                            className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white px-6 py-3 rounded-xl font-semibold transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 flex items-center gap-2"
                                        >
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                            </svg>
                                            Add Submodule
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

                            {/* Compact Search and Filters */}
                            <div className={`mb-4 ${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg border ${darkMode ? 'border-gray-600' : 'border-gray-200'} p-4`}>
                                <div className="flex flex-col sm:flex-row gap-4">
                                    <div className="flex-1">
                                        <div className="relative">
                                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                <svg className={`w-4 h-4 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                                </svg>
                                            </div>
                                            <input
                                                type="text"
                                                placeholder="Search modules..."
                                                value={searchQuery}
                                                onChange={(e) => setSearchQuery(e.target.value)}
                                                className={`w-full pl-9 pr-8 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                                                    darkMode ? 'border-gray-600 bg-gray-700 text-white placeholder-gray-400' : 'border-gray-300'
                                                }`}
                                            />
                                            {searchQuery && (
                                                <button
                                                    onClick={() => setSearchQuery('')}
                                                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                                                >
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                    </svg>
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <select
                                            value={sortBy}
                                            onChange={(e) => setSortBy(e.target.value)}
                                            className={`px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${darkMode ? 'border-gray-600 bg-gray-700 text-white' : 'border-gray-300'}`}
                                        >
                                            <option value="name">Sort by Name</option>
                                            <option value="module">Sort by Identifier</option>
                                            <option value="date">Sort by Date</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            {/* Modules Table */}
                            <div className={`shadow-lg rounded-lg overflow-hidden ${darkMode ? 'bg-gray-800' : 'bg-white'} border ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                                <div className="overflow-x-auto">
                                    <table className="min-w-full divide-y divide-gray-200">
                                        <thead className={`${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                                            <tr>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                    Module Name
                                                </th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                    Identifier
                                                </th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                    Submodule
                                                </th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                    Description
                                                </th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                    Status
                                                </th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                    Created
                                                </th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                    Modified
                                                </th>
                                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                    Actions
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody className={`${darkMode ? 'bg-gray-800' : 'bg-white'} divide-y divide-gray-200`}>
                                            {paginatedModules.map((module) => (
                                                <tr key={module.ROWID} className={`${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-50'} transition-colors`}>
                                                    <td className="px-6 py-2 whitespace-nowrap">
                                                        <div className={`text-sm font-medium ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                                            {module.NAME}
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-2 whitespace-nowrap">
                                                        <div className={`text-sm font-mono ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                                            {module.MODULE}
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-2 whitespace-nowrap">
                                                        <div className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                                                            {module.SUBMODULE || '—'}
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-2">
                                                        <div className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'} max-w-xs truncate`}>
                                                            {module.DESCRIPTION}
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-2 whitespace-nowrap">
                                                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                                            module.IS_ACTIVE === 1
                                                                ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                                                : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                                                        }`}>
                                                            {module.IS_ACTIVE === 1 ? 'Active' : 'Inactive'}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-2 whitespace-nowrap">
                                                        <div className="text-sm text-gray-500">
                                                            {formatDate(module.DATECREATED)}
                                                        </div>
                                                        <div className="text-xs text-gray-400">
                                                            by {module.CREATEDBY}
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-2 whitespace-nowrap">
                                                        <div className="text-sm text-gray-500">
                                                            {module.MODIFIEDBY ? formatDate(module.DATEMODIFIED) : 'Never'}
                                                        </div>
                                                        {module.MODIFIEDBY && (
                                                            <div className="text-xs text-gray-400">
                                                                by {module.MODIFIEDBY}
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td className="px-6 py-2 whitespace-nowrap text-right">
                                                        <div className="flex justify-end gap-2">
                                                            <button
                                                                onClick={() => openEditModal(module)}
                                                                className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                                                                title="Edit module"
                                                            >
                                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                                </svg>
                                                            </button>
                                                            {module.IS_ACTIVE === 1 ? (
                                                                <button
                                                                    onClick={() => openDeleteModal(module)}
                                                                    className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 transition-colors shadow-sm"
                                                                    title="Deactivate module"
                                                                >
                                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a2 2 0 11-4 0 2 2 0 014 0z" />
                                                                    </svg>
                                                                </button>
                                                            ) : (
                                                                <button
                                                                    onClick={() => openActivateModal(module)}
                                                                    className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors shadow-sm"
                                                                    title="Activate module"
                                                                >
                                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                                    </svg>
                                                                </button>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {filteredModules.length === 0 && (
                                <div className="text-center py-12">
                                    <svg className="w-16 h-16 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                                    </svg>
                                    <p className="text-lg font-medium text-gray-500">No modules found</p>
                                    <p className="text-sm text-gray-400 mt-1">Try adjusting your search or add a new module</p>
                                </div>
                            )}

                            {/* Pagination */}
                            {filteredModules.length > 0 && (
                                <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                                    <div className="flex items-center gap-2">
                                        <span className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                                            Show
                                        </span>
                                        <select
                                            value={itemsPerPage}
                                            onChange={(e) => handleItemsPerPageChange(Number(e.target.value))}
                                            className={`px-2 py-1 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500 ${darkMode ? 'border-gray-600 bg-gray-700 text-white' : 'border-gray-300'}`}
                                        >
                                            <option value={5}>5</option>
                                            <option value={10}>10</option>
                                            <option value={25}>25</option>
                                            <option value={50}>50</option>
                                        </select>
                                        <span className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                                            entries
                                        </span>
                                    </div>

                                    <div className="flex items-center gap-4">
                                        <div className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                                            Showing {startIndex + 1} to {Math.min(endIndex, totalItems)} of {totalItems} entries
                                        </div>

                                        <div className="flex items-center gap-1">
                                            <button
                                                onClick={() => handlePageChange(currentPage - 1)}
                                                disabled={currentPage === 1}
                                                className={`px-3 py-2 border rounded-md text-sm font-medium transition-colors ${
                                                    currentPage === 1
                                                        ? 'border-gray-300 text-gray-400 cursor-not-allowed'
                                                        : 'border-gray-300 text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500'
                                                }`}
                                            >
                                                Previous
                                            </button>

                                            {/* Page Numbers */}
                                            {Array.from({ length: totalPages }, (_, i) => i + 1)
                                                .filter(page => {
                                                    // Show first page, last page, current page, and pages around current page
                                                    return page === 1 ||
                                                           page === totalPages ||
                                                           (page >= currentPage - 1 && page <= currentPage + 1);
                                                })
                                                .map((page, index, array) => (
                                                    <div key={page} className="flex items-center">
                                                        {index > 0 && array[index - 1] !== page - 1 && (
                                                            <span className={`px-2 py-2 text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>...</span>
                                                        )}
                                                        <button
                                                            onClick={() => handlePageChange(page)}
                                                            className={`px-3 py-2 border rounded-md text-sm font-medium transition-colors ${
                                                                currentPage === page
                                                                    ? 'bg-blue-600 border-blue-600 text-white'
                                                                    : 'border-gray-300 text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500'
                                                            }`}
                                                        >
                                                            {page}
                                                        </button>
                                                    </div>
                                                ))}

                                            <button
                                                onClick={() => handlePageChange(currentPage + 1)}
                                                disabled={currentPage === totalPages}
                                                className={`px-3 py-2 border rounded-md text-sm font-medium transition-colors ${
                                                    currentPage === totalPages
                                                        ? 'border-gray-300 text-gray-400 cursor-not-allowed'
                                                        : 'border-gray-300 text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500'
                                                }`}
                                            >
                                                Next
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Modal Components */}
            <AddModuleModal
                isOpen={showAddModal}
                onClose={() => { setShowAddModal(false); resetForm(); }}
                formData={formData}
                formErrors={formErrors}
                formLoading={formLoading}
                onInputChange={handleInputChange}
                onSubmit={handleAddModule}
            />

            <EditModuleModal
                isOpen={showEditModal}
                onClose={() => { setShowEditModal(false); resetForm(); }}
                formData={formData}
                formErrors={formErrors}
                formLoading={formLoading}
                onInputChange={handleInputChange}
                onSubmit={handleEditModule}
                modules={modules}
            />

            <AddSubmoduleModal
                isOpen={showAddSubmoduleModal}
                onClose={() => { setShowAddSubmoduleModal(false); resetForm(); }}
                formData={formData}
                formErrors={formErrors}
                formLoading={formLoading}
                onInputChange={handleInputChange}
                onSubmit={handleAddSubmodule}
                modules={modules}
            />

            {/* Deactivate Confirmation Modal */}
            <ConfirmModal
                isOpen={showDeleteModal}
                title="Deactivate Module"
                message={`Are you sure you want to deactivate the module "${selectedModule?.NAME}"? The module will become inactive and users will no longer have access to it.`}
                confirmButtonText="Deactivate"
                confirmButtonColor="orange"
                onConfirm={handleDeactivateModule}
                onCancel={() => { setShowDeleteModal(false); setSelectedModule(null); }}
                isLoading={formLoading}
            />

            {/* Activate Confirmation Modal */}
            <ConfirmModal
                isOpen={showActivateModal}
                title="Activate Module"
                message={`Are you sure you want to activate the module "${selectedModule?.NAME}"? The module will become active and users will have access to it.`}
                confirmButtonText="Activate"
                confirmButtonColor="green"
                onConfirm={handleActivateModule}
                onCancel={() => { setShowActivateModal(false); setSelectedModule(null); }}
                isLoading={formLoading}
            />

        </div>
    );
}

export default function SystemModulesPage() {
    return (
        <ProtectedRoute>
            <SystemModulesContent />
        </ProtectedRoute>
    );
}
