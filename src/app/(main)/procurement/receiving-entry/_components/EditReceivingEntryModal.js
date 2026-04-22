'use client';

import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { useAuth } from '@/utils/authContext';
import { updateReceivingEntry, getApprovedPurchaseOrdersForReceiving } from '../_actions';

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
  const [itemsData, setItemsData] = useState([]);

  useEffect(() => {
    if (isOpen) {
      loadApprovedPOs();
      
      if (receivingEntry?.header) {
        setSelectedPO({ poNumber: receivingEntry.header.poNumber });
        setReceivingData({
          vendorId: receivingEntry.header.vendorId || '',
          vendName: receivingEntry.header.vendName || '',
          receivedBy: receivingEntry.header.createdBy || '',
          dateReceived: receivingEntry.header.dateReceived ? new Date(receivingEntry.header.dateReceived).toISOString().split('T')[0] : '',
          vndDocNm: receivingEntry.header.vndDocNm || '',
          locnCode: receivingEntry.header.locnCode || '',
          receiptType: receivingEntry.header.receiptType || 'Purchase Receipt',
          remarks: receivingEntry.header.remarks || ''
        });
        
        if (receivingEntry.details) {
          setItemsData(receivingEntry.details.map(item => ({
            rid: item.rid,
            itemNmbr: item.itemNmbr,
            itemDesc: item.itemDesc,
            uofm: item.uofm,
            inventoryQuantity: item.inventoryQuantity || 0,
            quantity: item.quantity || 0,
            unitCost: item.unitCost || 0,
            extdCost: item.extdCost || 0,
            brand: item.brand,
            origin: item.origin,
            budgetNo: item.budgetNo,
            prCode: item.prCode,
            itemStatus: item.itemStatus || 'RECEIVED'
          })));
        }
      }
    }
  }, [isOpen, receivingEntry]);

  const loadApprovedPOs = async () => {
    setLoadingPOs(true);
    try {
      const result = await getApprovedPurchaseOrdersForReceiving(user, isAdmin());
      if (result.success) {
        setApprovedPOs(result.purchaseOrders || []);
      }
    } catch (error) {
      console.error('Error loading approved POs:', error);
    } finally {
      setLoadingPOs(false);
    }
  };

  const handlePOChange = (e) => {
    const poNumber = e.target.value;
    const po = approvedPOs.find(p => p.poNumber === poNumber);
    setSelectedPO(po || { poNumber });
    
    if (po) {
      setReceivingData(prev => ({
        ...prev,
        vendorId: po.vendorId || '',
        vendName: po.vendName || ''
      }));
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setReceivingData(prev => ({ ...prev, [name]: value }));
  };

  const handleItemChange = (index, field, value) => {
    setItemsData(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      
      if (field === 'quantity' || field === 'inventoryQuantity' || field === 'unitCost') {
        const qty = field === 'quantity' ? value : updated[index].quantity;
        const invQty = field === 'inventoryQuantity' ? value : updated[index].inventoryQuantity;
        const cost = field === 'unitCost' ? value : updated[index].unitCost;
        updated[index].extdCost = (cost || 0) * ((field === 'quantity' ? value : qty) || 0);
      }
      
      return updated;
    });
  };

  const handleUpdate = async () => {
    if (!selectedPO) {
      toast.error('Please select a purchase order');
      return;
    }

    if (!receivingData.receivedBy) {
      toast.error('Please enter created by');
      return;
    }

    setLoading(true);
    try {
      const result = await updateReceivingEntry(
        receivingEntry.header.referenceNo,
        {
          poNumber: selectedPO.poNumber,
          vendorId: receivingData.vendorId,
          vendName: receivingData.vendName,
          receivedBy: receivingData.receivedBy,
          dateReceived: receivingData.dateReceived,
          vndDocNm: receivingData.vndDocNm,
          locnCode: receivingData.locnCode,
          receiptType: receivingData.receiptType,
          remarks: receivingData.remarks,
          receivingStatus: 'RECEIVED',
          inventoryDescription: receivingData.receivedBy
        },
        itemsData,
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
<div className={`relative w-full max-w-7xl max-h-[90vh] overflow-hidden rounded-lg shadow-xl ${
          darkMode ? 'bg-gray-800' : 'bg-white'
        }`}>
        <div className={`px-6 py-4 border-b ${darkMode ? 'border-gray-600' : 'border-gray-200'}`}>
          <div className="flex items-center justify-between">
            <h2 className={`text-xl font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              Edit Receiving Entry
            </h2>
            <button
              onClick={onClose}
              className={`p-2 rounded-lg ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          <div className="space-y-6">
            <div>
              <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                Purchase Order
              </label>
              <select
                value={selectedPO?.poNumber || ''}
                onChange={handlePOChange}
                className={`w-full px-4 py-2 rounded-lg border ${
                  darkMode 
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
                      className={`w-full px-4 py-2 rounded-lg border ${
                        darkMode 
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
                      className={`w-full px-4 py-2 rounded-lg border ${
                        darkMode 
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
                      className={`w-full px-4 py-2 rounded-lg border ${
                        darkMode 
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
                      className={`w-full px-4 py-2 rounded-lg border ${
                        darkMode 
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
                      className={`w-full px-4 py-2 rounded-lg border ${
                        darkMode 
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
                      className={`w-full px-4 py-2 rounded-lg border ${
                        darkMode 
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
                      className={`w-full px-4 py-2 rounded-lg border ${
                        darkMode 
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
                    className={`w-full px-4 py-2 rounded-lg border ${
                      darkMode 
                        ? 'bg-gray-700 border-gray-600 text-white' 
                        : 'bg-white border-gray-300 text-gray-900'
                    } focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                  />
                </div>

                <div className={`${darkMode ? 'bg-gray-700' : 'bg-gray-50'} rounded-lg p-4`}>
                  <h4 className={`font-medium mb-3 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    Items
                  </h4>
                  <div className="overflow-x-auto">
                    <table className={`w-full text-sm ${darkMode ? 'text-gray-300' : 'text-gray-900'}`}>
                      <thead className={`${darkMode ? 'bg-gray-600' : 'bg-gray-200'} text-xs uppercase`}>
                        <tr>
                          <th className="px-3 py-2 text-left">Item No.</th>
                          <th className="px-3 py-2 text-left">Description</th>
                          <th className="px-3 py-2 text-center">UOFM</th>
                          <th className="px-3 py-2 text-right">Inv. Qty</th>
                          <th className="px-3 py-2 text-right">Qty Received</th>
                          <th className="px-3 py-2 text-right">Unit Cost</th>
                          <th className="px-3 py-2 text-right">Extended Cost</th>
                        </tr>
                      </thead>
                      <tbody className={`divide-y ${darkMode ? 'divide-gray-600' : 'divide-gray-200'}`}>
                        {itemsData.map((item, idx) => (
                          <tr key={idx}>
                            <td className="px-3 py-2">{item.itemNmbr}</td>
                            <td className="px-3 py-2">{item.itemDesc}</td>
                            <td className="px-3 py-2 text-center">{item.uofm}</td>
                            <td className="px-3 py-2">
                              <input
                                type="number"
                                min="0"
                                value={item.inventoryQuantity}
                                onChange={(e) => handleItemChange(idx, 'inventoryQuantity', parseFloat(e.target.value) || 0)}
                                className={`w-20 px-2 py-1 rounded border text-right ${
                                  darkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'
                                }`}
                              />
                            </td>
                            <td className="px-3 py-2">
                              <input
                                type="number"
                                min="0"
                                value={item.quantity}
                                onChange={(e) => handleItemChange(idx, 'quantity', parseFloat(e.target.value) || 0)}
                                className={`w-20 px-2 py-1 rounded border text-right ${
                                  darkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'
                                }`}
                              />
                            </td>
                            <td className="px-3 py-2">
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={item.unitCost}
                                onChange={(e) => handleItemChange(idx, 'unitCost', parseFloat(e.target.value) || 0)}
                                className={`w-24 px-2 py-1 rounded border text-right ${
                                  darkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'
                                }`}
                              />
                            </td>
                            <td className="px-3 py-2 text-right font-medium">
                              {item.extdCost?.toLocaleString('en-US', { style: 'currency', currency: 'PHP' })}
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
            className={`px-4 py-2 rounded-lg border ${
              darkMode 
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