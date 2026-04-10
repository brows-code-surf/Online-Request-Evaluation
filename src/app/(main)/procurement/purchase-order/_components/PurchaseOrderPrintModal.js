'use client';

import currencyData from '@/utils/currency.json';

const generateHeader = (purchaseOrder, currentPage, totalPages) => `
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
            <div class="po-info-value">${currentPage}/${totalPages}</div>
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
            <div class="po-info-value">${purchaseOrder.details && purchaseOrder.details.length > 0 && purchaseOrder.details[0].currency ? (currencyData[purchaseOrder.details[0].currency]?.name || purchaseOrder.details[0].currency) : 'Philippine Peso'}</div>
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
      <div class="supplier-label" >Ship To</div>
      <div class="supplier-name" >${purchaseOrder.header.deliveryTo || 'N/A'}</div>
      <div class="supplier-info">
        ${purchaseOrder.header.deliveryAddress || 'N/A'}
      </div>
    </div>
  </div>
`;

const generateFooter = (purchaseOrder) => `
  <!-- Footer Section (includes Condition of Purchase, Signature, and Footer Info) -->
  <div class="footer-section">
    <!-- Condition of Purchase -->
    <div class="condition-text">
      Condition of Purchase:<br>
      1. Acceptance of Purchase Order. By accepting this Purchase Order (PO), the Seller agrees to the stated terms. Any additional terms from the Seller are rejected unless agreed to in writing by the Buyer.<br>
      2. Delivery: Delivery must be made on or before the specified date. The Buyer reserves the right to cancel the PO without liability if the Seller fails to deliver on time.<br>
      3. Quality: The Buyer reserves the right to reject materials that do not meet the agreed-upon specifications. Rejected materials will be returned to the Seller at the Seller's expense.
    </div>

    <!-- Signature Section -->
    <div class="signature-section">
      <div class="sig-header">
        <div class="sig-col" style="text-align: left; margin-bottom: 50px;">Prepared and Canvassed By:</div>
        <div class="sig-col" style="text-align: left; margin-left: 50px; margin-bottom: 50px;">Reviewed By:</div>
        <div class="sig-col" style="text-align: left; margin-left: 50px; margin-bottom: 50px;">Approved By:</div>
      </div>
      <div style="display: flex; justify-content: space-between; gap: 40px;">
        <div class="sig-col">
          <div class="sig-name" style="margin-bottom: 1px;">${purchaseOrder.header.canvassedBy || ''}</div>
          <div class="sig-line"></div>
          <div style="font-size: 10px;">Signature Over Printed Name</div>
        </div>
        <div class="sig-col">
          <div class="sig-name" style="margin-bottom: 1px;">${purchaseOrder.header.confirmedBy_1 && purchaseOrder.header.confirmedBy_2 ? purchaseOrder.header.confirmedBy_1 + ' / ' + purchaseOrder.header.confirmedBy_2 : purchaseOrder.header.confirmedBy_1 || purchaseOrder.header.confirmedBy_2 || ''}</div>
          <div class="sig-line"></div>
          <div style="font-size: 10px;">Signature Over Printed Name</div>
        </div>
        <div class="sig-col">
          <div class="sig-name" style="margin-bottom: 1px;">${purchaseOrder.header.approvedBy || ''}</div>
          <div class="sig-line"></div>
          <div style="font-size: 10px;">Signature Over Printed Name</div>
        </div>
      </div>
    </div>

    <!-- Footer Info -->
    <div class="footer-row">
      <div class="footer-col">
        Acknowledgement Certificate Control No.: AC_116_102024_000442<br><br>
        Date Issued: October 22, 2024<br><br>
        Document Series: POHO00000001-POHO99999999
      </div>
      <div class="footer-col" style = "min-width: 600px;">
        Software Provider: MIS — Software Calumpit, Bulacan<br><br>
        Contact No.: <br><br>
        Email: j.valencia@santehfeeds.com / carlo.arejola@santehfeeds.com<br><br>
        Website: <span class="tax-warning" style= "margin-left: 115px;">"THIS DOCUMENT IS NOT VALID FOR CLAIM OF INPUT TAX."</span>
      </div>
    </div>
  </div>
`;

