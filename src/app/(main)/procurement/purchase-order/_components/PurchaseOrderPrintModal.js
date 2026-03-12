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
              body { font-family: Arial, sans-serif; margin: 0; padding: 2px; font-size: 10px; }
              .header-top { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px; padding-bottom: 5px; }
              .header-left { flex: 0.5; }
              .header-right { flex: 0.5; text-align: left; }
              .header-upper-right { flex: 0.5; text-align: right; margin: 5px 0 0 0; }
              .company-logo { max-width: 120px; height: auto; }
              .company-name { font-size: 13px; font-weight: bold; color: #333; margin-bottom: 2px; }
              .company-info { font-size: 10px; color: #333; line-height: 1.3; }
              .form-details { font-size: 8px; color: #333; margin-bottom: 3px; }
              .form-details-inline { display: inline-block; }
              .po-title { font-size: 16px; font-weight: bold; text-align: right; margin: 5px 0 0 0; }
              .header-bottom { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px; border-bottom: 1px solid #333; padding-bottom: 5px; margin-top: 5px; }
              .po-info-table { width: 100%; border-collapse: collapse; text-align: left; margin-top: 5px; margin-bottom: 10px; font-size: 9px; }
              .po-info-cell { padding: 3px 5px; border: none; border-bottom: 1px solid #ccc; }
              .po-info-col { flex: 1; }
              .po-info-label { font-size: 8px; color: #666; font-weight: normal; }
              .po-info-value {  color: #333; }
              .supplier-section { display: flex; justify-content: space-between; margin: 15px 0; }
              .supplier-box { flex: 1; }
              .supplier-box:last-child { margin-left: 30px; }
              .supplier-label { font-size: 9px; color: #666; font-weight: normal; margin-bottom: 6px; }
              .supplier-name { font-size: 11px; font-weight: bold; margin-bottom: 5px; }
              .supplier-info { font-size: 9px; color: #333; line-height: 1.4; }
              table { width: 100%; border-collapse: collapse; margin: 10px 0; font-size: 9px; table-layout: fixed; }
              th { background: #666; color: white; font-weight: bold; padding: 4px 3px; text-align: left; }
              td { padding: 4px 3px; }
              td.text-center { text-align: center; }
              td.text-right { text-align: right; }
              .item-desc-sub { font-size: 8px; color: #666; margin-top: 1px; }
              .nothing-else { text-align: center; font-weight: bold; margin: 8px 0; padding: 5px 0; }
              .total-row { display: flex; justify-content: flex-end; margin: 10px 0; font-weight: bold; font-size: 11px; }
              .total-amount { border-bottom: 2px solid #333; padding-bottom: 3px; min-width: 150px; text-align: right; }
              .line-items-count { font-size: 9px; margin: 5px 0; }
              .remarks-label { font-style: italic; margin: 10px 0 5px 0; font-size: 9px; }
              .condition-text { font-size: 8px; line-height: 1.5; color: #333; margin: 15px 0; }
              .signature-section { border-top: 1px solid #333; padding-top: 8px; }
              .sig-header { display: flex; justify-content: space-between; font-size: 8px; font-weight: bold; }
              .sig-col { flex: 1; text-align: center; }
              .sig-line { border-top: 1px solid #333; padding-top: 3px; font-size: 7px; width: 100%; }
              .sig-name { margin-top: 5px; font-size: 8px; }
              .footer-section { font-size: 7px; margin-top: 20px; border-top: 1px solid #333; padding-top: 8px; }
              .footer-row { display: flex; justify-content: space-between; margin: 3px 0; }
              .footer-col { flex: 1; }
              .tax-warning { font-weight: bold; text-decoration: underline; text-align: right; margin-top: 5px; }
              @page { margin: 0.3in; }
            }
          </style>
        </head>
        <body>
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
                <span class="form-details-inline">Form No.:PUR-F-03</span>
                <span class="form-details-inline">Rev. No.: 2</span>
                <span class="form-details-inline">Eff. Date: 15 October 2008</span>
              </div>
              <div class="po-title">LOCAL PURCHASE ORDER</div>
              <!-- PO Info Table -->
              <table class="po-info-table">
                <tr>
                  <td class="po-info-cell" style="width: 33%; border-top: 1px solid #ccc;">
                    <div class="po-info-label">Document No.</div>
                    <div class="po-info-value" style="font-size: 14px; font-weight: bold;">${purchaseOrder.header.poNumber || 'N/A'}</div>
                  </td>
                  <td class="po-info-cell" style="width: 33%; border-top: 1px solid #ccc;">
                    <div class="po-info-label">Document Date</div>
                    <div class="po-info-value">${purchaseOrder.header.poDate ? new Date(purchaseOrder.header.poDate).toLocaleDateString() : 'N/A'}</div>
                  </td>
                  <td class="po-info-cell" style="width: 34%; border-top: 1px solid #ccc;">
                    <div class="po-info-label">Page</div>
                    <div class="po-info-value">1/1</div>
                  </td>
                </tr>
                <tr>
                  <td class="po-info-cell">
                    <div class="po-info-label">Terms</div>
                    <div class="po-info-value">${purchaseOrder.header.pymtrmid || '30 DAYS'}</div>
                  </td>
                  <td class="po-info-cell">
                    <div class="po-info-label">Delivery Date</div>
                    <div class="po-info-value">${purchaseOrder.header.promisedDate ? new Date(purchaseOrder.header.promisedDate).toLocaleDateString() : 'N/A'}</div>
                  </td>
                  <td class="po-info-cell">
                    <div class="po-info-label">Currency</div>
                    <div class="po-info-value">Philippine Peso</div>
                  </td>
                </tr>
              </table>
            </div>
          </div>

          <!-- Supplier Section -->
          <div class="supplier-section">
            <div class="supplier-box">
              <div class="supplier-label">Supplier</div>
              <div class="supplier-name">${purchaseOrder.header.vendName || 'N/A'}</div>
              <div class="supplier-info">
                ${purchaseOrder.header.vendAddress || 'N/A'}<br>
                TIN: ${purchaseOrder.header.vendTIN || 'N/A'}
              </div>
            </div>
            <div class="supplier-box">
              <div class="supplier-label">Ship To</div>
              <div class="supplier-name">${purchaseOrder.header.deliveryTo || 'N/A'}</div>
              <div class="supplier-info">
                ${purchaseOrder.header.deliveryAddress || 'N/A'}
              </div>
            </div>
          </div>

          <!-- Items Table -->
          <table>
            <thead>
              <tr>
                <th style="width: 10%; padding: 4px 3px;">Item Number</th>
                <th style="width: 40%; padding: 4px 3px;">Item Description</th>
                <th style="width: 12%; padding: 4px 3px; text-align: center;">Quantity</th>
                <th style="width: 8%; padding: 4px 3px; text-align: center;">U/M</th>
                <th style="width: 15%; padding: 4px 3px; text-align: right;">Unit Price</th>
                <th style="width: 15%; padding: 4px 3px; text-align: right;">Amount</th>
              </tr>
            </thead>
            <tbody>
              ${purchaseOrder.details && purchaseOrder.details.length > 0
          ? purchaseOrder.details.map((item, idx) => `
                    <tr>
                      <td style="width: 10%; padding: 4px 3px; text-align: left;">${item.itemNmbr || '-'}</td>
                      <td style="width: 40%; padding: 4px 3px;">${item.itemDesc || '-'}</td>
                      <td style="width: 12%; padding: 4px 3px; text-align: center;">${item.qtyOrder || 0}</td>
                      <td style="width: 8%; padding: 4px 3px; text-align: center;">${item.uofm || '-'}</td>
                      <td style="width: 15%; padding: 4px 3px; text-align: right;">${item.unitCost?.toLocaleString('en-US', { minimumFractionDigits: 5, maximumFractionDigits: 5 }) || '0.00000'}</td>
                      <td style="width: 15%; padding: 4px 3px; text-align: right;">₱${item.extdCost?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}</td>
                    </tr>
                  `).join('')
          : '<tr><td colspan="6" style="padding: 4px 3px; text-align: center; color: #666;">No items found for this order</td></tr>'
        }
            </tbody>
          </table>

          <!-- Nothing Else Follows -->
          <div class="nothing-else">----------------------------------------------------------------------------------------- Nothing Else Follows --------------------------------------------------------------------------------------</div>

          <!-- Total Row -->
          <div class="total-row">
            <div style="text-align: right; margin-right: 20px;">Total Php</div>
            <div class="total-amount">₱${purchaseOrder.header.subtotal?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}</div>
          </div>

          <!-- Line Items Count -->
          <div class="line-items-count">
            Number of Line Items: ${purchaseOrder.details?.length || 0}
          </div>

          <!-- Remarks -->
          ${purchaseOrder.header.remarks ? `
            <div class="remarks-label">Remarks:</div>
            <div style="font-size: 9px; margin-bottom: 10px;">${purchaseOrder.header.remarks}</div>
          ` : ''}

          <!-- Condition of Purchase -->
          <div class="condition-text">
            <strong>Condition of Purchase:</strong><br>
            1. Acceptance of Purchase Order. By accepting this Purchase Order (PO), the Seller agrees to the stated terms. Any additional terms from the Seller are rejected unless agreed to in writing by the Buyer.<br>
            2. Delivery: Delivery must be made on or before the specified date. The Buyer reserves the right to cancel the PO without liability if the Seller fails to deliver on time.<br>
            3. Quality: The Buyer reserves the right to reject materials that do not meet the agreed-upon specifications. Rejected materials will be returned to the Seller at the Seller's expense.
          </div>

          <!-- Signature Section -->
          <div class="signature-section">
            <div class="sig-header" style="margin-bottom: 60px;">
              <div class="sig-col" style="text-align: left;">Prepared and Canvassed By:</div>
              <div class="sig-col" style="text-align: left;">Reviewed By:</div>
              <div class="sig-col" style="text-align: left;">Approved By:</div>
            </div>
            <div style="display: flex; justify-content: space-between; gap: 40px;">
              <div class="sig-col">
                <div class="sig-name" style="margin-bottom: 1px;">${purchaseOrder.header.canvassedBy || ''}</div>
                <div class="sig-line"></div>
                <div style="font-size: 7px;">Signature Over Printed Name</div>
              </div>
              <div class="sig-col">
                <div class="sig-name" style="margin-bottom: 1px;">${purchaseOrder.header.confirmedBy_1 && purchaseOrder.header.confirmedBy_2 ? purchaseOrder.header.confirmedBy_1 + ' / ' + purchaseOrder.header.confirmedBy_2 : purchaseOrder.header.confirmedBy_1 || purchaseOrder.header.confirmedBy_2 || ''}</div>
                <div class="sig-line"></div>
                <div style="font-size: 7px;">Signature Over Printed Name</div>
              </div>
              <div class="sig-col">
                <div class="sig-name" style="margin-bottom: 1px;">${purchaseOrder.header.approvedBy || ''}</div>
                <div class="sig-line"></div>
                <div style="font-size: 7px;">Signature Over Printed Name</div>
              </div>
            </div>
          </div>

          <!-- Footer Section -->
          <div class="footer-section">
            <div class="footer-row">
              <div class="footer-col">
                <strong>Acknowledgement Certificate Control No.:</strong> AC-116, 102024_000442<br>
                <strong>Date Issued:</strong> October 22, 2024<br>
                <strong>Document Series:</strong> POHO00000001-POHO99999999
              </div>
              <div class="footer-col">
                <strong>Software Provider:</strong> Jupiter Systems Inc.<br>
                <strong>Contact No.:</strong> +632 8812 5149 / +632 5328 3342 / +632 8812 3229<br>
                <strong>Email:</strong> sales@jupitersystems.com<br>
                <strong>Website:</strong> https://www.jupitersystems.com
              </div>
            </div>
            <div class="tax-warning">"THIS DOCUMENT IS NOT VALID FOR CLAIM OF INPUT TAX."</div>
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
                className={`flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${isPrinting ? 'cursor-wait' : 'cursor-pointer'
                  }`}
              >
                <Printer className="h-4 w-4" />
                {isPrinting ? 'Preparing...' : 'Print'}
              </motion.button>
              <button
                onClick={onClose}
                className={`p-2 rounded-lg transition-colors ${darkMode
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
            style={{ fontFamily: 'Arial, sans-serif', fontSize: '10px' }}
          >
            {/* Header Top */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px', paddingBottom: '5px' }}>
              <div style={{ flex: 0.5 }}>
                <img src="/SANTEH-LOGO/SFC.png" alt="SANTEH" style={{ maxWidth: '80px', height: 'auto', marginBottom: '5px' }} />
                <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#333', marginBottom: '2px' }}>FEEDS CORPORATION</div>
                <div style={{ fontSize: '8px', color: '#333', lineHeight: '1.3' }}>
                  701 RICHWELL CENTER, 102 TIMOG AVE,<br />
                  QUEZON CITY, METRO MANILA, PHILIPPINES<br />
                  NON-VAT Reg. TIN: 000-240-016-00000
                </div>
              </div>
              <div style={{ flex: 0.5, textAlign: 'right' }}>
                <div style={{ fontSize: '8px', color: '#333', marginBottom: '3px' }}>
                  <span style={{ display: 'inline-block', marginRight: '15px' }}><strong>Form No.:</strong> PUR-F-03</span>
                  <span style={{ display: 'inline-block', marginRight: '15px' }}><strong>Rev. No.:</strong> 2</span>
                  <span style={{ display: 'inline-block' }}><strong>Eff. Date:</strong> 15 October 2008</span>
                </div>
                <div style={{ fontSize: '20px', fontWeight: 'bold', textAlign: 'right', marginTop: '5px' }}>LOCAL PURCHASE ORDER</div>
                {/* PO Info Table */}
                <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '5px', marginBottom: '0px', fontSize: '9px' }}>
                  <tbody>
                    <tr>
                      <td style={{ padding: '3px 5px', border: 'none', borderBottom: '1px solid #ccc', borderTop: '1px solid #ccc', width: '33%' }}>
                        <div style={{ fontSize: '8px', color: '#666' }}>Document No.</div>
                        <div style={{ fontWeight: 'bold', color: '#333' }}>{purchaseOrder.header.poNumber || 'N/A'}</div>
                      </td>
                      <td style={{ padding: '3px 5px', border: 'none', borderBottom: '1px solid #ccc', borderTop: '1px solid #ccc', width: '33%' }}>
                        <div style={{ fontSize: '8px', color: '#666' }}>Document Date</div>
                        <div style={{ fontWeight: 'bold', color: '#333' }}>{purchaseOrder.header.poDate ? new Date(purchaseOrder.header.poDate).toLocaleDateString() : 'N/A'}</div>
                      </td>
                      <td style={{ padding: '3px 5px', border: 'none', borderBottom: '1px solid #ccc', borderTop: '1px solid #ccc', width: '34%' }}>
                        <div style={{ fontSize: '8px', color: '#666' }}>Page</div>
                        <div style={{ fontWeight: 'bold', color: '#333' }}>1/1</div>
                      </td>
                    </tr>
                    <tr>
                      <td style={{ padding: '3px 5px', border: 'none', borderBottom: '1px solid #ccc' }}>
                        <div style={{ fontSize: '8px', color: '#666' }}>Terms</div>
                        <div style={{ fontWeight: 'bold', color: '#333' }}>{purchaseOrder.header.pymtrmid || '30 DAYS'}</div>
                      </td>
                      <td style={{ padding: '3px 5px', border: 'none', borderBottom: '1px solid #ccc' }}>
                        <div style={{ fontSize: '8px', color: '#666' }}>Delivery Date</div>
                        <div style={{ fontWeight: 'bold', color: '#333' }}>{purchaseOrder.header.deliveryDate ? new Date(purchaseOrder.header.deliveryDate).toLocaleDateString() : 'N/A'}</div>
                      </td>
                      <td style={{ padding: '3px 5px', border: 'none', borderBottom: '1px solid #ccc' }}>
                        <div style={{ fontSize: '8px', color: '#666' }}>Currency</div>
                        <div style={{ fontWeight: 'bold', color: '#333' }}>Philippine Peso</div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', margin: '15px 0' }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '9px', color: '#666', marginBottom: '3px' }}>Supplier</div>
                <div style={{ fontSize: '11px', fontWeight: 'bold', marginBottom: '5px' }}>{purchaseOrder.header.vendName || 'N/A'}</div>
                <div style={{ fontSize: '9px', color: '#333', lineHeight: '1.4' }}>
                  {purchaseOrder.header.vendAddress || 'N/A'}<br />
                  TIN: {purchaseOrder.header.vendTIN || 'N/A'}
                </div>
              </div>
              <div style={{ flex: 1, marginLeft: '30px' }}>
                <div style={{ fontSize: '9px', color: '#666', marginBottom: '3px' }}>Ship To</div>
                <div style={{ fontSize: '11px', fontWeight: 'bold', marginBottom: '5px' }}>{purchaseOrder.header.deliveryTo || 'N/A'}</div>
                <div style={{ fontSize: '9px', color: '#333', lineHeight: '1.4' }}>
                  {purchaseOrder.header.deliveryAddress || 'N/A'}
                </div>
              </div>
            </div>

            {/* Items Table */}
            <table className="w-full border-collapse" style={{ margin: '10px 0', fontSize: '9px', tableLayout: 'fixed' }}>
              <thead>
                <tr style={{ background: '#666', color: 'white' }}>
                  <th style={{ padding: '4px 3px', textAlign: 'left', fontWeight: 'bold', width: '10%' }}>Item Number</th>
                  <th style={{ padding: '4px 3px', textAlign: 'left', fontWeight: 'bold', width: '40%' }}>Item Description</th>
                  <th style={{ padding: '4px 3px', textAlign: 'center', fontWeight: 'bold', width: '12%' }}>Quantity</th>
                  <th style={{ padding: '4px 3px', textAlign: 'center', fontWeight: 'bold', width: '8%' }}>U/M</th>
                  <th style={{ padding: '4px 3px', textAlign: 'right', fontWeight: 'bold', width: '15%' }}>Unit Price</th>
                  <th style={{ padding: '4px 3px', textAlign: 'right', fontWeight: 'bold', width: '15%' }}>Amount</th>
                </tr>
              </thead>
              <tbody>
                {purchaseOrder.details && purchaseOrder.details.length > 0 ? (
                  purchaseOrder.details.map((item, index) => (
                    <tr key={index}>
                      <td style={{ padding: '4px 3px', textAlign: 'left', width: '10%' }}>{item.itemNmbr || '-'}</td>
                      <td style={{ padding: '4px 3px', width: '40%' }}>{item.itemDesc || '-'}</td>
                      <td style={{ padding: '4px 3px', textAlign: 'center', width: '12%' }}>{item.qtyOrder || 0}</td>
                      <td style={{ padding: '4px 3px', textAlign: 'center', width: '8%' }}>{item.uofm || '-'}</td>
                      <td style={{ padding: '4px 3px', textAlign: 'right', width: '15%' }}>
                        ₱{item.unitCost?.toLocaleString('en-US', { minimumFractionDigits: 5, maximumFractionDigits: 5 }) || '0.00000'}
                      </td>
                      <td style={{ padding: '4px 3px', textAlign: 'right', width: '15%' }}>
                        ₱{item.extdCost?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="6" style={{ padding: '4px 3px', textAlign: 'center', color: '#666' }}>
                      No items found for this order
                    </td>
                  </tr>
                )}
              </tbody>
            </table>

            {/* Nothing Else Follows */}
            <div style={{ textAlign: 'center', fontWeight: 'bold', margin: '8px 0', padding: '5px 0', fontSize: '9px' }}>
              ------------------------------------------------------------------------------------------------ Nothing Else Follows ------------------------------------------------------------------------------------------------
            </div>

            {/* Total Row */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', margin: '10px 0', fontWeight: 'bold', fontSize: '11px' }}>
              <div style={{ textAlign: 'right', marginRight: '20px' }}>Total Php</div>
              <div style={{ borderBottom: '2px solid #333', paddingBottom: '3px', minWidth: '150px', textAlign: 'right' }}>
                ₱{purchaseOrder.header.subtotal?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
              </div>
            </div>

            {/* Line Items Count */}
            <div style={{ fontSize: '9px', margin: '5px 0' }}>
              Number of Line Items: {purchaseOrder.details?.length || 0}
            </div>

            {/* Remarks */}
            {purchaseOrder.header.remarks && (
              <>
                <div style={{ fontStyle: 'italic', margin: '10px 0 5px 0', fontSize: '9px' }}>Remarks:</div>
                <div style={{ fontSize: '9px', marginBottom: '10px' }}>{purchaseOrder.header.remarks}</div>
              </>
            )}

            {/* Condition of Purchase */}
            <div style={{ fontSize: '8px', lineHeight: '1.5', color: '#333', margin: '15px 0' }}>
              <strong>Condition of Purchase:</strong><br />
              1. Acceptance of Purchase Order. By accepting this Purchase Order (PO), the Seller agrees to the stated terms. Any additional terms from the Seller are rejected unless agreed to in writing by the Buyer.<br />
              2. Delivery: Delivery must be made on or before the specified date. The Buyer reserves the right to cancel the PO without liability if the Seller fails to deliver on time.<br />
              3. Quality: The Buyer reserves the right to reject materials that do not meet the agreed-upon specifications. Rejected materials will be returned to the Seller at the Seller's expense.
            </div>

            {/* Signature Section */}
            <div style={{ margin: '25px 0', borderTop: '1px solid #333', paddingTop: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '8px', fontWeight: 'bold', marginBottom: '30px' }}>
                <div style={{ flex: 1, textAlign: 'left' }}>Prepared and Canvassed By:</div>
                <div style={{ flex: 1, textAlign: 'left' }}>Reviewed By:</div>
                <div style={{ flex: 1, textAlign: 'left' }}>Approved By:</div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '40px' }}>
                <div style={{ flex: 1, textAlign: 'center' }}>
                  <div style={{ borderTop: '1px solid #333', paddingTop: '3px', marginBottom: '8px', fontSize: '8px', width: '100%' }}></div>
                  <div style={{ marginTop: '8px', marginBottom: '8px', fontSize: '8px' }}>{purchaseOrder.header.canvassedBy || 'Alexies T Deocareza'}</div>
                  <div style={{ borderTop: '1px solid #333', paddingTop: '3px', marginTop: '8px', marginBottom: '8px', fontSize: '8px', width: '100%' }}></div>
                  <div style={{ fontSize: '7px', marginTop: '8px' }}>Signature Over Printed Name</div>
                </div>
                <div style={{ flex: 1, textAlign: 'center' }}>
                  <div style={{ borderTop: '1px solid #333', paddingTop: '3px', marginBottom: '8px', fontSize: '8px', width: '100%' }}></div>
                  <div style={{ marginTop: '8px', marginBottom: '8px', fontSize: '8px' }}>{purchaseOrder.header.confirmedBy_1 && purchaseOrder.header.confirmedBy_2 ? `${purchaseOrder.header.confirmedBy_1} / ${purchaseOrder.header.confirmedBy_2}` : purchaseOrder.header.confirmedBy_1 || purchaseOrder.header.confirmedBy_2 || 'Alexies T Deocareza'}</div>
                  <div style={{ borderTop: '1px solid #333', paddingTop: '3px', marginTop: '8px', marginBottom: '8px', fontSize: '8px', width: '100%' }}></div>
                  <div style={{ fontSize: '7px', marginTop: '8px' }}>Signature Over Printed Name</div>
                </div>
                <div style={{ flex: 1, textAlign: 'center' }}>
                  <div style={{ borderTop: '1px solid #333', paddingTop: '3px', marginBottom: '8px', fontSize: '8px', width: '100%' }}></div>
                  <div style={{ marginTop: '8px', marginBottom: '8px', fontSize: '8px' }}>{purchaseOrder.header.approvedBy || 'Alexies T Deocareza'}</div>
                  <div style={{ borderTop: '1px solid #333', paddingTop: '3px', marginTop: '8px', marginBottom: '8px', fontSize: '8px', width: '100%' }}></div>
                  <div style={{ fontSize: '7px', marginTop: '8px' }}>Signature Over Printed Name</div>
                </div>
              </div>
            </div>

            {/* Footer Section */}
            <div style={{ fontSize: '7px', marginTop: '20px', borderTop: '1px solid #333', paddingTop: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', margin: '3px 0' }}>
                <div style={{ flex: 1 }}>
                  <strong>Acknowledgement Certificate Control No.:</strong> AC-116, 102024_000442<br />
                  <strong>Date Issued:</strong> October 22, 2024<br />
                  <strong>Document Series:</strong> POHO00000001-POHO99999999
                </div>
                <div style={{ flex: 1 }}>
                  <strong>Software Provider:</strong> Jupiter Systems Inc.<br />
                  <strong>Contact No.:</strong> +632 8812 5149 / +632 5328 3342 / +632 8812 3229<br />
                  <strong>Email:</strong> sales@jupitersystems.com<br />
                  <strong>Website:</strong> https://www.jupitersystems.com
                </div>
              </div>
              <div style={{ fontWeight: 'bold', textDecoration: 'underline', textAlign: 'right', marginTop: '5px' }}>
                "THIS DOCUMENT IS NOT VALID FOR CLAIM OF INPUT TAX."
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
