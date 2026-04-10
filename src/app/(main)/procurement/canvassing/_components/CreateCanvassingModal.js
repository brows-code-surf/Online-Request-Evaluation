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
import ConfirmModal from '@/app/(main)/_components/confirmModal';
import currencyData from '@/utils/currency.json';

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
  const [selectedCurrency, setSelectedCurrency] = useState('');
  const [currencySearch, setCurrencySearch] = useState('');
  const [showCurrencyDropdown, setShowCurrencyDropdown] = useState(false);
  const [showPurchaseTypeDropdown, setShowPurchaseTypeDropdown] = useState(false);
  const purchaseTypes = [
    { value: 'Local', label: 'Local' },
    { value: 'Foreign', label: 'Foreign' }
  ];
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
    agreedPrice: '',
    currency: '',
    purchaseType: ''
  });
  const [filterByAddressedTo, setFilterByAddressedTo] = useState(true);
  const [currentStep, setCurrentStep] = useState(1); // 1: Item Selection, 2: Header, 3: Supplier, 4: Pricing
  const [tableSearchTerm, setTableSearchTerm] = useState('');
  const [existingSuppliers, setExistingSuppliers] = useState(new Map()); // RID -> vendorId mapping
  const [showSaveConfirmModal, setShowSaveConfirmModal] = useState(false);
  const [showSaveAndPostConfirmModal, setShowSaveAndPostConfirmModal] = useState(false);

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

    if (!canvassingData.purchaseType) {
      toast.error('Purchase type is required');
      return;
    }

    setShowSaveConfirmModal(true);
  };

  const handleConfirmSave = async () => {
    setShowSaveConfirmModal(false);
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
        currency: canvassingData.currency,
        purchaseType: canvassingData.purchaseType || '',
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
        setSelectedCurrency('');
        setCanvassingData({
          referenceNum: '',
          remarks: '',
          supplierQty: '',
          brand: '',
          currency: '',
          purchaseType: '',
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

  const handleSaveAndPost = async () => {
    if (selectedItems.length === 0) {
      toast.error('Please select at least one item for canvassing');
      return;
    }

    if (!canvassingData.referenceNum.trim()) {
      toast.error('Reference number is required');
      return;
    }

    if (!selectedSupplier.trim() || !selectedPaymentTerm.trim()) {
      toast.error('Supplier and Payment Terms are required');
      return;
    }

    if (!canvassingData.purchaseType) {
      toast.error('Purchase type is required');
      return;
    }

    setShowSaveAndPostConfirmModal(true);
  };

  const handleConfirmSaveAndPost = async () => {
    setShowSaveAndPostConfirmModal(false);
    setSubmitting(true);
    try {
      // Prepare header data
      const headerData = {
        referenceNum: canvassingData.referenceNum,
        pqRemarks: canvassingData.remarks
      };

      // Prepare details data
      const detailsData = selectedItems.map(item => ({
        prCode: item.requestId,
        rid: item.RID,
        itemNumber: item.ITEMNMBR,
        itemDescription: item.ITEMDESC,
        unitOfMeasure: item.UOFM,
        quantity: item.QUANTITY,
        company: item.company || '',
        budgetCode: item.BUDGETCODE,
        remarks: '',
        vendorId: selectedVendorId,
        brand: canvassingData.brand || '',
        origin: canvassingData.origin || '',
        isImported: canvassingData.isImported ? 1 : 0,
        currency: canvassingData.currency,
        purchaseType: canvassingData.purchaseType || '',
        offeredPrice: item.offeredPrice || 0,
        bidPrice: item.bidPrice || 0,
        finalPrice: item.finalPrice || 0,
        paymentTerms: selectedPaymentTerm,
        supplierQty: parseInt(canvassingData.supplierQty) || 0,
        legend: canvassingData.legend || '',
        deliverySchedule: canvassingData.deliverySchedule || '',
        poNumber: canvassingData.poNumber || '',
        canvassedBy: user?.empName || '',
        isServed: 0 // Mark as served for post
      }));

      const result = await createCanvassingRequest(headerData, detailsData, user?.empName, selectedSupplier, true);

      if (result.success) {
        toast.success('Canvassing request saved and posted successfully!');
        onSuccess?.();

        // Reset form
        setCurrentStep(1);
        setSelectedItems([]);
        setSelectedSupplier('');
        setSelectedVendorId('');
        setSelectedPaymentTerm('');
        setSelectedCurrency('');
        setCanvassingData({
          referenceNum: '',
          remarks: '',
          supplierQty: '',
          brand: '',
          currency: '',
          purchaseType: '',
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
        toast.error(result.message || 'Failed to save and post canvassing request');
      }
    } catch (error) {
      console.error('Error saving and posting canvassing request:', error);
      toast.error('Failed to save and post canvassing request');
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
      setSelectedCurrency('');
      setCurrencySearch('');
      setShowCurrencyDropdown(false);
      setShowPurchaseTypeDropdown(false);
      setTableSearchTerm('');
      setShowSaveConfirmModal(false);
      setShowSaveAndPostConfirmModal(false);
      setCanvassingData({
        referenceNum: '',
        remarks: '',
        supplierQty: '',
        brand: '',
        currency: '',
        purchaseType: '',
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
    <div className="fixed inset-0 z-50 overflow-hidden">
      <div className="flex items-start justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity" aria-hidden="true">
          <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm" onClick={handleClose}></div>
        </div>

        <div className={`inline-block align-bottom rounded-2xl text-left shadow-2xl transform transition-all sm:my-8 sm:align-middle sm:max-w-6xl w-full mx-4 sm:mx-auto h-[95vh] max-h-[95vh] relative z-10 flex flex-col overflow-hidden ${darkMode ? 'bg-gray-800' : 'bg-white'}`} onClick={(e) => e.stopPropagation()}>
          <form onSubmit={handleSubmit} className="flex flex-col h-full">
            {/* Header */}
            <div className={`px-2 sm:px-4 py-2 sm:py-3 border-b flex-shrink-0 ${darkMode ? 'border-blue-700/50 bg-gradient-to-r from-blue-900 via-blue-800 to-blue-900' : 'border-blue-200/50 bg-gradient-to-r from-blue-600 via-blue-500 to-blue-600'}`}>
              <div className="flex items-center justify-between gap-2">
                <h3 className={`text-sm sm:text-base font-semibold truncate ${darkMode ? 'text-white' : 'text-white'}`}>
                  Canvass of Quotation Entry
                </h3>
                <div className="flex items-center gap-2 shrink-0">
                  {canvassingData.referenceNum && (
                    <span className={`px-1.5 sm:px-3 py-0.5 sm:py-1 text-xs sm:text-lg font-bold bg-white/10 backdrop-blur-sm rounded-lg ${darkMode ? 'text-blue-300' : 'text-white'}`}>
                      {canvassingData.referenceNum}
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={handleClose}
                    disabled={submitting}
                    className={`rounded-lg sm:rounded-xl p-1.5 sm:p-2 transition-all duration-200 ${darkMode ? 'text-gray-400 hover:text-white hover:bg-white/10' : 'text-white/80 hover:text-white hover:bg-white/20'} disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>

            {/* Step Indicator */}
            <div className={`px-3 sm:px-4 py-3 border-b flex-shrink-0 ${darkMode ? 'bg-gray-800/50 border-gray-700/50' : 'bg-gray-50/50 border-gray-200/50'}`}>
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center space-x-2 sm:space-x-3 mx-auto">
                  <div className={`flex items-center gap-2 sm:gap-3 ${currentStep >= 1 ? 'text-blue-600' : 'text-gray-400'}`}>
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold transition-all duration-300 ${currentStep >= 1 ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30' : 'bg-gray-200 text-gray-500'}`}>
                      {currentStep > 1 ? (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      ) : '1'}
                    </div>
                    <span className={`text-xs font-medium ${currentStep >= 1 ? '' : 'text-gray-500'}`}>Select Items</span>
                  </div>
                  <div className={`w-12 sm:w-16 h-0.5 rounded-full transition-colors duration-300 ${currentStep >= 2 ? 'bg-blue-600' : 'bg-gray-200'}`}></div>
                  <div className={`flex items-center gap-2 sm:gap-3 ${currentStep >= 2 ? 'text-blue-600' : 'text-gray-400'}`}>
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold transition-all duration-300 ${currentStep >= 2 ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30' : 'bg-gray-200 text-gray-500'}`}>
                      {currentStep > 2 ? (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      ) : '2'}
                    </div>
                    <span className={`text-xs font-medium ${currentStep >= 2 ? '' : 'text-gray-500'}`}>Canvassing Details</span>
                  </div>
                </div>

                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium ${darkMode ? 'bg-gray-700/50 text-gray-400' : 'bg-gray-100 text-gray-600'}`}>
                  <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
                  Step {currentStep} of 2
                </div>
              </div>
              {/* Progress Bar */}
              <div className={`h-1 rounded-full overflow-hidden ${darkMode ? 'bg-gray-700' : 'bg-gray-200'}`}>
                <div
                  className="h-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all duration-500 ease-out rounded-full"
                  style={{ width: currentStep === 1 ? '50%' : '100%' }}
                ></div>
              </div>
            </div>

            {/* Scrollable Content */}
            <div className="px-4 py-1 overflow-hidden flex-1 flex flex-col">
              {currentStep === 1 && (
                <>
                  <div className="flex items-center gap-2 py-4">
                    <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                      <svg className="w-4 h-4 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                    </div>
                    <div>
                      <h4 className={`text-sm font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                        Select 1 or multiple item rows having same description
                      </h4>
                    </div>
                  </div>

                  {/* Items Selection */}
                  <div className={`rounded-xl p-3 ${darkMode ? 'bg-gray-700/30 border border-gray-700/50' : 'bg-gray-50 border border-gray-200'}`}>
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                      <div className="flex flex-wrap items-center gap-4">
                        <label className={`flex items-center gap-2.5 cursor-pointer group`}>
                          <div className="relative">
                            <input
                              type="checkbox"
                              id="filterAddressedTo"
                              checked={filterByAddressedTo}
                              onChange={(e) => setFilterByAddressedTo(e.target.checked)}
                              className="sr-only peer"
                            />
                            <div className={`w-4 h-4 rounded-md border-2 transition-all duration-200 peer-checked:bg-blue-600 peer-checked:border-blue-600 ${darkMode ? 'border-gray-600' : 'border-gray-300'} ${filterByAddressedTo ? 'bg-blue-50 dark:bg-blue-900/30' : ''}`}></div>
                            <svg
                              className="absolute inset-0 m-auto w-3 h-3 text-white opacity-0 peer-checked:opacity-100 transition-opacity duration-200 pointer-events-none"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                          </div>
                          <span className={`text-xs font-medium ${darkMode ? 'text-gray-300 group-hover:text-white' : 'text-gray-700 group-hover:text-gray-900'} transition-colors`}>
                            My Items Only
                          </span>
                        </label>
                        <label className={`flex items-center gap-2.5 cursor-pointer group ${selectedItems.length === 0 ? 'opacity-50' : ''}`}>
                          <div className="relative">
                            <input
                              type="checkbox"
                              id="selectAll"
                              checked={selectedItems.length === filteredAvailableItems.length && filteredAvailableItems.length > 0}
                              onChange={(e) => handleSelectAll(e.target.checked)}
                              disabled={selectedItems.length === 0}
                              className="sr-only peer"
                            />
                            <div className={`w-4 h-4 rounded-md border-2 transition-all duration-200 peer-checked:bg-blue-600 peer-checked:border-blue-600 ${darkMode ? 'border-gray-600 peer-checked:bg-blue-600' : 'border-gray-300 peer-checked:bg-blue-600'} ${selectedItems.length === filteredAvailableItems.length && filteredAvailableItems.length > 0 ? 'bg-blue-50 dark:bg-blue-900/30' : ''}`}></div>
                            <svg className={`absolute top-0.5 left-0.5 w-3 h-3 text-white opacity-0 peer-checked:opacity-100 transition-opacity duration-200 pointer-events-none`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                          </div>
                          <span className={`text-xs font-medium ${darkMode ? 'text-gray-300 group-hover:text-white' : 'text-gray-700 group-hover:text-gray-900'} transition-colors`}>
                            Select All ({filteredAvailableItems.length} items)
                          </span>
                        </label>
                      </div>
                      {selectedItems.length > 0 && (
                        <div className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px] font-medium ${darkMode ? 'bg-blue-900/50 text-blue-300' : 'bg-blue-100 text-blue-700'}`}>
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          {selectedItems.length} selected
                        </div>
                      )}
                    </div>

                    {/* Search Input */}
                    <div className={`mb-4 ${darkMode ? 'bg-gray-700/30 border border-gray-700/50' : 'bg-gray-50 border border-gray-200'} rounded-lg`}>
                      <div className="relative group">
                        <input
                          type="text"
                          placeholder="Search by reference no., requester, item, company, addressed to..."
                          value={tableSearchTerm}
                          onChange={(e) => setTableSearchTerm(e.target.value)}
                          className={`w-full px-3 py-1.5 pl-10 rounded-lg border-2 transition-all duration-200 focus:outline-none focus:ring-0 ${darkMode
                            ? 'bg-gray-700/50 border-gray-600 text-white placeholder-gray-400 focus:border-blue-500 focus:bg-gray-700'
                            : 'bg-white border-gray-200 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:shadow-sm'
                            }`}
                        />
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <svg className={`w-4 h-4 ${darkMode ? 'text-gray-500' : 'text-gray-400'} group-hover:text-blue-500 transition-colors`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                          </svg>
                        </div>
                        {tableSearchTerm && (
                          <button
                            type="button"
                            onClick={() => setTableSearchTerm('')}
                            className={`absolute inset-y-0 right-0 pr-4 flex items-center ${darkMode ? 'text-gray-400 hover:text-white' : 'text-gray-400 hover:text-gray-600'}`}
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        )}
                      </div>
                    </div>

                    {loading ? (
                      <div className="border-1 border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden flex-1">
                        <div className="h-full overflow-y-auto">
                          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                            <thead className={`${darkMode ? 'bg-gray-700/50' : 'bg-gray-100'}`}>
                              <tr>
                                <th className={`px-4 py-4 text-left text-xs font-semibold uppercase tracking-wider ${darkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                                  Select
                                </th>
                                <th className={`px-4 py-4 text-left text-xs font-semibold uppercase tracking-wider ${darkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                                  Item Ref No.
                                </th>
                                <th className={`px-4 py-4 text-left text-xs font-semibold uppercase tracking-wider ${darkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                                  Date Approved
                                </th>
                                <th className={`px-4 py-4 text-left text-xs font-semibold uppercase tracking-wider ${darkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                                  Requester
                                </th>
                                <th className={`px-4 py-4 text-left text-xs font-semibold uppercase tracking-wider ${darkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                                  Item Details
                                </th>
                                <th className={`px-4 py-4 text-left text-xs font-semibold uppercase tracking-wider ${darkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                                  Company
                                </th>
                                <th className={`px-4 py-4 text-left text-xs font-semibold uppercase tracking-wider ${darkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                                  Addressed To
                                </th>
                                <th className={`px-4 py-4 text-left text-xs font-semibold uppercase tracking-wider ${darkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                                  Quantity
                                </th>
                              </tr>
                            </thead>
                            <tbody className={`${darkMode ? 'bg-gray-800/50 divide-gray-700' : 'bg-white divide-gray-100'}`}>
                              {Array(6).fill().map((_, index) => (
                                <tr key={index} className={`${darkMode ? 'hover:bg-gray-700/30' : 'hover:bg-gray-50'}`}>
                                  <td className="px-4 py-4">
                                    <SkeletonLoader height="h-5" width="w-5" />
                                  </td>
                                  <td className="px-4 py-4">
                                    <SkeletonLoader height="h-4" width="w-16" />
                                  </td>
                                  <td className="px-4 py-4">
                                    <div className="space-y-2">
                                      <SkeletonLoader height="h-4" width="w-28" />
                                      <SkeletonLoader height="h-3" width="w-20" />
                                    </div>
                                  </td>
                                  <td className="px-4 py-4">
                                    <div className="space-y-2">
                                      <SkeletonLoader height="h-4" width="w-28" />
                                      <SkeletonLoader height="h-3" width="w-20" />
                                    </div>
                                  </td>
                                  <td className="px-4 py-4">
                                    <div className="space-y-2">
                                      <SkeletonLoader height="h-4" width="w-24" />
                                      <SkeletonLoader height="h-3" width="w-16" />
                                    </div>
                                  </td>
                                  <td className="px-4 py-4">
                                    <div className="space-y-2">
                                      <SkeletonLoader height="h-4" width="w-24" />
                                      <SkeletonLoader height="h-3" width="w-16" />
                                    </div>
                                  </td>
                                  <td className="px-4 py-4">
                                    <div className="space-y-2">
                                      <SkeletonLoader height="h-4" width="w-24" />
                                      <SkeletonLoader height="h-3" width="w-16" />
                                    </div>
                                  </td>
                                  <td className="px-4 py-4">
                                    <SkeletonLoader height="h-4" width="w-20" />
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    ) : availableItems.length === 0 ? (
                      <div className={`text-center py-10 rounded-xl ${darkMode ? 'bg-gray-700/20 border border-gray-700/50' : 'bg-gray-50 border-1 border-gray-200'}`}>
                        <div className="w-14 h-14 mx-auto mb-3 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                          <svg className="w-7 h-7 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2M4 13h2m8-5v2m0 0v2m0-2h2m-2 0h-2" />
                          </svg>
                        </div>
                        <p className={`text-lg font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                          No items available for canvassing
                        </p>
                        <p className={`text-sm ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                          Try adjusting your filters or check back later
                        </p>
                      </div>
                    ) : (
                      <div className="border-1 border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden flex-1">
                        {/* Card Layout for Mobile/Small Screens */}
                        <div className="lg:hidden max-h-[400px] overflow-y-auto p-3 space-y-3">
                          {filteredAvailableItems.map((item) => {
                            const isSelected = selectedItems.some(selected => selected.uniqueId === item.uniqueId);
                            return (
                              <div
                                key={item.uniqueId}
                                className={`rounded-lg p-3 cursor-pointer transition-all duration-200 border-2 ${isSelected
                                  ? (darkMode ? 'bg-blue-900/30 border-blue-500' : 'bg-blue-50 border-blue-500')
                                  : (darkMode ? 'bg-gray-800/50 border-gray-700 hover:border-gray-600' : 'bg-white border-gray-200 hover:border-gray-300')
                                  }`}
                                onClick={() => handleItemSelect(item, !isSelected)}
                              >
                                <div className="flex items-start justify-between gap-3 mb-3">
                                  <div className="flex items-center gap-2">
                                    <div className="relative">
                                      <input
                                        type="checkbox"
                                        checked={isSelected}
                                        onChange={(e) => handleItemSelect(item, e.target.checked)}
                                        className="sr-only peer"
                                      />
                                      <div className={`w-5 h-5 rounded-md border-2 transition-all duration-200 peer-checked:bg-blue-600 peer-checked:border-blue-600 pointer-events-none ${darkMode ? 'border-gray-600' : 'border-gray-300'} ${isSelected ? 'bg-blue-50 dark:bg-blue-900/30' : ''}`}></div>
                                      <svg className={`absolute top-0.5 left-0.5 w-4 h-4 text-white opacity-0 peer-checked:opacity-100 transition-opacity duration-200 pointer-events-none`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                      </svg>
                                    </div>
                                    <div>
                                      <div className={`text-xs font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                                        {item.RID}
                                      </div>
                                      <div className={`text-[10px] ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                                        {item.dateApproved ? new Date(item.dateApproved).toISOString().split('T')[0] : 'N/A'}
                                      </div>
                                    </div>
                                  </div>
                                  <span className={`inline-flex items-center px-2 py-0.5 rounded-lg text-xs font-medium ${darkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-700'}`}>
                                    {item.QUANTITY} <span className="ml-1 text-gray-400">{item.UOFM}</span>
                                  </span>
                                </div>

                                <div className="space-y-2">
                                  <div>
                                    <div className={`text-xs font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                                      {item.ITEMDESC}
                                    </div>
                                    <div className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                                      {item.ITEMNMBR}
                                    </div>
                                  </div>

                                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                                    <div>
                                      <div className={`text-[10px] uppercase tracking-wider ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>Requester</div>
                                      <div className={`text-xs ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                        {item.requester}
                                      </div>
                                    </div>
                                    <div>
                                      <div className={`text-[10px] uppercase tracking-wider ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>Addressed To</div>
                                      <div className={`text-xs truncate ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                        {item.addressedTo}
                                      </div>
                                    </div>
                                    <div className="col-span-2">
                                      <div className={`text-[10px] uppercase tracking-wider ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>Company</div>
                                      <div className={`text-xs ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                        {item.company || 'N/A'}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        {/* Table Layout for Large Screens */}
                        <div className="hidden lg:block flex-1 overflow-y-auto overflow-x-auto">
                          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                            <thead className={`${darkMode ? 'bg-gray-700/50' : 'bg-gray-100'}`}>
                              <tr>
                                <th className={`px-2 py-3 text-left text-[10px] font-semibold uppercase tracking-wider ${darkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                                  Select
                                </th>
                                <th className={`px-2 sm:px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider ${darkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                                  Item Ref No.
                                </th>
                                <th className={`px-2 sm:px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider ${darkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                                  Date Approved
                                </th>
                                <th className={`px-2 sm:px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider ${darkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                                  Requester
                                </th>
                                <th className={`px-2 sm:px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider ${darkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                                  Item Details
                                </th>
                                <th className={`hidden lg:table-cell px-2 sm:px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider ${darkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                                  Company
                                </th>
                                <th className={`hidden md:table-cell px-2 sm:px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider ${darkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                                  Addressed To
                                </th>
                                <th className={`px-2 sm:px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider ${darkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                                  Quantity
                                </th>
                              </tr>
                            </thead>
                            <tbody className={`${darkMode ? 'bg-gray-800/50 divide-gray-700' : 'bg-white divide-gray-100'}`}>
                              {filteredAvailableItems.map((item, index) => {
                                const isSelected = selectedItems.some(selected => selected.uniqueId === item.uniqueId);
                                return (
                                  <tr
                                    key={item.uniqueId}
                                    className={`cursor-pointer transition-all duration-200 ${isSelected
                                      ? (darkMode ? 'bg-blue-900/30 border-l-4 border-l-blue-500' : 'bg-blue-50 border-l-4 border-l-blue-500')
                                      : (darkMode ? 'hover:bg-gray-700/50' : 'hover:bg-gray-50')
                                      }`}
                                    onClick={() => handleItemSelect(item, !isSelected)}
                                  >
                                    <td className="px-2 sm:px-4 py-2">
                                      <div className="relative">
                                        <input
                                          type="checkbox"
                                          checked={isSelected}
                                          onChange={(e) => handleItemSelect(item, e.target.checked)}
                                          className="sr-only peer"
                                        />
                                        <div className={`w-4 h-4 rounded-md border-2 transition-all duration-200 peer-checked:bg-blue-600 peer-checked:border-blue-600 pointer-events-none ${darkMode ? 'border-gray-600' : 'border-gray-300'} ${isSelected ? 'bg-blue-50 dark:bg-blue-900/30' : ''}`}></div>
                                        <svg className={`absolute top-0.5 left-0.5 w-3 h-3 text-white opacity-0 peer-checked:opacity-100 transition-opacity duration-200 pointer-events-none`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                        </svg>
                                      </div>
                                    </td>
                                    <td className="px-2 sm:px-4 py-2">
                                      <div className={`text-[10px] sm:text-xs font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                                        {item.RID}
                                      </div>
                                    </td>
                                    <td className="px-2 sm:px-4 py-3.5">
                                      <div className={`text-xs sm:text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                        {item.dateApproved ? new Date(item.dateApproved).toISOString().split('T')[0] : 'N/A'}
                                      </div>
                                    </td>
                                    <td className="px-2 sm:px-4 py-3.5">
                                      <div className={`text-xs sm:text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                        {item.requester}
                                      </div>
                                    </td>
                                    <td className="px-2 sm:px-4 py-2">
                                      <div>
                                        <div className={`text-[10px] sm:text-xs font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                                          {item.ITEMDESC}
                                        </div>
                                        <div className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                                          {item.ITEMNMBR}
                                        </div>
                                      </div>
                                    </td>
                                    <td className={`hidden lg:table-cell px-2 sm:px-4 py-2`}>
                                      <div className={`text-[10px] sm:text-xs ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                        {item.company || 'N/A'}
                                      </div>
                                    </td>
                                    <td className={`hidden md:table-cell px-2 sm:px-4 py-2`}>
                                      <div className={`text-[10px] sm:text-xs ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                        {item.addressedTo}
                                      </div>
                                    </td>
                                    <td className="px-2 sm:px-4 py-2">
                                      <span className={`inline-flex items-center px-2 py-0.5 rounded-lg text-[10px] sm:text-xs font-medium ${darkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-700'}`}>
                                        {item.QUANTITY} <span className="ml-1 text-gray-400">{item.UOFM}</span>
                                      </span>
                                    </td>
                                  </tr>
                                )
                              })}
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
                    <div className="flex items-center gap-2 py-4">
                      <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                        <svg className="w-4 h-4 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                        </svg>
                      </div>
                      <div>
                        <h4 className={`text-sm font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                          Step 2: Enter Canvassing Details for Selected Row(s)
                        </h4>
                      </div>
                    </div>

                    {/* Supplier Information */}
                    <div className="mb-4">
                      <h4 className={`text-sm font-medium mb-3 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
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
                            Supplier ID
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
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                      <div className="relative w-full">
                        <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                          Purchase Type <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                          <input
                            type="text"
                            value={purchaseTypes.find(p => p.value === canvassingData.purchaseType)?.label || ''}
                            onChange={(e) => {
                              const found = purchaseTypes.find(p => p.label.toLowerCase().includes(e.target.value.toLowerCase()));
                              setCanvassingData(prev => ({ ...prev, purchaseType: found ? found.value : '' }));
                            }}
                            onFocus={() => setShowPurchaseTypeDropdown(true)}
                            onBlur={() => setTimeout(() => setShowPurchaseTypeDropdown(false), 200)}
                            className={`w-full px-3 py-2 pr-8 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
                              }`}
                            placeholder="Select purchase type"
                            required
                          />
                          <button
                            type="button"
                            onClick={() => setShowPurchaseTypeDropdown(!showPurchaseTypeDropdown)}
                            className={`absolute right-2 top-2 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </button>
                        </div>
                        {showPurchaseTypeDropdown && (
                          <div className={`absolute z-50 w-full mt-1 border rounded-md shadow-lg max-h-40 overflow-y-auto ${darkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'}`}>
                            {purchaseTypes.map((type) => (
                              <div
                                key={type.value}
                                onClick={() => {
                                  setCanvassingData(prev => ({ ...prev, purchaseType: type.value }));
                                  // Auto-select PHP for Local, remove PHP for Import
                                  if (type.value === 'Local') {
                                    setSelectedCurrency('Philippine Peso (₱)');
                                    setCanvassingData(prev => ({ ...prev, currency: 'PHP' }));
                                    setCurrencySearch('');
                                  } else if (type.value === 'Foreign') {
                                    // For Import, remove PHP from selection if selected
                                    if (selectedCurrency.includes('PHP') || canvassingData.currency === 'PHP') {
                                      setSelectedCurrency('');
                                      setCanvassingData(prev => ({ ...prev, currency: '' }));
                                      setCurrencySearch('');
                                    }
                                  }
                                  setShowPurchaseTypeDropdown(false);
                                }}
                                className={`px-3 py-2 cursor-pointer ${darkMode ? 'text-white hover:bg-gray-600' : 'text-gray-900 hover:bg-gray-100'}`}
                              >
                                {type.label}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="relative w-full">
                        <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                          Currency <span className="text-red-500">*</span>
                        </label>
                        <div className="relative w-full">
                          <input
                            type="text"
                            value={selectedCurrency}
                            onChange={(e) => {
                              // Only allow changes if not Local purchase type
                              if (canvassingData.purchaseType !== 'Local') {
                                setSelectedCurrency(e.target.value);
                                setCurrencySearch(e.target.value);
                              }
                            }}
                            onFocus={() => canvassingData.purchaseType !== 'Local' && setShowCurrencyDropdown(true)}
                            onBlur={() => setTimeout(() => setShowCurrencyDropdown(false), 200)}
                            readOnly={canvassingData.purchaseType === 'Local'}
                            className={`w-full px-3 py-2 pr-8 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'} ${canvassingData.purchaseType === 'Local' ? 'cursor-not-allowed opacity-75' : ''}`}
                            placeholder={canvassingData.purchaseType === 'Local' ? 'PHP (Fixed for Local)' : 'Select currency'}
                            required
                          />
                          {canvassingData.purchaseType !== 'Local' && (
                            <button
                              type="button"
                              onClick={() => setShowCurrencyDropdown(!showCurrencyDropdown)}
                              className={`absolute right-2 top-1/2 -translate-y-1/2 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                              </svg>
                            </button>
                          )}
                          {canvassingData.purchaseType === 'Local' && (
                            <div className={`absolute right-2 top-1/2 -translate-y-1/2 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                              </svg>
                            </div>
                          )}
                        </div>
                        {showCurrencyDropdown && canvassingData.purchaseType !== 'Local' && (
                          <div className={`absolute z-50 left-0 right-0 mt-1 border rounded-md shadow-lg max-h-48 sm:max-h-60 overflow-y-auto ${darkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'
                            }`}>
                            {Object.entries(currencyData)
                              .filter(([code, currency]) => {
                                // Filter by search term
                                const matchesSearch = currency.name.toLowerCase().includes(currencySearch.toLowerCase()) ||
                                  code.toLowerCase().includes(currencySearch.toLowerCase());
                                // Exclude PHP when purchase type is Import (value '2')
                                const isPHP = code === 'PHP';
                                const isImport = canvassingData.purchaseType === 'Foreign';
                                return matchesSearch && !(isPHP && isImport);
                              })
                              .map(([code, currency]) => (
                                <div
                                  key={code}
                                  onClick={() => {
                                    setSelectedCurrency(`${currency.name} (${currency.symbol_native})`);
                                    setCanvassingData(prev => ({ ...prev, currency: code }));
                                    setCurrencySearch('');
                                    setShowCurrencyDropdown(false);
                                  }}
                                  className={`px-3 py-2 cursor-pointer text-xs sm:text-sm truncate ${darkMode ? 'text-white hover:bg-gray-600' : 'text-gray-900 hover:bg-gray-100'}`}
                                  title={`${currency.name} (${currency.symbol_native})`}
                                >
                                  <div className="flex justify-between items-center">
                                    <span className="truncate">{currency.name}</span>
                                    <span className={`text-xs ml-2 shrink-0 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{currency.symbol_native}</span>
                                  </div>
                                </div>
                              ))}
                            {Object.entries(currencyData).filter(([code, currency]) => {
                              const matchesSearch = currency.name.toLowerCase().includes(currencySearch.toLowerCase()) ||
                                code.toLowerCase().includes(currencySearch.toLowerCase());
                              const isPHP = code === 'PHP';
                              const isImport = canvassingData.purchaseType === 'Foreign';
                              return matchesSearch && !(isPHP && isImport);
                            }).length === 0 && currencySearch && (
                                <div className={`px-3 py-2 text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                  No currencies found
                                </div>
                              )}
                          </div>
                        )}
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <label className={`text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                            Origin
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

                    </div>
                    <div className="mb-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        {/* <div>
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
                        </div> */}
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
                      </div>

                      {/* Global Pricing Inputs */}
                      <div className={`mb-6 p-4 rounded-md ${darkMode ? 'bg-gray-700' : 'bg-blue-50'}`}>
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
                                  Date Approved
                                </th>
                                <th className={`px-4 py-3 text-left text-xs font-medium uppercase tracking-wider ${darkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                                  Requester
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
                                    <div className={`text-sm font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                                      {item.dateApproved ? new Date(item.dateApproved).toISOString().split('T')[0] : 'N/A'}
                                    </div>
                                  </td>
                                  <td className="px-4 py-3">
                                    <div className={`text-sm font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                                      {item.requester}
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
            <div className={`px-6 py-4 border-t flex-shrink-0 ${darkMode ? 'border-blue-700 bg-gradient-to-r from-blue-800 to-blue-900' : 'border-blue-200 bg-gradient-to-r from-blue-50 to-blue-100'}`}>
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
                        className={`px-4 py-2 border rounded-md text-sm font-medium transition-colors duration-200 order-3 sm:order-1 ${darkMode
                          ? 'border-gray-600 text-gray-300 hover:bg-gray-700'
                          : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                          } disabled:opacity-50`}
                      >
                        Back
                      </button>
                      <button
                        type="submit"
                        disabled={submitting || !selectedSupplier.trim() || !selectedPaymentTerm.trim() || !canvassingData.purchaseType}
                        className="px-4 py-2 bg-green-600 border border-transparent rounded-md text-sm font-medium text-white hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 order-1 sm:order-2"
                      >
                        {submitting ? 'Saving...' : 'Save Canvass of Quotation'}
                      </button>
                      <button
                        type="button"
                        onClick={handleSaveAndPost}
                        disabled={submitting || !selectedSupplier.trim() || !selectedPaymentTerm.trim() || !canvassingData.purchaseType}
                        className="px-4 py-2 bg-blue-600 border border-transparent rounded-md text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 order-2 sm:order-3"
                      >
                        {submitting ? 'Saving...' : 'Save & Post Canvass of Quotation'}
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </form>
        </div>
      </div>

      {/* Save Confirmation Modal */}
      <ConfirmModal
        isOpen={showSaveConfirmModal}
        title="Save Canvassing Request"
        message="Are you sure you want to save this canvassing request?"
        confirmButtonText="Save"
        confirmButtonColor="green"
        onConfirm={handleConfirmSave}
        onCancel={() => setShowSaveConfirmModal(false)}
        isLoading={submitting}
      />

      {/* Save & Post Confirmation Modal */}
      <ConfirmModal
        isOpen={showSaveAndPostConfirmModal}
        title="Save & Post Canvassing Request"
        message="Are you sure you want to save and post this canvassing request? This will mark it as processed."
        confirmButtonText="Save & Post"
        confirmButtonColor="blue"
        onConfirm={handleConfirmSaveAndPost}
        onCancel={() => setShowSaveAndPostConfirmModal(false)}
        isLoading={submitting}
      />
    </div>
  );
}

export default CreateCanvassingModal;
