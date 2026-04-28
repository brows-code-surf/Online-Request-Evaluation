'use client';

import { getIconById } from '../../../../../utils/iconConstants';
import Pagination from '../../../_components/Pagination';

export default function ModulesTable({
    modules,
    currentPage,
    itemsPerPage,
    sortBy,
    filterStatus,
    searchQuery,
    onSortByChange,
    onItemsPerPageChange,
    onPageChange,
    onEditModule,
    onDeleteModule,
    onActivateModule,
    onPermanentDeleteModule,
    darkMode
}) {
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

    // Filter and sort modules
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

    return (
        <>
            {/* Table Container */}
            <div className={`shadow-lg rounded-lg overflow-hidden ${darkMode ? 'bg-gray-800' : 'bg-white'} border ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className={`${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Icon
                                </th>
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
                                <tr key={`${module.module_type}-${module.ROWID}`} className={`${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-50'} transition-colors`}>
                                    <td className="px-6 py-2 whitespace-nowrap">
                                        <div className="flex items-center justify-center">
                                            {module.ICON ? (
                                                (() => {
                                                    const iconData = getIconById(module.ICON);
                                                    const IconComponent = iconData ? iconData.icon : null;
                                                    return IconComponent ? <IconComponent className="w-5 h-5 text-gray-600" /> : <span className="text-gray-400">-</span>;
                                                })()
                                            ) : (
                                                <span className="text-gray-400">-</span>
                                            )}
                                        </div>
                                    </td>
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
                                                onClick={() => onEditModule(module)}
                                                className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                                                title="Edit module"
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                </svg>
                                            </button>
                                            {module.IS_ACTIVE === 1 ? (
                                                <button
                                                    onClick={() => onDeleteModule(module)}
                                                    className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 transition-colors shadow-sm"
                                                    title="Deactivate module"
                                                >
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a2 2 0 11-4 0 2 2 0 014 0z" />
                                                    </svg>
                                                </button>
                                            ) : (
                                                <button
                                                    onClick={() => onActivateModule(module)}
                                                    className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors shadow-sm"
                                                    title="Activate module"
                                                >
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                    </svg>
                                                </button>
                                            )}
                                            <button
                                                onClick={() => onPermanentDeleteModule(module)}
                                                className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors shadow-sm"
                                                title="Permanently delete module"
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                </svg>
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
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
            </div>

            {/* Pagination - Using the public component */}
            {filteredModules.length > 0 && (
                <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    totalItems={totalItems}
                    itemsPerPage={itemsPerPage}
                    onPageChange={onPageChange}
                    onItemsPerPageChange={onItemsPerPageChange}
                />
            )}
        </>
    );
}
