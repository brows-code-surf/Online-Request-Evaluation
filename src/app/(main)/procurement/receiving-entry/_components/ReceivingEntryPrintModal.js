'use client';

import { getDistributionsByReferenceNo } from '../_actions/index.js';

const generateHeader = (receivingEntry, currentPage, totalPages) => `
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
        <span class="form-details-inline" style="margin-right: 20px;">Form No.:PUR-F-03</span>
        <span class="form-details-inline" style="margin-right: 20px;">Rev. No.: 2</span>
        <span class="form-details-inline">Eff. Date: 15 October 2008</span>
      </div>
      <div class="po-title">GOODS RECEIVED FORM</div>
      <!-- Receiving Info Table -->
      <table class="po-info-table">
        <tr>
          <td class="po-info-cell" style="width: 50%; border-top: 1px solid #ccc;">
            <div class="po-info-label">Document No.</div>
            <div class="po-info-value" style="font-size: 14px; font-weight: bold;">${receivingEntry.header.referenceNo || 'N/A'}</div>
          </td>
          <td class="po-info-cell" style="width: 50%; border-top: 1px solid #ccc;">
            <div class="po-info-label">Page</div>
            <div class="po-info-value">${currentPage}/${totalPages}</div>
          </td>
        </tr>
        <tr>
          <td class="po-info-cell">
            <div class="po-info-label">Received Date</div>
            <div class="po-info-value">${receivingEntry.header.dateReceived ? new Date(receivingEntry.header.dateReceived).toLocaleDateString() : 'N/A'}</div>
          </td>
          <td class="po-info-cell">
            <div class="po-info-label">PO Number</div>
            <div class="po-info-value">${receivingEntry.header.poNumber || 'N/A'}</div>
          </td>
        </tr>
      </table>
    </div>
  </div>

  <!-- Supplier Section -->
  <div class="supplier-section">
    <div class="supplier-box">
      <div class="supplier-label">Supplier</div>
      <div class="supplier-name">${receivingEntry.header.vendName || 'N/A'}</div>
      <div class="supplier-info">
        ID: ${receivingEntry.header.vendorId || 'N/A'}
      </div>
    </div>
    <div class="supplier-box">
      <div class="supplier-label">Vendor Doc No.</div>
      <div class="supplier-name">${receivingEntry.header.vndDocNm || 'N/A'}</div>
      <div class="supplier-info">
        Location: ${receivingEntry.header.locnCode || 'N/A'}
      </div>
    </div>
  </div>
`;

const generateFooter = (receivingEntry) => `
  <!-- Footer Section -->
  <div class="footer-section">
    <div class="signature-section">
      <div class="sig-header">
        <div class="sig-col" style="text-align: left; margin-bottom: 50px;">Prepared By:</div>
        <div class="sig-col" style="text-align: left; margin-left: 50px; margin-bottom: 50px;">Received By:</div>
        <div class="sig-col" style="text-align: left; margin-left: 50px; margin-bottom: 50px;">Approved By:</div>
      </div>
      <div style="display: flex; justify-content: space-between; gap: 40px;">
        <div class="sig-col">
          <div class="sig-name" style="margin-bottom: 1px;">${receivingEntry.header.createdBy || ''}</div>
          <div class="sig-line"></div>
          <div style="font-size: 10px;">Signature Over Printed Name</div>
        </div>
        <div class="sig-col">
          <div class="sig-name" style="margin-bottom: 1px;">${receivingEntry.header.inventoryDescription || ''}</div>
          <div class="sig-line"></div>
          <div style="font-size: 10px;">Signature Over Printed Name</div>
        </div>
        <div class="sig-col">
          <div class="sig-name" style="margin-bottom: 1px;"></div>
          <div class="sig-line"></div>
          <div style="font-size: 10px;">Signature Over Printed Name</div>
        </div>
      </div>
    </div>

    <!-- Footer Info -->
    <div class="footer-row">
      <div class="footer-col">
        Document Series: RRHO00000001-RRHO99999999
      </div>
      <div class="footer-col" style="min-width: 600px;">
        Software Provider: MIS — Software Calumpit, Bulacan
      </div>
    </div>
  </div>
`;

