'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '../../../../utils/authContext';
import ProtectedRoute from '@/utils/protectedRoute';
import HeaderNavBar from '@/app/_components/headerNavBar';
import ContentLeftPanel from '../../_components/contentLeftPanel';
import PurchaseOrderDetails from './_components/PurchaseOrderDetails';
import CreatePurchaseOrderModal from './_components/CreatePurchaseOrderModal';
import EditPurchaseOrderModal from './_components/EditPurchaseOrderModal';
import SideNotchOpenLeftPanel from '../../_components/sideNotchOpenLeftPanel';
import Loader from '@/app/_components/loader';
import { SkeletonRequestEvaluationDetail } from '@/app/_components/skeletonLoader';
import { ToastContainer, toast } from 'react-toastify';
import { useSocketMultiple } from '@/hooks/useSocketMultiple';
import {
  getAllPurchaseOrders,
  getPurchaseOrderByPONumber,
  deletePurchaseOrder
} from './_actions';

function PurchaseOrderContent() {
  const { darkMode, user, isAdmin } = useAuth();
  const searchParams = useSearchParams();
  const loadingRef = useRef(false);

  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [fullApprovals, setFullApprovals] = useState([]);
  const [selectedPurchaseOrder, setSelectedPurchaseOrder] = useState(null);
  const [purchaseOrderDetails, setPurchaseOrderDetails] = useState(null);
  const [loading, setLoading] = useState(false);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsReloadKey, setDetailsReloadKey] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('date');
  const [filterStatus, setFilterStatus] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editPurchaseOrder, setEditPurchaseOrder] = useState(null);

  // Function to reload purchase orders data without page refresh
  const reloadPurchaseOrdersData = useCallback(async () => {
    try {
      const filters = {};
      if (filterStatus && filterStatus !== 'all') {
        filters.status = filterStatus;
      }

      const data = await getAllPurchaseOrders(filters, user, isAdmin);
      if (data.success) {
        setPurchaseOrders(data.purchaseOrders);
        const approvalsData = data.purchaseOrders.map(po => ({
          ...po,
          id: po.poNumber,
          title: po.vendorId || 'Unknown Vendor',
          requester: po.createdBy,
          status: po.poStatus || 'PENDING',
          requestDate: po.dateCreated,
          department: po.vendorId || 'Unknown Vendor',
          isRead: true, // Assuming all are read for now
          isRush: false, // PO doesn't have rush flag
          itemCount: po.itemCount
        }));
        return { success: true, approvalsData };
      }
      return { success: false };
    } catch (error) {
      console.error('Failed to reload purchase orders:', error);
      return { success: false };
    }
  }, [filterStatus, user]);

  useEffect(() => {
    const loadPurchaseOrders = async () => {
      if (!user?.empName) return;

      setLoading(true);
      try {
        const result = await reloadPurchaseOrdersData();
        if (result.success) {
          setFullApprovals(result.approvalsData);
          // Only set initial selection if we don't have one already
          if (!selectedPurchaseOrder) {
            const id = searchParams.get('id');
            let selectPO = null;
            if (result.approvalsData.length > 0) {
              selectPO = result.approvalsData[0];
              if (id) {
                const urlSelected = result.approvalsData.find(po => po.id === id);
                if (urlSelected) {
                  selectPO = urlSelected;
                }
              }
              setSelectedPurchaseOrder(selectPO);
            }
          }
        }
      } catch (error) {
        console.error('Failed to load purchase orders:', error);
      } finally {
        setLoading(false);
      }
    };

    loadPurchaseOrders();
  }, [user?.empName, reloadPurchaseOrdersData]); // Removed selectedPurchaseOrder from dependencies

  // Handle sidebar open event
  useEffect(() => {
    const handleOpenSidebar = () => {
      setSidebarOpen(true);
    };

    window.addEventListener('openSidebar', handleOpenSidebar);
    return () => window.removeEventListener('openSidebar', handleOpenSidebar);
  }, []);

  useEffect(() => {
    const loadDetails = async () => {
      // Prevent concurrent loads
      if (loadingRef.current || !selectedPurchaseOrder?.poNumber) return;

      loadingRef.current = true;
      setDetailsLoading(true);

      try {
        console.log(`Loading details for PO: ${selectedPurchaseOrder.poNumber}, reload key: ${detailsReloadKey}`);

        // Add cache-busting timestamp to ensure fresh data
        const cacheBust = Date.now();
        const details = await getPurchaseOrderByPONumber(
          selectedPurchaseOrder.poNumber,
          user,
          isAdmin()
        );

        console.log('API Response:', details);

        // Only update if this is still the selected PO
        if (details.success && details.purchaseOrder) {
          console.log('Updating purchase order details:', details.purchaseOrder);
          setPurchaseOrderDetails(details.purchaseOrder);
        } else {
          console.error('API response structure unexpected:', details);
          setPurchaseOrderDetails(null);
        }
      } catch (error) {
        console.error('Failed to load purchase order details:', error);
        setPurchaseOrderDetails(null);
      } finally {
        setDetailsLoading(false);
        loadingRef.current = false;
      }
    };

    loadDetails();
  }, [selectedPurchaseOrder?.poNumber, detailsReloadKey]);

  // Handle URL parameter changes to select purchase order
  useEffect(() => {
    const id = searchParams.get('id');
    if (id && purchaseOrders.length > 0) {
      const urlSelected = purchaseOrders.find(po => po.poNumber === id);
      if (urlSelected && urlSelected.poNumber !== selectedPurchaseOrder?.poNumber) {
        const approvalSelected = {
          ...urlSelected,
          id: urlSelected.poNumber,
          title: urlSelected.vendName || 'Unknown Vendor',
          requester: urlSelected.createdBy,
          status: urlSelected.poStatus || 'PENDING',
          requestDate: urlSelected.dateCreated,
          department: urlSelected.vendName || 'Unknown Vendor',
          isRead: true,
          isRush: false,
          itemCount: urlSelected.itemCount
        };
        setSelectedPurchaseOrder(approvalSelected);
      }
    }
  }, [searchParams, purchaseOrders, selectedPurchaseOrder?.poNumber]);

  // Handle purchase order selection with fresh data loading
  const handleSelectPurchaseOrder = (approval) => {
    // Always update the selection and force reload of details
    setSelectedPurchaseOrder(approval);
    setPurchaseOrderDetails(null);
    setDetailsLoading(true);

    // Increment reload key to trigger useEffect even for same PO
    setDetailsReloadKey(prev => prev + 1);
  };

  // Filter and sort approvals
  const filteredApprovals = purchaseOrders
    .map(po => ({
      ...po,
      id: po.poNumber,
      title: po.poNumber || 'Unknown Vendor',
      requester: po.createdBy,
      status: po.poStatus || 'PENDING',
      requestDate: po.dateCreated,
      department: po.vendorId || 'Unknown Vendor',
      isRead: true,
      isRush: false,
      itemCount: po.itemCount
    }))
    .filter(approval => {
      const matchesSearch = searchQuery === '' ||
        [approval.requester, approval.title, approval.id, approval.status, approval.department].some(field =>
          field?.toString().toLowerCase().includes(searchQuery.toLowerCase())
        );

      const matchesStatus = filterStatus === 'all' || filterStatus === '' ||
        approval.status === filterStatus;

      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      if (sortBy === 'date') {
        return new Date(b.requestDate) - new Date(a.requestDate);
      } else if (sortBy === 'supplier') {
        return a.department.localeCompare(b.department);
      } else if (sortBy === 'status') {
        return a.status.localeCompare(b.status);
      }
      return 0;
    });

  const handleCreatePurchaseOrder = async (headerData, detailsData) => {
    // This will be called after successful creation in the modal
    await reloadPurchaseOrdersData();
    setShowCreateModal(false);
  };

  const handleEditPurchaseOrder = (purchaseOrder) => {
    setEditPurchaseOrder(purchaseOrder);
    setShowEditModal(true);
  };

  const handleEditSuccess = async () => {
    await reloadPurchaseOrdersData();
    setShowEditModal(false);
    setEditPurchaseOrder(null);
    // Refresh details if it's the current PO
    if (selectedPurchaseOrder?.poNumber === editPurchaseOrder?.header?.poNumber) {
      setDetailsReloadKey(prev => prev + 1);
    }
  };

  const handleDeletePurchaseOrder = async (poNumber) => {
    try {
      const result = await deletePurchaseOrder(poNumber, user?.empName);
      if (result.success) {
        toast.success('Purchase order deleted successfully');
        await reloadPurchaseOrdersData();
        // Clear selection if it's the deleted PO
        if (selectedPurchaseOrder?.poNumber === poNumber) {
          setSelectedPurchaseOrder(null);
          setPurchaseOrderDetails(null);
        }
      } else {
        toast.error('Failed to delete purchase order: ' + result.message);
      }
    } catch (error) {
      console.error('Error deleting purchase order:', error);
      toast.error('Failed to delete purchase order');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'P.O. APPROVED':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'FOR P.O. CONFIRMATION':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'FOR P.O. APPROVAL':
        return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'POSTED':
        return 'bg-purple-100 text-purple-800 border-purple-300';
      case 'NOT POSTED':
        return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'CANCELLED':
        return 'bg-red-100 text-red-800 border-red-300';
      case 'P.O. REJECTED':
        return 'bg-red-100 text-red-800 border-red-300';
      case 'C.O.Q. REJECTED FROM P.O.':
        return 'bg-red-100 text-red-800 border-red-300';
      case 'P.R. REJECTED FROM P.O.':
        return 'bg-red-100 text-red-800 border-red-300';
      case 'PARTIALLY SERVED':
        return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'SERVED':
        return 'bg-green-100 text-green-800 border-green-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  // Real-time updates - listen to both purchase-order-broadcast and request-evaluation-broadcast
  useSocketMultiple("purchase-order-broadcast", {
    "purchase-order-created": useCallback(
      (data) => {
        console.log("Purchase order created event received:", data);
        reloadPurchaseOrdersData();
      },
      [reloadPurchaseOrdersData]
    ),
    "purchase-order-updated": useCallback(
      (data) => {
        console.log("Purchase order updated event received:", data);
        reloadPurchaseOrdersData();
      },
      [reloadPurchaseOrdersData]
    ),
    "po-approved": useCallback(
      (data) => {
        console.log("Purchase order approved event received:", data);
        reloadPurchaseOrdersData();
      },
      [reloadPurchaseOrdersData]
    ),
    "po-confirmed": useCallback(
      (data) => {
        console.log("Purchase order confirmed event received:", data);
        reloadPurchaseOrdersData();
      },
      [reloadPurchaseOrdersData]
    ),
    "po-rejected": useCallback(
      (data) => {
        console.log("Purchase order rejected event received:", data);
        reloadPurchaseOrdersData();
      },
      [reloadPurchaseOrdersData]
    ),
    "purchase-order-status-updated": useCallback(
      (data) => {
        console.log("Purchase order status updated event received:", data);
        reloadPurchaseOrdersData();
      },
      [reloadPurchaseOrdersData]
    )
  });

  useSocketMultiple("request-evaluation-broadcast", {
    "po-approved": useCallback(
      (data) => {
        console.log("PO approved event from request-evaluation:", data);
        reloadPurchaseOrdersData();
      },
      [reloadPurchaseOrdersData]
    ),
    "po-confirmed": useCallback(
      (data) => {
        console.log("PO confirmed event from request-evaluation:", data);
        reloadPurchaseOrdersData();
      },
      [reloadPurchaseOrdersData]
    ),
    "po-rejected": useCallback(
      (data) => {
        console.log("PO rejected event from request-evaluation:", data);
        reloadPurchaseOrdersData();
      },
      [reloadPurchaseOrdersData]
    ),
  });

  if (loading) {
    return (
      <div className={`flex flex-col h-screen ${darkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
        <Loader loading={true} />
        <HeaderNavBar />
      </div>
    );
  }

  return (
    <div className={`flex flex-col h-screen ${darkMode ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'}`}>
      <Loader loading={loading} />
      <HeaderNavBar />
      <div className="flex flex-1 overflow-hidden pt-14">

        {/* Left Panel - Using ContentLeftPanel Component */}
        <ContentLeftPanel
          sidebarOpen={sidebarOpen}
          onSidebarClose={() => setSidebarOpen(false)}
          headerTitle="Purchase Orders"
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          filterStatus={filterStatus}
          onFilterStatusChange={setFilterStatus}
          sortBy={sortBy}
          onSortByChange={setSortBy}
          approvals={filteredApprovals}
          allApprovals={fullApprovals}
          selectedApprovalId={selectedPurchaseOrder?.id}
          onApprovalSelect={handleSelectPurchaseOrder}
          getStatusColor={getStatusColor}
          filterType="purchase-order"
          enableReadStatus={false}
          isLoading={loading}
        />

        {/* Right Panel - Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <SideNotchOpenLeftPanel
            sidebarOpen={sidebarOpen}
            setSidebarOpen={setSidebarOpen}
          />

          {/* Main Content Area */}
          <div className="flex-1 overflow-y-auto">
            {selectedPurchaseOrder ? (
              <div className="p-6">
                {detailsLoading ? (
                  <SkeletonRequestEvaluationDetail />
                ) : (
                  <PurchaseOrderDetails
                    purchaseOrder={purchaseOrderDetails}
                    onClose={() => setSelectedPurchaseOrder(null)}
                    onDelete={handleDeletePurchaseOrder}
                    onEdit={handleEditPurchaseOrder}
                    onDataRefresh={() => setDetailsReloadKey(prev => prev + 1)}
                    onRefreshList={reloadPurchaseOrdersData}
                    darkMode={darkMode}
                  />
                )}
              </div>
            ) : (
              <div className="flex items-center justify-center h-full">
                <div className={`text-center ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  <svg className="w-16 h-16 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <p className="text-lg font-medium">Select a purchase order to view details</p>
                  <p className="text-sm mt-2">Click on any purchase order from the list on the left to see its details.</p>
                </div>
              </div>
            )}
          </div>

          {/* Floating Action Button - Create Purchase Order */}
          <button
            onClick={() => setShowCreateModal(true)}
            className="fixed bottom-6 right-6 bg-gradient-to-r from-blue-600 to-green-600 hover:from-blue-700 hover:to-green-700 text-white p-4 rounded-full shadow-lg hover:shadow-2xl transform hover:scale-110 transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-blue-500 focus:ring-opacity-50 backdrop-blur-md hover:backdrop-blur-sm opacity-70 hover:opacity-100"
            title="Create Purchase Order"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </button>
        </div>
      </div>

      {/* Create Purchase Order Modal */}
      <CreatePurchaseOrderModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        darkMode={darkMode}
        user={user}
        onSuccess={handleCreatePurchaseOrder}
      />

      {/* Edit Purchase Order Modal */}
      <EditPurchaseOrderModal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setEditPurchaseOrder(null);
        }}
        darkMode={darkMode}
        user={user}
        purchaseOrder={editPurchaseOrder}
        onSuccess={handleEditSuccess}
        purchaseOrders={purchaseOrders}
      />

      {/* Toast Container */}
      <ToastContainer
        position="top-center"
        autoClose={5000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme={darkMode ? "dark" : "light"}
      />
    </div>
  );
}

export default function PurchaseOrderPage() {
  return (
    <ProtectedRoute>
      <PurchaseOrderContent />
    </ProtectedRoute>
  );
}
