'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../../../utils/authContext';
import { getDistinctParentModules } from '../_actions';
import { MODULE_ICONS, getCategories, getIconById } from '../../../../utils/iconConstants';

function IconSelect({ value, onChange, darkMode }) {
    const [isOpen, setIsOpen] = useState(false);
    const [openUpward, setOpenUpward] = useState(false);
    const dropdownRef = useRef(null);
    const buttonRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const checkPosition = () => {
        if (buttonRef.current) {
            const rect = buttonRef.current.getBoundingClientRect();
            const windowHeight = window.innerHeight;
            const dropdownHeight = 240; // Approximate max height
            const spaceBelow = windowHeight - rect.bottom;
            const spaceAbove = rect.top;

            // Open upward if there's not enough space below but there is above
            setOpenUpward(spaceBelow < dropdownHeight && spaceAbove > spaceBelow);
        }
    };

    const handleToggle = () => {
        if (!isOpen) {
            checkPosition();
        }
        setIsOpen(!isOpen);
    };

    const selectedIcon = value ? getIconById(value) : null;

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                ref={buttonRef}
                type="button"
                onClick={handleToggle}
                className={`flex items-center justify-between w-full px-3 py-2 border ${darkMode ? 'border-gray-600 bg-gray-700 text-white' : 'border-gray-300'} rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500`}
            >
                <div className="flex items-center gap-2">
                    {selectedIcon ? (
                        <>
                            <selectedIcon.icon className="w-4 h-4" />
                            <span>{selectedIcon.name}</span>
                        </>
                    ) : (
                        <span className="text-gray-500">Select an icon...</span>
                    )}
                </div>
                <svg className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
            </button>

            {isOpen && (
                <div className={`absolute z-10 w-full ${openUpward ? 'bottom-full mb-1' : 'mt-1'} ${darkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'} border rounded-lg shadow-lg max-h-60 overflow-y-auto`}>
                    <div className={`px-3 py-2 border-b ${darkMode ? 'border-gray-600' : 'border-gray-200'}`}>
                        <button
                            type="button"
                            onClick={() => {
                                onChange({ target: { name: 'icon', value: '' } });
                                setIsOpen(false);
                            }}
                            className={`w-full text-left px-2 py-1 rounded ${darkMode ? 'hover:bg-gray-600' : 'hover:bg-gray-100'} flex items-center gap-2`}
                        >
                            <span className="text-gray-500">Select an icon...</span>
                        </button>
                    </div>
                    {getCategories().map(category => (
                        <div key={category}>
                            <div className={`px-3 py-2 text-xs font-semibold ${darkMode ? 'text-gray-400 bg-gray-800' : 'text-gray-600 bg-gray-50'} border-b ${darkMode ? 'border-gray-600' : 'border-gray-200'}`}>
                                {category}
                            </div>
                            {MODULE_ICONS.filter(icon => icon.category === category).map(icon => {
                                const IconComponent = icon.icon;
                                return (
                                    <button
                                        key={icon.id}
                                        type="button"
                                        onClick={() => {
                                            onChange({ target: { name: 'icon', value: icon.id } });
                                            setIsOpen(false);
                                        }}
                                        className={`w-full text-left px-3 py-2 ${darkMode ? 'hover:bg-gray-600' : 'hover:bg-gray-100'} flex items-center gap-3`}
                                    >
                                        <IconComponent className="w-4 h-4" />
                                        <span>{icon.name}</span>
                                    </button>
                                );
                            })}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

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

                            <div>
                                <label className="block text-sm font-medium mb-1">Icon</label>
                                <IconSelect value={formData.icon} onChange={onInputChange} darkMode={darkMode} />
                                <p className="text-xs text-gray-500 mt-1">
                                    Choose an appropriate icon for this submodule
                                </p>
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
