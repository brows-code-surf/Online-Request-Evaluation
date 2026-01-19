'use client';

import { useState } from 'react';
import { toast } from 'react-toastify';

function PurchaseOrderDetails({ purchaseOrder, onClose, darkMode, onPost, onCancel }) {
  const [posting, setPosting] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  const getStatusColor = (status) => {
    switch (status) {
      case 1:
        return 'bg-green-100 text-green-800 border-green-300';
      case 0:
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getStatusText = (status) => {
    return status === 1 ? 'POSTED' : 'NOT POSTED';
  };

  const handlePost = async () => {
    if (!window.confirm('Are you sure you want to post this purchase order? This action cannot be undone.')) {
      return;
    }

    setPosting(true);
    try {
      await onPost?.(purchaseOrder.header.PONUMBER);
    } catch (error) {
      console.error('Error posting purchase order:', error);
      toast.error('Failed to post purchase order');
    } finally {
      setPosting(false);
    }
  };

  const handleCancel = async () => {
    const reason = window.prompt('Please enter the reason for cancellation:');
    if (!reason || !reason.trim()) {
      return;
    }

    setCancelling(true);
    try {
      await onCancel?.(purchaseOrder.header.PONUMBER, reason.trim());
    } catch (error) {
      console.error('Error canceling purchase order:', error);
      toast.error('Failed to cancel purchase order');
    } finally {
      setCancelling(false);
    }
  };

  if (!purchaseOrder) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className={`text-center ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
          <svg className="w-16 h-16 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p className="text-lg font-medium">Select a purchase order to view details</p>
          <p className="text-sm mt-2">Click on any purchase order from the list on the left to see its details.</p>
        </div>
      </div>
    );
  }

  const { header, details } = purchaseOrder;

  return (
    <div className="space-y-6">
      {/* Header Information */}
      <div className={`p-6 rounded-lg border ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              Purchase Order {header.PONUMBER}
            </h2>
            <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border mt-2 ${getStatusColor(header.POSTSTATUS)}`}>
              {getStatusText(header.POSTSTATUS)}
            </div>
          </div>
          <div className="flex space-x-2">
            {header.POSTSTATUS === 0 && (
              <>
                <button
                  onClick={handleCancel}
                  disabled={cancelling}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                >
                  {cancelling ? 'Cancelling...' : 'Cancel PO'}
                </button>
                <button
                  onClick={handlePost}
                  disabled={posting}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                >
                  {posting ? 'Posting...' : 'Post PO'}
                </button>
              </>
            )}
          </div>
        </div>

        {/* PO Details Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div>
            <h3 className={`text-sm font-medium mb-3 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              Supplier Information
            </h3>
            <div className="space-y-2">
              <div>
                <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Vendor ID:</span>
                <span className={`ml-2 text-sm font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>{header.VENDORID || 'N/A'}</span>
              </div>
              <div>
                <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Vendor Name:</span>
                <span className={`ml-2 text-sm font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>{header.VENDNAME || 'N/A'}</span>
              </div>
              <div>
                <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Payment Terms:</span>
                <span className={`ml-2 text-sm font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>{header.PYMTRMID || 'N/A'}</span>
              </div>
            </div>
          </div>

          <div>
            <h3 className={`text-sm font-medium mb-3 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              Order Information
            </h3>
            <div className="space-y-2">
              <div>
                <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>PO Date:</span>
                <span className={`ml-2 text-sm font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  {header.PODATE ? new Date(header.PODATE).toLocaleDateString() : 'N/A'}
                </span>
              </div>
              <div>
                <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Date Needed:</span>
                <span className={`ml-2 text-sm font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  {header.DATENEEDED ? new Date(header.DATENEEDED).toLocaleDateString() : 'N/A'}
                </span>
              </div>
              <div>
                <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Delivery To:</span>
                <span className={`ml-2 text-sm font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>{header.DELIVERY_TO || 'N/A'}</span>
              </div>
            </div>
          </div>

          <div>
            <h3 className={`text-sm font-medium mb-3 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              Processing Information
            </h3>
            <div className="space-y-2">
              <div>
                <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Created By:</span>
                <span className={`ml-2 text-sm font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>{header.CREATEDBY || 'N/A'}</span>
              </div>
              <div>
                <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Created Date:</span>
                <span className={`ml-2 text-sm font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  {header.DATECREATED ? new Date(header.DATECREATED).toLocaleDateString() : 'N/A'}
                </span>
              </div>
              <div>
                <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Canvassed By:</span>
                <span className={`ml-2 text-sm font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>{header.CANVASSEDBY || 'N/A'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Flags */}
        <div className="mt-6">
          <h3 className={`text-sm font-medium mb-3 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
            Order Flags
          </h3>
          <div className="flex flex-wrap gap-2">
            {header.IS_BUDGETNO && (
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800`}>
                Budget No.
              </span>
            )}
            {header.IS_PRNO && (
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800`}>
                PR No.
              </span>
            )}
            {header.CAPEX && (
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800`}>
                CAPEX
              </span>
            )}
            {header.IS_PERADVISE && (
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800`}>
                Per Advise
              </span>
            )}
          </div>
        </div>

        {/* Remarks */}
        {header.REMARKS && (
          <div className="mt-6">
            <h3 className={`text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              Remarks
            </h3>
            <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
              {header.REMARKS}
            </p>
          </div>
        )}
      </div>

      {/* Items Table */}
      <div className={`rounded-lg border ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className={`text-lg font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            Order Items ({details.length})
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className={`${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
              <tr>
                <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${darkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                  Item Details
                </th>
                <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${darkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                  Quantity
                </th>
                <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${darkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                  Unit Cost
                </th>
                <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${darkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                  Extended Cost
                </th>
                <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${darkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                  Status
                </th>
              </tr>
            </thead>
            <tbody className={`${darkMode ? 'bg-gray-800 divide-gray-700' : 'bg-white divide-gray-200'}`}>
              {details.map((item, index) => (
                <tr key={item.RID} className={`${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-50'}`}>
                  <td className="px-6 py-4">
                    <div>
                      <div className={`text-sm font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                        {item.ITEMDESC}
                      </div>
                      <div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        Item No: {item.ITEMNMBR}
                      </div>
                      <div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        Budget: {item.BUDGETNO}
                      </div>
                      {(item.BRAND || item.ORIGIN) && (
                        <div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                          {item.BRAND && `Brand: ${item.BRAND}`}
                          {item.BRAND && item.ORIGIN && ' • '}
                          {item.ORIGIN && `Origin: ${item.ORIGIN}`}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`text-sm ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                      {item.QTYORDER} {item.UOFM}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`text-sm ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                      ₱{item.UNITCOST?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`text-sm font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                      ₱{item.EXTDCOST?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-2">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        item.ITEMSTATUS === 'PENDING'
                          ? 'bg-yellow-100 text-yellow-800'
                          : item.ITEMSTATUS === 'DELIVERED'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                      }`}>
                        {item.ITEMSTATUS || 'PENDING'}
                      </span>
                      <div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        Served: {item.QTYSERVED || 0}
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className={`${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
              <tr>
                <td colSpan="3" className={`px-6 py-4 text-right text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Subtotal:
                </td>
                <td className={`px-6 py-4 text-sm font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  ₱{header.SUBTOTAL?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
                </td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Additional Information */}
      {(header.PROMISEDDATE || header.PROMISEDSHIPDATE) && (
        <div className={`p-6 rounded-lg border ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
          <h3 className={`text-lg font-medium mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            Delivery Schedule
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {header.PROMISEDDATE && (
              <div>
                <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Promised Date:</span>
                <span className={`ml-2 text-sm font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  {new Date(header.PROMISEDDATE).toLocaleDateString()}
                </span>
              </div>
            )}
            {header.PROMISEDSHIPDATE && (
              <div>
                <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Promised Ship Date:</span>
                <span className={`ml-2 text-sm font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  {new Date(header.PROMISEDSHIPDATE).toLocaleDateString()}
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default PurchaseOrderDetails;
