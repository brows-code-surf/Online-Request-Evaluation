'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '../../../../utils/authContext';
import ProtectedRoute from '@/utils/protectedRoute';
import HeaderNavBar from '@/app/_components/headerNavBar';
import TicketList from './_components/TicketList';
import TicketForm from './_components/TicketForm';
import TicketDetails from './_components/TicketDetails';
import TicketSuccessModal from './_components/TicketSuccessModal';
import { ToastContainer, toast } from 'react-toastify';
import {
  getAllTickets,
  createTicket,
  updateTicket,
  deleteTicket
} from './_actions';

export default function TicketPage() {
  const { darkMode, user } = useAuth();

  // State management
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Modal states
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  // Data states
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');

  // Load tickets when user is available
  useEffect(() => {
    if (user) {
      loadTickets();
    }
  }, [user]);

  const loadTickets = async () => {
    try {
      setLoading(true);
      // Debug: Log user object before calling the action
      if (user) {
        console.log('User department:', user.department);
        console.log('User empName:', user.empName);
      }

      const result = await getAllTickets({}, user);
      if (result.success) {
        setTickets(result.tickets);
      } else {
        console.error('Failed to load tickets:', result.message);
      }
    } catch (error) {
      console.error('Error loading tickets:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTicket = async (ticketData) => {
    setActionLoading(true);
    try {
      const result = await createTicket(ticketData, user?.empName);
      if (result.success) {
        setSuccessMessage('Ticket created successfully!');
        setShowSuccessModal(true);
        setShowCreateForm(false);
        await loadTickets(); // Refresh the list
      } else {
        alert('Failed to create ticket: ' + result.message);
      }
    } catch (error) {
      console.error('Error creating ticket:', error);
      alert('Failed to create ticket');
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateTicket = async (ticketData) => {
    if (!selectedTicket) return;

    setActionLoading(true);
    try {
      const result = await updateTicket(selectedTicket.id, ticketData, user);
      if (result.success) {
        setSuccessMessage('Ticket updated successfully!');
        setShowSuccessModal(true);
        setShowEditForm(false);
        setSelectedTicket(null);
        await loadTickets(); // Refresh the list
      } else {
        toast.error('Failed to update ticket: ' + result.message);
      }
    } catch (error) {
      console.error('Error updating ticket:', error);
      toast.error('Failed to update ticket');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteTicket = async (ticketId) => {
    setActionLoading(true);
    try {
      const result = await deleteTicket(ticketId, user);
      if (result.success) {
        setSuccessMessage('Ticket deleted successfully!');
        setShowSuccessModal(true);
        setShowDetails(false);
        setSelectedTicket(null);
        await loadTickets(); // Refresh the list
      } else {
        alert('Failed to delete ticket: ' + result.message);
      }
    } catch (error) {
      console.error('Error deleting ticket:', error);
      alert('Failed to delete ticket');
    } finally {
      setActionLoading(false);
    }
  };

  const handleTicketClick = (ticket) => {
    setSelectedTicket(ticket);
    setShowDetails(true);
  };

  const handleEditClick = (ticket) => {
    setSelectedTicket(ticket);
    setShowEditForm(true);
    setShowDetails(false);
    // Check if user is admin before allowing update
    const isAdmin = user?.department?.trim().toUpperCase() === 'MIS';
    if (!isAdmin) {
      toast.error('You cannot update a ticket!');
      return;
    }
  };

  const closeAllModals = () => {
    setShowCreateForm(false);
    setShowEditForm(false);
    setShowDetails(false);
    setSelectedTicket(null);
  };

  return (
    <ProtectedRoute>
      <div className={`min-h-screen ${darkMode ? 'bg-gray-900' : 'bg-gray-50'} transition-colors duration-300`}>
        <HeaderNavBar />

        {/* Main Content */}
        <div className="pt-16 pb-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

            {/* Page Header */}
            <div className="mb-10 mt-8">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h1 className={`text-4xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'} mb-3`}>
                    Support Tickets
                  </h1>
                  <p className={`text-lg ${darkMode ? 'text-gray-300' : 'text-gray-600'} max-w-2xl`}>
                    Create, manage, and track all your support tickets in one place
                  </p>
                </div>

                <button
                  onClick={() => setShowCreateForm(true)}
                  className="inline-flex items-center gap-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-6 py-3 rounded-xl font-semibold transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Create Ticket
                </button>
              </div>
            </div>

            {/* Ticket List */}
            <TicketList
              tickets={tickets}
              onTicketClick={handleTicketClick}
              loading={loading}
            />
          </div>
        </div>

        {/* Create Ticket Modal */}
        {showCreateForm && (
          <div className="fixed inset-0 bg-opacity-10 backdrop-blur-lg flex items-center justify-center z-50 p-4">
            <div className="max-w-2xl w-full max-h-[90vh] overflow-y-auto bg-white dark:bg-gray-800 rounded-lg shadow-2xl">
              <TicketForm
                onSubmit={handleCreateTicket}
                onCancel={() => setShowCreateForm(false)}
                loading={actionLoading}
              />
            </div>
          </div>
        )}

        {/* Edit Ticket Modal */}
        {showEditForm && selectedTicket && (
          <div className="fixed inset-0 bg-opacity-10 backdrop-blur-lg flex items-center justify-center z-50 p-4">
            <div className="max-w-2xl w-full max-h-[90vh] overflow-y-auto bg-white dark:bg-gray-800 rounded-lg shadow-2xl">
              <TicketForm
                ticket={selectedTicket}
                onSubmit={handleUpdateTicket}
                onCancel={() => {
                  setShowEditForm(false);
                  setSelectedTicket(null);
                }}
                loading={actionLoading}
                isEdit={true}
              />
            </div>
          </div>
        )}

        {/* Ticket Details Modal */}
        {showDetails && selectedTicket && (
          <div className="fixed inset-0 bg-opacity-10 backdrop-blur-lg flex items-center justify-center z-50 p-4">
            <div className="max-w-2xl w-full max-h-[90vh] overflow-y-auto bg-white dark:bg-gray-800 rounded-lg shadow-2xl">
              <TicketDetails
                ticket={selectedTicket}
                user={user}
                onClose={() => {
                  setShowDetails(false);
                  setSelectedTicket(null);
                }}
                onEdit={handleEditClick}
                onDelete={handleDeleteTicket}
                loading={actionLoading}
              />
            </div>
          </div>
        )}

        {/* Success Modal */}
        <TicketSuccessModal
          isOpen={showSuccessModal}
          onClose={() => setShowSuccessModal(false)}
          message={successMessage}
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
    </ProtectedRoute>
  );
}
