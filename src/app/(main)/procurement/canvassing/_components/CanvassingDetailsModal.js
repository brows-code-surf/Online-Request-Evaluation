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

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity" aria-hidden="true">
          <div className="absolute inset-0 bg-gray-500 opacity-75" onClick={handleClose}></div>
        </div>

        <div className={`inline-block align-bottom rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-7xl sm:w-full h-[90vh] max-h-[90vh] relative z-10 ${darkMode ? 'bg-gray-800' : 'bg-white'}`} onClick={(e) => e.stopPropagation()}>
          {/* Header */}
          <div className={`px-6 py-4 border-b ${darkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-gray-50'}`}>
            <div className="flex items-center justify-between">
              <h3 className={`text-lg font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                Canvassing Request Details - {pqCode}
              </h3>
              <div className="flex items-center space-x-2">
                {canvassingData && canvassingData.header.postStatus === 0 && (
                  <button
                    type="button"
                    onClick={() => setShowEditModal(true)}
                    className={`rounded-md p-2 ${darkMode ? 'text-blue-400 hover:text-blue-300 hover:bg-gray-700' : 'text-blue-600 hover:text-blue-700 hover:bg-blue-50'} transition-colors duration-200`}
                    title="Edit Request"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleClose}
                  className={`rounded-md p-2 ${darkMode ? 'text-gray-400 hover:text-gray-300' : 'text-gray-400 hover:text-gray-500'}`}
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="px-6 py-4 overflow-y-auto" style={{ height: 'calc(90vh - 140px)' }}>
            {loading ? (
              <div className="space-y-6">
                {/* Request Information Skeleton */}
                <div>
                  <SkeletonLoader height="h-5" width="w-40" className="mb-4" />
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {Array(6).fill().map((_, i) => (
                      <div key={i}>
                        <SkeletonLoader height="h-4" width="w-20" className="mb-2" />
                        <SkeletonLoader height="h-5" width="w-24" />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Items Details Skeleton */}
                <div>
                  <SkeletonLoader height="h-5" width="w-32" className="mb-4" />
                  <div className="overflow-x-auto">
                    <div className={`border ${darkMode ? 'border-gray-600' : 'border-gray-200'} rounded-lg overflow-hidden`}>
                      <div className={`${darkMode ? 'bg-gray-700' : 'bg-gray-100'} border-b ${darkMode ? 'border-gray-600' : 'border-gray-200'} p-3`}>
                        <div className="flex gap-4">
                          <SkeletonLoader height="h-4" width="w-24" />
                          <SkeletonLoader height="h-4" width="w-20" />
                          <SkeletonLoader height="h-4" width="w-16" />
                          <SkeletonLoader height="h-4" width="w-28" />
                        </div>
                      </div>
                      {Array(5).fill().map((_, i) => (
                        <div key={i} className={`border-b ${darkMode ? 'border-gray-600' : 'border-gray-200'} p-3 last:border-b-0`}>
                          <div className="flex gap-4">
                            <div className="flex-1">
                              <SkeletonLoader height="h-4" width="w-32" className="mb-1" />
                              <SkeletonLoader height="h-3" width="w-40" />
                            </div>
                            <SkeletonLoader height="h-4" width="w-12" />
                            <div className="flex-1">
                              <SkeletonLoader height="h-4" width="w-16" className="mb-1" />
                              <SkeletonLoader height="h-4" width="w-14" />
                            </div>
                            <div className="flex-1">
                              <SkeletonLoader height="h-4" width="w-20" className="mb-1" />
                              <SkeletonLoader height="h-3" width="w-16" />
                            </div>
                            <div className="flex-1">
                              <SkeletonLoader height="h-4" width="w-20" className="mb-1" />
                              <SkeletonLoader height="h-3" width="w-16" />
                            </div>
                            <div className="flex-1">
                              <SkeletonLoader height="h-4" width="w-20" className="mb-1" />
                              <SkeletonLoader height="h-3" width="w-16" />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ) : canvassingData ? (
              <div className="space-y-6">
                {/* Header Information */}
                <div>
                  <h4 className={`text-md font-medium mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    Request Information
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div>
                      <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                        Reference Number
                      </label>
                      <p className={`text-sm ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                        {canvassingData.header.referenceNum}
                      </p>
                    </div>
                    <div>
                      <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                        Company
                      </label>
                      <p className={`text-sm ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                        {canvassingData.header.company}
                      </p>
                    </div>
                    <div>
                      <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                        Status
                      </label>
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${canvassingData.header.postStatus === 0 ? 'bg-yellow-100 text-yellow-800' :
                          canvassingData.header.postStatus === 1 ? 'bg-blue-100 text-blue-800' :
                            canvassingData.header.postStatus === 2 ? 'bg-green-100 text-green-800' :
                              'bg-gray-100 text-gray-800'
                        }`}>
                        {canvassingData.header.postStatus === 0 ? 'DRAFT' :
                          canvassingData.header.postStatus === 1 ? 'FOR CANVASSING' :
                            canvassingData.header.postStatus === 2 ? 'APPROVED' : 'COMPLETED'}
                      </span>
                    </div>
                    <div>
                      <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                        Supplier Name:
                      </label>
                      <p className={`text-sm ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                        {canvassingData.details[0].vendorName}
                      </p>
                    </div>
                    <div>
                      <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                        Created By
                      </label>
                      <p className={`text-sm ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                        {canvassingData.header.createdBy}
                      </p>
                    </div>
                    <div>
                      <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                        Date Requested
                      </label>
                      <p className={`text-sm ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                        {new Date(canvassingData.header.dateRequested).toLocaleDateString()}
                      </p>
                    </div>
                    {/* Display Delivery Date if it exists and is not null/blank */}
                    {canvassingData.details[0]?.deliverySchedule && (
                      <div>
                        <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                          Delivery Schedule
                        </label>
                        <p className={`text-sm ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                          {(() => {
                            try {
                              const deliveryDate = new Date(canvassingData.details[0].deliverySchedule);
                              return !isNaN(deliveryDate.getTime()) ? deliveryDate.toLocaleDateString() : canvassingData.details[0].deliverySchedule;
                            } catch (error) {
                              return canvassingData.details[0].deliverySchedule;
                            }
                          })()}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Supplier & Pricing Summary Container */}
                <div className={`mt-6 p-4 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                  <h5 className={`text-sm font-medium mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    Supplier & Pricing Summary
                  </h5>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {/* Display Brand if it exists and is not null/blank */}
                    {canvassingData.details[0]?.brand && canvassingData.details[0].brand.trim() && (
                      <div>
                        <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                          Brand
                        </label>
                        <p className={`text-sm ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                          {canvassingData.details[0].brand}
                        </p>
                      </div>
                    )}
                    {/* Display Origin if it exists and is not null/blank */}
                    {canvassingData.details[0]?.origin && canvassingData.details[0].origin.trim() && (
                      <div>
                        <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                          Origin
                        </label>
                        <p className={`text-sm ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                          {canvassingData.details[0].origin}
                          {canvassingData.details[0].isImported && (
                            <span className="ml-1 text-xs bg-blue-100 text-blue-800 px-1 rounded">Imported</span>
                          )}
                        </p>
                      </div>
                    )}
                    {/* Display Total Offered Price */}
                    <div>
                      <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                        Total Offered Price
                      </label>
                      <p className={`text-sm ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                        ₱{canvassingData.details.reduce((total, item) => total + (item.offeredPrice || 0), 0).toLocaleString()}
                      </p>
                    </div>
                    {/* Display Total Bid Price */}
                    <div>
                      <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                        Total Bid Price
                      </label>
                      <p className={`text-sm ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                        ₱{canvassingData.details.reduce((total, item) => total + (item.bidPrice || 0), 0).toLocaleString()}
                      </p>
                    </div>
                    {/* Display Total Agreed Price */}
                    <div>
                      <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                        Total Agreed Price
                      </label>
                      <p className={`text-sm font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                        ₱{canvassingData.details.reduce((total, item) => total + (item.finalPrice || 0), 0).toLocaleString()}
                      </p>
                    </div>
                    {/* Display Total Supplier Quantity */}
                    <div>
                      <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                        Total Supplier Qty
                      </label>
                      <p className={`text-sm ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                        {canvassingData.details.reduce((total, item) => total + (item.supplierQty || item.quantity || 0), 0).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Approval Status */}
                {canvassingData.approvals && canvassingData.approvals.length > 0 && (
                  <div>
                    <h4 className={`text-md font-medium mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                      Approval Status
                    </h4>
                    <div className="space-y-2">
                      {canvassingData.approvals.map((approval, index) => (
                        <div key={approval.id} className={`p-3 rounded-md ${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                          <div className="flex items-center justify-between">
                            <div>
                              <span className={`text-sm font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                                {approval.approvedBy}
                              </span>
                              <span className={`ml-2 text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                {new Date(approval.dateApproved).toLocaleDateString()}
                              </span>
                            </div>
                            <span className={`px-2 py-1 text-xs font-semibold rounded-full ${approval.isApproved ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                              }`}>
                              {approval.isApproved ? 'Approved' : 'Pending'}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Items Details */}
                <div>
                  <h4 className={`text-md font-medium mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    Items Details ({canvassingData.details.length} items)
                  </h4>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className={`${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                        <tr>
                          <th className={`px-4 py-3 text-left text-xs font-medium uppercase tracking-wider min-w-[300px] ${darkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                            Item Details
                          </th>
                          <th className={`px-4 py-3 text-left text-xs font-medium uppercase tracking-wider min-w-[100px] ${darkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                            Quantity
                          </th>
                          {(canvassingData.header.postStatus >= 2 || canvassingData.details.some(item => item.approvedBy)) && (
                            <th className={`px-4 py-3 text-left text-xs font-medium uppercase tracking-wider min-w-[150px] ${darkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                              Status
                            </th>
                          )}
                        </tr>
                      </thead>
                      <tbody className={`${darkMode ? 'bg-gray-800 divide-gray-700' : 'bg-white divide-gray-200'}`}>
                        {canvassingData.details.map((item, index) => (
                          <tr key={item.id} className={`${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-50'}`}>
                            <td className="px-4 py-3">
                              <div>
                                <div className={`text-sm font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                                  {item.itemNumber}
                                </div>
                                <div className={`text-sm ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                                  {item.itemDescription}
                                </div>
                                <div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                  UOM: {item.unitOfMeasure} | Budget: {item.budgetCode}
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <div className={`text-sm ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                                {item.quantity}
                              </div>
                            </td>
                            {(canvassingData.header.postStatus >= 2 || canvassingData.details.some(item => item.approvedBy)) && (
                              <td className="px-4 py-3">
                                <div className="space-y-1">
                                  {item.approvedBy && (
                                    <div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                      Approved: {item.approvedBy}
                                      {item.dateApproved && ` (${new Date(item.dateApproved).toLocaleDateString()})`}
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
              </div>
            ) : (
              <div className="text-center py-12">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6-4h6m2 5.291A7.962 7.962 0 0112 15c-2.34 0-4.29-1-5.625-2.709M12 4v16m8-8H4" />
                </svg>
                <h3 className={`mt-2 text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-900'}`}>No data available</h3>
                <p className={`mt-1 text-sm ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                  Unable to load canvassing request details.
                </p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className={`px-6 py-4 border-t ${darkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-gray-50'}`}>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleClose}
                className={`px-4 py-2 border rounded-md text-sm font-medium transition-colors duration-200 ${darkMode
                  ? 'border-gray-600 text-gray-300 hover:bg-gray-700'
                  : 'border-gray-300 text-gray-700 hover:bg-gray-50'
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
