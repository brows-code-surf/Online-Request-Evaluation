'use client';

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import { useAuth } from '@/utils/authContext';
import { updateReceivingEntry, getApprovedPurchaseOrdersForReceiving, getPurchaseOrderForReceiving } from '../_actions';

function EditReceivingEntryModal({ isOpen, onClose, darkMode, user, receivingEntry, onSuccess }) {
  const { isAdmin } = useAuth();
  const [loading, setLoading] = useState(false);
  const [approvedPOs, setApprovedPOs] = useState([]);
  const [loadingPOs, setLoadingPOs] = useState(false);
  const [selectedPO, setSelectedPO] = useState(null);
  const [receivingData, setReceivingData] = useState({
    vendorId: '',
    vendName: '',
    receivedBy: '',
    dateReceived: '',
    vndDocNm: '',
    locnCode: '',
    receiptType: 'Purchase Receipt',
    remarks: ''
  });
  const [selectedItems, setSelectedItems] = useState({});
  const [itemQuantities, setItemQuantities] = useState({});
  const [inventoryQuantities, setInventoryQuantities] = useState({});
  const [originalQuantities, setOriginalQuantities] = useState({}); // Original received quantities
  const [poLoaded, setPoLoaded] = useState(false);
  const [currentPODetails, setCurrentPODetails] = useState(null); // Full PO details for selected PO

   const loadApprovedPOs = useCallback(async () => {
     // Not really needed in edit mode but keep for dropdown options consistency
     setLoadingPOs(true);
     setPoLoaded(false);
     try {
       const result = await getApprovedPurchaseOrdersForReceiving(user, isAdmin());
       if (result.success) {
         setApprovedPOs(result.purchaseOrders || []);
       } else {
         toast.error(result.message || 'Failed to load approved purchase orders');
       }
     } catch (error) {
       console.error('Error loading approved POs:', error);
       toast.error('Failed to load approved purchase orders');
     } finally {
       setLoadingPOs(false);
       setPoLoaded(true);
     }
   }, [user, isAdmin]);

   const loadPODetails = useCallback(async (poNumber) => {
     if (!poNumber) {
       setCurrentPODetails(null);
       return;
     }
     try {
       const result = await getPurchaseOrderForReceiving(poNumber, user, isAdmin());
       if (result.success && result.purchaseOrder) {
         setCurrentPODetails(result.purchaseOrder);
       } else {
         console.error('Failed to load PO details:', result.message);
         setCurrentPODetails(null);
       }
     } catch (error) {
       console.error('Error loading PO details:', error);
       setCurrentPODetails(null);
     }
   }, [user, isAdmin]);

   // Helper to format date as YYYY-MM-DD for input[type="date"]
   const formatDateForInput = (dateValue) => {
     if (!dateValue) return '';
     const date = new Date(dateValue);
     const year = date.getFullYear();
     const month = String(date.getMonth() + 1).padStart(2, '0');
     const day = String(date.getDate()).padStart(2, '0');
     return `${year}-${month}-${day}`;
   };

  useEffect(() => {
    if (isOpen) {
      loadApprovedPOs();
      setSelectedItems({});
      setItemQuantities({});
      setInventoryQuantities({});
      setOriginalQuantities({});
      setPoLoaded(false);
      setCurrentPODetails(null);
    }
  }, [isOpen, loadApprovedPOs]);

   useEffect(() => {
     if (isOpen && receivingEntry?.header) {
       setSelectedPO({
         poNumber: receivingEntry.header.poNumber,
         vendorId: receivingEntry.header.vendorId,
         vendName: receivingEntry.header.vendName
       });
       setReceivingData({
         vendorId: receivingEntry.header.vendorId || '',
         vendName: receivingEntry.header.vendName || '',
         receivedBy: receivingEntry.header.createdBy || '',
         dateReceived: formatDateForInput(receivingEntry.header.dateCreated),
         vndDocNm: receivingEntry.header.vndDocNm || '',
         locnCode: receivingEntry.header.locnCode || '',
         receiptType: receivingEntry.header.receiptType || 'Purchase Receipt',
         remarks: receivingEntry.header.remarks || ''
       });

        if (receivingEntry.details) {
          const selected = {};
          const quantities = {};
          const invQuantities = {};
          const originals = {};

          receivingEntry.details.forEach(item => {
            selected[item.rid] = true;
            quantities[item.rid] = item.quantity || 0;
            invQuantities[item.rid] = item.inventoryQuantity || item.quantity || 0;
            originals[item.rid] = item.quantity || 0; // Store original received quantity
          });

          setSelectedItems(selected);
          setItemQuantities(quantities);
          setInventoryQuantities(invQuantities);
          setOriginalQuantities(originals);
        }
       
       // Load full PO details for this PO
       loadPODetails(receivingEntry.header.poNumber);
     }
   }, [isOpen, receivingEntry, loadPODetails]);

  useEffect(() => {
    if (selectedPO) {
      setReceivingData(prev => ({
        ...prev,
        vendorId: selectedPO.vendorId || '',
        vendName: selectedPO.vendName || ''
      }));
    }
  }, [selectedPO]);

  const handlePOChange = (e) => {
    // PO change not allowed in edit mode - dropdown is disabled
  };

  const handleItemSelect = (item, isChecked) => {
    setSelectedItems(prev => {
      const newSelected = { ...prev };
      if (isChecked) {
        newSelected[item.rid] = true;
        setItemQuantities(prev => ({
          ...prev,
          [item.rid]: item.qtyRemaining
        }));
        setInventoryQuantities(prev => ({
          ...prev,
          [item.rid]: item.qtyRemaining
        }));
      } else {
        delete newSelected[item.rid];
        setItemQuantities(prev => {
          const newQuantities = { ...prev };
          delete newQuantities[item.rid];
          return newQuantities;
        });
        setInventoryQuantities(prev => {
          const newInv = { ...prev };
          delete newInv[item.rid];
          return newInv;
        });
      }
      return newSelected;
    });
  };

  const handleQuantityChange = (item, value) => {
    const qty = parseInt(value) || 0;
    const originalQty = originalQuantities[item.rid] || 0;
    const maxQty = originalQty + item.qtyRemaining;
    setItemQuantities(prev => ({
      ...prev,
      [item.rid]: Math.min(Math.max(0, qty), maxQty)
    }));
  };

  const handleInventoryQuantityChange = (item, value) => {
    const qty = parseInt(value) || 0;
    setInventoryQuantities(prev => ({
      ...prev,
      [item.rid]: Math.max(0, qty)
    }));
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setReceivingData(prev => ({ ...prev, [name]: value }));
  };

  const handleUpdate = async () => {
    if (!selectedPO) {
      toast.error('Please select a purchase order');
      return;
    }

    if (!receivingData.receivedBy) {
      toast.error('Please enter received by');
      return;
    }

    const selectedItemIds = Object.keys(selectedItems);
    if (selectedItemIds.length === 0) {
      toast.error('Please select at least one item to receive');
      return;
    }

    setLoading(true);
    try {
      const detailsData = [];

      // Use current PO details (includes all items, not just remaining)
      const poDetails = currentPODetails?.details || [];
      poDetails.forEach(detail => {
        const qtyRemaining = (detail.qtyOrder || 0) - (detail.qtyServed || 0);
        if (selectedItems[detail.rid] && itemQuantities[detail.rid] > 0) {
          const qtyReceived = itemQuantities[detail.rid];
          const qtyInventory = inventoryQuantities[detail.rid] !== undefined ? inventoryQuantities[detail.rid] : qtyReceived;
          detailsData.push({
            rid: detail.rid,
            itemNmbr: detail.itemNmbr,
            itemDesc: detail.itemDesc,
            uofm: detail.uofm,
            quantity: qtyReceived,
            inventoryQuantity: qtyInventory,
            qtyReturned: 0,
            unitCost: detail.unitCost,
            extdCost: (detail.unitCost || 0) * qtyReceived,
            brand: detail.brand,
            origin: detail.origin,
            budgetNo: detail.budgetNo,
            prCode: detail.prCode,
            itemStatus: 'RECEIVED'
          });
        }
      });

      if (detailsData.length === 0) {
        toast.error('No items to receive');
        return;
      }

      console.log('Updating receiving entry with poNumber:', selectedPO.poNumber);
      console.log('Details data:', detailsData);
      const result = await updateReceivingEntry(
        receivingEntry.header.referenceNo,
        {
          poNumber: selectedPO.poNumber,
          vendorId: receivingData.vendorId,
          vendName: receivingData.vendName,
          pymtTermId: selectedPO.pymtTermId,
          receivedBy: receivingData.receivedBy,
          dateReceived: receivingData.dateReceived,
          vndDocNm: receivingData.vndDocNm,
          locnCode: receivingData.locnCode,
          receiptType: receivingData.receiptType,
          remarks: receivingData.remarks,
          receivingStatus: 'RECEIVED'
        },
        detailsData,
        user?.empName
      );

      if (result.success) {
        toast.success('Receiving entry updated successfully');
        onSuccess?.();
        onClose();
      } else {
        toast.error(result.message || 'Failed to update receiving entry');
      }
    } catch (error) {
      console.error('Error updating receiving entry:', error);
      toast.error('Failed to update receiving entry');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  // Build PO groups for dropdown (approved POs with remaining items)
  const poGroups = {};
  approvedPOs.forEach(po => {
    if (!poGroups[po.poNumber]) {
      poGroups[po.poNumber] = {
        poNumber: po.poNumber,
        vendorId: po.vendorId,
        vendName: po.vendName,
        items: []
      };
    }
    poGroups[po.poNumber].items.push(po);
  });

  // Compute items with remaining quantity from current full PO details
  const poItems = currentPODetails?.details
    ? currentPODetails.details.map(item => ({
        ...item,
        qtyRemaining: (item.qtyOrder || 0) - (item.qtyServed || 0)
      }))
    : [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className={`relative w-full max-w-7xl max-h-[90vh] overflow-hidden rounded-lg shadow-xl ${darkMode ? 'bg-gray-800' : 'bg-white'
        }`}>
        <div className={`px-6 py-4 border-b ${darkMode ? 'border-gray-600' : 'border-gray-200'}`}>
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div className={`p-2 rounded-lg ${darkMode ? 'bg-blue-900/50' : 'bg-blue-100'}`}>
                <svg className={`w-5 h-5 sm:w-6 sm:h-6 ${darkMode ? 'text-blue-400' : 'text-blue-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </div>
              <div className="min-w-0 flex-1">
                <h2 className={`text-lg sm:text-xl font-semibold truncate ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  Edit Receiving Entry
                </h2>
              </div>
            </div>
            <div className="flex items-center gap-2 sm:gap-3">
              <button
                onClick={onClose}
                className={`p-2 rounded-lg transition-colors ${darkMode ? 'text-gray-400 hover:text-white hover:bg-gray-700' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'} disabled:opacity-50`}
              >
                <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          {!poLoaded ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-3 text-gray-600">Loading purchase orders...</span>
            </div>
          ) : (
            <div className="space-y-6">
              <div>
                <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Purchase Order
                </label>
                <select
                  value={selectedPO?.poNumber || ''}
                  disabled={true}
                  className={`w-full px-4 py-2 rounded-lg border ${darkMode
                      ? 'bg-gray-700 border-gray-600 text-white'
                      : 'bg-white border-gray-300 text-gray-900'
                    } focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-60 disabled:cursor-not-allowed`}
                >
                  <option value={selectedPO?.poNumber || ''}>
                    {selectedPO ? `${selectedPO.poNumber} - ${selectedPO.vendName}` : 'No PO selected'}
                  </option>
                </select>
              </div>

              {selectedPO && (
                <>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                        Vendor ID
                      </label>
                      <input
                        type="text"
                        value={receivingData.vendorId}
                        readOnly
                        className={`w-full px-4 py-2 rounded-lg border ${darkMode
                            ? 'bg-gray-700 border-gray-600 text-white'
                            : 'bg-gray-50 border-gray-300 text-gray-900'
                          }`}
                      />
                    </div>
                    <div>
                      <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                        Vendor Name
                      </label>
                      <input
                        type="text"
                        value={receivingData.vendName}
                        readOnly
                        className={`w-full px-4 py-2 rounded-lg border ${darkMode
                            ? 'bg-gray-700 border-gray-600 text-white'
                            : 'bg-gray-50 border-gray-300 text-gray-900'
                          }`}
                      />
                    </div>
                    <div>
                      <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                        Vendor Document No.
                      </label>
                      <input
                        type="text"
                        name="vndDocNm"
                        value={receivingData.vndDocNm}
                        onChange={handleInputChange}
                        className={`w-full px-4 py-2 rounded-lg border ${darkMode
                            ? 'bg-gray-700 border-gray-600 text-white'
                            : 'bg-white border-gray-300 text-gray-900'
                          } focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                        Location
                      </label>
                      <select
                        name="locnCode"
                        value={receivingData.locnCode}
                        onChange={handleInputChange}
                        className={`w-full px-4 py-2 rounded-lg border ${darkMode
                            ? 'bg-gray-700 border-gray-600 text-white'
                            : 'bg-white border-gray-300 text-gray-900'
                          } focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                      >
                        <option value="">Select Location</option>
                        <option value="RM">RM</option>
                        <option value="SP">SP</option>
                        <option value="ADMIN">ADMIN</option>
                        <option value="MIS">MIS</option>
                      </select>
                    </div>
                    <div>
                      <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                        Receipt Type
                      </label>
                      <select
                        name="receiptType"
                        value={receivingData.receiptType}
                        onChange={handleInputChange}
                        className={`w-full px-4 py-2 rounded-lg border ${darkMode
                            ? 'bg-gray-700 border-gray-600 text-white'
                            : 'bg-white border-gray-300 text-gray-900'
                          } focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                      >
                        <option value="Purchase Receipt">Purchase Receipt</option>
                        <option value="Miscellaneous Receipt">Miscellaneous Receipt</option>
                        <option value="Stock Transfer In">Stock Transfer In</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                        Received By
                      </label>
                      <input
                        type="text"
                        name="receivedBy"
                        value={receivingData.receivedBy}
                        onChange={handleInputChange}
                        className={`w-full px-4 py-2 rounded-lg border ${darkMode
                            ? 'bg-gray-700 border-gray-600 text-white'
                            : 'bg-white border-gray-300 text-gray-900'
                          } focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                      />
                    </div>
                    <div>
                      <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                        Received Date
                      </label>
                      <input
                        type="date"
                        name="dateReceived"
                        value={formatDateForInput(receivingData.dateReceived)}
                        onChange={handleInputChange}
                        className={`w-full px-4 py-2 rounded-lg border ${darkMode
                            ? 'bg-gray-700 border-gray-600 text-white'
                            : 'bg-white border-gray-300 text-gray-900'
                          } focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                      />
                    </div>
                  </div>

                  <div>
                    <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      Remarks
                    </label>
                    <textarea
                      name="remarks"
                      value={receivingData.remarks}
                      onChange={handleInputChange}
                      rows={3}
                      className={`w-full px-4 py-2 rounded-lg border ${darkMode
                          ? 'bg-gray-700 border-gray-600 text-white'
                          : 'bg-white border-gray-300 text-gray-900'
                        } focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                    />
                  </div>

                  <div className={`${darkMode ? 'bg-gray-700' : 'bg-gray-50'} rounded-lg p-4`}>
                    <h4 className={`font-medium mb-3 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                      Items to Receive
                    </h4>
                    <div className="overflow-x-auto">
                      <table className={`w-full text-sm ${darkMode ? 'text-gray-300' : 'text-gray-900'}`}>
                        <thead className={`${darkMode ? 'bg-gray-600' : 'bg-gray-200'} text-xs uppercase`}>
                          <tr>
                            <th className="px-3 py-2 text-center w-12">Select</th>
                            <th className="px-3 py-2 text-left">Item No.</th>
                            <th className="px-3 py-2 text-left">Description</th>
                            <th className="px-3 py-2 text-right">Qty Ordered</th>
                            <th className="px-3 py-2 text-right">Qty Remaining</th>
                            <th className="px-3 py-2 text-right">Qty Received</th>
                            <th className="px-3 py-2 text-right">Inventory Qty</th>
                          </tr>
                        </thead>
                      <tbody className={`divide-y ${darkMode ? 'divide-gray-600' : 'divide-gray-200'}`}>
                        {poItems.map((item) => (
                          <tr key={item.rid} className={selectedItems[item.rid] ? (darkMode ? 'bg-gray-600' : 'bg-blue-50') : ''}>
                            <td className="px-3 py-2 text-center">
                              <input
                                type="checkbox"
                                checked={!!selectedItems[item.rid]}
                                onChange={(e) => handleItemSelect(item, e.target.checked)}
                                className="w-4 h-4 rounded"
                              />
                            </td>
                            <td className="px-3 py-2">{item.itemNmbr}</td>
                            <td className="px-3 py-2">{item.itemDesc}</td>
                            <td className="px-3 py-2 text-right">{item.qtyOrder}</td>
                            <td className="px-3 py-2 text-right">{item.qtyRemaining}</td>
                             <td className="px-3 py-2 text-right">
                               <input
                                 type="number"
                                 min="0"
                                 max={(originalQuantities[item.rid] || 0) + item.qtyRemaining}
                                 value={itemQuantities[item.rid] || 0}
                                 onChange={(e) => handleQuantityChange(item, e.target.value)}
                                 disabled={!selectedItems[item.rid]}
                                 className={`w-20 px-2 py-1 rounded border text-right ${darkMode
                                     ? 'bg-gray-700 border-gray-600 text-white'
                                     : 'bg-white border-gray-300 text-gray-900'
                                   } focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed`}
                               />
                             </td>
                            <td className="px-3 py-2 text-right">
                              <input
                                type="number"
                                min="0"
                                value={inventoryQuantities[item.rid] || 0}
                                onChange={(e) => handleInventoryQuantityChange(item, e.target.value)}
                                disabled={!selectedItems[item.rid]}
                                className={`w-20 px-2 py-1 rounded border text-right ${darkMode
                                    ? 'bg-gray-700 border-gray-600 text-white'
                                    : 'bg-white border-gray-300 text-gray-900'
                                  } focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed`}
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      </table>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        <div className={`px-6 py-4 border-t ${darkMode ? 'border-gray-600' : 'border-gray-200'} flex justify-end gap-3`}>
          <button
            onClick={onClose}
            className={`px-4 py-2 rounded-lg border ${darkMode
                ? 'border-gray-600 text-gray-300 hover:bg-gray-700'
                : 'border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
          >
            Cancel
          </button>
          <button
            onClick={handleUpdate}
            disabled={loading || !selectedPO || loadingPOs}
            className={`px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {loading ? 'Updating...' : 'Update Receiving Entry'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default EditReceivingEntryModal;