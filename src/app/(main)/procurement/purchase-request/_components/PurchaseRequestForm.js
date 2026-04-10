'use client';

import { useState, useEffect, forwardRef, useImperativeHandle, useRef } from 'react';
import { useAuth } from '../../../../../utils/authContext';
import { getNextReferenceNumber, generateItemNumber, getFilteredUsersForPurchaseRequest } from '../_actions';
import ConfirmModal from '@/app/(main)/_components/confirmModal';
import BudgetModal from './BudgetModal';
import ItemSelectionModal from './ItemSelectionModal';



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

const COMPANY_OPTIONS = [
  'SANTEH',
  'FISHTA',
  'AGRIJUAN',
  'PETCHOLA',
  'PETONE',
  'FEEDPRO',
  'ASPARE',
  'TATEH'
];

const PurchaseRequestForm = forwardRef(function PurchaseRequestForm({
  onSubmit,
  onCancel,
  loading = false,
  editData = null
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
      budgetCode: '',
      dateNeeded: '',
      remarks: '',
      itemStatus: ''
    }]
  });
  const [errors, setErrors] = useState({});
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showBudgetModal, setShowBudgetModal] = useState(false);
  const [currentBudgetItemIndex, setCurrentBudgetItemIndex] = useState(null);
  const [showItemSelectionModal, setShowItemSelectionModal] = useState(false);
  const [currentItemSelectionIndex, setCurrentItemSelectionIndex] = useState(null);

  // Get users for dropdowns
  const [users, setUsers] = useState([]);

  useEffect(() => {
    const loadInitialData = async () => {
      // Fetch filtered users from database (excluding Production Rank & File and Union Members)
      try {
        const usersResult = await getFilteredUsersForPurchaseRequest();
        if (usersResult.success) {
          setUsers(usersResult.data);
        } else {
          // Fallback to empty array if API fails
          setUsers([]);
        }
      } catch (error) {
        console.error('Error fetching users:', error);
        setUsers([]);
      }

      // If editData is provided, populate form with existing data
      if (editData) {
        setFormData({
          referenceNo: editData.referenceNo || '',
          company: editData.company || '',
          requestType: editData.requestType || 'PURCHASE REQUEST',
          locationCode: editData.locationCode || user?.location || '',
          reviewer: editData.reviewer || '',
          approver: editData.approver || '',
          addressedTo: editData.addressedTo || '',
          remarks: editData.remarks || '',
          isRush: editData.isRush || false,
          items: editData.details && editData.details.length > 0
            ? editData.details.map(detail => ({
              itemNumber: detail.itemNumber || '',
              itemDescription: detail.itemDescription || '',
              unitOfMeasure: detail.unitOfMeasure || '',
              quantity: detail.quantity || '',
              budgetCode: detail.budgetCode || '',
              dateNeeded: detail.dateNeeded ? new Date(detail.dateNeeded).toISOString().split('T')[0] : '',
              remarks: detail.remarks || '',
              itemStatus: detail.itemStatus || '',
              lineType: detail.lineType || ''
            }))
            : [{
              itemNumber: '',
              itemDescription: '',
              unitOfMeasure: '',
              quantity: '',
              budgetCode: '',
              dateNeeded: '',
              remarks: '',
              itemStatus: '',
              lineType: ''
            }]
        });
      } else {
        // Get next reference number for new requests
        try {
          const result = await getNextReferenceNumber();
          if (result.success) {
            setFormData(prev => ({ ...prev, referenceNo: result.referenceNo }));
          } else {
            // Fallback to timestamp if API fails
            const timestamp = Date.now();
            setFormData(prev => ({ ...prev, referenceNo: `OPR-${timestamp}` }));
          }
        } catch (error) {
          console.error('Error getting reference number:', error);
          // Fallback to timestamp if API fails
          const timestamp = Date.now();
          setFormData(prev => ({ ...prev, referenceNo: `OPR-${timestamp}` }));
        }
      }
    };

    loadInitialData();
  }, [editData, user?.location]);

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

    // Clear item number, UOM, and description when switching line types
    if (field === 'lineType') {
      newItems[index].itemNumber = '';
      newItems[index].unitOfMeasure = '';
      newItems[index].itemDescription = '';
      setFormData(prev => ({ ...prev, items: newItems }));
    }

    // Auto-generate item number only for TEXT type when description changes
    if (field === 'itemDescription' && newItems[index].lineType === 'TEXT') {
      if (!value.trim()) {
        // Clear item number when description is empty
        newItems[index].itemNumber = '';
        setFormData(prev => ({ ...prev, items: newItems }));
      } else {
        // Generate item number for any non-empty description
        let generatedItemNumber = '';
        try {
          const result = await generateItemNumber(value);
          if (result.success) {
            generatedItemNumber = result.itemNumber;

            // Check for conflicts with existing items in the form only for descriptions with 2 words
            const wordCount = value.trim().split(/\s+/).filter(word => word.length > 0).length;
            if (wordCount >= 2) {
              // Find items with same base item number but different descriptions
              const basePattern = generatedItemNumber.split('-')[0]; // Get base (e.g., 'CIC' from 'CIC-1')
              const conflictingItems = newItems.filter((item, itemIndex) =>
                itemIndex !== index && // Not the current item
                item.itemNumber &&
                item.itemNumber.startsWith(basePattern) &&
                item.itemDescription.trim().toLowerCase() !== value.trim().toLowerCase()
              );

              if (conflictingItems.length > 0) {
                // Find the highest number used for this base
                let highestNumber = 0;
                conflictingItems.forEach(item => {
                  const itemBase = item.itemNumber.split('-')[0];
                  if (itemBase === basePattern) {
                    if (item.itemNumber.includes('-')) {
                      const numberPart = parseInt(item.itemNumber.split('-')[1]);
                      if (!isNaN(numberPart) && numberPart > highestNumber) {
                        highestNumber = numberPart;
                      }
                    } else {
                      // Exact base match without number, treat as 0
                      highestNumber = Math.max(highestNumber, 0);
                    }
                  }
                });

                // Also check the generated item number itself
                if (generatedItemNumber.includes('-')) {
                  const genNumberPart = parseInt(generatedItemNumber.split('-')[1]);
                  if (!isNaN(genNumberPart)) {
                    highestNumber = Math.max(highestNumber, genNumberPart);
                  }
                }

                // Increment to get the next available number
                const nextNumber = highestNumber + 1;
                generatedItemNumber = `${basePattern}-${nextNumber}`;
              }
            }
          }

          newItems[index].itemNumber = generatedItemNumber;
          setFormData(prev => ({ ...prev, items: newItems }));
        } catch (error) {
          console.error('Error generating item number:', error);
          // Continue without item number generation
        }
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
        budgetCode: '',
        dateNeeded: '',
        remarks: '',
        itemStatus: ''
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
    // Reviewer is now optional
    // if (!formData.reviewer.trim()) {
    //   newErrors.reviewer = 'Reviewer is required';
    // }
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
      if (!item.budgetCode.trim()) {
        newErrors[`items.${index}.budgetCode`] = 'Budget code is required';
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
      // Ultra-smooth auto-scroll to first error field with enhanced timing
      setTimeout(() => {
        const firstErrorField = document.querySelector('[data-error="true"]') ||
          document.querySelector('.error, [aria-invalid="true"], .is-invalid');

        if (firstErrorField) {
          // Smooth scroll with enhanced options
          firstErrorField.scrollIntoView({
            behavior: 'smooth',
            block: 'center',
            inline: 'nearest'
          });

          // Focus with staggered delay to prevent conflicts
          setTimeout(() => {
            firstErrorField.focus({ preventScroll: true });
            // Add a subtle highlight effect
            firstErrorField.style.transition = 'box-shadow 0.3s ease';
            firstErrorField.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.5)';
            setTimeout(() => {
              firstErrorField.style.boxShadow = '';
            }, 1000);
          }, 400);
        }
      }, 200);
      return;
    }

    setShowConfirmModal(true);
  };

  const handleConfirmSubmit = async () => {
    setShowConfirmModal(false);

    // Prepare data for submission
    const headerData = {
      referenceNo: formData.referenceNo,
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
      budgetCode: item.budgetCode,
      dateNeeded: item.dateNeeded,
      remarks: item.remarks,
      itemStatus: item.itemStatus || '',
      lineType: item.lineType
    }));

    await onSubmit(headerData, detailsData);
  };

  const formatDateForInput = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toISOString().split('T')[0];
  };

  const handleOpenBudgetModal = (itemIndex) => {
    setCurrentBudgetItemIndex(itemIndex);
    setShowBudgetModal(true);
  };

  const handleBudgetSelect = (budgetDisplay) => {
    if (currentBudgetItemIndex !== null) {
      handleItemChange(currentBudgetItemIndex, 'budgetCode', budgetDisplay);
    }
    setShowBudgetModal(false);
    setCurrentBudgetItemIndex(null);
  };

  return (
    <div className={`${darkMode ? 'bg-gray-900' : 'bg-gray-50'} max-w-6xl mx-auto px-4 sm:px-6 lg:px-8`}>
      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6 sm:space-y-8">
        {/* Header Information Section */}
        <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg sm:rounded-xl border ${darkMode ? 'border-gray-700' : 'border-gray-200'} shadow-sm p-4 sm:p-6`}>
          <h3 className={`text-base sm:text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-900'} mb-4 sm:mb-6`}>Header Information</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
            {/* Reference Number */}
            <div>
              <label className={`block text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'} mb-2`}>
                Reference Number
              </label>
              <input
                type="text"
                value={formData.referenceNo}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${darkMode ? 'border-gray-600 bg-gray-700 text-white' : 'border-gray-300 bg-gray-100 text-gray-500'
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
              <select
                value={formData.company}
                onChange={(e) => handleHeaderChange('company', e.target.value)}
                data-error={errors.company ? 'true' : 'false'}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${errors.company ? 'border-red-300 bg-red-50 text-gray-900' : (darkMode ? 'border-gray-600 bg-gray-700 text-white' : 'border-gray-300 bg-white')
                  }`}
                disabled={loading}
              >
                <option value="">Select company</option>
                {COMPANY_OPTIONS.map(company => (
                  <option key={company} value={company} className={darkMode ? 'bg-gray-700' : ''}>
                    {company}
                  </option>
                ))}
              </select>
              {errors.company && <p className="mt-1 text-sm text-red-600">{errors.company}</p>}
            </div>





            {/* Rush Request */}
            <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-800' : 'bg-gray-100'}`}>
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
                    Mark as <span className={`text-xs px-2 py-1 rounded-full ${darkMode ? 'bg-red-900 text-red-300' : 'bg-red-100 text-red-700'} font-semibold whitespace-nowrap`}>
                      RUSH
                    </span>
                  </span>
                </div>
              </div>
            </div>

            {/* Reviewer */}
            <div>
              <label className={`block text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'} mb-2`}>
                Reviewer
              </label>
              <select
                value={formData.reviewer}
                onChange={(e) => handleHeaderChange('reviewer', e.target.value)}
                data-error={errors.reviewer ? 'true' : 'false'}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${errors.reviewer ? 'border-red-300 bg-red-50 text-gray-900' : (darkMode ? 'border-gray-600 bg-gray-700 text-white' : 'border-gray-300 bg-white')
                  }`}
                disabled={loading}
              >
                <option value="">Select reviewer</option>
                {users
                  .filter(approverUser => approverUser.empName.toUpperCase() !== user?.empName?.toUpperCase())
                  .map(user => (
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
                data-error={errors.approver ? 'true' : 'false'}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${errors.approver ? 'border-red-300 bg-red-50 text-gray-900' : (darkMode ? 'border-gray-600 bg-gray-700 text-white' : 'border-gray-300 bg-white')
                  }`}
                disabled={loading}
              >
                <option value="">Select approver</option>
                {users
                  .filter(approverUser => approverUser.empName.toUpperCase() !== user?.empName?.toUpperCase())
                  .map(approverUser => (
                    <option key={approverUser.empName} value={approverUser.empName} className={darkMode ? 'bg-gray-700' : ''}>
                      {approverUser.empName}
                    </option>
                  ))}
              </select>
              {errors.approver && <p className="mt-1 text-sm text-red-600">{errors.approver}</p>}
            </div>

            {/* Addressed To */}
            <div>
              <label className={`block text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'} mb-2`}>
                Addressed To (Purchaser)<span className="text-red-500">*</span>
              </label>
              <select
                value={formData.addressedTo}
                onChange={(e) => handleHeaderChange('addressedTo', e.target.value)}
                data-error={errors.addressedTo ? 'true' : 'false'}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${errors.addressedTo ? 'border-red-300 bg-red-50 text-gray-900' : (darkMode ? 'border-gray-600 bg-gray-700 text-white' : 'border-gray-300 bg-white')
                  }`}
                disabled={loading}
              >
                <option value="">Select recipient</option>
                {users
                  .filter(approverUser => approverUser.empName.toUpperCase() !== user?.empName?.toUpperCase())
                  .map(user => (
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
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${darkMode ? 'border-gray-600 bg-gray-700 text-white' : 'border-gray-300 bg-white'
                  }`}
                rows={3}
                placeholder="Enter any additional remarks..."
                disabled={loading}
              />
            </div>
          </div>
        </div>

        {/* Item Details Section */}
        <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg sm:rounded-xl border ${darkMode ? 'border-gray-700' : 'border-gray-200'} shadow-sm p-4 sm:p-6`}>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 sm:mb-6 gap-4">
            <h3 className={`text-base sm:text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>Item Details</h3>
            <button
              ref={addItemButtonRef}
              type="button"
              onClick={addItem}
              disabled={loading}
              className="w-full sm:w-auto bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-4 rounded-lg transition focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-opacity-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Add Item
            </button>
          </div>

          {formData.items.map((item, index) => (
            <div key={index} className={`${darkMode ? 'bg-gray-600' : 'bg-white'} rounded-lg p-3 sm:p-4 mb-4 border ${darkMode ? 'border-gray-500' : 'border-gray-200'}`}>
              <div className="flex justify-between items-center mb-3 sm:mb-4">
                <h4 className={`text-sm sm:text-base font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>Item {index + 1}</h4>
                {formData.items.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeItem(index)}
                    disabled={loading}
                    className="text-red-600 hover:text-red-700 font-medium disabled:opacity-50 text-sm"
                  >
                    Remove
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
                {/* Line Type Selection */}
                <div>
                  <label className={`block text-xs sm:text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'} mb-1`}>
                    Line Type
                  </label>
                  <select
                    value={item.lineType || ''}
                    onChange={(e) => handleItemChange(index, 'lineType', e.target.value)}
                    className={`w-full px-2 sm:px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm ${darkMode ? 'border-gray-500 bg-gray-700 text-white' : 'border-gray-300 bg-white'
                      }`}
                    disabled={loading}
                  >
                    <option value="">Select type</option>
                    <option value="ITEM">ITEM</option>
                    <option value="TEXT">TEXT</option>
                  </select>
                </div>

                {/* Item Number */}
                <div>
                  <label className={`block text-xs sm:text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'} mb-1`}>
                    Item Number <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={item.itemNumber}
                      readOnly
                      onChange={(e) => handleItemChange(index, 'itemNumber', e.target.value)}
                      data-error={errors[`items.${index}.itemNumber`] ? 'true' : 'false'}
                      className={`w-full px-2 sm:px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm ${errors[`items.${index}.itemNumber`] ? 'border-red-300 bg-red-50 placeholder-gray-900' : (darkMode ? 'border-gray-500 bg-gray-700 text-white' : 'border-gray-300 bg-white')
                        }`}
                      placeholder={item.lineType === 'ITEM' ? "Select item from masterfile" : item.lineType === 'TEXT' ? "Automated Item Number" : "Select line type first"}
                      disabled={loading || !item.lineType}
                    />
                    {item.lineType === 'ITEM' && (
                      <button
                        type="button"
                        onClick={() => {
                          setCurrentItemSelectionIndex(index);
                          setShowItemSelectionModal(true);
                        }}
                        disabled={loading || !item.lineType}
                        className={`absolute inset-y-0 right-0 pr-2 sm:pr-3 flex items-center ${darkMode ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-700'}`}
                      >
                        <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                      </button>
                    )}
                  </div>
                  {errors[`items.${index}.itemNumber`] && <p className="mt-1 text-xs text-red-600">{errors[`items.${index}.itemNumber`]}</p>}
                </div>

                {/* Unit of Measure */}
                <div>
                  <label className={`block text-xs sm:text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'} mb-1`}>
                    Unit of Measure <span className="text-red-500">*</span>
                  </label>
                  {item.lineType === 'ITEM' ? (
                    // For ITEM type, show the UOM as read-only text
                    <input
                      type="text"
                      value={item.unitOfMeasure}
                      readOnly
                      className={`w-full px-2 sm:px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm ${errors[`items.${index}.unitOfMeasure`] ? 'border-red-300 bg-red-50 text-gray-900' : (darkMode ? 'border-gray-500 bg-gray-700 text-white' : 'border-gray-300 bg-gray-100')
                        }`}
                      disabled={loading || !item.lineType}
                    />
                  ) : item.lineType === 'TEXT' ? (
                    // For TEXT type, show the dropdown with standard options
                    <select
                      value={item.unitOfMeasure}
                      onChange={(e) => handleItemChange(index, 'unitOfMeasure', e.target.value)}
                      data-error={errors[`items.${index}.unitOfMeasure`] ? 'true' : 'false'}
                      className={`w-full px-2 sm:px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm ${errors[`items.${index}.unitOfMeasure`] ? 'border-red-300 bg-red-50 text-gray-900' : (darkMode ? 'border-gray-500 bg-gray-700 text-white' : 'border-gray-300 bg-white')
                        }`}
                      disabled={loading || !item.lineType}
                    >
                      <option value="">Select UOM</option>
                      {UNIT_OF_MEASURE_OPTIONS.map(uom => (
                        <option key={uom} value={uom} className={darkMode ? 'bg-gray-700' : ''}>{uom}</option>
                      ))}
                    </select>
                  ) : (
                    // When no line type is selected, show disabled input
                    <input
                      type="text"
                      value=""
                      readOnly
                      className={`w-full px-2 sm:px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm ${darkMode ? 'border-gray-500 bg-gray-700 text-gray-400' : 'border-gray-300 bg-gray-100 text-gray-400'}
                        }`}
                      disabled={true}
                      placeholder="Select line type first"
                    />
                  )}
                  {errors[`items.${index}.unitOfMeasure`] && <p className="mt-1 text-xs text-red-600">{errors[`items.${index}.unitOfMeasure`]}</p>}
                </div>

                {/* Item Description */}
                <div className="sm:col-span-2 md:col-span-2">
                  <label className={`block text-xs sm:text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'} mb-1`}>
                    Item Description <span className="text-red-500">*</span>
                  </label>
                  {item.lineType === 'ITEM' ? (
                    // For ITEM type, show disabled input
                    <input
                      type="text"
                      value={item.itemDescription}
                      readOnly
                      className={`w-full px-2 sm:px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm ${errors[`items.${index}.itemDescription`] ? 'border-red-300 bg-red-50 placeholder-gray-900' : (darkMode ? 'border-gray-500 bg-gray-700 text-white' : 'border-gray-300 bg-gray-100')
                        }`}
                      placeholder="Auto-filled from masterfile"
                      disabled={true}
                    />
                  ) : item.lineType === 'TEXT' ? (
                    // For TEXT type, show editable input
                    <input
                      type="text"
                      value={item.itemDescription}
                      onChange={(e) => handleItemChange(index, 'itemDescription', e.target.value)}
                      data-error={errors[`items.${index}.itemDescription`] ? 'true' : 'false'}
                      className={`w-full px-2 sm:px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm ${errors[`items.${index}.itemDescription`] ? 'border-red-300 bg-red-50 placeholder-gray-900' : (darkMode ? 'border-gray-500 bg-gray-700 text-white' : 'border-gray-300 bg-white')
                        }`}
                      placeholder="Enter item description"
                      disabled={loading}
                    />
                  ) : (
                    // When no line type is selected, show disabled input
                    <input
                      type="text"
                      value=""
                      readOnly
                      className={`w-full px-2 sm:px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm ${darkMode ? 'border-gray-500 bg-gray-700 text-gray-400' : 'border-gray-300 bg-gray-100 text-gray-400'}
                        }`}
                      disabled={true}
                      placeholder="Select line type first"
                    />
                  )}
                  {errors[`items.${index}.itemDescription`] && <p className="mt-1 text-xs text-red-600">{errors[`items.${index}.itemDescription`]}</p>}
                </div>

                {/* Quantity */}
                <div>
                  <label className={`block text-xs sm:text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'} mb-1`}>
                    Quantity <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={item.quantity}
                    onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                    data-error={errors[`items.${index}.quantity`] ? 'true' : 'false'}
                    className={`w-full px-2 sm:px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm ${errors[`items.${index}.quantity`] ? 'border-red-300 bg-red-50 placeholder-gray-900' : (darkMode ? 'border-gray-500 bg-gray-700 text-white' : 'border-gray-300 bg-white')
                      }`}
                    placeholder="0.00"
                    disabled={loading}
                  />
                  {errors[`items.${index}.quantity`] && <p className="mt-1 text-xs text-red-600">{errors[`items.${index}.quantity`]}</p>}
                </div>

                {/* Budget Code */}
                <div>
                  <label className={`block text-xs sm:text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'} mb-1`}>
                    Budget Code <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={item.budgetCode}
                      onChange={(e) => handleItemChange(index, 'budgetCode', e.target.value)}
                      onClick={() => handleOpenBudgetModal(index)}
                      data-error={errors[`items.${index}.budgetCode`] ? 'true' : 'false'}
                      className={`w-full px-2 sm:px-3 py-2 pr-8 sm:pr-10 border rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm ${errors[`items.${index}.budgetCode`] ? 'border-red-300 bg-red-50 text-gray-900' : (darkMode ? 'border-gray-500 bg-gray-700 text-white' : 'border-gray-300 bg-white')
                        } cursor-pointer`}
                      placeholder="Click to select budget"
                      disabled={loading}
                      readOnly
                    />
                    <button
                      type="button"
                      onClick={() => handleOpenBudgetModal(index)}
                      disabled={loading}
                      className="absolute inset-y-0 right-0 pr-2 sm:pr-3 flex items-center"
                    >
                      <svg className={`w-4 h-4 sm:w-5 sm:h-5 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                  </div>
                  {errors[`items.${index}.budgetCode`] && <p className="mt-1 text-xs text-red-600">{errors[`items.${index}.budgetCode`]}</p>}
                </div>

                {/* Date Needed */}
                <div>
                  <label className={`block text-xs sm:text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'} mb-1`}>
                    Date Needed <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={formatDateForInput(item.dateNeeded)}
                    onChange={(e) => handleItemChange(index, 'dateNeeded', e.target.value)}
                    data-error={errors[`items.${index}.dateNeeded`] ? 'true' : 'false'}
                    className={`w-full px-2 sm:px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm ${errors[`items.${index}.dateNeeded`] ? 'border-red-300 bg-red-50 text-gray-900' : (darkMode ? 'border-gray-500 bg-gray-700 text-white' : 'border-gray-300 bg-white')
                      }`}
                    disabled={loading}
                  />
                  {errors[`items.${index}.dateNeeded`] && <p className="mt-1 text-xs text-red-600">{errors[`items.${index}.dateNeeded`]}</p>}
                </div>

                {/* Item Remarks */}
                <div className="sm:col-span-2 md:col-span-3">
                  <label className={`block text-xs sm:text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'} mb-1`}>
                    Item Remarks
                  </label>
                  <textarea
                    value={item.remarks}
                    onChange={(e) => handleItemChange(index, 'remarks', e.target.value)}
                    className={`w-full px-2 sm:px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm ${darkMode ? 'border-gray-500 bg-gray-700 text-white' : 'border-gray-300 bg-white'
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
        <div className="flex flex-col sm:flex-row gap-4 pt-4">
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
                {editData ? 'Updating...' : 'Creating Purchase Request ...'}
              </div>
            ) : (
              editData ? 'Update Purchase Request' : 'Create Purchase Request'
            )}
          </button>
        </div>
      </form>

      {/* Confirmation Modal */}
      <ConfirmModal
        isOpen={showConfirmModal}
        title={editData ? "Update Purchase Request" : "Create Purchase Request"}
        message={editData
          ? `Are you sure you want to update this purchase request? This will save your changes to the existing request.`
          : `Are you sure you want to create this purchase request? This will save the request as a draft and you can post it later to send notifications to the ${formData.reviewer ? 'reviewer' : 'approver'}.`
        }
        confirmButtonText={editData ? "Update Request" : "Create Request"}
        onConfirm={handleConfirmSubmit}
        onCancel={() => setShowConfirmModal(false)}
        isLoading={loading}
      />

      {/* Budget Modal */}
      <BudgetModal
        isOpen={showBudgetModal}
        onClose={() => setShowBudgetModal(false)}
        onSelect={handleBudgetSelect}
        darkMode={darkMode}
      />

      {/* Item Selection Modal */}
      <ItemSelectionModal
        isOpen={showItemSelectionModal}
        onClose={() => setShowItemSelectionModal(false)}
        onSelectItem={(selectedItem) => {
          if (currentItemSelectionIndex !== null) {
            // Update the item with the selected item data
            const newItems = [...formData.items];
            newItems[currentItemSelectionIndex].itemNumber = selectedItem.ITEMNMBR;
            newItems[currentItemSelectionIndex].itemDescription = selectedItem.ITEMDESC;
            // Set UOM from the selected item (use UOFM if available, otherwise UOMSCHDL)
            newItems[currentItemSelectionIndex].unitOfMeasure = selectedItem.UOFM || selectedItem.UOMSCHDL || '';
            setFormData(prev => ({ ...prev, items: newItems }));
          }
          setShowItemSelectionModal(false);
          setCurrentItemSelectionIndex(null);
        }}
        darkMode={darkMode}
      />
    </div>
  );
});

export default PurchaseRequestForm;
