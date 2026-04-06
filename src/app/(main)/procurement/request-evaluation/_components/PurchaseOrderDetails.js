'use client';

import { useState, useEffect, useRef } from 'react';
import { SkeletonRequestEvaluationDetail } from '../../../../_components/skeletonLoader';
import ConfirmModal from '../../../_components/confirmModal';
import RejectRequestModal from '../../../_components/rejectRequestModal';
import SuccessModal from '../../../_components/successModal';
import currencyData from '@/utils/currency.json';

function PurchaseOrderDetails({
    selectedApproval,
    approvalDetails,
    detailsLoading,
    darkMode,
    isAdmin,
    showApproveModal,
    showRejectModal,
    showSuccessModal,
    rejectionRemarks,
    successMessage,
    isSubmitting,
    getStatusColor,
    handleApproveClick,
    handleApproveConfirm,
    handleRejectClick,
    handleRejectConfirm,
    setShowApproveModal,
    setShowRejectModal,
    setShowSuccessModal,
    setRejectionRemarks,
    setSelectedApproval
}) {
    const [showActionMenu, setShowActionMenu] = useState(false);
    const menuRef = useRef(null);

    // Close menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                setShowActionMenu(false);
            }
        };

        if (showActionMenu) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [showActionMenu]);

    if (!selectedApproval) {
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

    const { header, details } = selectedApproval;

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

    const getDateCreated = () => {
        return `Created on ${formatDate(header.dateCreated)}`;
    };

    const getStatusText = (status) => {
        if (!status) return 'PENDING';

        // Ensure status is a string before calling trim()
        const statusStr = String(status);

        // Clean up the status text (trim whitespace)
        const cleanStatus = statusStr.trim();

        // Handle potential database duplication issue
        // If status appears twice consecutively, return just once
        const statusPatterns = [
            'FOR P.O. CONFIRMATION',
            'FOR P.O. APPROVAL',
            'P.O. APPROVED',
            'PENDING'
        ];

        for (const pattern of statusPatterns) {
            if (cleanStatus === pattern + pattern || cleanStatus === pattern + ' ' + pattern || cleanStatus === pattern + ',' + pattern) {
                return pattern;
            }
        }

        // If comma-separated duplicates, take the first unique part
        const parts = cleanStatus.split(',').map(p => p.trim());
        const uniqueParts = [...new Set(parts)];
        if (uniqueParts.length === 1) {
            return uniqueParts[0];
        }

        return cleanStatus;
    };

    const currencyDisplay = (currencyCode) => {
        if (!currencyCode) return '';
        try {
            const currency = currencyData[currencyCode];
            return currency ? currency.symbol_native : currencyCode;
        } catch (error) {
            console.error('Error formatting currency:', error);
            return currencyCode;
        }
    }

    return (
        <>
            {detailsLoading ? (
                <SkeletonRequestEvaluationDetail />
            ) : (
                <div className="p-6 overflow-y-auto flex-1">
                    <div className="space-y-6">
                        {/* Header */}
                        <div className={`p-4 rounded-lg`}>
                            <div className="flex items-start justify-between">
                                <div className="flex-1">
                                    <h1 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'} mb-2`}>
                                        Purchase Order No: <span className={`text-3xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{header.poNumber}</span>
                                    </h1>
                                    <div className="flex items-center gap-3">
                                        {selectedApproval.isRush && (
                                            <span className={`text-xs px-4 py-2 rounded-full ${darkMode ? 'bg-red-900 text-red-300' : 'bg-red-100 text-red-700'} font-semibold whitespace-nowrap`}>
                                                RUSH
                                            </span>
                                        )}
                                        <span className={`px-4 py-1 rounded-full text-sm font-semibold border ${getStatusColor(getStatusText(header.poStatus))}`}>
                                            {getStatusText(header.poStatus)}
                                        </span>
                                        <span className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                                            {getDateCreated()}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Order Information */}
                        <div className={`${darkMode ? 'bg-gray-800/50 border-gray-600' : 'bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200'} p-4 rounded-lg border`}>
                            <h3 className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'} mb-4`}>Purchase Order Header</h3>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 ml-4">
                                <div>
                                    <div className="space-y-2">
                                        <div>
                                            <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Vendor Name:</span>
                                            <span className={`ml-2 text-sm font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>{header?.vendName || 'N/A'}</span>
                                        </div>
                                        <div>
                                            <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Payment Terms:</span>
                                            <span className={`ml-2 text-sm font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>{header?.pymtrmid || 'N/A'}</span>
                                        </div>
                                        <div>
                                            <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Delivery To:</span>
                                            <span className={`ml-2 text-sm font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>{header?.deliveryTo || 'N/A'}</span>
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <div className="space-y-2">
                                        <div>
                                            <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Created By:</span>
                                            <span className={`ml-2 text-sm font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>{header?.createdBy || 'N/A'}</span>
                                        </div>
                                        <div>
                                            <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Canvassed By:</span>
                                            <span className={`ml-2 text-sm font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>{header?.canvassedBy || 'N/A'}</span>
                                        </div>
                                        <div>
                                            <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>PO Date:</span>
                                            <span className={`ml-2 text-sm font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                                                {formatDate(header.poDate)}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <div className="space-y-2 lg:ml-8">
                                        {/* Confirmed By */}
                                        {header?.confirmedBy_1 && (
                                            <div>
                                                <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{header?.dateConfirmed_1 ? 'Reviewed By:' : 'For Review By:'}</span>
                                                <span className={`ml-2 text-sm font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>{header.confirmedBy_1}</span>
                                                {header?.dateConfirmed_1 ? (
                                                    <span className={`ml-2 text-xs ${darkMode ? 'text-green-400' : 'text-green-600'}`}>
                                                        [DATE: {formatDate(header.dateConfirmed_1)}]
                                                    </span>
                                                ) : (
                                                    <span className={`ml-2 text-xs ${darkMode ? 'text-orange-400' : 'text-orange-600'}`}>
                                                        [PENDING]
                                                    </span>
                                                )}
                                            </div>
                                        )}
                                        {header?.confirmedBy_2 && (
                                            <div>
                                                <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{header?.dateConfirmed_2 ? 'Reviewed By:' : 'For Review By:'}</span>
                                                <span className={`ml-2 text-sm font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>{header.confirmedBy_2}</span>
                                                {header?.dateConfirmed_2 ? (
                                                    <span className={`ml-2 text-xs ${darkMode ? 'text-green-400' : 'text-green-600'}`}>
                                                        [DATE: {formatDate(header.dateConfirmed_2)}]
                                                    </span>
                                                ) : (
                                                    <span className={`ml-2 text-xs ${darkMode ? 'text-orange-400' : 'text-orange-600'}`}>
                                                        [PENDING]
                                                    </span>
                                                )}
                                            </div>
                                        )}
                                        {/* Approved By */}
                                        {header?.approvedBy && (
                                            <div>
                                                <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Approved By:</span>
                                                <span className={`ml-2 text-sm font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>{header.approvedBy}</span>
                                                {header?.dateApproved ? (
                                                    <span className={`ml-2 text-xs ${darkMode ? 'text-green-400' : 'text-green-600'}`}>
                                                        [DATE: {formatDate(header.dateApproved)}]
                                                    </span>
                                                ) : (
                                                    <span className={`ml-2 text-xs ${darkMode ? 'text-orange-400' : 'text-orange-600'}`}>
                                                        [PENDING]
                                                    </span>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Remarks */}
                            {(header.remarks || header.remarks) && (
                                <div className="mt-6">
                                    <h3 className={`text-sm font-bold mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                        Remarks:
                                    </h3>
                                    <div className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'} space-y-2`}>
                                        {header.remarks && (
                                            <p>{header.remarks}</p>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Request Details from evaluation */}
                        {approvalDetails.length > 0 && (
                            <div className={`${darkMode ? 'bg-gray-800/50 border-gray-600' : 'bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200'} p-4 rounded-lg border`}>
                                <h3 className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'} mb-3`}>Request Details</h3>

                                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                    <div>
                                        <p className={`text-xs ${darkMode ? 'text-gray-300' : 'text-gray-600'} font-medium mb-1`}>Reference Number</p>
                                        <p className="text-sm font-semibold text-blue-600">{selectedApproval.id}</p>
                                    </div>
                                    <div>
                                        <p className={`text-xs ${darkMode ? 'text-gray-300' : 'text-gray-600'} font-medium mb-1`}>Requested By</p>
                                        <p className={`text-sm font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{approvalDetails[0]?.REQUESTEDBY || '-'}</p>
                                    </div>
                                    <div>
                                        <p className={`text-xs ${darkMode ? 'text-gray-300' : 'text-gray-600'} font-medium mb-1`}>Company / Location</p>
                                        <p className={`text-sm font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{approvalDetails[0]?.DEPARTMENT || '-'} - {approvalDetails[0]?.LOCATION || '-'}</p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Items Table */}
                        <div>
                            <h3 className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'} mb-3`}>Purchase Order Details</h3>

                            {(() => {
                                const totalQuantity = details && details.length > 0 ? details.reduce((sum, item) => sum + parseFloat(item.QUANTITY || 0), 0) : 0;
                                return (
                                    <>
                                        {/* Desktop Table View */}
                                        <div className={`hidden sm:block overflow-x-auto border ${darkMode ? 'border-gray-600' : 'border-gray-200'} rounded-lg`}>
                                            <table className="w-full">
                                                <thead className={`${darkMode ? 'bg-gray-700' : 'bg-gray-100'} border-b ${darkMode ? 'border-gray-600' : 'border-gray-200'}`}>
                                                    <tr>
                                                        <th className={`px-4 py-3 text-left text-xs font-semibold ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>Item Code</th>
                                                        <th className={`px-4 py-3 text-left text-xs font-semibold ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>Item Description</th>
                                                        <th className={`px-4 py-3 text-left text-xs font-semibold ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>UOFM</th>
                                                        <th className={`px-4 py-3 text-right text-xs font-semibold ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>Quantity</th>
                                                        <th className={`px-4 py-3 text-right text-xs font-semibold ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>Unit Price</th>
                                                        <th className={`px-4 py-3 text-right text-xs font-semibold ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>Total</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {details && details.length > 0 ? (
                                                        details.map((item, index) => (
                                                            <tr key={index} className={`border-b ${darkMode ? 'border-gray-600' : 'border-gray-200'} ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-50'} transition`}>
                                                                <td className={`px-4 py-3 text-sm ${darkMode ? 'text-white' : 'text-gray-900'}`}>{item.ITEMNMBR || '-'}</td>
                                                                <td className={`px-4 py-3 text-sm ${darkMode ? 'text-white' : 'text-gray-900'}`}>{item.ITEMDESC || '-'}</td>
                                                                <td className={`px-4 py-3 text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>{item.UOFM || '-'}</td>
                                                                <td className={`px-4 py-3 text-sm ${darkMode ? 'text-white' : 'text-gray-900'} text-right font-semibold`}>{item.QUANTITY || 0}</td>
                                                                <td className={`px-4 py-3 text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'} text-right`}>
                                                                    {item.unitPrice ? `${currencyDisplay(header?.currencyCode || 'PHP')}${parseFloat(item.unitPrice).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '-'}
                                                                </td>
                                                                <td className={`px-4 py-3 text-sm ${darkMode ? 'text-white' : 'text-gray-900'} text-right font-semibold`}>
                                                                    {item.unitPrice && item.QUANTITY ? `${currencyDisplay(header?.currencyCode || 'PHP')}${(parseFloat(item.unitPrice) * parseFloat(item.QUANTITY)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '-'}
                                                                </td>
                                                            </tr>
                                                        ))
                                                    ) : (
                                                        <tr>
                                                            <td colSpan="6" className={`px-4 py-6 text-center ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                                                No items found for this order
                                                            </td>
                                                        </tr>
                                                    )}
                                                </tbody>
                                                <tfoot className={`${darkMode ? 'bg-gray-700' : 'bg-gray-100'} border-t ${darkMode ? 'border-gray-600' : 'border-gray-200'}`}>
                                                    <tr>
                                                        <td></td>
                                                        <td></td>
                                                        <td className={`px-4 py-3 text-left text-sm font-semibold ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>Total Quantity</td>
                                                        <td className={`px-4 py-3 text-sm ${darkMode ? 'text-white' : 'text-gray-900'} text-right font-bold`}>{totalQuantity}</td>
                                                        <td className={`px-4 py-3 text-right text-sm font-semibold ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>Total Amount</td>
                                                        <td className={`px-4 py-3 text-sm ${darkMode ? 'text-white' : 'text-gray-900'} text-right font-black`}>
                                                            {(() => {
                                                                if (!details || !Array.isArray(details) || details.length === 0) {
                                                                    return `${currencyDisplay(header?.currencyCode || 'PHP')}0.00`;
                                                                }
                                                                const subtotal = details.reduce((sum, item) => {
                                                                    const price = parseFloat(item.unitPrice || 0);
                                                                    const qty = parseFloat(item.QUANTITY || 0);
                                                                    return sum + (isNaN(price) ? 0 : price) * (isNaN(qty) ? 0 : qty);
                                                                }, 0);
                                                                const tax = parseFloat(header?.taxAmount || 0);
                                                                const freight = parseFloat(header?.freight || 0);
                                                                const total = subtotal + (isNaN(tax) ? 0 : tax) + (isNaN(freight) ? 0 : freight);
                                                                const formatted = isNaN(total) ? '0.00' : total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                                                                return `${currencyDisplay(header?.currencyCode || 'PHP')}${formatted}`;
                                                            })()}
                                                        </td>
                                                        <td></td>
                                                    </tr>
                                                </tfoot>
                                            </table>
                                        </div>

                                        {/* Mobile Card View */}
                                        <div className="sm:hidden space-y-4">
                                            {details && details.length > 0 ? (
                                                details.map((item, index) => (
                                                    <div key={index} className={`p-4 border ${darkMode ? 'border-gray-600 bg-gray-800' : 'border-gray-200 bg-white'} rounded-lg shadow-sm`}>
                                                        <div className="space-y-3">
                                                            {/* Item Code */}
                                                            <div>
                                                                <p className={`text-sm font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                                                                    {item.ITEMNMBR || '-'}
                                                                </p>
                                                            </div>

                                                            {/* Item Description */}
                                                            <div>
                                                                <p className={`text-xs ${darkMode ? 'text-gray-300' : 'text-gray-600'} font-medium mb-1`}>Description</p>
                                                                <p className={`text-sm leading-relaxed ${darkMode ? 'text-white' : 'text-gray-900'} break-words`}>
                                                                    {item.ITEMDESC || '-'}
                                                                </p>
                                                            </div>

                                                            {/* Quantity and UOFM */}
                                                            <div className="flex items-center justify-between">
                                                                <div className="flex items-center gap-4">
                                                                    <div>
                                                                        <p className={`text-xs ${darkMode ? 'text-gray-300' : 'text-gray-600'} font-medium`}>Quantity</p>
                                                                        <p className={`text-sm font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{item.QUANTITY || 0}</p>
                                                                    </div>
                                                                    <div>
                                                                        <p className={`text-xs ${darkMode ? 'text-gray-300' : 'text-gray-600'} font-medium`}>UOFM</p>
                                                                        <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>{item.UOFM || '-'}</p>
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            {/* Unit Price and Total */}
                                                            <div className="grid grid-cols-2 gap-4">
                                                                <div>
                                                                    <p className={`text-xs ${darkMode ? 'text-gray-300' : 'text-gray-600'} font-medium mb-1`}>Unit Price</p>
                                                                    <p className={`text-sm font-semibold ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                                                                        {item.unitPrice ? `${currencyDisplay(header?.currencyCode || 'PHP')}${parseFloat(item.unitPrice).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '-'}
                                                                    </p>
                                                                </div>
                                                                <div>
                                                                    <p className={`text-xs ${darkMode ? 'text-gray-300' : 'text-gray-600'} font-medium mb-1`}>Total</p>
                                                                    <p className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                                                                        {item.unitPrice && item.QUANTITY ? `${currencyDisplay(header?.currencyCode || 'PHP')}${(parseFloat(item.unitPrice) * parseFloat(item.QUANTITY)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '-'}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))
                                            ) : (
                                                <div className={`p-8 text-center border ${darkMode ? 'border-gray-600 bg-gray-800' : 'border-gray-200 bg-gray-50'} rounded-lg`}>
                                                    <p className={`${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                                        No items found for this order
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    </>
                                );
                            })()}
                        </div>

                        {/* Remarks */}
                        {selectedApproval.description && (
                            <div>
                                <h3 className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'} mb-3`}>Remarks</h3>
                                <p className={`leading-relaxed p-4 rounded-lg border ${darkMode ? 'text-gray-300 bg-gray-800 border-gray-600' : 'text-gray-700 bg-gray-50 border-gray-200'}`}>
                                    {selectedApproval.description}
                                </p>
                            </div>
                        )}

                        {/* Rejection/Cancellation Remarks */}
                        {(getStatusText(header.poStatus) === 'REJECTED' || getStatusText(header.poStatus) === 'CANCELLED') && (
                            <div>
                                <h3 className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'} mb-3`}>
                                    {getStatusText(header.poStatus) === 'REJECTED' ? 'Rejection Reason' : 'Cancellation Reason'}
                                </h3>
                                <div className={`leading-relaxed p-4 rounded-lg border ${darkMode ? 'text-gray-300 bg-red-900/20 border-red-600' : 'text-gray-700 bg-red-50 border-red-200'}`}>
                                    <div className="flex items-start gap-3">
                                        <svg className={`w-5 h-5 mt-0.5 flex-shrink-0 ${getStatusText(header.poStatus) === 'REJECTED' ? 'text-red-500' : 'text-orange-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                                        </svg>
                                        <p className="flex-1">
                                            {approvalDetails.length > 0 && approvalDetails[0].CANCELREMARKS && approvalDetails[0].CANCELREMARKS.trim()
                                                ? approvalDetails[0].CANCELREMARKS
                                                : 'No reason provided'
                                            }
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Actions */}
                        {(getStatusText(header.poStatus) === 'FOR P.O. APPROVAL' || getStatusText(header.poStatus) === 'FOR P.O. CONFIRMATION' || getStatusText(header.poStatus) === 'FOR PURCHASING LEAD TIME') && (
                            <div className={`flex gap-3 pt-6 border-t ${darkMode ? 'border-gray-600' : 'border-gray-200'}`}>
                                <button
                                    onClick={handleApproveClick}
                                    className="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-4 rounded-lg transition flex items-center justify-center gap-2"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                    Approve
                                </button>
                                <button
                                    onClick={handleRejectClick}
                                    className="flex-1 bg-red-600 hover:bg-red-700 text-white font-semibold py-3 px-4 rounded-lg transition flex items-center justify-center gap-2"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                    Reject
                                </button>
                            </div>
                        )}

                        {(getStatusText(header.poStatus) === 'P.O. APPROVED' || getStatusText(header.poStatus) === 'REJECTED') && (
                            <div className={`pt-6 border-t ${darkMode ? 'border-gray-600' : 'border-gray-200'}`}>
                                <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'} text-center`}>
                                    This purchase order has been {getStatusText(header.poStatus).toLowerCase()}.
                                </p>
                            </div>
                        )}
                    </div>
                </div >
            )
            }

            {/* Modals */}
            <ConfirmModal
                isOpen={showApproveModal}
                title="Approve Request"
                message={`Are you sure you want to approve this request? It will move to the next stage in the workflow.`}
                confirmButtonText="Approve"
                confirmButtonColor="green"
                isLoading={isSubmitting}
                onConfirm={handleApproveConfirm}
                onCancel={() => setShowApproveModal(false)}
            />

            <RejectRequestModal
                isOpen={showRejectModal}
                remarks={rejectionRemarks}
                onRemarksChange={setRejectionRemarks}
                onConfirm={handleRejectConfirm}
                onCancel={() => {
                    setShowRejectModal(false);
                    setRejectionRemarks('');
                }}
                isLoading={isSubmitting}
            />

            <SuccessModal
                isOpen={showSuccessModal}
                title={successMessage.title}
                message={successMessage.message}
                onClose={() => {
                    setShowSuccessModal(false);
                    if (!isAdmin()) {
                        setSelectedApproval(null);
                    }
                }}
                autoCloseDelay={3000}
            />
        </>
    );
}

export default PurchaseOrderDetails;