export const handlePrintPurchaseOrder = async (purchaseOrder) => {
  try {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Please allow popups for this website to print');
      return;
    }

    // Calculate total pages based on available height
    const items = purchaseOrder.details || [];
    const totalItems = items.length;
    const remarks = purchaseOrder.header.remarks || '';
    const remarksLength = remarks.length;
    
    // Calculate remarks height: ~3px per line, ~80 chars per line
    // For 500 chars = ~6-7 lines = ~20-25px base height + content
    const calculateRemarksHeight = (text, usePreWrap = true) => {
      if (!text || text.length === 0) return 0;
      
      if (usePreWrap) {
        // Calculate height with line breaks preserved
        const charsPerLine = 100;
        const lineHeight = 14; // pixels per line (font-size 9px + line-height)
        const numLines = Math.ceil(text.length / charsPerLine);
        const basePadding = 20; // margin-bottom and padding
        return (numLines * lineHeight) + basePadding;
      } else {
        // Calculate height with single line (no line breaks)
        const charsPerLine = 120;
        const lineHeight = 14;
        const numLines = Math.ceil(text.length / charsPerLine);
        const basePadding = 20;
        return (numLines * lineHeight) + basePadding;
      }
    };
    
    const remarksHeightPreWrap = calculateRemarksHeight(remarks, true);
    const remarksHeightNormal = calculateRemarksHeight(remarks, false);
    const remarksHeight = remarksHeightPreWrap;
    
    // Calculate average row height based on description length
    // Base height is 28px, add extra for long descriptions
    const calculateRowHeight = (item) => {
      const baseHeight = 28;
      const descLength = (item.itemDesc || '').length;
      // Add ~3px for every 20 characters of description
      const extraHeight = Math.floor(descLength / 20) * 3;
      return baseHeight + extraHeight;
    };
    
    // Calculate total estimated height for all items
    const totalItemsHeight = items.reduce((sum, item) => sum + calculateRowHeight(item), 0);
    
    // Standard letter page ~792px with 0.3in margins = ~732px usable
    // Subtract header, footer, and other elements
    const HEADER_HEIGHT = 200;
    const FOOTER_HEIGHT = 180;
    const availableHeight = 900 - HEADER_HEIGHT - FOOTER_HEIGHT;
    
    // Calculate how many items can fit per page based on actual content
    // Reserve space for remarks on the last page
    const calculateItemsPerPage = () => {
      let currentPageItems = [];
      let currentPageHeight = 0;
      let pageNum = 1;
      const pages = [];
      
      items.forEach((item) => {
        const itemHeight = calculateRowHeight(item);
        
        // For the last page, reserve space for remarks, total, and other footer elements
        // These elements take approximately 60px (Nothing Else Follows + Total + Line Items Count)
        const reservedHeight = 60; // Minimum space reserved for footer elements
        const effectiveAvailableHeight = availableHeight - reservedHeight;
        
        // Check if adding this item would exceed page height
        if (currentPageHeight + itemHeight > effectiveAvailableHeight && currentPageItems.length > 0) {
          // Start new page
          pages.push({ items: currentPageItems, pageNum: pageNum });
          pageNum++;
          currentPageItems = [item];
          currentPageHeight = itemHeight;
        } else {
          currentPageItems.push(item);
          currentPageHeight += itemHeight;
        }
      });
      
      // Add remaining items as last page
      if (currentPageItems.length > 0) {
        pages.push({ items: currentPageItems, pageNum: pageNum });
      }
      
      // Check if remarks would overflow on the last page
      // First try with pre-wrap (line breaks), if doesn't fit try with normal (single line)
      // If still doesn't fit, create a separate remarks page
      const lastPage = pages[pages.length - 1];
      const lastPageItemsHeight = lastPage ? lastPage.items.reduce((sum, item) => sum + calculateRowHeight(item), 0) : 0;
      // Footer elements: Nothing Else Follows + Total Row + Line Items Count
      const footerElementsHeight = 60;
      
      // Determine remarks display mode
      let remarksDisplayMode = 'pre-wrap';
      
      // Check remaining space on last page after items and footer elements
      const remainingSpaceAfterItems = availableHeight - footerElementsHeight - lastPageItemsHeight;
      
      // First try with pre-wrap (preserve line breaks)
      if (remarksHeightPreWrap > remainingSpaceAfterItems && remarksHeightPreWrap > 0) {
        // Try with normal whitespace (single line - remove \n)
        const singleLineRemarksHeight = calculateRemarksHeight(remarks, false);
        
        if (singleLineRemarksHeight > remainingSpaceAfterItems && singleLineRemarksHeight > 0) {
          // Neither fits, create a separate page for remarks
          pages.push({ items: [], pageNum: pageNum + 1, isRemarksOnly: true, remarksDisplayMode: 'pre-wrap' });
        } else {
          // Normal (single line) fits, use that mode
          remarksDisplayMode = 'normal';
        }
      }
      
      // Store the remarks display mode on the last page
      if (pages.length > 0) {
        pages[pages.length - 1].remarksDisplayMode = remarksDisplayMode;
      }
      
      return pages;
    };
    
    const pages = calculateItemsPerPage();
    const actualTotalPages = pages.length === 0 ? 1 : pages.length;

    // Generate pages
    let allPagesHtml = '';
    
    pages.forEach((page, index) => {
      const pageNum = index + 1;
      const pageItems = page.items;
      const isLastPage = pageNum === actualTotalPages;
      const isRemarksOnlyPage = page.isRemarksOnly === true;
      const remarksDisplayMode = page.remarksDisplayMode || 'pre-wrap';

      const pageHtml = `
        <div class="print-page">
          ${generateHeader(purchaseOrder, pageNum, actualTotalPages)}
          
          ${!isRemarksOnlyPage ? `
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
              ${pageItems.length > 0
                ? pageItems.map((item, idx) => `
                    <tr>
                      <td style="width: 10%; padding: 4px 3px; text-align: left; vertical-align: top;">${item.itemNmbr || '-'}</td>
                      <td style="width: 40%; padding: 4px 3px; vertical-align: top;">${item.itemDesc || '-'}</td>
                      <td style="width: 12%; padding: 4px 3px; text-align: center; vertical-align: top;">${item.qtyOrder?.toLocaleString('en-US', { minimumFractionDigits: 3, maximumFractionDigits: 3 }) || '0.000'}</td>
                      <td style="width: 8%; padding: 4px 3px; text-align: center; vertical-align: top;">${item.uofm || '-'}</td>
                      <td style="width: 15%; padding: 4px 3px; text-align: right; vertical-align: top;">${item.unitCost?.toLocaleString('en-US', { minimumFractionDigits: 5, maximumFractionDigits: 5 }) || '0.00000'}</td>
                      <td style="width: 15%; padding: 4px 3px; text-align: right; vertical-align: top;">${item.extdCost?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}</td>
                    </tr>
                  `).join('')
                : '<tr><td colspan="6" style="padding: 4px 3px; text-align: center; color: #666;">No items found for this order</td></tr>'}
            </tbody>
          </table>
          ` : ''}
          
          ${isLastPage ? `
            <!-- Nothing Else Follows -->
            <div class="nothing-else">--------------------------------------------------------------------------------------------------- Nothing Else Follows -----------------------------------------------------------------------------------------------</div>

            <!-- Total Row -->
            <div class="total-row">
              <div style="text-align: right; margin-right: 20px;">Total <span style ="margin-left: 5px;">${purchaseOrder.details && purchaseOrder.details.length > 0 && purchaseOrder.details[0].currency ? (currencyData[purchaseOrder.details[0].currency]?.symbol_native || '₱') : '₱'}</span></div>
              <div class="total-amount">${purchaseOrder.header.subtotal?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}</div>
            </div>

            <!-- Line Items Count -->
            <div class="line-items-count">
              Number of Line Items: ${totalItems}
            </div>

            <!-- Remarks -->
              <div class="remarks-label">Remarks:</div>
              <div style="font-size: 9px; margin-bottom: 10px; white-space: ${remarksDisplayMode};">${remarksDisplayMode === 'normal' ? (purchaseOrder.header.remarks || '').replace(/\n/g, ' ') : (purchaseOrder.header.remarks || '')}</div>
          ` : ''}
          
          ${generateFooter(purchaseOrder)}
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
            .header-bottom { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px; border-bottom: 1px solid #333; padding-bottom: 5px; margin-top: 5px; }
            .po-info-table { width: 100%; border-collapse: collapse; text-align: left; margin-top: 5px; margin-bottom: 10px; font-size: 9px; }
            .po-info-cell { padding: 3px 5px; border: none; border-bottom: 1px solid #ccc; }
            .po-info-col { flex: 1; }
            .po-info-label { font-size: 10px; color: #666; font-weight: normal; margin-bottom: 2px; }
            .po-info-value {  color: #333; font-size: 10px; }
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
            .item-desc-sub { font-size: 8px; color: #666; margin-top: 1px; }
            .nothing-else { text-align: center; font-weight: bold; margin: 8px 0; padding: 5px 0; }
            .total-row { display: flex; justify-content: flex-end; margin: 10px 0; font-weight: bold; font-size: 11px; }
            .total-amount { border-bottom: 4px double #ccc; padding-bottom: 1px; min-width: 150px; text-align: right; }
            .line-items-count { font-size: 9px; margin: 5px 0; }
            .remarks-label { font-style: italic; margin: 10px 0 5px 0; font-size: 9px; }
            .condition-text { font-size: 9px; line-height: 1.5; color: #333; margin: 15px 0; }
            .signature-section { border-top: 1px solid #ccc; padding-top: 8px;padding-top: 8px; margin-bottom: 10px; }
            .sig-header { display: flex; justify-content: space-between; font-size: 9px; margin-bottom: 10px; color: #666; }
            .sig-col { flex: 1; text-align: center; }
            .sig-line { border-top: 1px solid #ccc; padding-top: 3px; font-size: 7px; width: 100%; }
            .sig-name { margin-top: 5px; font-size: 9px; }
            .footer-section { font-size: 9px; margin-top: 20px; padding-top: 8px; position: fixed; bottom: 0; left: 0; right: 0; background: white; padding: 8px 2px; width: 100%; }
            .footer-row { display: flex; justify-content: space-between; margin: 3px 0; border-top: 1px solid #ccc; border-bottom: 1px solid #ccc; padding-top: 8px;padding-bottom: 8px; }
            .footer-col { flex: 1; text-align: left; min-width: 300px; }
            .tax-warning { font-weight: bold; text-decoration: underline 1px; font-size: 10px; text-align: right; margin-top: 5px; }
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
  }
};

