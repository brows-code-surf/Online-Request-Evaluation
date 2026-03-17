'use client';

import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { getCanvassingRequestByPQCode } from '../_actions';
import SkeletonLoader from '@/app/_components/skeletonLoader';
import EditCanvassingModal from './EditCanvassingModal';

function CanvassingDetailsModal({ isOpen, onClose, pqCode, darkMode, user }) {
  const [loading, setLoading] = useState(false);
  const [canvassingData, setCanvassingData] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);

  useEffect(() => {
    if (isOpen && pqCode) {
      loadCanvassingDetails();
    }
  }, [isOpen, pqCode]);

  const loadCanvassingDetails = async () => {
    if (!pqCode) return;

    setLoading(true);
    try {
      const result = await getCanvassingRequestByPQCode(pqCode, user);
      if (result.success) {
        setCanvassingData(result.canvassingRequest);
      } else {
        toast.error('Failed to load canvassing details');
      }
    } catch (error) {
      console.error('Error loading canvassing details:', error);
      toast.error('Failed to load canvassing details');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setCanvassingData(null);
    onClose();
  };

  if (!isOpen) return null;

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 overflow-y-auto">
        <div className="flex items-center justify-center min-h-screen pt-4 px-2 sm:px-4 pb-20 text-center sm:block sm:p-0">
          <div className="fixed inset-0 transition-opacity" aria-hidden="true">
            <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm" onClick={handleClose}></div>
          </div>
          <div className={`inline-block align-bottom rounded-2xl text-left overflow-hidden shadow-2xl transform transition-all sm:my-4 sm:align-middle sm:max-w-7xl w-full my-8 h-[85vh] sm:h-[90vh] max-h-[90vh] relative z-10 ring-1 ring-black/5 ${darkMode ? 'bg-gray-800' : 'bg-white'}`} onClick={(e) => e.stopPropagation()}>
            <div className="p-3 sm:p-6">
              <SkeletonLoader height="h-6" width="w-48" className="mb-4 sm:mb-6" />
              <div className="overflow-x-auto">
                <div className={`border ${darkMode ? 'border-gray-600' : 'border-gray-200'} rounded-lg overflow-hidden`}>
                  <div className={`${darkMode ? 'bg-gray-700' : 'bg-gray-100'} border-b ${darkMode ? 'border-gray-600' : 'border-gray-200'} p-3 sm:p-4`}>
                    <div className="flex gap-2 sm:gap-4">
                      <SkeletonLoader height="h-4" width="w-16 sm:w-24" />
                      <SkeletonLoader height="h-4" width="w-20 sm:w-32" />
                      <SkeletonLoader height="h-4" width="w-16 sm:w-24" className="hidden lg:flex" />
                      <SkeletonLoader height="h-4" width="w-16 sm:w-24" className="hidden md:flex" />
                      <SkeletonLoader height="h-4" width="w-12 sm:w-20" />
                      <SkeletonLoader height="h-4" width="w-16 sm:w-24" />
                    </div>
                  </div>
                  {Array(5).fill().map((_, i) => (
                    <div key={i} className={`border-b ${darkMode ? 'border-gray-600' : 'border-gray-200'} p-3 sm:p-4 last:border-b-0`}>
                      <div className="flex gap-2 sm:gap-4">
                        <SkeletonLoader height="h-4" width="w-14 sm:w-20" />
                        <div className="flex-1">
                          <SkeletonLoader height="h-4" width="w-24 sm:w-32" className="mb-1" />
                          <SkeletonLoader height="h-3" width="w-16 sm:w-24" />
                        </div>
                        <SkeletonLoader height="h-4" width="w-16 sm:w-24" className="hidden lg:block" />
                        <SkeletonLoader height="h-4" width="w-16 sm:w-24" className="hidden md:block" />
                        <SkeletonLoader height="h-4" width="w-10 sm:w-16" />
                        <SkeletonLoader height="h-4" width="w-12 sm:w-20" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-2 sm:px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity" aria-hidden="true">
          <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm" onClick={handleClose}></div>
        </div>
        <div className={`inline-block align-bottom rounded-2xl text-left overflow-hidden shadow-2xl transform transition-all sm:my-4 sm:align-middle sm:max-w-7xl w-full my-8 h-[85vh] sm:h-[90vh] max-h-[90vh] relative z-10 ring-1 ring-black/5 ${darkMode ? 'bg-gray-800' : 'bg-white'}`} onClick={(e) => e.stopPropagation()}>
          {/* Header */}
          <div className={`px-3 sm:px-6 py-3 sm:py-5 border-b ${darkMode ? 'border-gray-700 bg-gradient-to-r from-gray-800 via-gray-800 to-gray-900' : 'border-gray-200 bg-gradient-to-r from-white via-gray-50 to-gray-100'}`}>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-0 relative">
              <div className='text-left w-full sm:w-auto'>
                <h3 className={`text-base sm:text-lg lg:text-xl font-semibold tracking-tight ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  <span className="inline-flex items-center gap-1.5 sm:gap-2">
                    <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                    </svg>
                    <span className="hidden xs:inline">Canvassing Request Details</span>
                    <span className="xs:hidden">Details</span>
                  </span>
                </h3>
              </div>
              <div className="absolute left-1/2 top-0 transform -translate-x-1/2 hidden sm:block">
                {canvassingData && (canvassingData.approvalStatus ? (
                  <span className={`px-2 sm:px-3 py-1 sm:py-1.5 inline-flex text-xs sm:text-sm leading-5 font-semibold rounded-full shadow-sm ${darkMode ? 'border' : ''} ${canvassingData.approvalStatus === 'PENDING' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                    canvassingData.approvalStatus === 'SELECTED' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                      canvassingData.approvalStatus === 'NOT SELECTED' ? 'bg-orange-50 text-orange-700 border-orange-200' :
                        canvassingData.approvalStatus === 'REJECTED' ? 'bg-red-50 text-red-700 border-red-200' :
                          'bg-gray-50 text-gray-700 border-gray-200'
                    }`}>
                    {canvassingData.approvalStatus}
                  </span>
                ) : (
                  <span className={`px-2 sm:px-3 py-1 sm:py-1.5 inline-flex text-xs sm:text-sm leading-5 font-semibold rounded-full shadow-sm ${darkMode ? 'border' : ''} ${canvassingData.postStatus === 1 ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-yellow-50 text-yellow-700 border-yellow-200'
                    }`}>
                    {canvassingData.postStatus === 1 ? 'POSTED' : 'NOT POSTED'}
                  </span>
                ))}
              </div>
              <div className='flex items-center gap-1 sm:gap-2 w-full sm:w-auto justify-between sm:justify-end'>
                {/* Mobile status badge */}
                <div className="sm:hidden">
                  {canvassingData && (canvassingData.approvalStatus ? (
                    <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full shadow-sm ${darkMode ? 'border' : ''} ${canvassingData.approvalStatus === 'PENDING' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                      canvassingData.approvalStatus === 'SELECTED' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                        canvassingData.approvalStatus === 'NOT SELECTED' ? 'bg-orange-50 text-orange-700 border-orange-200' :
                          canvassingData.approvalStatus === 'REJECTED' ? 'bg-red-50 text-red-700 border-red-200' :
                            'bg-gray-50 text-gray-700 border-gray-200'
                      }`}>
                      {canvassingData.approvalStatus}
                    </span>
                  ) : (
                    <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full shadow-sm ${darkMode ? 'border' : ''} ${canvassingData.postStatus === 1 ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-yellow-50 text-yellow-700 border-yellow-200'
                      }`}>
                      {canvassingData.postStatus === 1 ? 'POSTED' : 'NOT POSTED'}
                    </span>
                  ))}
                </div>
                {canvassingData && canvassingData.header.pqCode && (
                  <span className={`px-2 sm:px-3 py-1 sm:py-1.5 text-2xl sm:text-lg font-bold ${darkMode ? 'text-blue-300' : 'text-blue-800'}`}>
                    {canvassingData.header.pqCode}
                  </span>
                )}
                {canvassingData && canvassingData.header.postStatus === 0 && (
                  <button
                    type="button"
                    onClick={() => setShowEditModal(true)}
                    className={`rounded-lg p-1.5 sm:p-2 ${darkMode ? 'text-gray-400 hover:text-white hover:bg-gray-700' : 'text-gray-500 hover:text-blue-600 hover:bg-blue-50'} transition-all duration-200 hover:scale-110`}
                    title="Edit Request"
                  >
                    <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleClose}
                  className={`rounded-lg p-1.5 sm:p-2 ${darkMode ? 'text-gray-400 hover:text-white hover:bg-gray-700' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'} transition-all duration-200 hover:scale-110`}
                >
                  <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="px-3 sm:px-6 py-4 sm:py-5 overflow-y-auto" style={{ height: 'calc(85vh - 100px)', maxHeight: 'calc(90vh - 130px)' }}>
            {canvassingData ? (
              <>
                {/* Supplier Info Section */}
                <div className="mb-4 sm:mb-6">
                  <h4 className={`text-xs sm:text-sm font-semibold uppercase tracking-wider mb-3 sm:mb-4 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    Supplier Information
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                    <div className={`p-3 sm:p-4 rounded-xl border ${darkMode ? 'bg-gray-700/50 border-gray-600' : 'bg-gray-50 border-gray-200'}`}>
                      <label className={`block text-xs font-medium mb-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        Supplier
                      </label>
                      <div className={`text-sm font-medium truncate ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                        {canvassingData.details[0]?.vendorName || 'N/A'}
                      </div>
                    </div>
                    <div className={`p-3 sm:p-4 rounded-xl border ${darkMode ? 'bg-gray-700/50 border-gray-600' : 'bg-gray-50 border-gray-200'}`}>
                      <label className={`block text-xs font-medium mb-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        Payment Terms
                      </label>
                      <div className={`text-sm font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                        {canvassingData.details[0]?.paymentTerms || 'N/A'}
                      </div>
                    </div>
                    <div className={`p-3 sm:p-4 rounded-xl border sm:col-span-2 lg:col-span-1 ${darkMode ? 'bg-gray-700/50 border-gray-600' : 'bg-gray-50 border-gray-200'}`}>
                      <label className={`block text-xs font-medium mb-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        Delivery Schedule
                      </label>
                      <div className={`text-sm font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                        {canvassingData.details[0]?.deliverySchedule ? (
                          <>
                            {(() => {
                              try {
                                const deliveryDate = new Date(canvassingData.details[0].deliverySchedule);
                                return !isNaN(deliveryDate.getTime()) ? deliveryDate.toLocaleDateString() : canvassingData.details[0].deliverySchedule;
                              } catch (error) {
                                return canvassingData.details[0].deliverySchedule;
                              }
                            })()}
                          </>
                        ) : 'N/A'}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Product Details Section */}
                <div className="mb-4 sm:mb-6">
                  <h4 className={`text-xs sm:text-sm font-semibold uppercase tracking-wider mb-3 sm:mb-4 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    Product Details
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-3 sm:mb-4">
                    <div className={`p-3 sm:p-4 rounded-xl border ${darkMode ? 'bg-gray-700/30 border-gray-600' : 'bg-white border-gray-200'}`}>
                      <label className={`block text-xs font-medium mb-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        Supplier Qty
                      </label>
                      <div className={`text-sm font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                        {canvassingData.details[0]?.supplierQty?.toLocaleString() || 'N/A'}
                      </div>
                    </div>
                    <div className={`p-3 sm:p-4 rounded-xl border ${darkMode ? 'bg-gray-700/30 border-gray-600' : 'bg-white border-gray-200'}`}>
                      <label className={`block text-xs font-medium mb-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        Brand
                      </label>
                      <div className={`text-sm font-medium truncate ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                        {canvassingData.details[0].brand || 'N/A'}
                      </div>
                    </div>
                    <div className={`p-3 sm:p-4 rounded-xl border ${darkMode ? 'bg-gray-700/30 border-gray-600' : 'bg-white border-gray-200'}`}>
                      <label className={`block text-xs font-medium mb-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        Origin
                      </label>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className={`text-sm font-medium truncate ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                          {canvassingData.details[0].origin || 'N/A'}
                        </span>
                        {canvassingData.details[0].isImported === 1 && (
                          <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full font-medium shrink-0">Imported</span>
                        )}
                      </div>
                    </div>
                    <div className={`p-3 sm:p-4 rounded-xl border ${darkMode ? 'bg-gray-700/30 border-gray-600' : 'bg-white border-gray-200'}`}>
                      <label className={`block text-xs font-medium mb-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        Purchase Type
                      </label>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className={`text-sm font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                          {canvassingData.details[0].purchaseType === '1' ? 'Regular' : canvassingData.details[0].purchaseType === '2' ? 'Emergency' : 'N/A'}
                        </span>
                        {canvassingData.details[0].purchaseType === '2' && (
                          <span className="text-xs bg-red-100 text-red-700 px-1.5 py-0.5 rounded-full font-medium shrink-0">Emergency</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Pricing Section */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                    <div className={`p-3 sm:p-4 rounded-xl border ${darkMode ? 'bg-blue-900/30 border-blue-700' : 'bg-blue-50 border-blue-200'}`}>
                      <label className={`block text-xs font-medium mb-1 ${darkMode ? 'text-blue-300' : 'text-blue-600'}`}>
                        Offered Price
                      </label>
                      <div className={`text-sm sm:text-base font-bold ${darkMode ? 'text-blue-300' : 'text-blue-800'}`}>
                        <span className="hidden sm:inline">₱{canvassingData.details.reduce((total, item) => total + (item.offeredPrice || 0), 0).toLocaleString()}</span>
                        <span className="sm:hidden">₱{canvassingData.details.reduce((total, item) => total + (item.offeredPrice || 0), 0).toLocaleString()}</span>
                        <span className="text-xs ml-1 opacity-75">/{canvassingData.details[0].unitOfMeasure || 'N/A'}</span>
                      </div>
                    </div>
                    <div className={`p-3 sm:p-4 rounded-xl border ${darkMode ? 'bg-purple-900/30 border-purple-700' : 'bg-purple-50 border-purple-200'}`}>
                      <label className={`block text-xs font-medium mb-1 ${darkMode ? 'text-purple-300' : 'text-purple-600'}`}>
                        Bid Price
                      </label>
                      <div className={`text-sm sm:text-base font-bold ${darkMode ? 'text-purple-300' : 'text-purple-800'}`}>
                        <span className="hidden sm:inline">₱{canvassingData.details.reduce((total, item) => total + (item.bidPrice || 0), 0).toLocaleString()}</span>
                        <span className="sm:hidden">₱{canvassingData.details.reduce((total, item) => total + (item.bidPrice || 0), 0).toLocaleString()}</span>
                        <span className="text-xs ml-1 opacity-75">/{canvassingData.details[0].unitOfMeasure || 'N/A'}</span>
                      </div>
                    </div>
                    <div className={`p-3 sm:p-4 rounded-xl border ${darkMode ? 'bg-emerald-900/30 border-emerald-700' : 'bg-emerald-50 border-emerald-200'}`}>
                      <label className={`block text-xs font-medium mb-1 ${darkMode ? 'text-emerald-300' : 'text-emerald-600'}`}>
                        Agreed Price
                      </label>
                      <div className={`text-sm sm:text-base font-bold ${darkMode ? 'text-emerald-300' : 'text-emerald-800'}`}>
                        <span className="hidden sm:inline">₱{canvassingData.details.reduce((total, item) => total + (item.finalPrice || 0), 0).toLocaleString()}</span>
                        <span className="sm:hidden">₱{canvassingData.details.reduce((total, item) => total + (item.finalPrice || 0), 0).toLocaleString()}</span>
                        <span className="text-xs ml-1 opacity-75">/{canvassingData.details[0].unitOfMeasure || 'N/A'}</span>
                      </div>
                    </div>
                    <div className={`p-3 sm:p-4 rounded-xl border ${darkMode ? 'bg-gray-700/30 border-gray-600' : 'bg-white border-gray-200'}`}>
                      <label className={`block text-xs font-medium mb-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        Currency
                      </label>
                      <div className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                        {canvassingData.details[0].currency || 'PHP'}
                      </div>
                    </div>
                  </div>

                  {/* Personnel Section */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mt-3 sm:mt-4">
                    <div className={`p-3 sm:p-4 rounded-xl border ${darkMode ? 'bg-gray-700/30 border-gray-600' : 'bg-gray-50 border-gray-200'}`}>
                      <label className={`block text-xs font-medium mb-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        Canvassed By
                      </label>
                      <div className={`text-sm font-medium truncate ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                        {canvassingData.header.createdBy}
                      </div>
                    </div>
                    <div className={`p-3 sm:p-4 rounded-xl border ${darkMode ? 'bg-gray-700/30 border-gray-600' : 'bg-gray-50 border-gray-200'}`}>
                      <label className={`block text-xs font-medium mb-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        Evaluated By
                      </label>
                      <div className={`text-sm font-medium truncate ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                        {canvassingData.header.evaluatedBy || 'N/A'}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Items Details Table */}
                <div className="mt-4 sm:mt-6">
                  <h4 className={`text-xs sm:text-sm font-semibold uppercase tracking-wider mb-3 sm:mb-4 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    Item Details
                  </h4>
                  <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700 -mx-3 sm:mx-0">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                      <thead className={`${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                        <tr>
                          <th className={`px-3 sm:px-4 py-2.5 sm:py-3.5 text-left text-xs font-semibold uppercase tracking-wider ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                            <span className="hidden sm:inline">Item Ref No.</span>
                            <span className="sm:hidden">Ref No.</span>
                          </th>
                          <th className={`px-3 sm:px-4 py-2.5 sm:py-3.5 text-left text-xs font-semibold uppercase tracking-wider ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                            Item Details
                          </th>
                          <th className={`hidden lg:table-cell px-3 sm:px-4 py-2.5 sm:py-3.5 text-left text-xs font-semibold uppercase tracking-wider ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                            Company
                          </th>
                          <th className={`px-3 sm:px-4 py-2.5 sm:py-3.5 text-left text-xs font-semibold uppercase tracking-wider ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                            Qty
                          </th>
                          {(canvassingData.header.postStatus >= 2 || canvassingData.details.some(item => item.approvedBy)) && (
                            <th className={`px-3 sm:px-4 py-2.5 sm:py-3.5 text-left text-xs font-semibold uppercase tracking-wider ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                              Status
                            </th>
                          )}
                        </tr>
                      </thead>
                      <tbody className={`${darkMode ? 'bg-gray-800 divide-gray-700' : 'bg-white divide-gray-200'}`}>
                        {canvassingData.details.map((item, index) => (
                          <tr key={item.id} className={`${darkMode ? 'hover:bg-gray-700/50' : 'hover:bg-gray-50'} transition-colors duration-150`}>
                            <td className="px-3 sm:px-4 py-2.5 sm:py-3.5">
                              <span className={`text-xs sm:text-sm font-medium ${darkMode ? 'text-blue-400' : 'text-blue-600'}`}>
                                {item.rid || item.RID || 'N/A'}
                              </span>
                            </td>
                            <td className="px-3 sm:px-4 py-2.5 sm:py-3.5">
                              <div className="max-w-[150px] sm:max-w-none">
                                <div className={`text-xs sm:text-sm font-medium truncate ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                                  {item.itemDescription}
                                </div>
                                <div className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                                  {item.itemNumber ? `Item: ${item.itemNumber}` : 'No item #'}
                                </div>
                              </div>
                            </td>
                            <td className={`hidden lg:table-cell px-3 sm:px-4 py-2.5 sm:py-3.5`}>
                              <span className={`text-xs sm:text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                {item.company || 'N/A'}
                              </span>
                            </td>
                            <td className="px-3 sm:px-4 py-2.5 sm:py-3.5">
                              <span className={`text-xs sm:text-sm font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                                {item.quantity} <span className="text-xs opacity-70">{item.unitOfMeasure}</span>
                              </span>
                            </td>
                            {(canvassingData.header.postStatus >= 2 || canvassingData.details.some(item => item.approvedBy)) && (
                              <td className="px-3 sm:px-4 py-2.5 sm:py-3.5">
                                <div className="space-y-0.5">
                                  {item.approvedBy && (
                                    <div className={`text-xs ${darkMode ? 'text-emerald-400' : 'text-emerald-600'}`}>
                                      <span className="font-medium">✓</span> {item.approvedBy}
                                      {item.dateApproved && <span className="hidden sm:inline"> ({new Date(item.dateApproved).toLocaleDateString()})</span>}
                                    </div>
                                  )}
                                </div>
                              </td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center py-12 sm:py-16">
                <div className={`mx-auto w-12 h-12 sm:w-16 sm:h-16 rounded-full flex items-center justify-center mb-3 sm:mb-4 ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                  <svg className="w-6 h-6 sm:w-8 sm:h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6-4h6m2 5.291A7.962 7.962 0 0112 15c-2.34 0-4.29-1-5.625-2.709M12 4v16m8-8H4" />
                  </svg>
                </div>
                <h3 className={`text-sm sm:text-lg font-medium ${darkMode ? 'text-gray-300' : 'text-gray-900'}`}>No data available</h3>
                <p className={`mt-1 text-xs sm:text-sm ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                  Unable to load canvassing request details.
                </p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className={`px-3 sm:px-6 py-3 sm:py-4 border-t ${darkMode ? 'border-gray-700 bg-gradient-to-r from-gray-800 via-gray-800 to-gray-900' : 'border-gray-200 bg-gradient-to-r from-gray-50 via-white to-gray-100'}`}>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleClose}
                className={`px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl text-sm font-medium transition-all duration-200 w-full sm:w-auto ${darkMode
                  ? 'bg-gray-700 text-gray-300 hover:bg-gray-600 border border-gray-600'
                  : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300 shadow-sm hover:shadow'
                  }`}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      <EditCanvassingModal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        darkMode={darkMode}
        user={user}
        canvassingData={canvassingData}
        onSuccess={() => {
          setShowEditModal(false);
          loadCanvassingDetails(); // Refresh the details after edit
        }}
      />
    </div>
  );
}

export default CanvassingDetailsModal;
