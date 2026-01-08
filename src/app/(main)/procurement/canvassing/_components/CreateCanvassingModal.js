'use client';

import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import {
  getPurchaseRequestDetailsForCanvassing,
  createCanvassingRequest,
  getAllSuppliers,
  getAllPaymentTerms
} from '../_actions';

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
    itemRemarks: ''
  });
  const [filterByAddressedTo, setFilterByAddressedTo] = useState(true);

  // Load suppliers, payment terms, and available purchase request items that are FOR CANVASSING
  useEffect(() => {
    if (isOpen) {
      loadSuppliers();
      loadPaymentTerms();
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
      setSelectedItems(availableItems.map(item => ({
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
      // Get company from the selected items (all should have the same company)
      const companies = [...new Set(selectedItems.map(item => item.company))];
      if (companies.length !== 1) {
        toast.error('All selected items must be from the same company');
        setSubmitting(false);
        return;
      }

      // Prepare header data
      const headerData = {
        company: companies[0],
        referenceNum: canvassingData.referenceNum,
        pqRemarks: canvassingData.remarks
      };

      // Prepare details data from selected items
      const detailsData = selectedItems.map(item => ({
        prCode: item.requestId,
        itemNumber: item.ITEMNMBR,
        itemDescription: item.ITEMDESC,
        unitOfMeasure: item.UOFM,
        quantity: item.QUANTITY,
        budgetCode: item.BUDGETCODE,
        remarks: item.REMARKS || '',
        vendorId: '',
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
          legend: ''
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
      setSelectedItems([]);
      setSelectedSupplier('');
      setSelectedVendorId('');
      setSupplierSearch('');
      setShowSupplierDropdown(false);
      setSelectedPaymentTerm('');
      setPaymentTermSearch('');
      setShowPaymentTermDropdown(false);
      setCanvassingData({
        referenceNum: '',
        remarks: '',
        supplierQty: '',
        brand: '',
        origin: '',
        isImported: false,
        deliverySchedule: '',
        poNumber: '',
        itemRemarks: ''
      });
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity" aria-hidden="true">
          <div className="absolute inset-0 bg-gray-500 opacity-75" onClick={handleClose}></div>
        </div>

        <div className={`inline-block align-bottom rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-7xl sm:w-full relative z-10 ${darkMode ? 'bg-gray-800' : 'bg-white'}`} onClick={(e) => e.stopPropagation()}>
          <form onSubmit={handleSubmit}>
            {/* Header */}
            <div className={`px-6 py-4 border-b ${darkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-gray-50'}`}>
              <div className="flex items-center justify-between">
                <h3 className={`text-lg font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  Create Canvassing Request
                </h3>
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

            {/* Content */}
            <div className="px-6 py-4 max-h-[80rem] overflow-y-auto">
              {/* Canvassing Request Header */}
              <div className="mb-6">
                <h4 className={`text-md font-medium mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  Canvassing Request Header
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      Reference Number *
                    </label>
                    <input
                      type="text"
                      value={canvassingData.referenceNum}
                      onChange={(e) => setCanvassingData(prev => ({ ...prev, referenceNum: e.target.value }))}
                      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
                        }`}
                      placeholder="Enter reference number"
                      required
                    />
                  </div>
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      Remarks
                    </label>
                    <input
                      type="text"
                      value={canvassingData.remarks}
                      onChange={(e) => setCanvassingData(prev => ({ ...prev, remarks: e.target.value }))}
                      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
                        }`}
                      placeholder="Optional remarks"
                    />
                  </div>
                </div>
              </div>

              {/* Supplier Information */}
              <div className="mb-6">
                <h4 className={`text-md font-medium mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  Canvassing Request Details
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="relative">
                    <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      Supplier
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
                          .map((supplier) => (
                            <div
                              key={supplier.id}
                              onClick={() => {
                                setSelectedSupplier(supplier.vendorName);
                                setSelectedVendorId(supplier.vendorId);
                                // Pre-select payment terms from supplier's default
                                if (supplier.paymentTerms) {
                                  setSelectedPaymentTerm(supplier.paymentTerms);
                                }
                                setSupplierSearch('');
                                setShowSupplierDropdown(false);
                              }}
                              className={`px-3 py-2 cursor-pointer ${darkMode
                                  ? 'text-white hover:bg-gray-600'
                                  : 'text-gray-900 hover:bg-gray-100'
                                }`}
                            >
                              <div className="flex justify-between items-center">
                                <span>{supplier.vendorName}</span>
                              </div>
                            </div>
                          ))}
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
                      Payment Terms
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

                {/* Additional Supplier Details */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
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

                </div>

                {/* Additional Fields Row */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
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
                  {/* <div>
                    <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      Item Remarks
                    </label>
                    <input
                      type="text"
                      value={canvassingData.itemRemarks}
                      onChange={(e) => setCanvassingData(prev => ({ ...prev, itemRemarks: e.target.value }))}
                      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
                      }`}
                      placeholder="Enter item remarks"
                    />
                  </div> */}
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
                  </div>
                </div>
              </div>

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
                        checked={selectedItems.length === availableItems.length && availableItems.length > 0}
                        onChange={(e) => handleSelectAll(e.target.checked)}
                        className="rounded"
                      />
                      <label htmlFor="selectAll" className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                        Select All ({availableItems.length} items)
                      </label>
                    </div>
                  </div>
                </div>

                {loading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
                    <p className={`mt-2 text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      Loading available items...
                    </p>
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
                    <div className="max-h-96 overflow-y-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className={`${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                          <tr>
                            <th className={`px-4 py-3 text-left text-xs font-medium uppercase tracking-wider ${darkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                              Select
                            </th>
                            <th className={`px-4 py-3 text-left text-xs font-medium uppercase tracking-wider ${darkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                              Reference No.
                            </th>
                            <th className={`px-4 py-3 text-left text-xs font-medium uppercase tracking-wider ${darkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                              Item Ref No.
                            </th>
                            <th className={`px-4 py-3 text-left text-xs font-medium uppercase tracking-wider ${darkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                              Item Details
                            </th>
                            <th className={`px-4 py-3 text-left text-xs font-medium uppercase tracking-wider ${darkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                              Request Info
                            </th>
                            <th className={`px-4 py-3 text-left text-xs font-medium uppercase tracking-wider ${darkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                              Quantity
                            </th>
                          </tr>
                        </thead>
                        <tbody className={`${darkMode ? 'bg-gray-800 divide-gray-700' : 'bg-white divide-gray-200'}`}>
                          {availableItems.map((item, index) => (
                            <tr key={item.uniqueId} className={`${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-50'}`}>
                              <td className="px-4 py-3">
                                <input
                                  type="checkbox"
                                  checked={selectedItems.some(selected => selected.uniqueId === item.uniqueId)}
                                  onChange={(e) => handleItemSelect(item, e.target.checked)}
                                  className="rounded"
                                />
                              </td>
                              <td className="px-4 py-3">
                                <div className={`text-sm font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                                  {item.requestId}
                                </div>
                              </td>
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
                                  {/* <div className={`text-sm font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                                    {item.ITEMNMBR}
                                  </div> */}
                                  <div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-400'}`}>
                                    Budget: {item.BUDGETCODE}
                                  </div>
                                </div>
                              </td>
                              <td className="px-4 py-3">
                                <div className={`text-sm ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                                  {item.requester}
                                </div>
                                <div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-400'}`}>
                                  {item.company}
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
                )}

                {selectedItems.length > 0 && (
                  <div className="mt-6">
                    <h5 className={`text-sm font-medium mb-3 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                      Selected Items with Pricing
                    </h5>
                    <div className="border rounded-md overflow-hidden">
                      <div className="max-h-64 overflow-y-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className={`${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                            <tr>
                              <th className={`px-4 py-3 text-left text-xs font-medium uppercase tracking-wider ${darkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                                Item
                              </th>
                              <th className={`px-4 py-3 text-left text-xs font-medium uppercase tracking-wider ${darkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                                Quantity
                              </th>
                              <th className={`px-4 py-3 text-left text-xs font-medium uppercase tracking-wider ${darkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                                Offered Price
                              </th>
                              <th className={`px-4 py-3 text-left text-xs font-medium uppercase tracking-wider ${darkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                                Bid Price
                              </th>
                              <th className={`px-4 py-3 text-left text-xs font-medium uppercase tracking-wider ${darkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                                Agreed Price
                              </th>
                              <th className={`px-4 py-3 text-left text-xs font-medium uppercase tracking-wider ${darkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                                Remove
                              </th>
                            </tr>
                          </thead>
                          <tbody className={`${darkMode ? 'bg-gray-800 divide-gray-700' : 'bg-white divide-gray-200'}`}>
                            {selectedItems.map((item, index) => (
                              <tr key={item.uniqueId} className={`${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-50'}`}>
                                <td className="px-4 py-3">
                                  <div>
                                    <div className={`text-sm font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                                      {item.ITEMNMBR}
                                    </div>
                                    <div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                      {item.ITEMDESC}
                                    </div>
                                  </div>
                                </td>
                                <td className="px-4 py-3">
                                  <span className={`text-sm ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                                    {item.QUANTITY} {item.UOFM}
                                  </span>
                                </td>
                                <td className="px-4 py-3">
                                  <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={item.offeredPrice || ''}
                                    onChange={(e) => {
                                      const value = parseFloat(e.target.value) || 0;
                                      setSelectedItems(prev => prev.map(selected =>
                                        selected.uniqueId === item.uniqueId
                                          ? { ...selected, offeredPrice: value }
                                          : selected
                                      ));
                                    }}
                                    className={`w-full px-2 py-1 text-sm border rounded focus:outline-none focus:ring-1 focus:ring-blue-500 ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
                                      }`}
                                    placeholder="0.00"
                                  />
                                </td>
                                <td className="px-4 py-3">
                                  <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={item.bidPrice || ''}
                                    onChange={(e) => {
                                      const value = parseFloat(e.target.value) || 0;
                                      setSelectedItems(prev => prev.map(selected =>
                                        selected.uniqueId === item.uniqueId
                                          ? { ...selected, bidPrice: value }
                                          : selected
                                      ));
                                    }}
                                    className={`w-full px-2 py-1 text-sm border rounded focus:outline-none focus:ring-1 focus:ring-blue-500 ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
                                      }`}
                                    placeholder="0.00"
                                  />
                                </td>
                                <td className="px-4 py-3">
                                  <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={item.finalPrice || ''}
                                    onChange={(e) => {
                                      const value = parseFloat(e.target.value) || 0;
                                      setSelectedItems(prev => prev.map(selected =>
                                        selected.uniqueId === item.uniqueId
                                          ? { ...selected, finalPrice: value }
                                          : selected
                                      ));
                                    }}
                                    className={`w-full px-2 py-1 text-sm border rounded focus:outline-none focus:ring-1 focus:ring-blue-500 ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
                                      }`}
                                    placeholder="0.00"
                                  />
                                </td>
                                <td className="px-4 py-3">
                                  <button
                                    type="button"
                                    onClick={() => handleItemSelect(item, false)}
                                    className={`text-red-500 hover:text-red-700 ${darkMode ? 'text-red-400 hover:text-red-300' : ''}`}
                                  >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className={`px-6 py-4 border-t ${darkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-gray-50'}`}>
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={handleClose}
                  disabled={submitting}
                  className={`px-4 py-2 border rounded-md text-sm font-medium transition-colors duration-200 ${darkMode
                      ? 'border-gray-600 text-gray-300 hover:bg-gray-700'
                      : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                    } disabled:opacity-50`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || selectedItems.length === 0}
                  className="px-4 py-2 bg-blue-600 border border-transparent rounded-md text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                >
                  {submitting ? 'Creating...' : 'Create Canvassing Request'}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default CreateCanvassingModal;
