'use client';

import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Printer } from 'lucide-react';
import { useAuth } from '../../../../utils/authContext';

export const PurchaseRequestPrintModal = ({ isOpen, onClose, purchaseRequest }) => {
  const { darkMode } = useAuth();
  const printRef = useRef(null);
  const [isPrinting, setIsPrinting] = useState(false);

  if (!isOpen || !purchaseRequest) return null;

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
          <title>Purchase Request - ${purchaseRequest.referenceNo}</title>
          <style>
            @media print {
              body { font-family: Arial, sans-serif; margin: 0; padding: 20px; }
              .header { border-bottom: 2px solid #333; padding-bottom: 20px; margin-bottom: 30px; }
              .company-name { font-size: 24px; font-weight: bold; color: #2563eb; margin-bottom: 10px; }
              .reference-no { font-size: 18px; font-weight: bold; color: #dc2626; }
              .status { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: bold; margin-left: 10px; }
              .status-posted { background: #ddd6fe; color: #7c3aed; }
              .status-for-confirmation { background: #dbeafe; color: #2563eb; }
              .status-for-approval { background: #fef3c7; color: #d97706; }
              .status-completed { background: #d1fae5; color: #065f46; }
              .status-rejected { background: #fee2e2; color: #dc2626; }
              .info-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; margin-bottom: 30px; }
              .info-item { margin-bottom: 8px; }
              .info-label { font-size: 12px; color: #666; font-weight: bold; margin-bottom: 2px; }
              .info-value { font-size: 14px; color: #333; }
              .remarks { margin-bottom: 30px; padding: 15px; background: #f9f9f9; border-left: 4px solid #2563eb; }
              .remarks-label { font-weight: bold; margin-bottom: 5px; }
              table { width: 100%; border-collapse: collapse; margin-top: 20px; }
              th, td { border: 1px solid #ddd; padding: 8px; text-align: left; font-size: 12px; }
              th { background: #f5f5f5; font-weight: bold; }
              .text-right { text-align: right; }
              .text-center { text-align: center; }
              .total-row { font-weight: bold; background: #f0f0f0; }
              .rush-indicator { color: #dc2626; font-weight: bold; font-size: 16px; }
              .footer { margin-top: 40px; text-align: center; font-size: 10px; color: #666; }
              @page { margin: 0.5in; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="company-name">${purchaseRequest.company || 'SANTEH'}</div>
            <div style="display: flex; align-items: center; justify-content: space-between;">
              <div class="reference-no">Purchase Request #${purchaseRequest.referenceNo}</div>
              <div>
                <span class="status status-${purchaseRequest.requestStatus?.toLowerCase().replace(' ', '-') || 'unknown'}">
                  ${purchaseRequest.requestStatus || 'Unknown'}
                </span>
                ${purchaseRequest.isRush ? '<span class="rush-indicator">RUSH</span>' : ''}
              </div>
            </div>
            <div style="margin-top: 10px; font-size: 12px; color: #666;">
              Requested on: ${formatDate(purchaseRequest.dateRequested)}
            </div>
          </div>

          <div class="info-grid">
            <div class="info-item">
              <div class="info-label">REQUESTED BY</div>
              <div class="info-value">${purchaseRequest.requestedBy || '-'}</div>
            </div>
            <div class="info-item">
              <div class="info-label">LOCATION</div>
              <div class="info-value">${purchaseRequest.locationCode || '-'}</div>
            </div>
            <div class="info-item">
              <div class="info-label">REVIEWER</div>
              <div class="info-value">${purchaseRequest.reviewer || '-'}
                ${purchaseRequest.dateReviewed ? ` [REVIEWED: ${formatDate(purchaseRequest.dateReviewed)}]` : ' [PENDING]'}</div>
            </div>
            <div class="info-item">
              <div class="info-label">APPROVER</div>
              <div class="info-value">${purchaseRequest.approver || '-'}
                ${purchaseRequest.dateApproved ? ` [APPROVED: ${formatDate(purchaseRequest.dateApproved)}]` : ' [PENDING]'}</div>
            </div>
            <div class="info-item">
              <div class="info-label">ADDRESSED TO</div>
              <div class="info-value">${purchaseRequest.addressedTo || '-'}
                ${purchaseRequest.dateReceived ? ` [RECEIVED: ${formatDate(purchaseRequest.dateReceived)}]` : ' [PENDING]'}</div>
            </div>
          </div>

          ${purchaseRequest.remarks ? `
            <div class="remarks">
              <div class="remarks-label">REMARKS:</div>
              <div>${purchaseRequest.remarks}</div>
            </div>
          ` : ''}

          <table>
            <thead>
              <tr>
                <th style="width: 10%;">Item Code</th>
                <th style="width: 25%;">Item Description</th>
                <th style="width: 8%;">UOFM</th>
                <th style="width: 10%;" class="text-center">Quantity</th>
                <th style="width: 15%;">Budget Name</th>
                <th style="width: 12%;">Date Needed</th>
                <th style="width: 20%;">Remarks</th>
              </tr>
            </thead>
            <tbody>
              ${purchaseRequest.details && purchaseRequest.details.length > 0
                ? purchaseRequest.details.map(item => `
                    <tr>
                      <td>${item.itemNumber || '-'}</td>
                      <td>${item.itemDescription || '-'}</td>
                      <td>${item.unitOfMeasure || '-'}</td>
                      <td class="text-center">${item.quantity || 0}</td>
                      <td>${item.budgetName || '-'}</td>
                      <td>${item.dateNeeded ? new Date(item.dateNeeded).toLocaleDateString() : '-'}</td>
                      <td>${item.remarks || '-'}</td>
                    </tr>
                  `).join('')
                : '<tr><td colspan="7" class="text-center">No items found for this request</td></tr>'
              }
            </tbody>
          </table>

          <div class="footer">
            <div>Generated on: ${new Date().toLocaleString()}</div>
            <div>SANTEH FEEDS CORPORATION - Purchase Request System</div>
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
    switch (status) {
      case 'POSTED':
        return 'bg-purple-100 text-purple-800';
      case 'FOR CONFIRMATION':
        return 'bg-blue-100 text-blue-800';
      case 'FOR REQUEST APPROVAL':
        return 'bg-yellow-100 text-yellow-800';
      case 'FOR PURCHASING LEAD TIME':
        return 'bg-orange-100 text-orange-800';
      case 'COMPLETED':
        return 'bg-green-100 text-green-800';
      case 'REJECTED':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
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
                Print Purchase Request
              </h2>
              <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Preview and print the purchase request details
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
            <div className="border-b-2 border-gray-800 pb-4 mb-6">
              <div className="text-2xl font-bold text-blue-600 mb-2">
                {purchaseRequest.company || 'SANTEH'}
              </div>
              <div className="flex items-center justify-between">
                <div className="text-xl font-bold text-red-600">
                  Purchase Request #{purchaseRequest.referenceNo}
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-3 py-1 rounded-full text-xs font-bold border ${getStatusBadgeClass(purchaseRequest.requestStatus)}`}>
                    {purchaseRequest.requestStatus}
                  </span>
                  {purchaseRequest.isRush && (
                    <span className="text-red-600 font-bold text-sm">RUSH</span>
                  )}
                </div>
              </div>
              <div className="text-sm text-gray-600 mt-2">
                Requested on: {formatDate(purchaseRequest.dateRequested)}
              </div>
            </div>

            {/* Request Information */}
            <div className="grid grid-cols-2 gap-6 mb-6">
              <div>
                <div className="text-xs font-bold text-gray-600 mb-1">REQUESTED BY</div>
                <div className="text-sm text-gray-900">{purchaseRequest.requestedBy}</div>
              </div>
              <div>
                <div className="text-xs font-bold text-gray-600 mb-1">LOCATION</div>
                <div className="text-sm text-gray-900">{purchaseRequest.locationCode}</div>
              </div>
              <div>
                <div className="text-xs font-bold text-gray-600 mb-1">REVIEWER</div>
                <div className="text-sm text-gray-900">
                  {purchaseRequest.reviewer || '-'}
                  {purchaseRequest.dateReviewed ? (
                    <span className="text-green-600 ml-2 text-xs">
                      [REVIEWED: {formatDate(purchaseRequest.dateReviewed)}]
                    </span>
                  ) : (
                    <span className="text-orange-600 ml-2 text-xs">[PENDING]</span>
                  )}
                </div>
              </div>
              <div>
                <div className="text-xs font-bold text-gray-600 mb-1">APPROVER</div>
                <div className="text-sm text-gray-900">
                  {purchaseRequest.approver || '-'}
                  {purchaseRequest.dateApproved ? (
                    <span className="text-green-600 ml-2 text-xs">
                      [APPROVED: {formatDate(purchaseRequest.dateApproved)}]
                    </span>
                  ) : (
                    <span className="text-orange-600 ml-2 text-xs">[PENDING]</span>
                  )}
                </div>
              </div>
              <div className="col-span-2">
                <div className="text-xs font-bold text-gray-600 mb-1">ADDRESSED TO</div>
                <div className="text-sm text-gray-900">
                  {purchaseRequest.addressedTo || '-'}
                  {purchaseRequest.dateReceived ? (
                    <span className="text-green-600 ml-2 text-xs">
                      [RECEIVED: {formatDate(purchaseRequest.dateReceived)}]
                    </span>
                  ) : (
                    <span className="text-orange-600 ml-2 text-xs">[PENDING]</span>
                  )}
                </div>
              </div>
            </div>

            {/* Remarks */}
            {purchaseRequest.remarks && (
              <div className="mb-6 p-4 bg-gray-50 border-l-4 border-blue-500">
                <div className="font-bold text-sm mb-1">REMARKS:</div>
                <div className="text-sm text-gray-700">{purchaseRequest.remarks}</div>
              </div>
            )}

            {/* Items Table */}
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-gray-300">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="border border-gray-300 px-3 py-2 text-left text-xs font-bold">Item Code</th>
                    <th className="border border-gray-300 px-3 py-2 text-left text-xs font-bold">Item Description</th>
                    <th className="border border-gray-300 px-3 py-2 text-left text-xs font-bold">UOFM</th>
                    <th className="border border-gray-300 px-3 py-2 text-center text-xs font-bold">Quantity</th>
                    <th className="border border-gray-300 px-3 py-2 text-left text-xs font-bold">Budget Name</th>
                    <th className="border border-gray-300 px-3 py-2 text-left text-xs font-bold">Date Needed</th>
                    <th className="border border-gray-300 px-3 py-2 text-left text-xs font-bold">Remarks</th>
                  </tr>
                </thead>
                <tbody>
                  {purchaseRequest.details && purchaseRequest.details.length > 0 ? (
                    purchaseRequest.details.map((item, index) => (
                      <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        <td className="border border-gray-300 px-3 py-2 text-sm">{item.itemNumber || '-'}</td>
                        <td className="border border-gray-300 px-3 py-2 text-sm">{item.itemDescription || '-'}</td>
                        <td className="border border-gray-300 px-3 py-2 text-sm">{item.unitOfMeasure || '-'}</td>
                        <td className="border border-gray-300 px-3 py-2 text-sm text-center font-semibold">{item.quantity || 0}</td>
                        <td className="border border-gray-300 px-3 py-2 text-sm">{item.budgetName || '-'}</td>
                        <td className="border border-gray-300 px-3 py-2 text-sm">
                          {item.dateNeeded ? new Date(item.dateNeeded).toLocaleDateString() : '-'}
                        </td>
                        <td className="border border-gray-300 px-3 py-2 text-sm">{item.remarks || '-'}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="7" className="border border-gray-300 px-3 py-4 text-center text-gray-500">
                        No items found for this request
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Footer */}
            <div className="mt-8 text-center text-xs text-gray-500">
              <div>Generated on: {new Date().toLocaleString()}</div>
              <div>SANTEH FEEDS CORPORATION - Purchase Request System</div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
