'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '../../../../utils/authContext';
import { getDistinctParentModules } from '../_actions';

export default function AddSubmoduleModal({
    isOpen,
    onClose,
    formData,
    formErrors,
    formLoading,
    onInputChange,
    onSubmit,
    modules = []
}) {
    const { darkMode } = useAuth();
    const [inputMode, setInputMode] = useState('dropdown'); // 'dropdown' or 'text'
    const [parentModules, setParentModules] = useState([]);
    const [loadingParentModules, setLoadingParentModules] = useState(false);

    // Fetch distinct parent modules when modal opens
    useEffect(() => {
        if (isOpen) {
            const fetchParentModules = async () => {
                setLoadingParentModules(true);
                try {
                    const result = await getDistinctParentModules();
                    if (result.success) {
                        setParentModules(result.data);
                    } else {
                        console.error('Failed to fetch parent modules:', result.message);
                        // Fallback to filtering from modules prop
                        setParentModules(modules.filter(module => !module.SUBMODULE));
                    }
                } catch (error) {
                    console.error('Error fetching parent modules:', error);
                    // Fallback to filtering from modules prop
                    setParentModules(modules.filter(module => !module.SUBMODULE));
                } finally {
                    setLoadingParentModules(false);
                }
            };

            fetchParentModules();
        }
    }, [isOpen, modules]);

    const handleParentModuleChange = (e) => {
        if (inputMode === 'dropdown') {
            onInputChange(e);
        } else {
            // For text input, create a synthetic event
            onInputChange({ target: { name: 'submodule', value: e.target.value } });
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className={`w-full max-w-md ${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-xl`}>
                <form onSubmit={(e) => { e.preventDefault(); onSubmit(); }}>
                    <div className="p-6">
                        <h2 className="text-2xl font-bold mb-4">Add New Submodule</h2>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-2">Parent Module</label>
                                <div className="flex gap-2 mb-2">
                                    <button
                                        type="button"
                                        onClick={() => setInputMode('dropdown')}
                                        className={`px-3 py-1 text-xs rounded ${inputMode === 'dropdown' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}
                                    >
                                        Select Existing
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setInputMode('text')}
                                        className={`px-3 py-1 text-xs rounded ${inputMode === 'text' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}
                                    >
                                        Enter Manually
                                    </button>
                                </div>

                                {inputMode === 'dropdown' ? (
                                    <select
                                        name="submodule"
                                        value={formData.submodule}
                                        onChange={handleParentModuleChange}
                                        disabled={loadingParentModules}
                                        className={`w-full px-3 py-2 border ${darkMode ? 'border-gray-600 bg-gray-700 text-white' : 'border-gray-300'} rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${formErrors.submodule ? 'border-red-500' : ''}`}
                                    >
                                        <option value="">
                                            {loadingParentModules ? 'Loading parent modules...' : 'Select a parent module...'}
                                        </option>
                                        {parentModules.map((module, index) => (
                                            <option key={`${module.identifier}-${index}`} value={module.identifier}>
                                                {module.name}
                                            </option>
                                        ))}
                                    </select>
                                ) : (
                                    <input
                                        type="text"
                                        name="submodule"
                                        value={formData.submodule}
                                        onChange={handleParentModuleChange}
                                        placeholder="e.g., user-setup"
                                        className={`w-full px-3 py-2 border ${darkMode ? 'border-gray-600 bg-gray-700 text-white' : 'border-gray-300'} rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${formErrors.submodule ? 'border-red-500' : ''}`}
                                    />
                                )}
                                {formErrors.submodule && <p className="text-red-500 text-xs mt-1">{formErrors.submodule}</p>}
                                <p className="text-xs text-gray-500 mt-1">
                                    {inputMode === 'dropdown'
                                        ? "Select from existing parent modules"
                                        : "Enter the identifier of an existing or new parent module"
                                    }
                                </p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1">Submodule Name</label>
                                <input
                                    type="text"
                                    name="submodulename"
                                    value={formData.submodulename}
                                    onChange={onInputChange}
                                    placeholder="e.g., User Account Management"
                                    className={`w-full px-3 py-2 border ${darkMode ? 'border-gray-600 bg-gray-700 text-white' : 'border-gray-300'} rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${formErrors.submodulename ? 'border-red-500' : ''}`}
                                />
                                {formErrors.submodulename && <p className="text-red-500 text-xs mt-1">{formErrors.submodulename}</p>}
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1">Submodule Identifier (Link)</label>
                                <input
                                    type="text"
                                    name="module"
                                    value={formData.module}
                                    onChange={onInputChange}
                                    placeholder="e.g., user-access"
                                    className={`w-full px-3 py-2 border ${darkMode ? 'border-gray-600 bg-gray-700 text-white' : 'border-gray-300'} rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${formErrors.module ? 'border-red-500' : ''}`}
                                />
                                {formErrors.module && <p className="text-red-500 text-xs mt-1">{formErrors.module}</p>}
                                <p className="text-xs text-gray-500 mt-1">
                                    Submodule identifiers must use lowercase letters, numbers, hyphens, and underscores
                                </p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1">Description</label>
                                <textarea
                                    name="description"
                                    value={formData.description}
                                    onChange={onInputChange}
                                    placeholder="Describe what this submodule does..."
                                    rows={3}
                                    className={`w-full px-3 py-2 border ${darkMode ? 'border-gray-600 bg-gray-700 text-white' : 'border-gray-300'} rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${formErrors.description ? 'border-red-500' : ''}`}
                                />
                                {formErrors.description && <p className="text-red-500 text-xs mt-1">{formErrors.description}</p>}
                            </div>
                        </div>

                        <div className="flex gap-3 mt-6">
                            <button
                                onClick={onClose}
                                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                                disabled={formLoading}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={onSubmit}
                                disabled={formLoading}
                                className="flex-1 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white px-4 py-2 rounded-lg font-medium transition-all duration-300 disabled:opacity-50"
                            >
                                {formLoading ? 'Adding...' : 'Add Submodule'}
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
}
