'use client';

import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Printer } from 'lucide-react';
import { useAuth } from '../../../../../utils/authContext';

export const PurchaseOrderPrintModal = ({ isOpen, onClose, purchaseOrder }) => {
  const { darkMode } = useAuth();
  const printRef = useRef(null);
  const [isPrinting, setIsPrinting] = useState(false);

  if (!isOpen || !purchaseOrder) return null;

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'UTC'
    });
  };

  const handlePrint = async () => {
    setIsPrinting(true);
    try {
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        alert('Please allow popups for this website to print');
        setIsPrinting(false);
        return;
      }

      const printContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            @media print {
              body { font-family: Arial, sans-serif; margin: 0; padding: 12px; }
              .header { border-bottom: 2px solid #333; padding-bottom: 12px; margin-bottom: 18px; }
              .company-name { font-size: 19px; font-weight: bold; color: #2563eb; margin-bottom: 6px; }
              .po-number { font-size: 13px; color: #dc2626; }
              .po-number strong { font-size: 16px; }
              .status { display: inline-block; padding: 2px 7px; border-radius: 12px; font-size: 7px; font-weight: bold; margin-left: 6px; }
              .status-posted { background: #d1fae5; color: #065f46; }
              .status-not-posted { background: #fef3c7; color: #d97706; }
              .info-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 9px; margin-bottom: 18px; }
              .info-item { margin-bottom: 5px; }
              .info-label { font-size: 8px; color: #666; margin-bottom: 1px; }
              .info-value { font-size: 11px; font-weight: bold; color: #333; }
              .info-value-small { font-size: 9px; font-weight: bold; color: #333; }
              .remarks { margin-bottom: 18px; padding: 9px; background: #f9f9f9; border-left: 4px solid #2563eb; }
              .remarks-label { font-weight: bold; margin-bottom: 3px; }
              .flags { margin-bottom: 18px; }
              .flag-item { display: inline-block; padding: 2px 5px; margin: 1px; border-radius: 7px; font-size: 6px; font-weight: bold; }
              table { width: 100%; border-collapse: collapse; margin-top: 12px; }
              th, td { border: 1px solid #ddd; padding: 5px; text-align: left; font-size: 10px;}
              th { background: #f5f5f5; font-weight: bold; }
              .text-right { text-align: right; }
              .text-center { text-align: center; }
              .total-row { font-weight: bold; background: #f0f0f0; }
              .footer { margin-top: 21px; text-align: center; font-size: 10px; color: #666; }
              @page { margin: 1in 1in 3.5in 1in; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="company-name">SANTEH FEEDS CORPORATION</div>
            <div style="display: flex; align-items: center; justify-content: space-between;">
              <div class="po-number">Purchase Order # : <strong>${purchaseOrder.header.poNumber}</strong></div>
            </div>
          </div>

          <div class="info-grid">
            <div class="info-item">
              <div class="info-label">VENDOR NAME</div>
              <div class="info-value">${purchaseOrder.header.vendName || 'N/A'}</div>
            </div>
            <div class="info-item">
              <div class="info-label">PO DATE</div>
              <div class="info-value">${purchaseOrder.header.poDate ? new Date(purchaseOrder.header.poDate).toLocaleDateString() : 'N/A'}</div>
            </div>
            <div class="info-item">
              <div class="info-label">PAYMENT TERMS</div>
              <div class="info-value-small">${purchaseOrder.header.pymtrmid || 'N/A'}</div>
            </div>
            <div class="info-item">
              <div class="info-label">DELIVERY TO</div>
              <div class="info-value-small">${purchaseOrder.header.deliveryTo || 'N/A'}</div>
            </div>
            <div class="info-item">
              <div class="info-label">CONTACT PERSON</div>
              <div class="info-value-small">${purchaseOrder.header.contactPerson || 'N/A'}</div>
            </div>
            <div class="info-item">
              <div class="info-label">CANVASSED BY</div>
              <div class="info-value-small">${purchaseOrder.header.canvassedBy || 'N/A'}</div>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th style="width: 10%;">Item No</th>
                <th style="width: 25%;">Item Description</th>
                <th style="width: 8%;">UOFM</th>
                <th style="width: 10%;" class="text-center">Quantity</th>
                <th style="width: 12%;" class="text-right">Unit Cost</th>
                <th style="width: 12%;" class="text-right">Extended Cost</th>
                <th style="width: 10%;">Budget</th>
                
              </tr>
            </thead>
            <tbody>
              ${purchaseOrder.details && purchaseOrder.details.length > 0
                ? purchaseOrder.details.map(item => `
                    <tr>
                      <td>${item.itemNmbr || '-'}</td>
                      <td>${item.itemDesc || '-'}</td>
                      <td>${item.uofm || '-'}</td>
                      <td class="text-center">${item.qtyOrder || 0}</td>
                      <td class="text-right">₱${item.unitCost?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}</td>
                      <td class="text-right">₱${item.extdCost?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}</td>
                      <td>${item.budgetNo || '-'}</td>
                     
                    </tr>
                  `).join('')
                : '<tr><td colspan="8" class="text-center">No items found for this order</td></tr>'
              }
            </tbody>
            <tfoot>
              <tr class="total-row">
                <td colspan="5" class="text-right">Subtotal:</td>
                <td class="text-right">₱${purchaseOrder.header.subtotal?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}</td>
                <td colspan="2"></td>
              </tr>
            </tfoot>
          </table>

          ${(purchaseOrder.header.remarks || purchaseOrder.header.isBudgetNo === 1 || purchaseOrder.header.isPrNo === 1 || purchaseOrder.header.capex === 1 || purchaseOrder.header.isPerAdvise === 1) ? `
            <div class="remarks" style="margin-top: 20px; margin-bottom: 10px; font-size: 10px;">
              <div class="remarks-label">REMARKS:</div>
              <div>${purchaseOrder.header.remarks || ''}</div>
              ${(purchaseOrder.header.isBudgetNo === 1 || purchaseOrder.header.isPrNo === 1 || purchaseOrder.header.capex === 1 || purchaseOrder.header.isPerAdvise === 1) ? `
                <div style="margin-top: 10px;">
                  ${purchaseOrder.header.isBudgetNo === 1 && purchaseOrder.header.budgetNoList ?  purchaseOrder.header.budgetNoList  : ''}
                  <br/>
                  ${purchaseOrder.header.isPrNo === 1 && purchaseOrder.header.prList ?  purchaseOrder.header.prList  : ''}
                  <div style="margin-top: 5px;">
                    ${purchaseOrder.header.capex === 1 ? '<span class="flag-item" style="background: #e9d5ff; color: #7c2d92;">CAPEX</span>' : ''}
                    ${purchaseOrder.header.isPerAdvise === 1 ? '<span class="flag-item" style="background: #fed7aa; color: #c2410c;">Per Advise</span>' : ''}
                  </div>
                </div>
              ` : ''}
            </div>
          ` : ''}

          <div style="margin-top: 30px; display: flex; justify-content: space-between; width: 100%; font-size: 10px;">
            <div style="flex: 1; text-align: left; margin-left: 60px;">
                Created By: <strong>${purchaseOrder.header.createdBy || '____________________'}</strong><br/>
                </div>  
            <div style="flex: 1; text-align: center;">
                Confirmed By: <strong>${purchaseOrder.header.confirmedBy || '____________________'}</strong>
              </div>
            <div style="flex: 1; text-align: right; margin-right: 60px;">
              Approved By: <strong>${purchaseOrder.header.approvedBy || '____________________'}</strong>
            </div>
          </div>

          <div class="footer">
            <div>Generated on: ${new Date().toLocaleString()}</div>
            <div>SANTEH FEEDS CORPORATION - Purchase Order System</div>
          </div>
        </body>
        </html>
      `;

      printWindow.document.write(printContent);
      printWindow.document.close();

      // Wait for content to load
      printWindow.onload = () => {
        printWindow.print();
        // Close the window after printing (optional)
        setTimeout(() => {
          printWindow.close();
        }, 1000);
      };

    } catch (error) {
      console.error('Print error:', error);
      alert('Error occurred while preparing print. Please try again.');
    } finally {
      setIsPrinting(false);
    }
  };

  const getStatusBadgeClass = (status) => {
    return status === 1 ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800';
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className={`relative w-full max-w-5xl max-h-[90vh] overflow-hidden rounded-2xl shadow-2xl ${darkMode ? 'bg-gray-800' : 'bg-white'}`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className={`flex items-center justify-between p-6 border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
            <div>
              <h2 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                Print Purchase Order
              </h2>
              <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Preview and print the purchase order details
              </p>
            </div>
            <div className="flex items-center gap-3">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handlePrint}
                disabled={isPrinting}
                className={`flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                  isPrinting ? 'cursor-wait' : 'cursor-pointer'
                }`}
              >
                <Printer className="h-4 w-4" />
                {isPrinting ? 'Preparing...' : 'Print'}
              </motion.button>
              <button
                onClick={onClose}
                className={`p-2 rounded-lg transition-colors ${
                  darkMode
                    ? 'hover:bg-gray-700 text-gray-400 hover:text-white'
                    : 'hover:bg-gray-100 text-gray-500 hover:text-gray-700'
                }`}
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Print Preview Content */}
          <div
            ref={printRef}
            className="overflow-y-auto max-h-[calc(90vh-120px)] p-6 bg-white text-black"
            style={{ fontFamily: 'Arial, sans-serif' }}
          >
            {/* Header */}
            <div style={{ borderBottom: '2px solid #333', paddingBottom: '12px', marginBottom: '18px' }}>
              <div style={{ fontSize: '19px', fontWeight: 'bold', color: '#2563eb', marginBottom: '6px' }}>
                SANTEH FEEDS CORPORATION
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ fontSize: '13px', color: '#dc2626' }}>
                  Purchase Order # : <strong style={{ fontSize: '16px' }}>{purchaseOrder.header.poNumber}</strong>
                </div>
              </div>
            </div>

            {/* Order Information */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '9px', marginBottom: '18px' }}>
              <div>
                <div style={{ fontSize: '12px', color: '#666', marginBottom: '1px' }}>VENDOR NAME</div>
                <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#333' }}>{purchaseOrder.header.vendName || 'N/A'}</div>
              </div>
              <div>
                <div style={{ fontSize: '12px', color: '#666', marginBottom: '1px' }}>PO DATE</div>
                <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#333' }}>
                  {purchaseOrder.header.poDate ? new Date(purchaseOrder.header.poDate).toLocaleDateString() : 'N/A'}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '12px', color: '#666', marginBottom: '1px' }}>PAYMENT TERMS</div>
                <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#333' }}>{purchaseOrder.header.pymtrmid || 'N/A'}</div>
              </div>
              <div>
                <div style={{ fontSize: '12px', color: '#666', marginBottom: '1px' }}>DELIVERY TO</div>
                <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#333' }}>{purchaseOrder.header.deliveryTo || 'N/A'}</div>
              </div>
              <div>
                <div style={{ fontSize: '12px', color: '#666', marginBottom: '1px' }}>CONTACT PERSON</div>
                <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#333' }}>{purchaseOrder.header.contactPerson || 'N/A'}</div>
              </div>
              <div>
                <div style={{ fontSize: '12px', color: '#666', marginBottom: '1px' }}>CANVASSED BY</div>
                <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#333' }}>{purchaseOrder.header.canvassedBy || 'N/A'}</div>
              </div>
            </div>

            {/* Items Table */}
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-gray-300">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="border border-gray-300 px-3 py-2 text-left text-xs font-bold">Item Description</th>
                    <th className="border border-gray-300 px-3 py-2 text-left text-xs font-bold">Item No</th>
                    <th className="border border-gray-300 px-3 py-2 text-left text-xs font-bold">UOFM</th>
                    <th className="border border-gray-300 px-3 py-2 text-center text-xs font-bold">Quantity</th>
                    <th className="border border-gray-300 px-3 py-2 text-right text-xs font-bold">Unit Cost</th>
                    <th className="border border-gray-300 px-3 py-2 text-right text-xs font-bold">Extended Cost</th>
                    <th className="border border-gray-300 px-3 py-2 text-left text-xs font-bold">Budget</th>
                    {/* <th className="border border-gray-300 px-3 py-2 text-left text-xs font-bold">Status</th> */}
                  </tr>
                </thead>
                <tbody>
                  {purchaseOrder.details && purchaseOrder.details.length > 0 ? (
                    purchaseOrder.details.map((item, index) => (
                      <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        <td className="border border-gray-300 px-3 py-2 text-sm">{item.itemDesc || '-'}</td>
                        <td className="border border-gray-300 px-3 py-2 text-sm">{item.itemNmbr || '-'}</td>
                        <td className="border border-gray-300 px-3 py-2 text-sm">{item.uofm || '-'}</td>
                        <td className="border border-gray-300 px-3 py-2 text-sm text-center font-semibold">{item.qtyOrder || 0}</td>
                        <td className="border border-gray-300 px-3 py-2 text-sm text-right">
                          ₱{item.unitCost?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
                        </td>
                        <td className="border border-gray-300 px-3 py-2 text-sm text-right font-semibold">
                          ₱{item.extdCost?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
                        </td>
                        <td className="border border-gray-300 px-3 py-2 text-sm">{item.budgetNo || '-'}</td>
                        {/* <td className="border border-gray-300 px-3 py-2 text-sm">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            item.itemStatus === 'PENDING'
                              ? 'bg-yellow-100 text-yellow-800'
                              : item.itemStatus === 'DELIVERED'
                                ? 'bg-green-100 text-green-800'
                                : 'bg-gray-100 text-gray-800'
                          }`}>
                            {item.itemStatus || 'PENDING'}
                          </span>
                        </td> */}
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="8" className="border border-gray-300 px-3 py-4 text-center text-gray-500">
                        No items found for this order
                      </td>
                    </tr>
                  )}
                </tbody>
                <tfoot>
                  <tr className="bg-gray-100 font-bold">
                    <td colSpan="5" className="border border-gray-300 px-3 py-2 text-right">Subtotal:</td>
                    <td className="border border-gray-300 px-3 py-2 text-right">
                      ₱{purchaseOrder.header.subtotal?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
                    </td>
                    <td colSpan="2" className="border border-gray-300"></td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Remarks */}
            {(purchaseOrder.header.remarks || purchaseOrder.header.isBudgetNo === 1 || purchaseOrder.header.isPrNo === 1 ||
              purchaseOrder.header.capex === 1 || purchaseOrder.header.isPerAdvise === 1) && (
              <div className="mt-6 p-4 bg-gray-50 border-l-4 border-blue-500">
                <div className="font-bold text-sm mb-1">REMARKS:</div>
                {purchaseOrder.header.remarks && (
                  <div className="text-sm text-gray-700 mb-2">{purchaseOrder.header.remarks}</div>
                )}
                {(purchaseOrder.header.isBudgetNo === 1 || purchaseOrder.header.isPrNo === 1 ||
                  purchaseOrder.header.capex === 1 || purchaseOrder.header.isPerAdvise === 1) && (
                  <div>
                    {purchaseOrder.header.isBudgetNo === 1 && purchaseOrder.header.budgetNoList && (
                      <div className="mb-1">
                       {purchaseOrder.header.budgetNoList}
                      </div>
                    )}
                    {purchaseOrder.header.isPrNo === 1 && purchaseOrder.header.prList && (
                      <div className="mb-1">
                        {purchaseOrder.header.prList}
                      </div>
                    )}
                    <div className="flex flex-wrap gap-2 mt-2">
                      {purchaseOrder.header.capex === 1 && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                          CAPEX
                        </span>
                      )}
                      {purchaseOrder.header.isPerAdvise === 1 && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                          Per Advise
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Confirmed By and Approved By */}
            <div style={{ marginTop: '30px', display: 'flex', justifyContent: 'space-between', width: '100%' }}>
              <div style={{ flex: 1, textAlign: 'left' }}>
                Created By: <strong>{purchaseOrder.header.createdBy || '____________________'}</strong><br/>
                </div>
              <div style={{ flex: 1, textAlign: 'center' }}>
                Confirmed By: <strong>{purchaseOrder.header.confirmedBy || '____________________'}</strong>
              </div>
              <div style={{ flex: 1, textAlign: 'right' }}>
                Approved By: <strong>{purchaseOrder.header.approvedBy || '____________________'}</strong>
              </div>
            </div>

            {/* Footer */}
            <div className="mt-4 text-center text-xs text-gray-500">
              <div>Generated on: {new Date().toLocaleString()}</div>
              <div>SANTEH FEEDS CORPORATION - Purchase Order System</div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
