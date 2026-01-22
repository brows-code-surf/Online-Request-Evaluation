'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import HeaderNavBar from '../../../_components/headerNavBar';
import Loader from '@/app/_components/loader';
import ProtectedRoute from '@/utils/protectedRoute';
import { useAuth } from '../../../../utils/authContext';
import ConfirmModal from '../../_components/confirmModal';
import { getAllModules, addModule, updateModule, deactivateModule, activateModule } from './_actions';
import AddModuleModal from './_components/AddModuleModal';
import AddSubmoduleModal from './_components/AddSubmoduleModal';
import EditModuleModal from './_components/EditModuleModal';
import ModulesTable from './_components/ModulesTable';

function SystemModulesContent() {
    const { user, loading, darkMode } = useAuth();
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
    const [selectedModule, setSelectedModule] = useState(null);
    const [submodules, setSubmodules] = useState([]);
    const [currentSubmodule, setCurrentSubmodule] = useState('');

    // Form states
    const [formData, setFormData] = useState({
        module: '',
        name: '',
        description: '',
        submodulename: '',
        submodule: ''
    });
    const [formErrors, setFormErrors] = useState({});
    const [formLoading, setFormLoading] = useState(false);

    // Messages
    const [successMessage, setSuccessMessage] = useState('');
    const [errorMessage, setErrorMessage] = useState('');

    useEffect(() => {
        if (loading) return;
        loadModules();
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
                // Submodule identifiers should be lowercase with hyphens/underscores and forward slashes
                if (!/^[a-z0-9-_\/]+$/.test(formData.module)) {
                    errors.module = 'Submodule identifier must use lowercase letters, numbers, hyphens, underscores, and forward slashes';
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

            // if (!formData.name?.trim()) {
            //     errors.name = 'Module name is required';
            // }

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
            submodule: module.SUBMODULE || '',
            icon: module.ICON || '' // Add the icon field from the module data
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
                (module.DESCRIPTION && module.DESCRIPTION.toLowerCase().includes(searchQuery.toLowerCase())) ||
                (module.SUBMODULE && module.SUBMODULE.toLowerCase().includes(searchQuery.toLowerCase()));
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
                                                className={`w-full pl-9 pr-8 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${darkMode ? 'border-gray-600 bg-gray-700 text-white placeholder-gray-400' : 'border-gray-300'
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
                            <ModulesTable
                                modules={modules}
                                currentPage={currentPage}
                                itemsPerPage={itemsPerPage}
                                sortBy={sortBy}
                                filterStatus={filterStatus}
                                searchQuery={searchQuery}
                                onSortByChange={setSortBy}
                                onItemsPerPageChange={handleItemsPerPageChange}
                                onPageChange={handlePageChange}
                                onEditModule={openEditModal}
                                onDeleteModule={openDeleteModal}
                                onActivateModule={openActivateModal}
                                darkMode={darkMode}
                            />
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