export const handlePrintReceivingEntry = async (receivingEntry) => {
  try {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Please allow popups for this website to print');
      return;
    }

    const items = receivingEntry.details || [];
    const totalItems = items.length;
    const remarks = receivingEntry.header.remarks || '';

    // Fetch distributions if DA is posted
    let distributions = [];
    if (receivingEntry.header.hasDA) {
      const distResult = await getDistributionsByReferenceNo(receivingEntry.header.referenceNo);
      if (distResult.success) {
        distributions = distResult.distributions;
      }
    }

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
      const descLength = (item.itemDesc || '').length;
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
          ${generateHeader(receivingEntry, pageNum, actualTotalPages)}
          
          <!-- Items Table -->
          <table>
            <thead>
              <tr>
                <th style="width: 10%; padding: 4px 3px;">Item Number</th>
                <th style="width: 35%; padding: 4px 3px;">Item Description</th>
                <th style="width: 10%; padding: 4px 3px; text-align: center;">U/M</th>
                <th style="width: 15%; padding: 4px 3px; text-align: right;">Inv. Qty</th>
                <th style="width: 15%; padding: 4px 3px; text-align: right;">Qty Received</th>
                <th style="width: 15%; padding: 4px 3px; text-align: right;">Amount</th>
              </tr>
            </thead>
            <tbody>
              ${pageItems.length > 0
                ? pageItems.map((item) => `
                    <tr>
                      <td style="width: 10%; padding: 4px 3px; text-align: left; vertical-align: top;">${item.itemNmbr || '-'}</td>
                      <td style="width: 35%; padding: 4px 3px; vertical-align: top;">${item.itemDesc || '-'}</td>
                      <td style="width: 10%; padding: 4px 3px; text-align: center; vertical-align: top;">${item.uofm || '-'}</td>
                      <td style="width: 15%; padding: 4px 3px; text-align: right; vertical-align: top;">${item.inventoryQuantity?.toLocaleString('en-US', { minimumFractionDigits: 3, maximumFractionDigits: 3 }) || '0.000'}</td>
                      <td style="width: 15%; padding: 4px 3px; text-align: right; vertical-align: top;">${item.quantity?.toLocaleString('en-US', { minimumFractionDigits: 3, maximumFractionDigits: 3 }) || '0.000'}</td>
                      <td style="width: 15%; padding: 4px 3px; text-align: right; vertical-align: top;">${((item.unitCost || 0) * (item.quantity || 0)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    </tr>
                  `).join('')
                : '<tr><td colspan="6" style="padding: 4px 3px; text-align: center; color: #666;">No items found for this receiving entry</td></tr>'}
            </tbody>
          </table>

          ${isLastPage && distributions.length > 0 ? `
            <!-- Distribution of Accounts Section -->
            <div class="distribution-section">
              <div class="distribution-title">Distribution of Accounts</div>
              <table class="distribution-table">
                <thead>
                  <tr>
                    <th style="width: 20%;">Account No.</th>
                    <th style="width: 20%;">Account Type</th>
                    <th style="width: 20%; text-align: right;">Debit Amount</th>
                    <th style="width: 20%; text-align: right;">Credit Amount</th>
                    <th style="width: 20%; text-align: right;">EWT</th>
                  </tr>
                </thead>
                <tbody>
                  ${distributions.map(dist => `
                    <tr>
                      <td>${dist.acctNo || '-'}</td>
                      <td>${dist.accountType || '-'}</td>
                      <td style="text-align: right;">${dist.debitAmount ? dist.debitAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'}</td>
                      <td style="text-align: right;">${dist.creditAmount ? dist.creditAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'}</td>
                      <td style="text-align: right;">${dist.ewt ? dist.ewt.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          ` : ''}

          ${isLastPage ? `
            <div class="nothing-else">--------------------------------------------------------------------------------------------------- Nothing Else Follows -----------------------------------------------------------------------------------------------</div>

            <div class="total-row">
              <div style="text-align: right; margin-right: 20px;">Total <span style="margin-left: 5px;">₱</span></div>
              <div class="total-amount">${receivingEntry.details.reduce((sum, item) => sum + ((item.unitCost || 0) * (item.quantity || 0)), 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
            </div>

            <div class="line-items-count">
              Number of Line Items: ${totalItems}
            </div>

            ${remarks ? `
              <div class="remarks-label">Remarks:</div>
              <div style="font-size: 9px; margin-bottom: 10px; white-space: ${remarksDisplayMode};">${remarksDisplayMode === 'normal' ? remarks.replace(/\n/g, ' ') : remarks}</div>
            ` : ''}
          ` : ''}
          
          ${generateFooter(receivingEntry)}
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

    printWindow.onload = () => {
      printWindow.print();
      setTimeout(() => {
        printWindow.close();
      }, 1000);
    };

  } catch (error) {
    console.error('Print error:', error);
    alert('Error occurred while preparing print. Please try again.');
  }
};