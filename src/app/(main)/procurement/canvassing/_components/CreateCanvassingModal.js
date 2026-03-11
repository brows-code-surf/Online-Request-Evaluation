'use client';

import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import {
  getPurchaseRequestDetailsForCanvassing,
  createCanvassingRequest,
  getAllSuppliers,
  getAllPaymentTerms,
  getNextReferenceNumber,
  checkExistingSuppliersForRIDs
} from '../_actions';
import SkeletonLoader from '@/app/_components/skeletonLoader';

function CreateCanvassingModal({ isOpen, onClose, darkMode, user, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [availableItems, setAvailableItems] = useState([]);
  const [selectedItems, setSelectedItems] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [selectedSupplier, setSelectedSupplier] = useState('');
  const [selectedVendorId, setSelectedVendorId] = useState('');
  const [supplierSearch, setSupplierSearch] = useState('');
  const [showSupplierDropdown, setShowSupplierDropdown] = useState(false);
  const [paymentTerms, setPaymentTerms] = useState([]);
  const [selectedPaymentTerm, setSelectedPaymentTerm] = useState('');
  const [paymentTermSearch, setPaymentTermSearch] = useState('');
  const [showPaymentTermDropdown, setShowPaymentTermDropdown] = useState(false);
  const [canvassingData, setCanvassingData] = useState({
    referenceNum: '',
    remarks: '',
    supplierQty: '',
    brand: '',
    origin: '',
    isImported: false,
    deliverySchedule: '',
    poNumber: '',
    itemRemarks: '',
    offeredPrice: '',
    bidPrice: '',
    agreedPrice: ''
  });
  const [filterByAddressedTo, setFilterByAddressedTo] = useState(true);
  const [currentStep, setCurrentStep] = useState(1); // 1: Item Selection, 2: Header, 3: Supplier, 4: Pricing
  const [tableSearchTerm, setTableSearchTerm] = useState('');
  const [existingSuppliers, setExistingSuppliers] = useState(new Map()); // RID -> vendorId mapping

  // Check for existing suppliers when selected items change
  useEffect(() => {
    const checkExistingSuppliers = async () => {
      if (selectedItems.length === 0) {
        setExistingSuppliers(new Map());
        return;
      }

      try {
        // Get unique RIDs from selected items
        const rids = [...new Set(selectedItems.map(item => item.RID))];

        const result = await checkExistingSuppliersForRIDs(rids);
        if (result.success) {
          setExistingSuppliers(result.existingSuppliers);
        } else {
          console.error('Failed to check existing suppliers');
          setExistingSuppliers(new Map());
        }
      } catch (error) {
        console.error('Error checking existing suppliers:', error);
        setExistingSuppliers(new Map());
      }
    };

    checkExistingSuppliers();
  }, [selectedItems]);

  // Filter available items based on search term and selected item description
  const filteredAvailableItems = availableItems.filter((item) => {
    const searchTerm = tableSearchTerm.toLowerCase();
    const matchesSearch = (
      item.requestId?.toLowerCase().includes(searchTerm) ||
      item.RID?.toString().toLowerCase().includes(searchTerm) ||
      item.ITEMDESC?.toLowerCase().includes(searchTerm) ||
      item.BUDGETCODE?.toLowerCase().includes(searchTerm) ||
      item.addressedTo?.toLowerCase().includes(searchTerm) ||
      item.company?.toLowerCase().includes(searchTerm)
    );

    // If any items are selected, filter to show only items with the same ITEMDESC
    const matchesSelectedItemDesc = selectedItems.length > 0
      ? selectedItems.some(selected => selected.ITEMDESC === item.ITEMDESC)
      : true;

    return matchesSearch && matchesSelectedItemDesc;
  });

  // Load suppliers, payment terms, reference number, and available purchase request items that are FOR CANVASSING
  useEffect(() => {
    if (isOpen) {
      loadSuppliers();
      loadPaymentTerms();
      loadReferenceNumber();
      loadAvailableItems();
    }
  }, [isOpen, filterByAddressedTo]);

  const loadSuppliers = async () => {
    try {
      const result = await getAllSuppliers();
      if (result.success) {
        setSuppliers(result.suppliers);
      } else {
        toast.error('Failed to load suppliers');
      }
    } catch (error) {
      console.error('Error loading suppliers:', error);
      toast.error('Failed to load suppliers');
    }
  };

  const loadPaymentTerms = async () => {
    try {
      const result = await getAllPaymentTerms();
      if (result.success) {
        setPaymentTerms(result.paymentTerms);
      } else {
        toast.error('Failed to load payment terms');
      }
    } catch (error) {
      console.error('Error loading payment terms:', error);
      toast.error('Failed to load payment terms');
    }
  };

  const loadReferenceNumber = async () => {
    try {
      const result = await getNextReferenceNumber();
      if (result.success) {
        setCanvassingData(prev => ({ ...prev, referenceNum: result.referenceNum }));
      } else {
        toast.error('Failed to load reference number');
      }
    } catch (error) {
      console.error('Error loading reference number:', error);
      toast.error('Failed to load reference number');
    }
  };

  const loadAvailableItems = async () => {
    setLoading(true);
    try {
      const result = await getPurchaseRequestDetailsForCanvassing(user, filterByAddressedTo);
      if (result.success) {
        setAvailableItems(result.items.map((item, index) => ({
          ...item,
          uniqueId: `${item.requestId}-${item.RID || index}`
        })));
      } else {
        toast.error('Failed to load available items for canvassing');
      }
    } catch (error) {
      console.error('Error loading items:', error);
      toast.error('Failed to load available items');
    } finally {
      setLoading(false);
    }
  };

  const handleItemSelect = (item, checked) => {
    if (checked) {
      setSelectedItems(prev => [...prev, {
        ...item,
        offeredPrice: 0,
        bidPrice: 0,
        finalPrice: 0
      }]);
    } else {
      setSelectedItems(prev => prev.filter(selected => selected.uniqueId !== item.uniqueId));
    }
  };

  const handleSelectAll = (checked) => {
    if (checked) {
      setSelectedItems(filteredAvailableItems.map(item => ({
        ...item,
        offeredPrice: 0,
        bidPrice: 0,
        finalPrice: 0
      })));
    } else {
      setSelectedItems([]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (selectedItems.length === 0) {
      toast.error('Please select at least one item for canvassing');
      return;
    }

    if (!canvassingData.referenceNum.trim()) {
      toast.error('Reference number is required');
      return;
    }

    setSubmitting(true);
    try {
      // Prepare header data (company is now optional at header level)
      const headerData = {
        referenceNum: canvassingData.referenceNum,
        pqRemarks: canvassingData.remarks
      };

      // Prepare details data from selected items with individual companies
      const detailsData = selectedItems.map(item => ({
        prCode: item.requestId,
        rid: item.RID, // Save the RID of the purchase request
        itemNumber: item.ITEMNMBR,
        itemDescription: item.ITEMDESC,
        unitOfMeasure: item.UOFM,
        quantity: item.QUANTITY,
        company: item.company || '', // Each item can have different company
        budgetCode: item.BUDGETCODE,
        remarks: '',
        vendorId: selectedVendorId,
        brand: canvassingData.brand || '',
        origin: canvassingData.origin || '',
        isImported: canvassingData.isImported ? 1 : 0,
        offeredPrice: item.offeredPrice || 0,
        bidPrice: item.bidPrice || 0,
        finalPrice: item.finalPrice || 0,
        paymentTerms: selectedPaymentTerm,
        supplierQty: parseInt(canvassingData.supplierQty) || 0,
        legend: canvassingData.legend || '',
        deliverySchedule: canvassingData.deliverySchedule || '',
        poNumber: canvassingData.poNumber || '',
        canvassedBy: user?.empName || '',
        isServed: 0
      }));

      const result = await createCanvassingRequest(headerData, detailsData, user?.empName, selectedSupplier);

      if (result.success) {
        toast.success('Canvassing request created successfully!');
        onSuccess?.();

        // Reset form
        setCurrentStep(1);
        setSelectedItems([]);
        setSelectedSupplier('');
        setSelectedVendorId('');
        setSelectedPaymentTerm('');
        setCanvassingData({
          referenceNum: '',
          remarks: '',
          supplierQty: '',
          brand: '',
          origin: '',
          isImported: false,
          deliverySchedule: '',
          poNumber: '',
          itemRemarks: '',
          offeredPrice: '',
          bidPrice: '',
          agreedPrice: ''
        });
        onClose();
      } else {
        toast.error(result.message || 'Failed to create canvassing request');
      }
    } catch (error) {
      console.error('Error creating canvassing request:', error);
      toast.error('Failed to create canvassing request');
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!submitting) {
      setCurrentStep(1);
      setSelectedItems([]);
      setSelectedSupplier('');
      setSelectedVendorId('');
      setSupplierSearch('');
      setShowSupplierDropdown(false);
      setSelectedPaymentTerm('');
      setPaymentTermSearch('');
      setShowPaymentTermDropdown(false);
      setTableSearchTerm('');
      setCanvassingData({
        referenceNum: '',
        remarks: '',
        supplierQty: '',
        brand: '',
        origin: '',
        isImported: false,
        deliverySchedule: '',
        poNumber: '',
        itemRemarks: '',
        offeredPrice: '',
        bidPrice: '',
        agreedPrice: ''
      });
      onClose();
    }
  };

  const handleNextStep = () => {
    if (currentStep === 1 && selectedItems.length === 0) {
      toast.error('Please select at least one item for canvassing');
      return;
    }
    if (currentStep < 4) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity" aria-hidden="true">
          <div className="absolute inset-0 bg-gray-500 opacity-75" onClick={handleClose}></div>
        </div>

        <div className={`inline-block align-bottom rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-6xl w-full mx-4 sm:mx-auto h-[90vh] max-h-[90vh] relative z-10 ${darkMode ? 'bg-gray-800' : 'bg-white'}`} onClick={(e) => e.stopPropagation()}>
          <form onSubmit={handleSubmit}>
            {/* Header */}
            <div className={`px-6 py-4 border-b ${darkMode ? 'border-blue-700 bg-gradient-to-r from-blue-800 to-blue-900' : 'border-blue-200 bg-gradient-to-r from-blue-50 to-blue-100'}`}>
              <div className="flex items-center justify-between">
                <div className="flex-1"></div>
                <div className="text-center">
                  <h3 className={`text-lg font-medium ${darkMode ? 'text-white' : 'text-black'}`}>
                    Create Canvassing Request
                  </h3>
                  {canvassingData.referenceNum && (
                    <p className="text-sm mt-1 font-bold text-blue-800">
                      Reference: {canvassingData.referenceNum}
                    </p>
                  )}
                </div>
                <div className="flex-1 flex justify-end">
                  <button
                    type="button"
                    onClick={handleClose}
                    disabled={submitting}
                    className={`rounded-md p-2 ${darkMode ? 'text-gray-400 hover:text-gray-300' : 'text-gray-400 hover:text-gray-500'} disabled:opacity-50`}
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>

            {/* Step Indicator */}
            <div className="px-4 sm:px-6 py-4 border-b bg-white">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4">
                <div className="flex flex-col sm:flex-row sm:items-center space-y-4 sm:space-y-0 sm:space-x-4 mb-4 sm:mb-0">
                  <div className={`flex items-center ${currentStep >= 1 ? 'text-blue-600' : 'text-gray-400'}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${currentStep >= 1 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'}`}>
                      1
                    </div>
                    <span className={`ml-2 text-sm font-medium ${currentStep >= 1 ? '' : 'text-gray-500'}`}>Select Items</span>
                  </div>
                  <div className={`hidden sm:block w-8 h-0.5 ${currentStep >= 2 ? 'bg-blue-600' : 'bg-gray-200'}`}></div>
                  <div className={`sm:hidden w-0.5 h-8 mx-auto ${currentStep >= 2 ? 'bg-blue-600' : 'bg-gray-200'}`}></div>
                  <div className={`flex items-center ${currentStep >= 2 ? 'text-blue-600' : 'text-gray-400'}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${currentStep >= 2 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'}`}>
                      2
                    </div>
                    <span className={`ml-2 text-sm font-medium ${currentStep >= 2 ? '' : 'text-gray-500'}`}>Canvassing Details</span>
                  </div>
                  <div className={`hidden sm:block w-8 h-0.5 ${currentStep >= 3 ? 'bg-blue-600' : 'bg-gray-200'}`}></div>
                  <div className={`sm:hidden w-0.5 h-8 mx-auto ${currentStep >= 3 ? 'bg-blue-600' : 'bg-gray-200'}`}></div>
                  <div className={`flex items-center ${currentStep >= 3 ? 'text-blue-600' : 'text-gray-400'}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${currentStep >= 3 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'}`}>
                      3
                    </div>
                    <span className={`ml-2 text-sm font-medium ${currentStep >= 3 ? '' : 'text-gray-500'}`}>Purchase Order</span>
                  </div>
                  <div className={`hidden sm:block w-8 h-0.5 ${currentStep >= 4 ? 'bg-blue-600' : 'bg-gray-200'}`}></div>
                  <div className={`sm:hidden w-0.5 h-8 mx-auto ${currentStep >= 4 ? 'bg-blue-600' : 'bg-gray-200'}`}></div>
                  <div className={`flex items-center ${currentStep >= 4 ? 'text-blue-600' : 'text-gray-400'}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${currentStep >= 4 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'}`}>
                      4
                    </div>
                    <span className={`ml-2 text-sm font-medium ${currentStep >= 4 ? '' : 'text-gray-500'}`}>Receiving Report</span>
                  </div>
                </div>

                <div className="text-sm text-gray-500 text-center sm:text-right">
                  Step {currentStep} of 4
                </div>
              </div>
            </div>

            {/* Scrollable Content */}
            <div className="px-6 py-4 overflow-y-auto" style={{ height: 'calc(86vh - 200px)' }}>
              {currentStep === 1 && (
                <>
                  <h4 className={`text-lg font-medium mb-6 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    Step 1: Select Items for Canvassing
                  </h4>

                  {/* Items Selection */}
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h4 className={`text-md font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                        Select Items for Canvassing
                      </h4>
                      <div className="flex items-center space-x-4">
                        <div className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id="filterAddressedTo"
                            checked={filterByAddressedTo}
                            onChange={(e) => setFilterByAddressedTo(e.target.checked)}
                            className="rounded"
                          />
                          <label htmlFor="filterAddressedTo" className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                            My Items Only
                          </label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id="selectAll"
                            checked={selectedItems.length === filteredAvailableItems.length && filteredAvailableItems.length > 0}
                            onChange={(e) => handleSelectAll(e.target.checked)}
                            disabled={selectedItems.length === 0}
                            className="rounded disabled:opacity-50"
                          />
                          <label htmlFor="selectAll" className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'} ${selectedItems.length === 0 ? 'opacity-50' : ''}`}>
                            Select All ({filteredAvailableItems.length} items)
                          </label>
                        </div>
                      </div>
                    </div>

                    {/* Search Input */}
                    <div className="mb-4">
                      <div className="relative">
                        <input
                          type="text"
                          placeholder="Search items by reference no., item details, addressed to, company..."
                          value={tableSearchTerm}
                          onChange={(e) => setTableSearchTerm(e.target.value)}
                          className={`w-full px-3 py-2 pl-10 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${darkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'bg-white border-gray-300 placeholder-gray-500'
                            }`}
                        />
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <svg className={`w-5 h-5 ${darkMode ? 'text-gray-400' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                          </svg>
                        </div>
                      </div>
                    </div>

                    {loading ? (
                      <div className="border rounded-md overflow-hidden">
                        <div className="max-h-96 overflow-y-auto">
                          <table className="min-w-full divide-y divide-gray-200">
                            <thead className={`${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                              <tr>
                                <th className={`px-4 py-3 text-left text-xs font-medium uppercase tracking-wider ${darkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                                  Select
                                </th>
                                <th className={`px-4 py-3 text-left text-xs font-medium uppercase tracking-wider ${darkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                                  Item Ref No.
                                </th>
                                <th className={`px-4 py-3 text-left text-xs font-medium uppercase tracking-wider ${darkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                                  Item Details
                                </th>
                                <th className={`px-4 py-3 text-left text-xs font-medium uppercase tracking-wider ${darkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                                  Company
                                </th>
                                <th className={`px-4 py-3 text-left text-xs font-medium uppercase tracking-wider ${darkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                                  Addressed To
                                </th>
                                <th className={`px-4 py-3 text-left text-xs font-medium uppercase tracking-wider ${darkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                                  Quantity
                                </th>
                              </tr>
                            </thead>
                            <tbody className={`${darkMode ? 'bg-gray-800 divide-gray-700' : 'bg-white divide-gray-200'}`}>
                              {Array(5).fill().map((_, index) => (
                                <tr key={index} className={`${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-50'}`}>
                                  <td className="px-4 py-3">
                                    <SkeletonLoader height="h-4" width="w-4" />
                                  </td>
                                  <td className="px-4 py-3">
                                    <SkeletonLoader height="h-4" width="w-12" />
                                  </td>
                                  <td className="px-4 py-3">
                                    <div className="space-y-1">
                                      <SkeletonLoader height="h-4" width="w-32" />
                                      <SkeletonLoader height="h-3" width="w-24" />
                                    </div>
                                  </td>
                                   <td className="px-4 py-3">
                                    <div className="space-y-1">
                                      <SkeletonLoader height="h-4" width="w-32" />
                                      <SkeletonLoader height="h-3" width="w-24" />
                                    </div>
                                  </td>
                                  <td className="px-4 py-3">
                                    <div className="space-y-1">
                                      <SkeletonLoader height="h-4" width="w-20" />
                                      <SkeletonLoader height="h-3" width="w-16" />
                                    </div>
                                  </td>
                                  <td className="px-4 py-3">
                                    <SkeletonLoader height="h-4" width="w-16" />
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    ) : availableItems.length === 0 ? (
                      <div className="text-center py-8">
                        <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2M4 13h2m8-5v2m0 0v2m0-2h2m-2 0h-2" />
                        </svg>
                        <p className={`mt-2 text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                          No items available for canvassing
                        </p>
                      </div>
                    ) : (
                      <div className="border rounded-md overflow-hidden">
                        <div className="max-h-96 overflow-y-auto overflow-x-auto">
                          <table className="min-w-full divide-y divide-gray-200">
                            <thead className={`${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                              <tr>
                                <th className={`px-2 sm:px-4 py-3 text-left text-xs font-medium uppercase tracking-wider ${darkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                                  Select
                                </th>
                                <th className={`px-2 sm:px-4 py-3 text-left text-xs font-medium uppercase tracking-wider ${darkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                                  Item Ref No.
                                </th>
                                <th className={`px-2 sm:px-4 py-3 text-left text-xs font-medium uppercase tracking-wider ${darkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                                  Item Details
                                </th>
                                <th className={`hidden lg:table-cell px-2 sm:px-4 py-3 text-left text-xs font-medium uppercase tracking-wider ${darkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                                  Company
                                </th>
                                <th className={`hidden md:table-cell px-2 sm:px-4 py-3 text-left text-xs font-medium uppercase tracking-wider ${darkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                                  Addressed To
                                </th>
                                <th className={`px-2 sm:px-4 py-3 text-left text-xs font-medium uppercase tracking-wider ${darkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                                  Quantity
                                </th>
                              </tr>
                            </thead>
                            <tbody className={`${darkMode ? 'bg-gray-800 divide-gray-700' : 'bg-white divide-gray-200'}`}>
                              {filteredAvailableItems.map((item, index) => (
                                <tr key={item.uniqueId} className={`${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-50'}`}>
                                  <td className="px-2 sm:px-4 py-3">
                                    <input
                                      type="checkbox"
                                      checked={selectedItems.some(selected => selected.uniqueId === item.uniqueId)}
                                      onChange={(e) => handleItemSelect(item, e.target.checked)}
                                      className="rounded"
                                    />
                                  </td>
                                  <td className="px-2 sm:px-4 py-3">
                                    <div className={`text-xs sm:text-sm font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                                      {item.RID}
                                    </div>
                                  </td>
                                  <td className="px-2 sm:px-4 py-3">
                                    <div>
                                      <div className={`text-xs sm:text-sm font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                                        {item.ITEMDESC}
                                      </div>
                                      <div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-400'}`}>
                                        Budget: {item.BUDGETCODE}
                                      </div>
                                    </div>
                                  </td>
                                  <td className={`hidden lg:table-cell px-2 sm:px-4 py-3`}>
                                    <div className={`text-xs sm:text-sm ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                                      {item.company || 'N/A'}
                                    </div>
                                  </td>
                                  <td className={`hidden md:table-cell px-2 sm:px-4 py-3`}>
                                    <div className={`text-xs sm:text-sm ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                                      {item.addressedTo}
                                    </div>
                                  </td>
                                  <td className="px-2 sm:px-4 py-3">
                                    <span className={`text-xs sm:text-sm ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                                      {item.QUANTITY} {item.UOFM}
                                    </span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                </>
              )}

              {currentStep === 2 && (
                <>
                  {/* Canvassing Request Details - Step 2 */}
                  <div className="mb-4">
                    <h4 className={`text-lg font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                      Step 2: Enter Canvassing Details for Selected Items
                    </h4>

                    {/* Summary of selected items */}
                    {/* <div className={`mb-6 p-4 rounded-md ${darkMode ? 'bg-gray-700' : 'bg-blue-50'}`}>
                      <h5 className={`text-sm font-medium mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                        Selected Items Summary ({selectedItems.length} items)
                      </h5>
                      <div className="space-y-1">
                        {selectedItems.map((item, index) => (
                          <div key={item.uniqueId} className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                            {index + 1}. {item.ITEMDESC} - Qty: {item.QUANTITY} {item.UOFM}
                          </div>
                        ))}
                      </div>
                    </div> */}

                    {/* Supplier Information */}
                    <div className="mb-4">
                      <h4 className={`text-md font-medium mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                        Supplier Information
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="relative">
                          <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                            Supplier <span className="text-red-500">*</span>
                          </label>
                          <div className="relative">
                            <input
                              type="text"
                              value={selectedSupplier}
                              onChange={(e) => {
                                setSelectedSupplier(e.target.value);
                                setSupplierSearch(e.target.value);
                              }}
                              onFocus={() => setShowSupplierDropdown(true)}
                              onBlur={() => setTimeout(() => setShowSupplierDropdown(false), 200)}
                              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
                                }`}
                              placeholder="Select or type supplier name"
                              required
                            />
                            <button
                              type="button"
                              onClick={() => setShowSupplierDropdown(!showSupplierDropdown)}
                              className={`absolute right-2 top-2 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                              </svg>
                            </button>
                          </div>
                          {showSupplierDropdown && (
                            <div className={`absolute z-50 w-full mt-1 border rounded-md shadow-lg max-h-60 overflow-y-auto ${darkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'
                              }`}>
                              {suppliers
                                .filter(supplier =>
                                  supplier.vendorName.toLowerCase().includes(supplierSearch.toLowerCase())
                                )
                                .map((supplier) => {
                                  // Check if this supplier is already assigned to any selected items
                                  const isAlreadyAssigned = selectedItems.some(item =>
                                    existingSuppliers.get(item.RID) === supplier.vendorId
                                  );

                                  return (
                                    <div
                                      key={supplier.id}
                                      onClick={() => {
                                        // if (isAlreadyAssigned) {
                                        //   toast.error(`Supplier ${supplier.vendorName} is already assigned to selected item(s). Please choose a different supplier.`);
                                        //   return;
                                        // }

                                        setSelectedSupplier(supplier.vendorName);
                                        setSelectedVendorId(supplier.vendorId);
                                        // Pre-select payment terms from supplier's default
                                        if (supplier.paymentTerms) {
                                          setSelectedPaymentTerm(supplier.paymentTerms);
                                        }
                                        setSupplierSearch('');
                                        setShowSupplierDropdown(false);
                                      }}
                                      className={`px-3 py-2 cursor-pointer 
                                        ${
                                        // isAlreadyAssigned ? 'opacity-50 cursor-not-allowed' : 
                                        darkMode ? 'text-white hover:bg-gray-600' : 'text-gray-900 hover:bg-gray-100'
                                        }
                                      `}
                                    >
                                      <div className="flex justify-between items-center">
                                        <span>{supplier.vendorName}</span>
                                        {/* {isAlreadyAssigned && (
                                          <span className="text-xs text-red-500 ml-2">Already assigned</span>
                                        )} */}
                                      </div>
                                    </div>
                                  );
                                })}
                              {suppliers.filter(supplier =>
                                supplier.vendorName.toLowerCase().includes(supplierSearch.toLowerCase())
                              ).length === 0 && supplierSearch && (
                                  <div className={`px-3 py-2 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                    No suppliers found
                                  </div>
                                )}
                            </div>
                          )}
                        </div>
                          <div>
                            <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                            Vendor ID
                          </label>
                          <input
                            type="text"
                            value={selectedVendorId}
                            readOnly
                            className={`w-full px-3 py-2 border rounded-md ${darkMode ? 'bg-gray-600 border-gray-500 text-gray-300' : 'bg-gray-100 border-gray-200 text-gray-600'
                              }`}
                            placeholder="Auto-filled when supplier is selected"
                          />
                        </div>
                        <div className="relative">
                          <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                            Payment Terms <span className="text-red-500">*</span>
                          </label>
                          <div className="relative">
                            <input
                              type="text"
                              value={selectedPaymentTerm}
                              onChange={(e) => {
                                setSelectedPaymentTerm(e.target.value);
                                setPaymentTermSearch(e.target.value);
                              }}
                              onFocus={() => setShowPaymentTermDropdown(true)}
                              onBlur={() => setTimeout(() => setShowPaymentTermDropdown(false), 200)}
                              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
                                }`}
                              placeholder="Select payment terms"
                              required
                            />
                            <button
                              type="button"
                              onClick={() => setShowPaymentTermDropdown(!showPaymentTermDropdown)}
                              className={`absolute right-2 top-2 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                              </svg>
                            </button>
                          </div>
                          {showPaymentTermDropdown && (
                            <div className={`absolute z-50 w-full mt-1 border rounded-md shadow-lg max-h-60 overflow-y-auto ${darkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'
                              }`}>
                              {paymentTerms
                                .filter(term =>
                                  term.paymentTermId.toLowerCase().includes(paymentTermSearch.toLowerCase())
                                )
                                .map((term) => (
                                  <div
                                    key={term.id}
                                    onClick={() => {
                                      setSelectedPaymentTerm(term.paymentTermId);
                                      setPaymentTermSearch('');
                                      setShowPaymentTermDropdown(false);
                                    }}
                                    className={`px-3 py-2 cursor-pointer ${darkMode
                                      ? 'text-white hover:bg-gray-600'
                                      : 'text-gray-900 hover:bg-gray-100'
                                      }`}
                                  >
                                    <div className="flex justify-between items-center">
                                      <span>{term.paymentTermId}</span>
                                      <span className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                        {term.dueDays} days
                                      </span>
                                    </div>
                                  </div>
                                ))}
                              {paymentTerms.filter(term =>
                                term.paymentTermId.toLowerCase().includes(paymentTermSearch.toLowerCase())
                              ).length === 0 && paymentTermSearch && (
                                  <div className={`px-3 py-2 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                    No payment terms found
                                  </div>
                                )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Item Details */}
                    <div className="mb-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                         <div>
                          <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                            Delivery Schedule
                          </label>
                          <input
                            type="date"
                            value={canvassingData.deliverySchedule}
                            onChange={(e) => setCanvassingData(prev => ({ ...prev, deliverySchedule: e.target.value }))}
                            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
                              }`}
                          />
                        </div>
                        <div>
                          <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                            Supplier QTY
                          </label>
                          <input
                            type="number"
                            min="0"
                            value={canvassingData.supplierQty}
                            onChange={(e) => setCanvassingData(prev => ({ ...prev, supplierQty: e.target.value }))}
                            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
                              }`}
                            placeholder="Enter supplier quantity"
                          />
                        </div>
                        <div>
                          <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                            Brand
                          </label>
                          <input
                            type="text"
                            value={canvassingData.brand}
                            onChange={(e) => setCanvassingData(prev => ({ ...prev, brand: e.target.value }))}
                            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
                              }`}
                            placeholder="Enter brand name"
                          />
                        </div>
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <label className={`text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                              Origin
                            </label>
                            <label className={`inline-flex items-center ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                              <input
                                type="checkbox"
                                checked={canvassingData.isImported}
                                onChange={(e) => setCanvassingData(prev => ({ ...prev, isImported: e.target.checked }))}
                                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                              />
                              <span className="ml-2 text-sm">Is Imported</span>
                            </label>
                          </div>
                          <input
                            type="text"
                            value={canvassingData.origin}
                            onChange={(e) => setCanvassingData(prev => ({ ...prev, origin: e.target.value }))}
                            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
                              }`}
                            placeholder="Enter origin/country"
                          />
                        </div>
                       
                        {/* <div>
                          <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                            PO No.
                          </label>
                          <input
                            type="text"
                            value={canvassingData.poNumber}
                            onChange={(e) => setCanvassingData(prev => ({ ...prev, poNumber: e.target.value }))}
                            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
                              }`}
                            placeholder="Enter PO number"
                          />
                        </div>
                        <div>
                          <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                            Legend
                          </label>
                          <input
                            type="text"
                            value={canvassingData.legend}
                            onChange={(e) => setCanvassingData(prev => ({ ...prev, legend: e.target.value }))}
                            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
                              }`}
                            placeholder="Enter legend"
                          />
                        </div> */}
                      </div>
                      <h4 className={`text-md font-medium mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                        Item Pricing
                      </h4>

                      {/* Global Pricing Inputs */}
                      <div className={`mb-6 p-4 rounded-md ${darkMode ? 'bg-gray-700' : 'bg-blue-50'}`}>
                        <h5 className={`text-sm font-medium mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                          Apply Pricing to All Selected Items
                        </h5>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                              Offered Price <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={canvassingData.offeredPrice || ''}
                              onChange={(e) => {
                                const value = parseFloat(e.target.value) || 0;
                                setCanvassingData(prev => ({ ...prev, offeredPrice: value }));
                                // Apply to all selected items
                                setSelectedItems(prev => prev.map(item => ({
                                  ...item,
                                  offeredPrice: value
                                })));
                              }}
                              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
                                }`}
                              placeholder="0.00"
                              required
                            />
                          </div>
                          <div>
                            <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                              Bid Price <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={canvassingData.bidPrice || ''}
                              onChange={(e) => {
                                const value = parseFloat(e.target.value) || 0;
                                setCanvassingData(prev => ({ ...prev, bidPrice: value }));
                                // Apply to all selected items
                                setSelectedItems(prev => prev.map(item => ({
                                  ...item,
                                  bidPrice: value
                                })));
                              }}
                              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
                                }`}
                              placeholder="0.00"
                              required
                            />
                          </div>
                          <div>
                            <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                              Agreed Price <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={canvassingData.agreedPrice || ''}
                              onChange={(e) => {
                                const value = parseFloat(e.target.value) || 0;
                                setCanvassingData(prev => ({ ...prev, agreedPrice: value }));
                                // Apply to all selected items
                                setSelectedItems(prev => prev.map(item => ({
                                  ...item,
                                  finalPrice: value
                                })));
                              }}
                              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
                                }`}
                              placeholder="0.00"
                              required
                            />
                          </div>
                        </div>
                        <p className={`text-xs mt-4 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                          Changes here will apply to all selected items.
                        </p>
                      </div>

                      {/* Selected Items Summary */}
                      <div className="border rounded-md overflow-hidden">
                        <div className="max-h-96 overflow-y-auto">
                          <table className="min-w-full divide-y divide-gray-200">
                            <thead className={`${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                              <tr>
                                <th className={`px-4 py-3 text-left text-xs font-medium uppercase tracking-wider ${darkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                                  Item Ref No.
                                </th>
                                <th className={`px-4 py-3 text-left text-xs font-medium uppercase tracking-wider ${darkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                                  Item Details
                                </th>
                                <th className={`px-4 py-3 text-left text-xs font-medium uppercase tracking-wider ${darkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                                  Quantity
                                </th>
                              </tr>
                            </thead>
                            <tbody className={`${darkMode ? 'bg-gray-800 divide-gray-700' : 'bg-white divide-gray-200'}`}>
                              {selectedItems.map((item, index) => (
                                <tr key={item.uniqueId} className={`${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-50'}`}>
                                  <td className="px-4 py-3">
                                    <div className={`text-sm font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                                      {item.RID}
                                    </div>
                                  </td>
                                  <td className="px-4 py-3">
                                    <div>
                                      <div className={`text-sm font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                                        {item.ITEMDESC}
                                      </div>
                                      <div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                        {item.ITEMNMBR}
                                      </div>
                                    </div>
                                  </td>
                                  <td className="px-4 py-3">
                                    <span className={`text-sm ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                                      {item.QUANTITY} {item.UOFM}
                                    </span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Footer */}
            <div className={`px-6 py-4 border-t ${darkMode ? 'border-blue-700 bg-gradient-to-r from-blue-800 to-blue-900' : 'border-blue-200 bg-gradient-to-r from-blue-50 to-blue-100'}`}>
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center space-y-3 sm:space-y-0">
                <div className="text-sm text-gray-500 text-center sm:text-left">
                  {currentStep === 1 && selectedItems.length > 0 && (
                    <span>{selectedItems.length} item{selectedItems.length !== 1 ? 's' : ''} selected</span>
                  )}
                </div>
                <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3">
                  <button
                    type="button"
                    onClick={handleClose}
                    disabled={submitting}
                    className={`px-4 py-2 border rounded-md text-sm font-medium transition-colors duration-200 order-2 sm:order-1 ${darkMode
                      ? 'border-gray-600 text-gray-300 hover:bg-gray-700'
                      : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                      } disabled:opacity-50`}
                  >
                    Cancel
                  </button>

                  {currentStep === 1 && (
                    <button
                      type="button"
                      onClick={handleNextStep}
                      disabled={selectedItems.length === 0}
                      className="px-4 py-2 bg-blue-600 border border-transparent rounded-md text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 order-1 sm:order-2"
                    >
                      Next: Enter Details
                    </button>
                  )}

                  {currentStep === 2 && (
                    <>
                      <button
                        type="button"
                        onClick={handlePrevStep}
                        disabled={submitting}
                        className={`px-4 py-2 border rounded-md text-sm font-medium transition-colors duration-200 order-3 sm:order-2 ${darkMode
                          ? 'border-gray-600 text-gray-300 hover:bg-gray-700'
                          : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                          } disabled:opacity-50`}
                      >
                        Back
                      </button>
                      <button
                        type="submit"
                        disabled={submitting || !selectedSupplier.trim() || !selectedPaymentTerm.trim()}
                        className="px-4 py-2 bg-green-600 border border-transparent rounded-md text-sm font-medium text-white hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 order-1 sm:order-3"
                      >
                        {submitting ? 'Creating...' : 'Create Canvassing Request'}
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default CreateCanvassingModal;
