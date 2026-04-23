'use client';

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import { useAuth } from '@/utils/authContext';
import { createReceivingEntry, getApprovedPurchaseOrdersForReceiving, getNextReceivingNumber } from '../_actions';

function CreateReceivingEntryModal({ isOpen, onClose, darkMode, user, onSuccess }) {
  const { isAdmin } = useAuth();
  const [loading, setLoading] = useState(false);
  const [approvedPOs, setApprovedPOs] = useState([]);
  const [loadingPOs, setLoadingPOs] = useState(false);
  const [selectedPO, setSelectedPO] = useState(null);
  const [receivingNumber, setReceivingNumber] = useState('');
  const [receivingData, setReceivingData] = useState({
    vendorId: '',
    vendName: '',
    receivedBy: '',
    dateReceived: new Date().toISOString().split('T')[0],
    vndDocNm: '',
    locnCode: '',
    receiptType: 'Purchase Receipt',
    remarks: ''
  });

  const [selectedItems, setSelectedItems] = useState({});
  const [itemQuantities, setItemQuantities] = useState({});
  const [inventoryQuantities, setInventoryQuantities] = useState({});

  const loadApprovedPOs = useCallback(async () => {
    setLoadingPOs(true);
    setSelectedItems({});
    setItemQuantities({});
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
    }
  }, [user, isAdmin]);

  const loadReceivingNumber = useCallback(async () => {
    try {
      const result = await getNextReceivingNumber();
      if (result.success) {
        setReceivingNumber(result.referenceNo);
      } else {
        toast.error(result.message || 'Failed to generate receiving number');
      }
    } catch (error) {
      console.error('Error loading receiving number:', error);
      toast.error('Failed to generate receiving number');
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      loadApprovedPOs();
      loadReceivingNumber();
      setSelectedPO(null);
      setSelectedItems({});
      setItemQuantities({});
      setInventoryQuantities({});
      setReceivingData({
        vendorId: '',
        vendName: '',
        receivedBy: user?.empName || '',
        dateReceived: new Date().toISOString().split('T')[0],
        vndDocNm: '',
        locnCode: '',
        receiptType: 'Purchase Receipt',
        remarks: ''
      });
    }
  }, [isOpen, user, loadApprovedPOs, loadReceivingNumber]);

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
    const poNumber = e.target.value;
    const po = approvedPOs.find(p => p.poNumber === poNumber);
    setSelectedPO(po || null);
    setSelectedItems({});
    setItemQuantities({});
    setInventoryQuantities({});
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
    const maxQty = item.qtyRemaining;
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

  const handleCreate = async () => {
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

      const poDetails = approvedPOs.filter(p => p.poNumber === selectedPO.poNumber);
      poDetails.forEach(detail => {
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

      const result = await createReceivingEntry(
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
        toast.success('Receiving entry created successfully');
        onSuccess?.();
        onClose();
      } else {
        toast.error(result.message || 'Failed to create receiving entry');
      }
    } catch (error) {
      console.error('Error creating receiving entry:', error);
      toast.error('Failed to create receiving entry');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

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
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div className="min-w-0 flex-1">
                <h2 className={`text-lg sm:text-xl font-semibold truncate ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  Create Receiving Entry
                </h2>
              </div>
            </div>
            <div className="flex items-center gap-2 sm:gap-3">
              {receivingNumber && (
                <span className={`hidden sm:inline-flex px-3 py-1.5 text-xl sm:text-2xl font-bold rounded-full ${darkMode ? 'text-blue-300' : 'text-blue-800'}`}>
                  {receivingNumber}
                </span>
              )}
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
          {/* RR Number for mobile */}
          {receivingNumber && (
            <div className="sm:hidden mt-2">
              <span className={`inline-flex px-3 py-1 text-sm font-bold rounded-full ${darkMode ? 'bg-blue-900/60 text-blue-300' : 'bg-blue-100 text-blue-800'}`}>
                {receivingNumber}
              </span>
            </div>
          )}
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          <div className="space-y-6">
            <div>
              <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                Select Purchase Order (P.O. APPROVED)
              </label>
              <select
                value={selectedPO?.poNumber || ''}
                onChange={handlePOChange}
                className={`w-full px-4 py-2 rounded-lg border ${darkMode
                    ? 'bg-gray-700 border-gray-600 text-white'
                    : 'bg-white border-gray-300 text-gray-900'
                  } focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                disabled={loadingPOs}
              >
                <option value="">{loadingPOs ? 'Loading...' : 'Select a Purchase Order'}</option>
                {Object.values(poGroups).map(po => (
                  <option key={po.poNumber} value={po.poNumber}>
                    {po.poNumber} - {po.vendName}
                  </option>
                ))}
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
                      value={receivingData.dateReceived}
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
                        {poGroups[selectedPO.poNumber]?.items.map((item) => (
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
                                max={item.qtyRemaining}
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
            onClick={handleCreate}
            disabled={loading || !selectedPO || loadingPOs}
            className={`px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {loading ? 'Creating...' : 'Create Receiving Entry'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default CreateReceivingEntryModal;