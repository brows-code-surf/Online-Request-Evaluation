'use client';

import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Printer } from 'lucide-react';
import { useAuth } from '../../../../../utils/authContext';

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
  
  const finalQty = (quantity, qtyCancel) => {
    const qtyCancelNum = parseFloat(qtyCancel) || 0;
    const quantityNum = parseFloat(quantity) || 0;
    return quantityNum - qtyCancelNum;
  };

  const generateHeader = (purchaseRequest, currentPage, totalPages) => `
    <!-- Header Top -->
    <div class="header-top">
      <div class="header-left">
        <img src="/SANTEH-LOGO/SFC.png" alt="SANTEH" class="company-logo" />
        <div class="company-info">
          701 RICHWELL CENTER, 102 TIMOG AVE,<br>
          QUEZON CITY, METRO MANILA, PHILIPPINES<br>
          NON-VAT Reg. TIN: 000-240-016-00000
        </div>
      </div>
      <div class="header-upper-right">
        <div class="form-details">
          <span class="form-details-inline" style="margin-right: 20px;">Form No.:PUR-F-01</span>
          <span class="form-details-inline" style="margin-right: 20px;">Rev. No.: 2</span>
          <span class="form-details-inline">Eff. Date: 15 October 2008</span>
        </div>
        <div class="po-title">PURCHASE REQUEST</div>
        <!-- Purchase Request Info Table -->
        <table class="po-info-table">
          <tr>
            <td class="po-info-cell" style="width: 50%; border-top: 1px solid #ccc;">
              <div class="po-info-label">Document No.</div>
              <div class="po-info-value" style="font-size: 14px; font-weight: bold;">${purchaseRequest.referenceNo || 'N/A'}</div>
            </td>
            <td class="po-info-cell" style="width: 50%; border-top: 1px solid #ccc;">
              <div class="po-info-label">Page</div>
              <div class="po-info-value">${currentPage}/${totalPages}</div>
            </td>
          </tr>
          <tr>
            <td class="po-info-cell">
              <div class="po-info-label">Requested Date</div>
              <div class="po-info-value">${purchaseRequest.dateRequested ? new Date(purchaseRequest.dateRequested).toLocaleDateString() : 'N/A'}</div>
            </td>
            <td class="po-info-cell">
              <div class="po-info-label">Location</div>
              <div class="po-info-value">${purchaseRequest.locationCode || 'N/A'}</div>
            </td>
          </tr>
        </table>
      </div>
    </div>

    <!-- Requester Section -->
    <div class="supplier-section">
      <div class="supplier-box">
        <div class="supplier-label">Requested By</div>
        <div class="supplier-name">${purchaseRequest.requestedBy || 'N/A'}</div>
        <div class="supplier-info">
          Company: ${purchaseRequest.company || 'N/A'}
        </div>
      </div>
      <div class="supplier-box">
        <div class="supplier-label">Addressed To</div>
        <div class="supplier-name">${purchaseRequest.addressedTo || 'N/A'}</div>
        <div class="supplier-info">
          Status: ${purchaseRequest.requestStatus || 'N/A'}
        </div>
      </div>
    </div>
  `;

  const generateFooter = (purchaseRequest) => `
    <!-- Footer Section -->
    <div class="footer-section">
      <div class="signature-section">
        <div class="sig-header">
          <div class="sig-col" style="text-align: left; margin-bottom: 50px;">Requested By:</div>
          <div class="sig-col" style="text-align: left; margin-left: 50px; margin-bottom: 50px;">Reviewed By:</div>
          <div class="sig-col" style="text-align: left; margin-left: 50px; margin-bottom: 50px;">Approved By:</div>
        </div>
        <div style="display: flex; justify-content: space-between; gap: 40px;">
          <div class="sig-col">
            <div class="sig-name" style="margin-bottom: 1px; height: 15px; display: flex; align-items: center; justify-content: center;">${purchaseRequest.requestedBy || ''}</div>
            <div class="sig-line"></div>
            <div style="font-size: 10px;">Signature Over Printed Name</div>
          </div>
          <div class="sig-col">
            <div class="sig-name" style="margin-bottom: 1px; height: 15px; display: flex; align-items: center; justify-content: center;">${purchaseRequest.reviewer || ''}</div>
            <div class="sig-line"></div>
            <div style="font-size: 10px;">Signature Over Printed Name</div>
          </div>
          <div class="sig-col">
            <div class="sig-name" style="margin-bottom: 1px; height: 15px; display: flex; align-items: center; justify-content: center;">${purchaseRequest.approver || ''}</div>
            <div class="sig-line"></div>
            <div style="font-size: 10px;">Signature Over Printed Name</div>
          </div>
        </div>
      </div>

      <!-- Footer Info -->
      <div class="footer-row">
        <div class="footer-col">
          Document Series: OPR00000001-OPR99999999
        </div>
        <div class="footer-col" style="min-width: 600px;">
          Software Provider: MIS — Software Calumpit, Bulacan
        </div>
      </div>
    </div>
  `;

  const handlePrint = async () => {
    setIsPrinting(true);
    try {
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        alert('Please allow popups for this website to print');
        setIsPrinting(false);
        return;
      }

      const items = purchaseRequest.details || [];
      const totalItems = items.length;
      const remarks = purchaseRequest.remarks || '';

      const calculateRemarksHeight = (text) => {
        if (!text || text.length === 0) return 0;
        const charsPerLine = 100;
        const lineHeight = 14;
        const numLines = Math.ceil(text.length / charsPerLine);
        const basePadding = 20;
        return (numLines * lineHeight) + basePadding;
      };

      const calculateRowHeight = (item) => {
        const baseHeight = 28;
        const descLength = (item.itemDescription || '').length;
        const extraHeight = Math.floor(descLength / 20) * 3;
        return baseHeight + extraHeight;
      };

      const totalItemsHeight = items.reduce((sum, item) => sum + calculateRowHeight(item), 0);

      const HEADER_HEIGHT = 180;
      const FOOTER_HEIGHT = 150;
      const availableHeight = 900 - HEADER_HEIGHT - FOOTER_HEIGHT;

      const calculateItemsPerPage = () => {
        let currentPageItems = [];
        let currentPageHeight = 0;
        let pageNum = 1;
        const pages = [];

        items.forEach((item) => {
          const itemHeight = calculateRowHeight(item);
          const reservedHeight = 60;
          const effectiveAvailableHeight = availableHeight - reservedHeight;

          if (currentPageHeight + itemHeight > effectiveAvailableHeight && currentPageItems.length > 0) {
            pages.push({ items: currentPageItems, pageNum: pageNum });
            pageNum++;
            currentPageItems = [item];
            currentPageHeight = itemHeight;
          } else {
            currentPageItems.push(item);
            currentPageHeight += itemHeight;
          }
        });

        if (currentPageItems.length > 0) {
          pages.push({ items: currentPageItems, pageNum: pageNum });
        }

        return pages;
      };

      const pages = calculateItemsPerPage();
      const actualTotalPages = pages.length === 0 ? 1 : pages.length;

      let allPagesHtml = '';

      pages.forEach((page, index) => {
        const pageNum = index + 1;
        const pageItems = page.items;
        const isLastPage = pageNum === actualTotalPages;
        const remarksHeight = calculateRemarksHeight(remarks);
        const lastPageItemsHeight = pageItems.reduce((sum, item) => sum + calculateRowHeight(item), 0);
        const footerElementsHeight = 60;
        const remainingSpaceAfterItems = availableHeight - footerElementsHeight - lastPageItemsHeight;
        const remarksDisplayMode = remarksHeight > remainingSpaceAfterItems ? 'normal' : 'pre-wrap';

        const pageHtml = `
          <div class="print-page">
            ${generateHeader(purchaseRequest, pageNum, actualTotalPages)}

            <!-- Items Table -->
            <table>
              <thead>
                <tr>
                  <th style="width: 10%; padding: 4px 3px;">Item Code</th>
                  <th style="width: 35%; padding: 4px 3px;">Item Description</th>
                  <th style="width: 10%; padding: 4px 3px; text-align: center;">U/M</th>
                  <th style="width: 15%; padding: 4px 3px; text-align: center;">Quantity</th>
                  <th style="width: 15%; padding: 4px 3px; text-align: left;">Budget Code</th>
                  <th style="width: 15%; padding: 4px 3px; text-align: left;">Date Needed</th>
                </tr>
              </thead>
              <tbody>
                ${pageItems.length > 0
                  ? pageItems.map((item) => `
                      <tr>
                        <td style="width: 10%; padding: 4px 3px; text-align: left; vertical-align: top;">${item.itemNumber || '-'}</td>
                        <td style="width: 35%; padding: 4px 3px; vertical-align: top;">${item.itemDescription || '-'}</td>
                        <td style="width: 10%; padding: 4px 3px; text-align: center; vertical-align: top;">${item.unitOfMeasure || '-'}</td>
                        <td style="width: 15%; padding: 4px 3px; text-align: center; vertical-align: top;">${finalQty(item.quantity, item.qtyCancel)}</td>
                        <td style="width: 15%; padding: 4px 3px; vertical-align: top;">${item.budgetCode || '-'}</td>
                        <td style="width: 15%; padding: 4px 3px; vertical-align: top;">${item.dateNeeded ? new Date(item.dateNeeded).toLocaleDateString() : '-'}</td>
                      </tr>
                    `).join('')
                  : '<tr><td colspan="6" style="padding: 4px 3px; text-align: center; color: #666;">No items found for this purchase request</td></tr>'}
              </tbody>
            </table>

            ${isLastPage ? `
              <div class="nothing-else">--------------------------------------------------------------------------------------------------- Nothing Else Follows -----------------------------------------------------------------------------------------------</div>

              <div class="line-items-count">
                Number of Line Items: ${totalItems}
              </div>

              ${remarks ? `
                <div class="remarks-label">Remarks:</div>
                <div style="font-size: 9px; margin-bottom: 10px; white-space: ${remarksDisplayMode};">${remarksDisplayMode === 'normal' ? remarks.replace(/\n/g, ' ') : remarks}</div>
              ` : ''}
            ` : ''}

            ${generateFooter(purchaseRequest)}
          </div>
        `;

        allPagesHtml += pageHtml;
      });

      const printContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            @media print {
              body { font-family: Arial, sans-serif; margin: 0; padding: 2px; padding-bottom: 80px; font-size: 10px; }
              .header-top { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px; padding-bottom: 5px; }
              .header-left { flex: 0.5; }
              .header-right { flex: 0.5; text-align: left; }
              .header-upper-right { flex: 0.5; text-align: right; margin: 5px 0 0 0; }
              .company-logo { max-width: 120px; height: auto; }
              .company-name { font-size: 13px; font-weight: bold; color: #333; margin-bottom: 2px; }
              .company-info { font-size: 10px; color: #333; line-height: 1.3; }
              .form-details { font-size: 10px; color: #333; margin-bottom: 3px; }
              .form-details-inline { display: inline-block; }
              .po-title { font-size: 16px; font-weight: bold; text-align: right; margin: 5px 0 0 0; }
              .po-info-table { width: 100%; border-collapse: collapse; text-align: left; margin-top: 5px; margin-bottom: 10px; font-size: 9px; }
              .po-info-cell { padding: 3px 5px; border: none; border-bottom: 1px solid #ccc; }
              .po-info-label { font-size: 10px; color: #666; font-weight: normal; margin-bottom: 2px; }
              .po-info-value { color: #333; font-size: 10px; }
              .supplier-section { display: flex; justify-content: space-between; margin: 15px 0; }
              .supplier-box { flex: 1; }
              .supplier-box:last-child { margin-left: 10px; }
              .supplier-label { font-size: 9px; color: #666; font-weight: normal; margin-bottom: 6px; }
              .supplier-name { font-size: 11px; font-weight: bold; margin-bottom: 5px; }
              .supplier-info { font-size: 9px; color: #333; line-height: 1.4; }
              table { width: 100%; border-collapse: collapse; margin: 10px 0; font-size: 9px; table-layout: fixed; }
              th { background: #666; color: white; font-weight: bold; padding: 4px 3px; text-align: left; }
              td { padding: 4px 3px; }
              td.text-center { text-align: center; }
              td.text-right { text-align: right; }
              .nothing-else { text-align: center; font-weight: bold; margin: 8px 0; padding: 5px 0; }
              .total-row { display: flex; justify-content: flex-end; margin: 10px 0; font-weight: bold; font-size: 11px; }
              .total-amount { border-bottom: 4px double #ccc; padding-bottom: 1px; min-width: 150px; text-align: right; }
              .line-items-count { font-size: 9px; margin: 5px 0; }
              .remarks-label { font-style: italic; margin: 10px 0 5px 0; font-size: 9px; }
              .condition-text { font-size: 9px; line-height: 1.5; color: #333; margin: 15px 0; }
              .distribution-section { margin: 15px 0; }
              .distribution-title { font-size: 12px; font-weight: bold; margin-bottom: 8px; text-align: center; }
              .distribution-table { width: 100%; border-collapse: collapse; font-size: 9px; margin-bottom: 10px; }
              .distribution-table th { background: #666; color: white; font-weight: bold; padding: 4px 3px; text-align: left; }
              .distribution-table td { padding: 4px 3px; border-bottom: 1px solid #ccc; }
              .signature-section { border-top: 1px solid #ccc; padding-top: 8px; margin-bottom: 10px; }
              .sig-header { display: flex; justify-content: space-between; font-size: 9px; margin-bottom: 10px; color: #666; }
              .sig-col { flex: 1; text-align: center; }
              .sig-line { border-top: 1px solid #ccc; padding-top: 3px; font-size: 7px; width: 100%; }
              .sig-name { margin-top: 5px; font-size: 9px; }
              .footer-section { font-size: 9px; margin-top: 20px; padding-top: 8px; position: fixed; bottom: 0; left: 0; right: 0; background: white; padding: 8px 2px; width: 100%; }
              .footer-row { display: flex; justify-content: space-between; margin: 3px 0; border-top: 1px solid #ccc; border-bottom: 1px solid #ccc; padding-top: 8px; padding-bottom: 8px; }
              .footer-col { flex: 1; text-align: left; min-width: 300px; }
              @page { margin: 0.3in; size: auto; }
              .print-page { page-break-after: always; min-height: 0; }
              .print-page:last-child { page-break-after: auto; }
            }
          </style>
        </head>
        <body>
          ${allPagesHtml}
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
                    <th className="border border-gray-300 px-3 py-2 text-left text-xs font-bold">Budget Code</th>
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
                        <td className="border border-gray-300 px-3 py-2 text-sm text-center font-semibold">{finalQty(item.quantity, item.qtyCancel)}</td>
                        <td className="border border-gray-300 px-3 py-2 text-sm">{item.budgetCode || '-'}</td>
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
