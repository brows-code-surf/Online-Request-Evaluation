'use client';

import { useState, useEffect, forwardRef, useImperativeHandle, useRef } from 'react';
import { useAuth } from '../../../../utils/authContext';
import { getNextReferenceNumber, generateItemNumber } from '../_actions';

const REQUEST_TYPE_OPTIONS = [
  { value: 'CAPEX', label: 'CAPEX - Capital Expenditure' },
  { value: 'OPEX', label: 'OPEX - Operating Expenditure' },
  { value: 'REVENUE', label: 'REVENUE - Revenue Generating' }
];

const BUDGET_OPTIONS = [
  'IT Equipment',
  'Office Supplies',
  'Software Licenses',
  'Marketing',
  'Travel',
  'Training',
  'Maintenance',
  'Other'
];

const UNIT_OF_MEASURE_OPTIONS = [
  'Each',
  'Box',
  'Pack',
  'Kg',
  'Liter',
  'Meter',
  'Set',
  'Unit',
  'Other'
];

const PurchaseRequestForm = forwardRef(function PurchaseRequestForm({
  onSubmit,
  onCancel,
  loading = false
}, ref) {
  const addItemButtonRef = useRef(null);
  const { darkMode, user } = useAuth();
  const [formData, setFormData] = useState({
    // Header data
    referenceNo: '',
    company: '',
    requestType: 'PURCHASE REQUEST',
    locationCode: user?.location || '',
    reviewer: '',
    approver: '',
    addressedTo: '',
    remarks: '',
    isRush: false,
    // Details data (array of items)
    items: [{
      itemNumber: '',
      itemDescription: '',
      unitOfMeasure: '',
      quantity: '',
      budgetName: '',
      dateNeeded: '',
      remarks: ''
    }]
  });
  const [errors, setErrors] = useState({});

  // Get users for dropdowns
  const [users, setUsers] = useState([]);

  useEffect(() => {
    const loadInitialData = async () => {
      // In a real app, you'd fetch users from an API
      // For now, we'll use mock data
      setUsers([
        { empName: 'John Doe', email: 'john@example.com' },
        { empName: 'Jane Smith', email: 'jane@example.com' },
        { empName: 'Mike Johnson', email: 'mike@example.com' },
        { empName: 'Sarah Wilson', email: 'sarah@example.com' }
      ]);

      // Get next reference number from database
      try {
        const result = await getNextReferenceNumber();
        if (result.success) {
          setFormData(prev => ({ ...prev, referenceNo: result.referenceNo }));
        } else {
          // Fallback to timestamp if API fails
          const timestamp = Date.now();
          setFormData(prev => ({ ...prev, referenceNo: `SCPRO-${timestamp}` }));
        }
      } catch (error) {
        console.error('Error getting reference number:', error);
        // Fallback to timestamp if API fails
        const timestamp = Date.now();
        setFormData(prev => ({ ...prev, referenceNo: `SCPRO-${timestamp}` }));
      }
    };

    loadInitialData();
  }, []);

  // Expose addItem function and button ref to parent component
  useImperativeHandle(ref, () => ({
    addItem,
    addItemButtonRef
  }));

  const handleHeaderChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleItemChange = async (index, field, value) => {
    const newItems = [...formData.items];
    newItems[index][field] = value;
    setFormData(prev => ({ ...prev, items: newItems }));

    // Auto-generate item number when description changes
    if (field === 'itemDescription' && value.trim()) {
      try {
        const result = await generateItemNumber(value);
        if (result.success) {
          newItems[index].itemNumber = result.itemNumber;
          setFormData(prev => ({ ...prev, items: newItems }));
        }
      } catch (error) {
        console.error('Error generating item number:', error);
        // Continue without item number generation
      }
    }

    const errorKey = `items.${index}.${field}`;
    if (errors[errorKey]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[errorKey];
        return newErrors;
      });
    }
  };

  const addItem = () => {
    setFormData(prev => ({
      ...prev,
      items: [...prev.items, {
        itemNumber: '',
        itemDescription: '',
        unitOfMeasure: '',
        quantity: '',
        budgetName: '',
        dateNeeded: '',
        remarks: ''
      }]
    }));
  };

  const removeItem = (index) => {
    if (formData.items.length > 1) {
      setFormData(prev => ({
        ...prev,
        items: prev.items.filter((_, i) => i !== index)
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    // Header validation
    if (!formData.company.trim()) {
      newErrors.company = 'Company is required';
    }
    if (!formData.reviewer.trim()) {
      newErrors.reviewer = 'Reviewer is required';
    }
    if (!formData.approver.trim()) {
      newErrors.approver = 'Approver is required';
    }
    if (!formData.addressedTo.trim()) {
      newErrors.addressedTo = 'Addressed to is required';
    }

    // Items validation
    formData.items.forEach((item, index) => {
      if (!item.itemNumber.trim()) {
        newErrors[`items.${index}.itemNumber`] = 'Item number is required';
      }
      if (!item.itemDescription.trim()) {
        newErrors[`items.${index}.itemDescription`] = 'Item description is required';
      }
      if (!item.unitOfMeasure.trim()) {
        newErrors[`items.${index}.unitOfMeasure`] = 'Unit of measure is required';
      }
      if (!item.quantity || item.quantity <= 0) {
        newErrors[`items.${index}.quantity`] = 'Valid quantity is required';
      }
      if (!item.budgetName.trim()) {
        newErrors[`items.${index}.budgetName`] = 'Budget name is required';
      }
      if (!item.dateNeeded) {
        newErrors[`items.${index}.dateNeeded`] = 'Date needed is required';
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    // Prepare data for submission
    const headerData = {
      company: formData.company,
      requestType: formData.requestType,
      locationCode: formData.locationCode,
      reviewer: formData.reviewer,
      approver: formData.approver,
      addressedTo: formData.addressedTo,
      remarks: formData.remarks,
      isRush: formData.isRush ? 1 : 0
    };

    const detailsData = formData.items.map(item => ({
      itemNumber: item.itemNumber,
      itemDescription: item.itemDescription,
      unitOfMeasure: item.unitOfMeasure,
      quantity: parseFloat(item.quantity),
      budgetName: item.budgetName,
      dateNeeded: item.dateNeeded,
      remarks: item.remarks
    }));

    await onSubmit(headerData, detailsData);
  };

  const formatDateForInput = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toISOString().split('T')[0];
  };

  return (
    <div className={`${darkMode ? 'bg-gray-900' : 'bg-gray-50'} max-w-6xl mx-auto`}>
      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Header Information Section */}
        <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-xl border ${darkMode ? 'border-gray-700' : 'border-gray-200'} shadow-sm p-6`}>
          <h3 className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-900'} mb-4`}>Header Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Reference Number */}
            <div>
              <label className={`block text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'} mb-2`}>
                Reference Number
              </label>
              <input
                type="text"
                value={formData.referenceNo}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  darkMode ? 'border-gray-600 bg-gray-700 text-white' : 'border-gray-300 bg-gray-100 text-gray-500'
                }`}
                placeholder="Auto-generated reference number"
                disabled={true}
                readOnly
              />
            </div>

            {/* Company */}
            <div>
              <label className={`block text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'} mb-2`}>
                Company <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.company}
                onChange={(e) => handleHeaderChange('company', e.target.value)}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.company ? 'border-red-300 bg-red-50' : (darkMode ? 'border-gray-600 bg-gray-700 text-white' : 'border-gray-300 bg-white')
                }`}
                placeholder="Enter company name"
                disabled={loading}
              />
              {errors.company && <p className="mt-1 text-sm text-red-600">{errors.company}</p>}
            </div>



            {/* Location Code */}
            <div>
              <label className={`block text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'} mb-2`}>
                Location Code
              </label>
              <input
                type="text"
                value={formData.locationCode}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.locationCode ? 'border-red-300 bg-red-50' : (darkMode ? 'border-gray-600 bg-gray-700 text-white' : 'border-gray-300 bg-gray-100 text-gray-500')
                }`}
                placeholder="Auto-filled from user location"
                disabled={true}
              />
              {errors.locationCode && <p className="mt-1 text-sm text-red-600">{errors.locationCode}</p>}
            </div>

            {/* Rush Request */}
            <div>
              <label className={`block text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'} mb-2`}>
                Rush Request
              </label>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.isRush}
                  onChange={(e) => handleHeaderChange('isRush', e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  disabled={loading}
                />
                <span className={`ml-2 text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Mark as rush request
                </span>
              </div>
            </div>

            {/* Reviewer */}
            <div>
              <label className={`block text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'} mb-2`}>
                Reviewer <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.reviewer}
                onChange={(e) => handleHeaderChange('reviewer', e.target.value)}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.reviewer ? 'border-red-300 bg-red-50' : (darkMode ? 'border-gray-600 bg-gray-700 text-white' : 'border-gray-300 bg-white')
                }`}
                disabled={loading}
              >
                <option value="">Select reviewer</option>
                {users.map(user => (
                  <option key={user.empName} value={user.empName} className={darkMode ? 'bg-gray-700' : ''}>
                    {user.empName}
                  </option>
                ))}
              </select>
              {errors.reviewer && <p className="mt-1 text-sm text-red-600">{errors.reviewer}</p>}
            </div>

            {/* Approver */}
            <div>
              <label className={`block text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'} mb-2`}>
                Approver <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.approver}
                onChange={(e) => handleHeaderChange('approver', e.target.value)}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.approver ? 'border-red-300 bg-red-50' : (darkMode ? 'border-gray-600 bg-gray-700 text-white' : 'border-gray-300 bg-white')
                }`}
                disabled={loading}
              >
                <option value="">Select approver</option>
                {users.map(user => (
                  <option key={user.empName} value={user.empName} className={darkMode ? 'bg-gray-700' : ''}>
                    {user.empName}
                  </option>
                ))}
              </select>
              {errors.approver && <p className="mt-1 text-sm text-red-600">{errors.approver}</p>}
            </div>

            {/* Addressed To */}
            <div>
              <label className={`block text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'} mb-2`}>
                Addressed To <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.addressedTo}
                onChange={(e) => handleHeaderChange('addressedTo', e.target.value)}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.addressedTo ? 'border-red-300 bg-red-50' : (darkMode ? 'border-gray-600 bg-gray-700 text-white' : 'border-gray-300 bg-white')
                }`}
                disabled={loading}
              >
                <option value="">Select recipient</option>
                {users.map(user => (
                  <option key={user.empName} value={user.empName} className={darkMode ? 'bg-gray-700' : ''}>
                    {user.empName}
                  </option>
                ))}
              </select>
              {errors.addressedTo && <p className="mt-1 text-sm text-red-600">{errors.addressedTo}</p>}
            </div>

            {/* Remarks */}
            <div className="md:col-span-2">
              <label className={`block text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'} mb-2`}>
                Remarks
              </label>
              <textarea
                value={formData.remarks}
                onChange={(e) => handleHeaderChange('remarks', e.target.value)}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  darkMode ? 'border-gray-600 bg-gray-700 text-white' : 'border-gray-300 bg-white'
                }`}
                rows={3}
                placeholder="Enter any additional remarks..."
                disabled={loading}
              />
            </div>
          </div>
        </div>

        {/* Item Details Section */}
        <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-xl border ${darkMode ? 'border-gray-700' : 'border-gray-200'} shadow-sm p-6`}>
          <div className="flex justify-between items-center mb-4">
            <h3 className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>Item Details</h3>
            <button
              ref={addItemButtonRef}
              type="button"
              onClick={addItem}
              disabled={loading}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50"
            >
              Add Item
            </button>
          </div>

          {formData.items.map((item, index) => (
            <div key={index} className={`${darkMode ? 'bg-gray-600' : 'bg-white'} rounded-lg p-4 mb-4 border ${darkMode ? 'border-gray-500' : 'border-gray-200'}`}>
              <div className="flex justify-between items-center mb-4">
                <h4 className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>Item {index + 1}</h4>
                {formData.items.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeItem(index)}
                    disabled={loading}
                    className="text-red-600 hover:text-red-700 font-medium disabled:opacity-50"
                  >
                    Remove
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Item Number */}
                <div>
                  <label className={`block text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'} mb-1`}>
                    Item Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={item.itemNumber}
                    readOnly
                    onChange={(e) => handleItemChange(index, 'itemNumber', e.target.value)}
                    className={`w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      errors[`items.${index}.itemNumber`] ? 'border-red-300 bg-red-50' : (darkMode ? 'border-gray-500 bg-gray-700 text-white' : 'border-gray-300 bg-white')
                    }`}
                    placeholder="Enter item number"
                    disabled={loading}
                  />
                  {errors[`items.${index}.itemNumber`] && <p className="mt-1 text-xs text-red-600">{errors[`items.${index}.itemNumber`]}</p>}
                </div>

                {/* Item Description */}
                <div className="md:col-span-2">
                  <label className={`block text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'} mb-1`}>
                    Item Description <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={item.itemDescription}
                    onChange={(e) => handleItemChange(index, 'itemDescription', e.target.value)}
                    className={`w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      errors[`items.${index}.itemDescription`] ? 'border-red-300 bg-red-50' : (darkMode ? 'border-gray-500 bg-gray-700 text-white' : 'border-gray-300 bg-white')
                    }`}
                    placeholder="Enter item description"
                    disabled={loading}
                  />
                  {errors[`items.${index}.itemDescription`] && <p className="mt-1 text-xs text-red-600">{errors[`items.${index}.itemDescription`]}</p>}
                </div>

                {/* Unit of Measure */}
                <div>
                  <label className={`block text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'} mb-1`}>
                    Unit of Measure <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={item.unitOfMeasure}
                    onChange={(e) => handleItemChange(index, 'unitOfMeasure', e.target.value)}
                    className={`w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      errors[`items.${index}.unitOfMeasure`] ? 'border-red-300 bg-red-50' : (darkMode ? 'border-gray-500 bg-gray-700 text-white' : 'border-gray-300 bg-white')
                    }`}
                    disabled={loading}
                  >
                    <option value="">Select UOM</option>
                    {UNIT_OF_MEASURE_OPTIONS.map(uom => (
                      <option key={uom} value={uom} className={darkMode ? 'bg-gray-700' : ''}>{uom}</option>
                    ))}
                  </select>
                  {errors[`items.${index}.unitOfMeasure`] && <p className="mt-1 text-xs text-red-600">{errors[`items.${index}.unitOfMeasure`]}</p>}
                </div>

                {/* Quantity */}
                <div>
                  <label className={`block text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'} mb-1`}>
                    Quantity <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={item.quantity}
                    onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                    className={`w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      errors[`items.${index}.quantity`] ? 'border-red-300 bg-red-50' : (darkMode ? 'border-gray-500 bg-gray-700 text-white' : 'border-gray-300 bg-white')
                    }`}
                    placeholder="0.00"
                    disabled={loading}
                  />
                  {errors[`items.${index}.quantity`] && <p className="mt-1 text-xs text-red-600">{errors[`items.${index}.quantity`]}</p>}
                </div>

                {/* Budget Name */}
                <div>
                  <label className={`block text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'} mb-1`}>
                    Budget Name <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={item.budgetName}
                    onChange={(e) => handleItemChange(index, 'budgetName', e.target.value)}
                    className={`w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      errors[`items.${index}.budgetName`] ? 'border-red-300 bg-red-50' : (darkMode ? 'border-gray-500 bg-gray-700 text-white' : 'border-gray-300 bg-white')
                    }`}
                    disabled={loading}
                  >
                    <option value="">Select budget</option>
                    {BUDGET_OPTIONS.map(budget => (
                      <option key={budget} value={budget} className={darkMode ? 'bg-gray-700' : ''}>{budget}</option>
                    ))}
                  </select>
                  {errors[`items.${index}.budgetName`] && <p className="mt-1 text-xs text-red-600">{errors[`items.${index}.budgetName`]}</p>}
                </div>

                {/* Date Needed */}
                <div>
                  <label className={`block text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'} mb-1`}>
                    Date Needed <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={formatDateForInput(item.dateNeeded)}
                    onChange={(e) => handleItemChange(index, 'dateNeeded', e.target.value)}
                    className={`w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      errors[`items.${index}.dateNeeded`] ? 'border-red-300 bg-red-50' : (darkMode ? 'border-gray-500 bg-gray-700 text-white' : 'border-gray-300 bg-white')
                    }`}
                    disabled={loading}
                  />
                  {errors[`items.${index}.dateNeeded`] && <p className="mt-1 text-xs text-red-600">{errors[`items.${index}.dateNeeded`]}</p>}
                </div>

                {/* Item Remarks */}
                <div className="md:col-span-3">
                  <label className={`block text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'} mb-1`}>
                    Item Remarks
                  </label>
                  <textarea
                    value={item.remarks}
                    onChange={(e) => handleItemChange(index, 'remarks', e.target.value)}
                    className={`w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      darkMode ? 'border-gray-500 bg-gray-700 text-white' : 'border-gray-300 bg-white'
                    }`}
                    rows={2}
                    placeholder="Enter item-specific remarks..."
                    disabled={loading}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Buttons */}
        <div className="flex gap-4 pt-4">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className={`flex-1 ${darkMode ? 'bg-gray-600 hover:bg-gray-500 text-white' : 'bg-gray-200 hover:bg-gray-300 text-gray-800'} font-semibold py-3 px-6 rounded-xl transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex-1 bg-gradient-to-r from-blue-600 to-green-600 hover:from-blue-700 hover:to-green-700 text-white font-semibold py-3 px-6 rounded-xl transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                Creating...
              </div>
            ) : (
              'Create Purchase Request'
            )}
          </button>
        </div>
      </form>
    </div>
  );
});

export default PurchaseRequestForm;
