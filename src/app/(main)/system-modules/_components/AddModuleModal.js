'use client';

import { useAuth } from '../../../../utils/authContext';

export default function AddModuleModal({
    isOpen,
    onClose,
    formData,
    formErrors,
    formLoading,
    onInputChange,
    onSubmit
}) {
    const { darkMode } = useAuth();

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className={`w-full max-w-md ${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-xl`}>
                <form onSubmit={(e) => { e.preventDefault(); onSubmit(); }}>
                    <div className="p-6">
                        <h2 className="text-2xl font-bold mb-4">Add New Main Module</h2>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">Module Identifier</label>
                                <input
                                    type="text"
                                    name="module"
                                    value={formData.module}
                                    onChange={onInputChange}
                                    placeholder="e.g., User Setup"
                                    className={`w-full px-3 py-2 border ${darkMode ? 'border-gray-600 bg-gray-700 text-white' : 'border-gray-300'} rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${formErrors.module ? 'border-red-500' : ''}`}
                                />
                                {formErrors.module && <p className="text-red-500 text-xs mt-1">{formErrors.module}</p>}
                                <p className="text-xs text-gray-500 mt-1">
                                    Module identifiers can use letters, numbers, spaces, hyphens, and underscores
                                </p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1">Module Name</label>
                                <input
                                    type="text"
                                    name="name"
                                    value={formData.name}
                                    onChange={onInputChange}
                                    placeholder="e.g., User Management"
                                    className={`w-full px-3 py-2 border ${darkMode ? 'border-gray-600 bg-gray-700 text-white' : 'border-gray-300'} rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${formErrors.name ? 'border-red-500' : ''}`}
                                />
                                {formErrors.name && <p className="text-red-500 text-xs mt-1">{formErrors.name}</p>}
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1">Description</label>
                                <textarea
                                    name="description"
                                    value={formData.description}
                                    onChange={onInputChange}
                                    placeholder="Describe what this module does..."
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
                                className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-4 py-2 rounded-lg font-medium transition-all duration-300 disabled:opacity-50"
                            >
                                {formLoading ? 'Adding...' : 'Add Module'}
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
}
