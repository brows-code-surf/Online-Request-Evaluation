'use client';

import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import {
  updatePurchaseOrder,
  getAllSuppliers,
  getAllPaymentTerms,
  getConfirmedBy,
  getApprovedBy,
  getDeliveryLocations,
  getSupplierContactPersons,
  getDocumentTypes,
  getCanvassingDataForPO
} from '../_actions';
import ItemSelectionModal from './ItemSelectionModal';

// Document type options
const DOC_TYPE_OPTIONS = [
  'Sales Invoice',
  'Delivery Receipt',
  'N/A'
];

function EditPurchaseOrderModal({ isOpen, onClose, darkMode, user, purchaseOrder, onSuccess, purchaseOrders = [] }) {
  const [submitting, setSubmitting] = useState(false);
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
  const [poData, setPoData] = useState({
    poNumber: '',
    remarks: '',
    deliveryTo: '',
    dateNeeded: '',
    promisedDate: '',
    promisedShipDate: '',
    isBudgetNo: false,
    isPrNo: false,
    capex: false,
    isPerAdvise: false,
    budgetNoList: '',
    canvassedBy: '',
    confirmedBy: [],
    approvedBy: '',
    contactPerson: '',
    docType: ''
  });
  const [confirmedByOptions, setConfirmedByOptions] = useState([]);
  const [approvedByOptions, setApprovedByOptions] = useState([]);
  const [deliveryLocations, setDeliveryLocations] = useState([]);
  const [documentTypes, setDocumentTypes] = useState([]);
  const [showItemSelectionModal, setShowItemSelectionModal] = useState(false);
  const [showConfirmedByDropdown, setShowConfirmedByDropdown] = useState(false);
  const [showApprovedByDropdown, setShowApprovedByDropdown] = useState(false);
  const [showDeliveryToDropdown, setShowDeliveryToDropdown] = useState(false);
  const [contactPersons, setContactPersons] = useState([]);
  const [showContactPersonDropdown, setShowContactPersonDropdown] = useState(false);
  const [showDocTypeDropdown, setShowDocTypeDropdown] = useState(false);
  const [isDeliveryMode, setIsDeliveryMode] = useState(true); // true = Delivery, false = Pick-up
  const [locationSearch, setLocationSearch] = useState('');
  const [docTypeSearch, setDocTypeSearch] = useState('');
  const [reviewBySearch, setReviewBySearch] = useState('');
  const [approvalBySearch, setApprovalBySearch] = useState('');

  // Load initial data when modal opens or purchaseOrder changes
  useEffect(() => {
    if (isOpen && purchaseOrder) {
      loadInitialData();
      loadDocumentTypes();
    }
  }, [isOpen, purchaseOrder]);

  const loadInitialData = async () => {
    if (!purchaseOrder) return;

    // Load dropdown data
    await Promise.all([
      loadSuppliers(),
      loadPaymentTerms(),
      loadConfirmedBy(),
      loadApprovedBy(),
      loadDeliveryLocations()
    ]);

    // Set form data from purchase order
    const header = purchaseOrder.header;
    const details = purchaseOrder.details || [];

    setPoData({
      poNumber: header.poNumber || '',
      remarks: header.remarks || '',
      deliveryTo: header.deliveryTo || '',
      dateNeeded: header.dateNeeded ? new Date(header.dateNeeded).toISOString().split('T')[0] : '',
      promisedDate: header.promisedDate ? new Date(header.promisedDate).toISOString().split('T')[0] : '',
      promisedShipDate: header.promisedShipDate ? new Date(header.promisedShipDate).toISOString().split('T')[0] : '',
      isBudgetNo: header.isBudgetNo === 1,
      isPrNo: header.isPrNo === 1,
      capex: header.capex === 1,
      isPerAdvise: header.isPerAdvise === 1,
      budgetNoList: header.budgetNoList || '',
      canvassedBy: header.canvassedBy || '',
      confirmedBy: [header.confirmedBy_1, header.confirmedBy_2].filter(Boolean),
      approvedBy: header.approvedBy || '',
      contactPerson: header.contactPerson || '',
      docType: header.refDocType || ''
    });

    // Set supplier
    setSelectedSupplier(header.vendName || '');
    setSelectedVendorId(header.vendorId || '');
    setSelectedPaymentTerm(header.pymtrmid || '');

    // Initialize search states
    setLocationSearch(header.deliveryTo || '');
    setDocTypeSearch(header.refDocType || '');
    setReviewBySearch('');
    setApprovalBySearch(header.approvedBy || '');

    // Load contact persons for the supplier
    if (header.vendorId) {
      loadContactPersons(header.vendorId);
    }

    // Fetch canvassing data to get remaining quantities
    try {
      const canvassingResult = await getCanvassingDataForPO(user, false); // false to get all items, not just assigned to user
      const canvassingItems = canvassingResult.success ? canvassingResult.items : [];

      // Convert details to selected items format with proper remaining quantities
      const items = details.map((detail, index) => {
        // Find matching canvassing item by RID
        const canvassingItem = canvassingItems.find(item => item.rid === detail.rid);

        // Calculate remaining: original quantity - total ordered by other POs + current PO quantity
        let remaining = detail.qtyOrder || 0; // Default to current qtyOrder
        if (canvassingItem) {
          // remaining = original_quantity - total_ordered_by_other_pos + current_po_quantity
          remaining = (canvassingItem.quantity - canvassingItem.totalQtyOrdered) + (detail.qtyOrder || 0);
        }

        return {
          uniqueId: `item-${index}`,
          rid: detail.rid || '', // Include the RID from the existing purchase order
          pqCode: detail.pqCode || '',
          prCode: detail.prCode || '',
          itemNumber: detail.itemNmbr || '',
          itemDescription: detail.itemDesc || '',
          uofm: detail.uofm || '',
          qtyOrder: detail.qtyOrder || 0,
          unitCost: detail.unitCost || 0,
          brand: detail.brand || '',
          origin: detail.origin || '',
          budgetCode: detail.budgetNo || '',
          addressedTo: header.canvassedBy || '',
          quantity: detail.qtyOrder || 0, // Max available quantity
          remaining: remaining // Properly calculated remaining quantity
        };
      });

      setSelectedItems(items);
    } catch (error) {
      console.error('Error loading canvassing data for remaining quantities:', error);
      // Fallback to original logic if canvassing data fetch fails
      const items = details.map((detail, index) => ({
        uniqueId: `item-${index}`,
        rid: detail.rid || '',
        pqCode: detail.pqCode || '',
        prCode: detail.prCode || '',
        itemNumber: detail.itemNmbr || '',
        itemDescription: detail.itemDesc || '',
        uofm: detail.uofm || '',
        qtyOrder: detail.qtyOrder || 0,
        unitCost: detail.unitCost || 0,
        brand: detail.brand || '',
        origin: detail.origin || '',
        budgetCode: detail.budgetNo || '',
        addressedTo: header.canvassedBy || '',
        quantity: detail.qtyOrder || 0,
        remaining: detail.qtyOrder || 0
      }));
      setSelectedItems(items);
    }
  };

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

  const loadConfirmedBy = async () => {
    try {
      const result = await getConfirmedBy();
      if (result.success) {
        setConfirmedByOptions(result.confirmedBy);
      } else {
        toast.error('Failed to load confirmed by options');
      }
    } catch (error) {
      console.error('Error loading confirmed by options:', error);
      toast.error('Failed to load confirmed by options');
    }
  };

  const loadApprovedBy = async () => {
    try {
      const result = await getApprovedBy();
      if (result.success) {
        setApprovedByOptions(result.approvedBy);
      } else {
        toast.error('Failed to load approved by options');
      }
    } catch (error) {
      console.error('Error loading approved by options:', error);
      toast.error('Failed to load approved by options');
    }
  };

  const loadDeliveryLocations = async () => {
    try {
      const result = await getDeliveryLocations();
      if (result.success) {
        setDeliveryLocations(result.deliveryLocations);
      } else {
        toast.error('Failed to load delivery locations');
      }
    } catch (error) {
      console.error('Error loading delivery locations:', error);
      toast.error('Failed to load delivery locations');
    }
  };

  const loadDocumentTypes = () => {
    try {
      // Extract unique document types from existing purchase orders
      const uniqueDocTypes = [...new Set(
        purchaseOrders
          .map(po => po.refDocType)
          .filter(docType => docType && docType.trim() !== '')
      )];

      setDocumentTypes(uniqueDocTypes.map(doctype => ({ doctype })));
    } catch (error) {
      console.error('Error loading document types:', error);
      setDocumentTypes([]);
    }
  };

  const loadContactPersons = async (vendorId) => {
    if (!vendorId) {
      setContactPersons([]);
      setPoData(prev => ({ ...prev, contactPerson: '' }));
      return;
    }

    try {
      const result = await getSupplierContactPersons(vendorId);
      if (result.success) {
        setContactPersons(result.contactPersons);
      } else {
        setContactPersons([]);
      }
    } catch (error) {
      console.error('Error loading contact persons:', error);
      setContactPersons([]);
    }
  };

  const updateSelectedItem = (uniqueId, field, value) => {
    setSelectedItems(prev => prev.map(item =>
      item.uniqueId === uniqueId ? { ...item, [field]: value } : item
    ));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (selectedItems.length === 0) {
      toast.error('Please select at least one item for the purchase order');
      return;
    }

    if (!selectedSupplier.trim()) {
      toast.error('Supplier is required');
      return;
    }

    if (!selectedPaymentTerm.trim()) {
      toast.error('Payment terms are required');
      return;
    }

    if (poData.confirmedBy.length === 0) {
      toast.error('At least one confirmer is required');
      return;
    }

    if (poData.confirmedBy.length > 2) {
      toast.error('Maximum of 2 confirmers allowed');
      return;
    }

    setSubmitting(true);
    try {
      // Prepare header data
      const headerData = {
        poNumber: poData.poNumber,
        vendorId: selectedVendorId,
        vendName: selectedSupplier,
        pymtrmid: selectedPaymentTerm,
        refDocType: poData.docType,
        deliveryTo: poData.deliveryTo,
        poDate: purchaseOrder.header.poDate ? new Date(purchaseOrder.header.poDate) : new Date(),
        dateNeeded: poData.dateNeeded ? new Date(poData.dateNeeded) : null,
        promisedDate: poData.promisedDate ? new Date(poData.promisedDate) : null,
        promisedShipDate: poData.promisedShipDate ? new Date(poData.promisedShipDate) : null,
        canvassedBy: selectedItems.length > 0 ? [...new Set(selectedItems.map(item => item.addressedTo).filter(Boolean))].join(', ') : (poData.canvassedBy || user?.empName || ''),
        confirmedBy_1: poData.confirmedBy[0] || '',
        confirmedBy_2: poData.confirmedBy[1] || '',
        approvedBy: poData.approvedBy,
        isBudgetNo: poData.isBudgetNo,
        isPrNo: poData.isPrNo,
        capex: poData.capex,
        isPerAdvise: poData.isPerAdvise,
        remarks: poData.remarks,
        budgetNoList: poData.isBudgetNo ? 'Budget No. ' + selectedItems.map(item => `${item.itemNumber}-${item.budgetCode}`).filter(Boolean).join(', ') : '',
        prList: poData.isPrNo ? [...new Set(selectedItems.map(item => item.prCode).filter(Boolean))].join(', ') : '',
        subtotal: selectedItems.reduce((sum, item) => sum + (item.unitCost * item.qtyOrder), 0),
        contactPerson: poData.contactPerson
      };

      // Prepare details data
      const detailsData = selectedItems.map(item => ({
        rid: item.rid, // Include the RID from the existing purchase order
        pqCode: item.pqCode,
        prCode: item.prCode,
        itemNmbr: item.itemNumber,
        itemDesc: item.itemDescription,
        uofm: item.uofm,
        qtyOrder: item.qtyOrder,
        unitCost: item.unitCost,
        brand: item.brand || '',
        origin: item.origin || '',
        budgetNo: item.budgetCode,
        itemStatus: item.itemStatus || 'PENDING'
      }));

      const result = await updatePurchaseOrder(poData.poNumber, headerData, detailsData, user?.empName);

      if (result.success) {
        toast.success('Purchase order updated successfully!');
        onSuccess?.();

        // Reset form
        setSelectedItems([]);
        setSelectedSupplier('');
        setSelectedVendorId('');
        setSelectedPaymentTerm('');
        setContactPersons([]);
        setIsDeliveryMode(true);
        setPoData({
          poNumber: '',
          remarks: '',
          deliveryTo: '',
          dateNeeded: '',
          promisedDate: '',
          promisedShipDate: '',
          isBudgetNo: false,
          isPrNo: false,
          capex: false,
          isPerAdvise: false,
          budgetNoList: '',
          canvassedBy: '',
          confirmedBy: '',
          approvedBy: '',
          contactPerson: '',
          docType: 'N/A'
        });
        onClose();
      } else {
        toast.error(result.message || 'Failed to update purchase order');
      }
    } catch (error) {
      console.error('Error updating purchase order:', error);
      toast.error('Failed to update purchase order');
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
      setContactPersons([]);
      setIsDeliveryMode(true);
      setLocationSearch('');
      setDocTypeSearch('');
      setReviewBySearch('');
      setApprovalBySearch('');
      setPoData({
        poNumber: '',
        remarks: '',
        deliveryTo: '',
        dateNeeded: '',
        promisedDate: '',
        promisedShipDate: '',
        isBudgetNo: false,
        isPrNo: false,
        capex: false,
        isPerAdvise: false,
        budgetNoList: '',
        canvassedBy: '',
        confirmedBy: [],
        approvedBy: '',
        contactPerson: '',
        docType: 'N/A'
      });
      onClose();
    }
  };

  // Handle items selected from the modal
  const handleItemsSelected = (items) => {
    setSelectedItems(items);
  };

  if (!isOpen || !purchaseOrder) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      <div className="flex items-end sm:items-center justify-center min-h-screen p-0 sm:p-4">
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm" onClick={handleClose}></div>

        <div className={`relative w-full sm:w-full md:w-[90%] lg:w-[85%] xl:w-[80%] max-w-7xl h-[95vh] sm:h-[85vh] md:h-[90vh] rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden ${darkMode ? 'bg-gray-800' : 'bg-white'}`} onClick={(e) => e.stopPropagation()}>
          <form onSubmit={handleSubmit} className="flex flex-col h-full">
            {/* Header */}
            <div className={`px-4 sm:px-6 py-3 sm:py-4 border-b flex-shrink-0 ${darkMode ? 'border-gray-700 bg-gradient-to-r from-gray-800 to-gray-900' : 'border-gray-200 bg-gradient-to-r from-white to-gray-50'}`}>
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className={`p-2 rounded-lg ${darkMode ? 'bg-blue-900/50' : 'bg-blue-100'}`}>
                    <svg className={`w-5 h-5 sm:w-6 sm:h-6 ${darkMode ? 'text-blue-400' : 'text-blue-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className={`text-lg sm:text-xl font-semibold truncate ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                      Edit Purchase Order
                    </h3>
                  </div>
                </div>
                <div className="flex items-center gap-2 sm:gap-3">
                  {poData.poNumber && (
                    <span className={`hidden sm:inline-flex px-3 py-1.5 text-2xl font-bold rounded-full ${darkMode ? 'text-blue-300' : 'text-blue-800'}`}>
                      {poData.poNumber}
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={handleClose}
                    disabled={submitting}
                    className={`p-2 rounded-lg transition-colors ${darkMode ? 'text-gray-400 hover:text-white hover:bg-gray-700' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'} disabled:opacity-50`}
                  >
                    <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
              {/* PO Number for mobile */}
              {poData.poNumber && (
                <div className="sm:hidden mt-2">
                  <span className={`inline-flex px-3 py-1 text-sm font-bold rounded-full ${darkMode ? 'bg-blue-900/60 text-blue-300' : 'bg-blue-100 text-blue-800'}`}>
                    {poData.poNumber}
                  </span>
                </div>
              )}
            </div>
            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto overflow-x-hidden px-3 sm:px-6">
              <div className="space-y-5 sm:space-y-6 pb-4">
              <h4 className={`text-base sm:text-lg font-semibold mb-2 sm:mb-3 mt-3 sm:mt-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                Purchase Order Header
              </h4>

                {/* Supplier Information */}
                <div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                    <div className="relative">
                      <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
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
                          placeholder="Select supplier"
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
                            .map((supplier) => (
                              <div
                                key={supplier.vendorId}
                                onClick={() => {
                                  setSelectedSupplier(supplier.vendorName);
                                  setSelectedVendorId(supplier.vendorId);
                                  setSelectedPaymentTerm(supplier.paymentTerms || '');
                                  loadContactPersons(supplier.vendorId);
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

                    <div className="relative">
                      <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
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
                          {paymentTerms && paymentTerms
                            .filter(term =>
                              term.paymentTermId.toLowerCase().includes(paymentTermSearch.toLowerCase())
                            )
                            .map((term) => (
                              <div
                                key={term.paymentTermId}
                                onClick={() => {
                                  setSelectedPaymentTerm(term.paymentTermId);
                                  setPaymentTermSearch('');
                                  setShowPaymentTermDropdown(false);
                                }}
                                className={`px-3 py-2 cursor-pointer ${darkMode
                                  ? 'text-white hover:bg-gray-600'
                                  : 'text-gray-900 hover:bg-gray-100'
                                  }`}>
                                <div className="flex justify-between items-center">
                                  <span>{term.paymentTermId}</span>
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

                    <div className="relative">
                      <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                        Contact Person
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          value={poData.contactPerson}
                          onChange={(e) => {
                            setPoData(prev => ({ ...prev, contactPerson: e.target.value }));
                          }}
                          onFocus={() => setShowContactPersonDropdown(true)}
                          onBlur={() => setTimeout(() => setShowContactPersonDropdown(false), 200)}
                          className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
                            }`}
                          placeholder="Select contact person"
                        />
                        <button
                          type="button"
                          onClick={() => setShowContactPersonDropdown(!showContactPersonDropdown)}
                          className={`absolute right-2 top-2 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>
                      </div>
                      {showContactPersonDropdown && (
                        <div className={`absolute z-50 w-full mt-1 border rounded-md shadow-lg max-h-60 overflow-y-auto ${darkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'
                          }`}>
                          {contactPersons.map((person) => (
                            <div
                              key={person.contactPerson}
                              onClick={() => {
                                setPoData(prev => ({ ...prev, contactPerson: person.contactPerson }));
                                setShowContactPersonDropdown(false);
                              }}
                              className={`px-3 py-2 cursor-pointer ${darkMode
                                ? 'text-white hover:bg-gray-600'
                                : 'text-gray-900 hover:bg-gray-100'
                                }`}
                            >
                              <div>
                                <div className="font-medium">{person.contactPerson}</div>
                                {person.mobileNo && (
                                  <div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                    Mobile: {person.mobileNo}
                                  </div>
                                )}
                                {person.emailAddress && (
                                  <div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                    Email: {person.emailAddress}
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                          {contactPersons.length === 0 && (
                            <div className={`px-3 py-2 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                              No contact persons available
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mt-4">
                    <div>
                      <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                        Date Needed
                      </label>
                      <input
                        type="date"
                        value={poData.dateNeeded}
                        onChange={(e) => {
                          const selectedDate = e.target.value;
                          setPoData(prev => ({ 
                            ...prev, 
                            dateNeeded: selectedDate,
                            promisedShipDate: selectedDate,
                            promisedDate: selectedDate
                          }));
                        }}
                        className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
                          }`}
                      />
                    </div>

                    <div className="relative">
                      <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                        Expected Ship Date
                      </label>
                      <input
                        type="date"
                        value={poData.promisedShipDate}
                        onChange={(e) => setPoData(prev => ({ ...prev, promisedShipDate: e.target.value }))}
                        className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
                          }`}
                      />
                    </div>

                    <div>
                      <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                        Promised Date
                      </label>
                      <input
                        type="date"
                        value={poData.promisedDate}
                        onChange={(e) => setPoData(prev => ({ ...prev, promisedDate: e.target.value }))}
                        className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
                          }`}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-4">
                    <div className="relative -mt-2.5"> 
                      {/* Switch Button with 2 labels */}
                      <div className="flex items-center mb-1">
                        <div className={`relative inline-flex items-center justify-center p-1 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-100'} shadow-sm`}>
                          {/* Active indicator background */}
                          <div 
                            className={`absolute top-1 bottom-1 w-[50%] rounded-md transition-all duration-300 ease-in-out shadow-md ${
                              isDeliveryMode 
                                ? 'left-1 bg-blue-600' 
                                : 'left-[calc(100%-50%-4px)] bg-orange-500'
                            }`}
                          />
                          <button
                            type="button"
                            onClick={() => {
                              if (!isDeliveryMode) {
                                setIsDeliveryMode(true);
                                setPoData(prev => ({ ...prev, deliveryTo: '' }));
                              }
                            }}
                            className={`relative z-10 px-4 py-1.5 text-sm font-semibold transition-colors duration-200 ${isDeliveryMode ? 'text-white' : darkMode ? 'text-gray-300 hover:text-white' : 'text-gray-600 hover:text-gray-900'}`}
                          >
                            <span className="flex items-center gap-1.5">
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              Delivery
                            </span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (isDeliveryMode) {
                                setIsDeliveryMode(false);
                                setPoData(prev => ({ ...prev, deliveryTo: '' }));
                              }
                            }}
                            className={`relative z-10 px-4 py-1.5 text-sm font-semibold transition-colors duration-200 ${!isDeliveryMode ? 'text-white' : darkMode ? 'text-gray-300 hover:text-white' : 'text-gray-600 hover:text-gray-900'}`}
                          >
                            <span className="flex items-center gap-1.5">
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                              </svg>
                              Pick-up
                            </span>
                          </button>
                        </div>
                        <span className={`ml-3 text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                          Location <span className="text-red-500">*</span>
                        </span>
                      </div>
                      {/* Conditional: Dropdown for Delivery, Input for Pick-up */}
                      {isDeliveryMode ? (
                        <div className="relative">
                          <input
                            type="text"
                            value={locationSearch}
                            onChange={(e) => {
                              setLocationSearch(e.target.value);
                              setPoData(prev => ({ ...prev, deliveryTo: e.target.value }));
                            }}
                            onFocus={() => setShowDeliveryToDropdown(true)}
                            onBlur={() => setTimeout(() => setShowDeliveryToDropdown(false), 200)}
                            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
                              }`}
                            placeholder="Select delivery location"
                            required
                          />
                          <button
                            type="button"
                            onClick={() => setShowDeliveryToDropdown(!showDeliveryToDropdown)}
                            className={`absolute right-2 top-2 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </button>
                          {showDeliveryToDropdown && (
                            <div className={`absolute z-50 w-full mt-1 border rounded-md shadow-lg max-h-60 overflow-y-auto ${darkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'
                              }`}>
                              {deliveryLocations
                                .filter(location => location.name.toLowerCase().includes(locationSearch.toLowerCase()))
                                .map((location) => (
                                  <div
                                    key={location.id}
                                    onClick={() => {
                                      setPoData(prev => ({ ...prev, deliveryTo: location.name }));
                                      setLocationSearch(location.name);
                                      setShowDeliveryToDropdown(false);
                                    }}
                                    className={`px-3 py-2 cursor-pointer ${darkMode
                                      ? 'text-white hover:bg-gray-600'
                                      : 'text-gray-900 hover:bg-gray-100'
                                      }`}
                                  >
                                    {location.name}
                                  </div>
                                ))}
                            </div>
                          )}
                        </div>
                      ) : (
                        <input
                          type="text"
                          value={poData.deliveryTo}
                          onChange={(e) => {
                            setPoData(prev => ({ ...prev, deliveryTo: e.target.value }));
                          }}
                          className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
                            }`}
                          placeholder="Enter pick-up location"
                          required
                        />
                      )}
                    </div>

                    {/* Doc Type */}
                    <div className="relative">
                      <label className={`block text-sm font-medium mb-1 mt-2.5 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                        Doc Type
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          value={docTypeSearch}
                          onChange={(e) => {
                            setDocTypeSearch(e.target.value);
                            setPoData(prev => ({ ...prev, docType: e.target.value }));
                          }}
                          onFocus={() => setShowDocTypeDropdown(true)}
                          onBlur={() => setTimeout(() => setShowDocTypeDropdown(false), 200)}
                          className={`w-full px-3 py-2.5 sm:py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base ${darkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'}
                            `}
                          placeholder="Select doc type"
                        />
                        <button
                          type="button"
                          onClick={() => setShowDocTypeDropdown(!showDocTypeDropdown)}
                          className={`absolute right-2 top-2 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>
                        {showDocTypeDropdown && (
                          <div className={`absolute z-50 w-full mt-1 border rounded-md shadow-lg max-h-60 overflow-y-auto ${darkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'}`}>
                            {(() => {
                              const allOptions = [...new Set([...DOC_TYPE_OPTIONS, ...documentTypes.map(dt => dt.doctype)])];
                              if (poData.docType && !allOptions.includes(poData.docType)) {
                                allOptions.unshift(poData.docType);
                              }
                              return allOptions
                                .filter(docType => docType.toLowerCase().includes(docTypeSearch.toLowerCase()))
                                .map((docType) => (
                                  <div
                                    key={docType}
                                    onClick={() => {
                                      setPoData(prev => ({ ...prev, docType: docType }));
                                      setDocTypeSearch(docType);
                                      setShowDocTypeDropdown(false);
                                    }}
                                    className={`px-3 py-2 cursor-pointer ${darkMode ? 'text-white hover:bg-gray-600' : 'text-gray-900 hover:bg-gray-100'}`}
                                  >
                                    {docType}
                                  </div>
                                ));
                            })()}
                          </div>
                        )}
                      </div>
                    </div>

                  </div>
                </div>

                {/* Approval Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  <div className="relative">
                    <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      For Review By <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <div className={`w-full min-h-[42px] px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'}`}>
                        <div className="flex flex-wrap gap-1">
                          {poData.confirmedBy.map((confirmer, index) => (
                            <span
                              key={index}
                              className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${darkMode ? 'bg-blue-600 text-white' : 'bg-blue-100 text-blue-800'}`}
                            >
                              {confirmer}
                              <button
                                type="button"
                                onClick={() => {
                                  setPoData(prev => ({
                                    ...prev,
                                    confirmedBy: prev.confirmedBy.filter((_, i) => i !== index)
                                  }));
                                }}
                                className="ml-1 inline-flex items-center justify-center w-4 h-4 rounded-full hover:bg-blue-200 focus:outline-none"
                              >
                                <svg className="w-2 h-2" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                </svg>
                              </button>
                            </span>
                          ))}
                          <input
                            type="text"
                            value={reviewBySearch}
                            onChange={(e) => setReviewBySearch(e.target.value)}
                            onFocus={() => setShowConfirmedByDropdown(true)}
                            onBlur={() => setTimeout(() => setShowConfirmedByDropdown(false), 200)}
                            className={`flex-1 min-w-[100px] outline-none ${darkMode ? 'bg-gray-700 text-white' : 'bg-white text-gray-900'}`}
                            placeholder={poData.confirmedBy.length === 0 ? "Select for confirmation by (max 2)" : poData.confirmedBy.length < 2 ? "Select second confirmer" : ""}
                          />
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowConfirmedByDropdown(!showConfirmedByDropdown)}
                        className={`absolute right-2 top-2 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                    </div>
                    {showConfirmedByDropdown && (
                      <div className={`absolute z-50 w-full mt-1 border rounded-md shadow-lg max-h-60 overflow-y-auto ${darkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'}`}>
                        {confirmedByOptions
                          .filter(option => 
                            !poData.confirmedBy.includes(option.name) && 
                            poData.confirmedBy.length < 2 &&
                            option.name.toLowerCase().includes(reviewBySearch.toLowerCase())
                          )
                          .map((option) => (
                            <div
                              key={option.id}
                              onClick={() => {
                                setPoData(prev => ({
                                  ...prev,
                                  confirmedBy: [...prev.confirmedBy, option.name]
                                }));
                                setReviewBySearch('');
                                setShowConfirmedByDropdown(false);
                              }}
                              className={`px-3 py-2 cursor-pointer ${darkMode
                                ? 'text-white hover:bg-gray-600'
                                : 'text-gray-900 hover:bg-gray-100'
                                }`}
                            >
                              {option.name}
                            </div>
                          ))}
                      </div>
                    )}
                  </div>

                  <div className="relative">
                    <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      For Approval By <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={approvalBySearch}
                        onChange={(e) => setApprovalBySearch(e.target.value)}
                        onFocus={() => setShowApprovedByDropdown(true)}
                        onBlur={() => setTimeout(() => setShowApprovedByDropdown(false), 200)}
                        className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
                          }`}
                        placeholder="Select for approval by"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowApprovedByDropdown(!showApprovedByDropdown)}
                        className={`absolute right-2 top-2 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                    </div>
                    {showApprovedByDropdown && (
                      <div className={`absolute z-50 w-full mt-1 border rounded-md shadow-lg max-h-60 overflow-y-auto ${darkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'
                        }`}>
                        {approvedByOptions
                          .filter(option => option.name.toLowerCase().includes(approvalBySearch.toLowerCase()))
                          .map((option) => (
                          <div
                            key={option.id}
                            onClick={() => {
                              setPoData(prev => ({ ...prev, approvedBy: option.name }));
                              setApprovalBySearch(option.name);
                              setShowApprovedByDropdown(false);
                            }}
                            className={`px-3 py-2 cursor-pointer ${darkMode
                              ? 'text-white hover:bg-gray-600'
                              : 'text-gray-900 hover:bg-gray-100'
                              }`}
                          >
                            {option.name}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Remarks */}
                <div className="mb-6">
                  <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Header Remarks
                  </label>
                  <textarea
                    value={poData.remarks}
                    onChange={(e) => setPoData(prev => ({ ...prev, remarks: e.target.value }))}
                    rows={3}
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
                      }`}
                    placeholder="Enter remarks"
                  />
                </div>
              </div>

              {/* Purchase Order Details */}
              <div className={`border-t flex-shrink-0`}>
                <h4 className={`text-lg font-medium mb-3 mt-3${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  Purchase Order Details
                </h4>
                {/* Items Selection */}
                <div>
                  <div className="flex items-center gap-4 mb-4">
                    <button
                      type="button"
                      onClick={() => {
                        if (!selectedSupplier.trim()) {
                          toast.error('Please select a supplier first before selecting items');
                          return;
                        }
                        setShowItemSelectionModal(true);
                      }}
                      disabled={!selectedSupplier.trim()}
                      className={`px-4 py-2 border rounded-md text-sm font-medium transition-colors duration-200 ${!selectedSupplier.trim()
                        ? 'opacity-50 cursor-not-allowed'
                        : darkMode
                          ? 'border-gray-600 text-gray-300 hover:bg-gray-700'
                          : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                        }`}
                    >
                      {selectedItems.length > 0 ? `${selectedItems.length} Item${selectedItems.length !== 1 ? 's' : ''} Selected` : 'Select Items from Canvassing'}
                    </button>
                    {selectedItems.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setSelectedItems([])}
                        className="px-3 py-2 text-red-600 hover:text-red-700 text-sm font-medium transition-colors duration-200"
                      >
                        Clear All
                      </button>
                    )}
                  </div>
                  {selectedItems.length === 0 && (
                    <p className={`text-sm mt-2 mb-4 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      {!selectedSupplier.trim()
                        ? 'Please select a supplier first, then click "Select Items" to choose items from approved canvassing requests'
                        : 'Click "Select Items" to choose items from approved canvassing requests'
                      }
                    </p>
                  )}
                </div>
                {/* Doc Type and Flags in 2 columns */}
                {/* Flags */}
                {/* <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      Options
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          id="isBudgetNo"
                          checked={poData.isBudgetNo}
                          onChange={(e) => setPoData(prev => ({ ...prev, isBudgetNo: e.target.checked }))}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <label htmlFor="isBudgetNo" className={`ml-2 text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                          W/Budget No.
                        </label>
                      </div>
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          id="capex"
                          checked={poData.capex}
                          onChange={(e) => setPoData(prev => ({ ...prev, capex: e.target.checked }))}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <label htmlFor="capex" className={`ml-2 text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                          CAPEX
                        </label>
                      </div>
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          id="isPrNo"
                          checked={poData.isPrNo}
                          onChange={(e) => setPoData(prev => ({ ...prev, isPrNo: e.target.checked }))}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <label htmlFor="isPrNo" className={`ml-2 text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                          W/PR No.
                        </label>
                      </div>
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          id="isPerAdvise"
                          checked={poData.isPerAdvise}
                          onChange={(e) => setPoData(prev => ({ ...prev, isPerAdvise: e.target.checked }))}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <label htmlFor="isPerAdvise" className={`ml-2 text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                          As Per Advise
                        </label>
                      </div>
                    </div>
                  </div>
                </div> */}
              </div>

              {/* Selected Items Summary */}
              {selectedItems.length > 0 && (
                <div>
                  <div className="border rounded-md overflow-hidden mb-6">
                    <div className="max-h-96 overflow-y-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className={`${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                          <tr>
                            <th className={`px-4 py-3 text-left text-xs font-medium uppercase tracking-wider ${darkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                              Item Details
                            </th>
                            <th className={`px-4 py-3 text-left text-xs font-medium uppercase tracking-wider ${darkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                              Unit Cost
                            </th>
                            <th className={`px-4 py-3 text-left text-xs font-medium uppercase tracking-wider ${darkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                              Quantity
                            </th>
                            <th className={`px-4 py-3 text-left text-xs font-medium uppercase tracking-wider ${darkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                              Total
                            </th>
                          </tr>
                        </thead>
                        <tbody className={`${darkMode ? 'bg-gray-800 divide-gray-700' : 'bg-white divide-gray-200'}`}>
                          {selectedItems.map((item, index) => (
                            <tr key={item.uniqueId} className={`${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-50'} transition-colors duration-150`}>
                              <td className="px-4 py-3">
                                <div>
                                  <div className={`text-sm font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                                    {item.itemDescription}
                                  </div>
                                  <div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                    {item.itemNumber}
                                  </div>
                                </div>
                              </td>
                              <td className="px-4 py-3">
                                <span className={`text-sm ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                                  ₱{Number(item.unitCost || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </span>
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex items-center">
                                  <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    max={item.remaining}
                                    value={item.qtyOrder || ''}
                                    onChange={(e) => {
                                      const newValue = parseFloat(e.target.value) || 0;
                                      if (newValue <= item.remaining) {
                                        updateSelectedItem(item.uniqueId, 'qtyOrder', newValue);
                                      }
                                    }}
                                    className={`w-20 px-2 py-1 text-sm border rounded focus:outline-none focus:ring-2 focus:ring-blue-500 ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
                                      }`}
                                    title={`Max quantity: ${item.remaining} ${item.uofm}`}
                                  />
                                  <span className={`ml-2 text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                    {item.uofm}
                                  </span>
                                </div>
                              </td>
                              <td className="px-4 py-3">
                                <span className={`text-sm font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                                  ₱{((item.unitCost || 0) * (item.qtyOrder || 0)).toLocaleString()}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        {selectedItems.length > 0 && (
                          <tfoot className={`${darkMode ? 'bg-gray-750' : 'bg-gray-100'} border-t-2 ${darkMode ? 'border-gray-600' : 'border-gray-300'}`}>
                            <tr>
                              <td className={`px-4 py-3 text-sm font-semibold ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                <span className="flex items-center gap-2">
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                  </svg>
                                  Grand Total
                                </span>
                              </td>
                              <td className={`px-4 py-3 text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                <span className="italic"></span>
                              </td>
                              <td className="px-4 py-3">
                                <span className={`text-sm font-bold ${darkMode ? 'text-blue-400' : 'text-blue-700'}`}>
                                  {selectedItems.reduce((sum, item) => sum + (item.qtyOrder || 0), 0).toLocaleString()}
                                </span>
                              </td>
                              <td className="px-4 py-3">
                                <span className={`text-sm font-bold ${darkMode ? 'text-green-400' : 'text-green-700'}`}>
                                  ₱{selectedItems.reduce((sum, item) => sum + ((item.unitCost || 0) * (item.qtyOrder || 0)), 0).toLocaleString()}
                                </span>
                              </td>
                            </tr>
                          </tfoot>
                        )}
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className={`px-6 py-4 border-t flex-shrink-0 ${darkMode ? 'border-blue-700 bg-gradient-to-r from-blue-800 to-blue-900' : 'border-blue-200 bg-gradient-to-r from-blue-50 to-blue-100'}`}>
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center space-y-3 sm:space-y-0">
                <div className="text-sm text-gray-500 text-center sm:text-left">
                  {selectedItems.length > 0 && (
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

                  <button
                    type="submit"
                    disabled={submitting || selectedItems.length === 0 || !selectedSupplier.trim() || !selectedPaymentTerm.trim()}
                    className="px-4 py-2 bg-blue-600 border border-transparent rounded-md text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 order-1 sm:order-2"
                  >
                    {submitting ? 'Updating...' : 'Update Purchase Order'}
                  </button>
                </div>
              </div>
            </div>
          </form>
        </div>

        {/* Item Selection Modal */}
        <ItemSelectionModal
          isOpen={showItemSelectionModal}
          onClose={() => setShowItemSelectionModal(false)}
          darkMode={darkMode}
          user={user}
          selectedItems={selectedItems}
          selectedSupplier={selectedSupplier}
          onItemsSelected={handleItemsSelected}
        />
      </div>
    </div>
  );
}

export default EditPurchaseOrderModal;
