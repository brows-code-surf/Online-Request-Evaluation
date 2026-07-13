import { useState, useEffect } from 'react';
import { getAllBudgetAccounts } from '../procurement/purchase-request/_actions';
import SkeletonLoader from '@/app/_components/skeletonLoader';

export default function BudgetModal({ isOpen, onClose, onSelect, darkMode, selectedBudgetCode }) {
  const [budgets, setBudgets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('particular');

  useEffect(() => {
    if (isOpen) {
      loadBudgets();
    }
  }, [isOpen]);

  const loadBudgets = async () => {
    setLoading(true);
    try {
      const result = await getAllBudgetAccounts();
      if (result.success) {
        setBudgets(result.budgets);
      }
    } catch (error) {
      console.error('Error loading budgets:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredBudgets = budgets
    .filter(budget => {
      const matchesSearch = searchQuery === '' ||
        [budget.particular, budget.budgetCategory, budget.department, budget.company, budget.location, budget.expenseType, budget.budgetCode].some(field =>
          field?.toString().toLowerCase().includes(searchQuery.toLowerCase())
        );
      return matchesSearch;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'particular':
          return a.particular.localeCompare(b.particular);
        case 'category':
          return a.budgetCategory.localeCompare(b.budgetCategory);
        case 'department':
          return a.department.localeCompare(b.department);
        case 'company':
          return a.company.localeCompare(b.company);
        case 'year':
          return b.budgetYear - a.budgetYear;
        default:
          return 0;
      }
    });

  const handleRowDoubleClick = (budget) => {
    // Create a display string that combines relevant fields for the budget selection
    const budgetDisplay = budget.budgetCode;
    onSelect(budgetDisplay);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-[1000] p-4">
      <div className={`w-full max-w-7xl max-h-[90vh] rounded-lg shadow-xl ${darkMode ? 'bg-gray-800' : 'bg-white'} overflow-hidden`}>
        {/* Header */}
        <div className={`px-6 py-4 border-b ${darkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'}`}>
          <div className="flex items-center justify-between">
            <h2 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              Select Budget Account
            </h2>
            <button
              onClick={onClose}
              className={`p-2 rounded-full hover:${darkMode ? 'bg-gray-700' : 'bg-gray-100'} transition-colors`}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-4 mt-4">
            <div className="flex-1 min-w-64">
              <input
                type="text"
                placeholder="Search budgets by particular, category, department..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  darkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'bg-white border-gray-300 text-gray-900'
                }`}
              />
            </div>

            <div className="flex gap-2">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className={`px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'
                }`}
              >
                <option value="particular">Sort by Particular</option>
                <option value="category">Sort by Category</option>
                <option value="department">Sort by Department</option>
                <option value="company">Sort by Company</option>
                <option value="year">Sort by Year</option>
              </select>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-[calc(90vh-200px)]">
          <div className="overflow-x-auto">
            <table className={`w-full ${darkMode ? 'text-gray-300' : 'text-gray-900'}`}>
              <thead className={`${darkMode ? 'bg-gray-700' : 'bg-gray-50'} text-sm border-b ${darkMode ? 'border-gray-600' : 'border-gray-200'}`}>
                <tr>
                  {/* <th className="px-4 py-3 text-left font-semibold">Budget Year</th> */}
                  {/* <th className="px-4 py-3 text-left font-semibold">Company</th> */}
                  {/* <th className="px-4 py-3 text-left font-semibold">Location</th> */}
                  <th className="px-1 py-2 text-left font-semibold">Budget Code</th>
                  <th className="px-1 py-2 text-left font-semibold hidden md:table-cell">Department</th>
                  {/* <th className="px-4 py-3 text-left font-semibold">Area</th> */}
                  <th className="px-1 py-2 text-left font-semibold hidden md:table-cell">Expense Type</th>
                  <th className="px-1 py-2 text-left font-semibold">Budget Category</th>
                  <th className="px-1 py-2 text-left font-semibold">Particular</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  // Skeleton loading rows
                  Array(10).fill().map((_, index) => (
                    <tr key={`skeleton-${index}`} className={`border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                      <td className="px-1 py-2"><SkeletonLoader height="h-4" width="w-16" /></td>
                      <td className="px-1 py-2"><SkeletonLoader height="h-4" width="w-20" /></td>
                      <td className="px-1 py-2"><SkeletonLoader height="h-4" width="w-24" /></td>
                      <td className="px-1 py-2"><SkeletonLoader height="h-4" width="w-28" /></td>
                      <td className="px-1 py-2"><SkeletonLoader height="h-4" width="w-20" /></td>
                      <td className="px-1 py-2"><SkeletonLoader height="h-4" width="w-24" /></td>
                      <td className="px-1 py-2"><SkeletonLoader height="h-4" width="w-32" /></td>
                      <td className="px-1 py-2"><SkeletonLoader height="h-4" width="w-24" /></td>
                      <td className="px-1 py-2"><SkeletonLoader height="h-4" width="w-40" /></td>
                    </tr>
                  ))
                ) : (
                  <>
                    {filteredBudgets.map((budget, index) => (
                      <tr
                        key={budget.id}
                        onDoubleClick={() => handleRowDoubleClick(budget)}
                        className={`text-xs border-b transition-colors cursor-pointer ${
                          budget.budgetCode === selectedBudgetCode
                            ? darkMode
                              ? 'border-blue-500 bg-blue-900/30'
                              : 'border-blue-500 bg-blue-100'
                            : darkMode
                              ? 'border-gray-700 hover:bg-gray-700'
                              : 'border-gray-200 hover:bg-gray-50'
                        }`}
                      >
                        {/* <td className="px-4 py-3 font-medium">{budget.budgetYear}</td> */}
                        {/* <td className="px-4 py-3">{budget.company}</td> */}
                        {/* <td className="px-4 py-3">{budget.location}</td> */}
                        <td className="px-1 py-2">{budget.budgetCode}</td>
                        <td className="px-1 py-2 hidden md:table-cell">{budget.department}</td>
                        {/* <td className="px-4 py-3">{budget.area}</td> */}
                        <td className="px-1 py-2 hidden md:table-cell">{budget.expenseType}</td>
                        <td className="px-1 py-2">{budget.budgetCategory}</td>
                        <td className="px-1 py-2 font-medium">{budget.particular}</td>
                      </tr>
                    ))}
                    {filteredBudgets.length === 0 && (
                      <tr>
                        <td colSpan="5" className="px-4 py-12 text-center">
                          <p className={`text-lg ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                            No budget accounts found
                          </p>
                        </td>
                      </tr>
                    )}
                  </>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer */}
        <div className={`px-6 py-4 border-t ${darkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-gray-50'} flex justify-between items-center`}>
          <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            Double-click on a row to select the budget account
          </p>
          <div className="flex gap-2">
            <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              {filteredBudgets.length} of {budgets.length} budgets
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
