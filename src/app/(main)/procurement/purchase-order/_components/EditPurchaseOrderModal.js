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
    confirmedBy: '',
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
      confirmedBy: header.confirmedBy || '',
      approvedBy: header.approvedBy || '',
      contactPerson: header.contactPerson || '',
      docType: header.refDocType || ''
    });

    // Set supplier
    setSelectedSupplier(header.vendName || '');
    setSelectedVendorId(header.vendorId || '');
    setSelectedPaymentTerm(header.pymtrmid || '');

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
        confirmedBy: poData.confirmedBy,
        approvedBy: poData.approvedBy,
        isBudgetNo: poData.isBudgetNo,
        isPrNo: poData.isPrNo,
        capex: poData.capex,
        isPerAdvise: poData.isPerAdvise,
        remarks: poData.remarks,
        budgetNoList: poData.isBudgetNo ? 'Budget No. ' + selectedItems.map(item => `${item.itemNumber}-${item.budgetCode}`).filter(Boolean).join(', ') : '',
        prList: poData.isPrNo ? 'PR No. ' + selectedItems.map(item => `${item.itemNumber}-${item.prCode}`).filter(Boolean).join(', ') : '',
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
    }
  };

  // Handle items selected from the modal
  const handleItemsSelected = (items) => {
    setSelectedItems(items);
  };

  if (!isOpen || !purchaseOrder) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity" aria-hidden="true">
          <div className="absolute inset-0 bg-gray-500 opacity-75" onClick={handleClose}></div>
        </div>

        <div className={`inline-block align-bottom rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-6xl w-full mx-4 sm:mx-auto h-[90vh] max-h-[90vh] relative z-10 ${darkMode ? 'bg-gray-800' : 'bg-white'}`} onClick={(e) => e.stopPropagation()}>
          <form onSubmit={handleSubmit} className="flex flex-col h-full">
            {/* Header */}
            <div className={`px-6 py-4 border-b flex-shrink-0 ${darkMode ? 'border-blue-700 bg-gradient-to-r from-blue-800 to-blue-900' : 'border-blue-200 bg-gradient-to-r from-blue-50 to-blue-100'}`}>
              <div className="flex items-center justify-between">
                <div className="flex-1"></div>
                <div className="text-center">
                  <h3 className={`text-lg font-medium ${darkMode ? 'text-white' : 'text-black'}`}>
                    Edit Purchase Order
                  </h3>
                  {poData.poNumber && (
                    <p className="text-sm mt-1 font-bold text-blue-800">
                      {poData.poNumber}
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

            {/* Scrollable Content */}
            <div className="px-6 py-4 overflow-y-auto flex-1">
              <div className="space-y-8 pb-6">

                {/* Supplier Information */}
                <div>
                  <h4 className={`text-lg font-medium mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
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
                      <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
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
                </div>

                {/* Items Selection */}
                <div>
                  <h4 className={`text-lg font-medium mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    Select Items from Canvassing
                  </h4>
                  <div className="flex items-center gap-4">
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
                      className={`px-4 py-2 border rounded-md text-sm font-medium transition-colors duration-200 ${
                        !selectedSupplier.trim()
                          ? 'opacity-50 cursor-not-allowed'
                          : darkMode
                          ? 'border-gray-600 text-gray-300 hover:bg-gray-700'
                          : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      {selectedItems.length > 0 ? `Modify Items (${selectedItems.length} selected)` : 'Select Items'}
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
                    <p className={`text-sm mt-2 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      {!selectedSupplier.trim()
                        ? 'Please select a supplier first, then click "Select Items" to choose items from approved canvassing requests'
                        : 'Click "Select Items" to choose items from approved canvassing requests'
                      }
                    </p>
                  )}
                </div>

                {/* Approval Information */}
                <div>
                  <h4 className={`text-lg font-medium mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    Approval Information
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    <div className="relative">
                      <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                        Canvassed By
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          value={poData.canvassedBy || (selectedItems.length > 0 ? [...new Set(selectedItems.map(item => item.addressedTo).filter(Boolean))].join(', ') : '')}
                          onChange={(e) => setPoData(prev => ({ ...prev, canvassedBy: e.target.value }))}
                          className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
                            }`}
                          placeholder="Auto-filled from selected items"
                          readOnly
                        />
                      </div>
                    </div>

                    <div className="relative">
                      <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                        For Confirmation By <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          value={poData.confirmedBy}
                          onChange={(e) => {
                            setPoData(prev => ({ ...prev, confirmedBy: e.target.value }));
                          }}
                          onFocus={() => setShowConfirmedByDropdown(true)}
                          onBlur={() => setTimeout(() => setShowConfirmedByDropdown(false), 200)}
                          className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
                            }`}
                          placeholder="Select for confirmation by"
                          required
                        />
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
                        <div className={`absolute z-50 w-full mt-1 border rounded-md shadow-lg max-h-60 overflow-y-auto ${darkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'
                          }`}>
                          {confirmedByOptions.map((option) => (
                            <div
                              key={option.id}
                              onClick={() => {
                                setPoData(prev => ({ ...prev, confirmedBy: option.name }));
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
                      <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                        For Approval By <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          value={poData.approvedBy}
                          onChange={(e) => {
                            setPoData(prev => ({ ...prev, approvedBy: e.target.value }));
                          }}
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
                          {approvedByOptions.map((option) => (
                            <div
                              key={option.id}
                              onClick={() => {
                                setPoData(prev => ({ ...prev, approvedBy: option.name }));
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

                    <div className="relative">
                      <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                        Delivery To <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          value={poData.deliveryTo}
                          onChange={(e) => {
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
                      </div>
                      {showDeliveryToDropdown && (
                        <div className={`absolute z-50 w-full mt-1 border rounded-md shadow-lg max-h-60 overflow-y-auto ${darkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'
                          }`}>
                          {deliveryLocations.map((location) => (
                            <div
                              key={location.id}
                              onClick={() => {
                                setPoData(prev => ({ ...prev, deliveryTo: location.name }));
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
                  </div>
                </div>

                {/* Purchase Order Details */}
                <div>
                  <h4 className={`text-lg font-medium mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    Purchase Order Details
                  </h4>

                  {/* PO Details */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div>
                      <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                        Date Needed
                      </label>
                      <input
                        type="date"
                        value={poData.dateNeeded}
                        onChange={(e) => setPoData(prev => ({ ...prev, dateNeeded: e.target.value }))}
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
                    <div>
                      <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                        Promised Ship Date
                      </label>
                      <input
                        type="date"
                        value={poData.promisedShipDate}
                        onChange={(e) => setPoData(prev => ({ ...prev, promisedShipDate: e.target.value }))}
                        className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
                          }`}
                      />
                    </div>
                  </div>

                  {/* Doc Type and Flags in 2 columns */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    {/* Doc Type */}
                    <div>
                      <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                        Doc Type
                      </label>
                      <select
                        value={poData.docType}
                        onChange={(e) => setPoData(prev => ({ ...prev, docType: e.target.value }))}
                        className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
                          }`}
                      >
                        {/* Include current saved docType if not already in options */}
                        {(() => {
                          const allOptions = [...new Set([...DOC_TYPE_OPTIONS, ...documentTypes.map(dt => dt.doctype)])];
                          if (poData.docType && !allOptions.includes(poData.docType)) {
                            allOptions.unshift(poData.docType);
                          }
                          return allOptions.map((docType) => (
                            <option key={docType} value={docType}>
                              {docType}
                            </option>
                          ));
                        })()}
                      </select>
                    </div>

                    {/* Flags */}
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
                  </div>

                  {/* Remarks */}
                  <div className="mb-6">
                    <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      Remarks
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

                {/* Selected Items Summary */}
                {selectedItems.length > 0 && (
                  <div>
                    <h4 className={`text-lg font-medium mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                      Selected Items Summary
                    </h4>
                    <div className={`mb-6 p-4 rounded-md ${darkMode ? 'bg-gray-700' : 'bg-blue-50'}`}>
                      <h5 className={`text-sm font-medium mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                        Purchase Order Summary
                      </h5>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className={`font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Items Selected:</span>
                          <span className={`ml-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>{selectedItems.length}</span>
                        </div>
                        <div>
                          <span className={`font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Total Amount:</span>
                          <span className={`ml-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                            ₱{selectedItems.reduce((sum, item) => sum + (item.unitCost * item.qtyOrder), 0).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="border rounded-md overflow-hidden">
                      <div className="max-h-96 overflow-y-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className={`${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                            <tr>
                              <th className={`px-4 py-3 text-left text-xs font-medium uppercase tracking-wider ${darkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                                Item Details
                              </th>
                              <th className={`px-4 py-3 text-left text-xs font-medium uppercase tracking-wider ${darkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                                Quantity
                              </th>
                              <th className={`px-4 py-3 text-left text-xs font-medium uppercase tracking-wider ${darkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                                Unit Cost
                              </th>
                              <th className={`px-4 py-3 text-left text-xs font-medium uppercase tracking-wider ${darkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                                Total
                              </th>
                            </tr>
                          </thead>
                          <tbody className={`${darkMode ? 'bg-gray-800 divide-gray-700' : 'bg-white divide-gray-200'}`}>
                            {selectedItems.map((item, index) => (
                              <tr key={item.uniqueId} className={`${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-50'}`}>
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
                                    className={`w-20 px-2 py-1 text-sm border rounded focus:outline-none focus:ring-1 focus:ring-blue-500 ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
                                      }`}
                                    title={`Max quantity: ${item.remaining} ${item.uofm}`}
                                  />
                                  <span className={`ml-1 text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                    {item.uofm}
                                  </span>
                                </td>
                                <td className="px-4 py-3">
                                  <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={item.unitCost || ''}
                                    onChange={(e) => {
                                      const newValue = parseFloat(e.target.value) || 0;
                                      updateSelectedItem(item.uniqueId, 'unitCost', newValue);
                                    }}
                                    className={`w-24 px-2 py-1 text-sm border rounded focus:outline-none focus:ring-1 focus:ring-blue-500 ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
                                      }`}
                                    title="Unit cost"
                                  />
                                </td>
                                <td className="px-4 py-3">
                                  <span className={`text-sm ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                                    ₱{((item.unitCost || 0) * (item.qtyOrder || 0)).toLocaleString()}
                                  </span>
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
