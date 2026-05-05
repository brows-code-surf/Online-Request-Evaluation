'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import HeaderNavBar from '../../../_components/headerNavBar';
import Loader from '@/app/_components/loader';
import ProtectedRoute from '@/utils/protectedRoute';
import { useAuth } from '../../../../utils/authContext';
import ContentLeftPanel from '../../_components/contentLeftPanel';
import ConfirmModal from '../../_components/confirmModal';
import { getAllUsers, getUserAccess, grantAccess, revokeAccess, getAvailableModules, addUserToConfirmBy, getConfirmByUsersForUser, updateUserStatus, addUserToApproveBy, getApproveByUsersForUser, updateApproveByUserStatus, addUserToAuthorization, getAuthorizationUsersForUser, updateAuthorizationUserStatus } from './_actions';
import { useSocketMultiple } from '@/hooks/useSocketMultiple';
import SideNotchOpenLeftPanel from '../../_components/sideNotchOpenLeftPanel';
import { SkeletonUserAccountsDetail } from '../../../_components/skeletonLoader';

function UserAccessContent() {
    const router = useRouter();
    const { user, loading, isAdmin, darkMode } = useAuth();
    const [pageLoading, setPageLoading] = useState(true);
    const [detailsLoading, setDetailsLoading] = useState(false);
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [selectedUser, setSelectedUser] = useState(null);
    const [users, setUsers] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [sortBy, setSortBy] = useState('date');
    const [filterStatus, setFilterStatus] = useState('all');

    const [userAccess, setUserAccess] = useState([]);
    const [availableModules, setAvailableModules] = useState([]);
    const [accessLoading, setAccessLoading] = useState({});
    const [successMessage, setSuccessMessage] = useState('');
    const [errorMessage, setErrorMessage] = useState('');
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [confirmAction, setConfirmAction] = useState(null);
    const [confirmMessage, setConfirmMessage] = useState('');
    const [pendingAction, setPendingAction] = useState(null);
    const [isAccessRecordsOpen, setIsAccessRecordsOpen] = useState(false);

    // User Management State
    const [confirmByUsers, setConfirmByUsers] = useState([]);
    const [approveByUsers, setApproveByUsers] = useState([]);
    const [authorizationUsers, setAuthorizationUsers] = useState([]);

    useEffect(() => {
        if (loading) return;
        if (!isAdmin()) {
            router.push('/request-evaluation');
            return;
        } else {
            fetchAllUsers();
            fetchAvailableModules();
        }
    }, [loading]);

    const fetchAllUsers = async () => {
        setPageLoading(true);
        try {
            const result = await getAllUsers();
            if (result.success && result.data) {
                setUsers(result.data.map(user => ({ ...user, title: user.requester })));
                if (result.data.length > 0) {
                    // Set selected user first
                    setSelectedUser(result.data[0]);

                    // Load user access
                    loadUserAccess(result.data[0]);

                    // Fetch confirm by users - this will be called when selectedUser is set
                    // The useEffect below will handle this automatically
                }
            } else {
                setUsers([]);
                setErrorMessage(result.message || 'Failed to load users');
            }
        } catch (error) {
            console.error('Error fetching users:', error);
            setErrorMessage('Failed to load users');
            setUsers([]);
        } finally {
            setPageLoading(false);
        }
    };

    const fetchAvailableModules = async () => {
        try {
            const result = await getAvailableModules();
            if (result.success) {
                setAvailableModules(result.data);
            }
        } catch (error) {
            console.error('Error fetching available modules:', error);
        }
    };

    // User Management Functions
    const fetchConfirmByUsers = async () => {
        if (!selectedUser) return;
        
        setDetailsLoading(true);
        try {
            console.log('Fetching confirm by users for:', selectedUser.requester);
            const result = await getConfirmByUsersForUser(selectedUser.requester);
            console.log('getConfirmByUsersForUser result:', result);
            if (result.success) {
                console.log('Setting confirmByUsers to:', result.data);
                setConfirmByUsers(result.data);
            } else {
                setErrorMessage(result.message || 'Failed to load confirm by users');
            }
        } catch (error) {
            console.error('Error fetching confirm by users:', error);
            setErrorMessage('Failed to load confirm by users');
        } finally {
            setDetailsLoading(false);
        }
    };

    const fetchApproveByUsers = async () => {
        if (!selectedUser) return;

        setDetailsLoading(true);
        try {
            console.log('Fetching approve by users for:', selectedUser.requester);
            const result = await getApproveByUsersForUser(selectedUser.requester);
            console.log('getApproveByUsersForUser result:', result);
            if (result.success) {
                console.log('Setting approveByUsers to:', result.data);
                setApproveByUsers(result.data);
            } else {
                setErrorMessage(result.message || 'Failed to load approve by users');
            }
        } catch (error) {
            console.error('Error fetching approve by users:', error);
            setErrorMessage('Failed to load approve by users');
        } finally {
            setDetailsLoading(false);
        }
    };

    const fetchAuthorizationUsers = async () => {
        if (!selectedUser) return;

        setDetailsLoading(true);
        try {
            console.log('Fetching authorization users for:', selectedUser.requester);
            const result = await getAuthorizationUsersForUser(selectedUser.requester);
            console.log('getAuthorizationUsersForUser result:', result);
            if (result.success) {
                console.log('Setting authorizationUsers to:', result.data);
                setAuthorizationUsers(result.data);
            } else {
                setErrorMessage(result.message || 'Failed to load authorization users');
            }
        } catch (error) {
            console.error('Error fetching authorization users:', error);
            setErrorMessage('Failed to load authorization users');
        } finally {
            setDetailsLoading(false);
        }
    };

    const handleUpdateUserStatus = async (rowId, active) => {
        try {
            const result = await updateUserStatus(rowId, active ? 1 : 0);
            if (result.success) {
                setSuccessMessage('User status updated successfully!');
                fetchConfirmByUsers();
                setTimeout(() => setSuccessMessage(''), 3000);
            } else {
                setErrorMessage(result.message || 'Failed to update user status');
            }
        } catch (error) {
            console.error('Error updating user status:', error);
            setErrorMessage('An error occurred while updating user status');
        }
    };

    const handleAddUserToConfirmBy = async () => {
        try {
            const result = await addUserToConfirmBy('Purchasing', selectedUser.requester, 1);
            if (result.success) {
                setSuccessMessage('User added as Purchase Order Confirmation Officer successfully!');
                fetchConfirmByUsers();
                setTimeout(() => setSuccessMessage(''), 3000);
            } else {
                setErrorMessage(result.message || 'Failed to add user as PO Confirmation Officer');
            }
        } catch (error) {
            console.error('Error adding user to confirm by:', error);
            setErrorMessage('An error occurred while adding user as PO Confirmation Officer');
        }
    };

    const handleAddUserToConfirmByWithConfirmation = () => {
        setConfirmAction('addUserToConfirmBy');
        setConfirmMessage(`Are you sure you want to add ${selectedUser.requester} as a Purchase Order Confirmation Officer?`);
        setShowConfirmModal(true);
    };

    const loadUserAccess = async (userData) => {
        setDetailsLoading(true);
        try {
            console.log('Loading access for user:', userData.employeeID, userData.requester);
            const result = await getUserAccess(userData.employeeID);
            console.log('getUserAccess result:', result);
            if (result.success) {
                console.log('Setting userAccess data:', result.data);
                setUserAccess(result.data);
            } else {
                console.log('getUserAccess failed:', result.message);
                setUserAccess([]);
            }
        } catch (error) {
            console.error('Error loading user access:', error);
            setUserAccess([]);
        } finally {
            setDetailsLoading(false);
        }
    };

    const handleSelectUser = (userData) => {
        setDetailsLoading(true);
        setTimeout(() => {
            setSelectedUser(userData);
            loadUserAccess(userData);
            fetchConfirmByUsers(); // Fetch confirm by users when user is selected
            setDetailsLoading(false);
        }, 300);
    };

    const handleAccessToggle = async (moduleId, currentAccess) => {
        if (!selectedUser) return;

        const action = currentAccess ? 'revoke' : 'grant';
        const message = `Are you sure you want to ${action} access to "${moduleId}" for ${selectedUser.requester}?`;

        setPendingAction({ moduleId, action, currentAccess });
        setConfirmAction(action);
        setConfirmMessage(message);
        setShowConfirmModal(true);
    };

    const executeAccessChange = async () => {
        if (!pendingAction || !selectedUser) return;

        const { moduleId, action } = pendingAction;
        const moduleName = availableModules.find(m => m.id === moduleId)?.name || moduleId;

        setAccessLoading(prev => ({ ...prev, [moduleId]: true }));
        setSuccessMessage('');
        setErrorMessage('');

        try {
            let result;
            if (action === 'grant') {
                result = await grantAccess(selectedUser.employeeID, selectedUser.requester, moduleId, user.empName);
            } else {
                result = await revokeAccess(selectedUser.employeeID, moduleId, user.empName);
            }

            if (result.success) {
                setSuccessMessage(`Access ${action === 'grant' ? 'granted' : 'revoked'} successfully for ${selectedUser.requester} to ${moduleName}!`);

                // Update local state
                if (action === 'grant') {
                    const newAccess = {
                        ROWID: Date.now(), // Temporary ID
                        EMPLOYEEID: selectedUser.employeeID,
                        EMPLOYEENAME: selectedUser.requester,
                        MODULE: moduleId,
                        HASACCESS: 1,
                        CREATEDBY: user.employeeName,
                        DATECREATED: new Date(),
                        MODIFIEDBY: user.employeeName,
                        DATEMODIFIED: new Date()
                    };
                    setUserAccess(prev => {
                        const existing = prev.find(a => a.MODULE === moduleId);
                        if (existing) {
                            return prev.map(a => a.MODULE === moduleId ? { ...a, HASACCESS: 1, MODIFIEDBY: user.employeeID, DATEMODIFIED: new Date() } : a);
                        } else {
                            return [...prev, newAccess];
                        }
                    });
                } else {
                    setUserAccess(prev => prev.filter(a => a.MODULE !== moduleId));
                }

                setTimeout(() => setSuccessMessage(''), 3000);
            } else {
                setErrorMessage(result.message || `Failed to ${action} access`);
            }
        } catch (error) {
            setErrorMessage(`An error occurred while ${action === 'grant' ? 'granting' : 'revoking'} access`);
        } finally {
            setAccessLoading(prev => ({ ...prev, [moduleId]: false }));
        }
    };

    const handleConfirmAction = async () => {
        if (confirmAction === 'addUserToConfirmBy') {
            // Execute the addUserToConfirmBy function
            await handleAddUserToConfirmBy();
            setShowConfirmModal(false);
            setConfirmAction(null);
            setConfirmMessage('');
            setPendingAction(null);
        } else if (confirmAction === 'activatePOOfficer') {
            // Activate existing PO Confirmation Officer
            const existingUser = confirmByUsers.find(u => 
                u.LOCNCODE === 'Purchasing' && 
                u.CONFIRMNAME === selectedUser.requester
            );
            if (existingUser) {
                await handleUpdateUserStatus(existingUser.ROWID, 1);
            }
            setShowConfirmModal(false);
            setConfirmAction(null);
            setConfirmMessage('');
            setPendingAction(null);
        } else if (confirmAction === 'deactivatePOOfficer') {
            // Deactivate existing PO Confirmation Officer
            const existingUser = confirmByUsers.find(u => 
                u.LOCNCODE === 'Purchasing' && 
                u.CONFIRMNAME === selectedUser.requester
            );
            if (existingUser) {
                await handleUpdateUserStatus(existingUser.ROWID, 0);
            }
            setShowConfirmModal(false);
            setConfirmAction(null);
            setConfirmMessage('');
            setPendingAction(null);
        } else if (confirmAction === 'addUserToApproveBy') {
            // Execute the addUserToApproveBy function
            await handleAddUserToApproveBy();
            setShowConfirmModal(false);
            setConfirmAction(null);
            setConfirmMessage('');
            setPendingAction(null);
        } else if (confirmAction === 'activatePOApprover') {
            // Activate existing PO Approver
            const existingUser = approveByUsers.find(u => 
                u.LOCNCODE === 'PURCHASING' && 
                u.APPROVENAME === selectedUser.requester
            );
            if (existingUser) {
                await updateApproveByUserStatus(existingUser.ROWID, 1);
            }
            setShowConfirmModal(false);
            setConfirmAction(null);
            setConfirmMessage('');
            setPendingAction(null);
        } else if (confirmAction === 'deactivatePOApprover') {
            // Deactivate existing PO Approver
            const existingUser = approveByUsers.find(u =>
                u.LOCNCODE === 'PURCHASING' &&
                u.APPROVENAME === selectedUser.requester
            );
            if (existingUser) {
                await updateApproveByUserStatus(existingUser.ROWID, 0);
            }
            setShowConfirmModal(false);
            setConfirmAction(null);
            setConfirmMessage('');
            setPendingAction(null);
        } else if (confirmAction === 'addUserToAuthorization') {
            // Execute the addUserToAuthorization function
            await handleAddUserToAuthorization();
            setShowConfirmModal(false);
            setConfirmAction(null);
            setConfirmMessage('');
            setPendingAction(null);
        } else if (confirmAction === 'activateAuthorization') {
            // Activate existing authorization
            const existingUser = authorizationUsers.find(u =>
                u.ACTION === 'RR Distribution of Account' &&
                u.NAME === selectedUser.requester
            );
            if (existingUser) {
                await updateAuthorizationUserStatus(existingUser.ROWID, 1);
            }
            setShowConfirmModal(false);
            setConfirmAction(null);
            setConfirmMessage('');
            setPendingAction(null);
        } else if (confirmAction === 'deactivateAuthorization') {
            // Deactivate existing authorization
            const existingUser = authorizationUsers.find(u =>
                u.ACTION === 'RR Distribution of Account' &&
                u.NAME === selectedUser.requester
            );
            if (existingUser) {
                await updateAuthorizationUserStatus(existingUser.ROWID, 0);
            }
            setShowConfirmModal(false);
            setConfirmAction(null);
            setConfirmMessage('');
            setPendingAction(null);
        } else {
            // Handle access toggle confirmations
            await executeAccessChange();
            setShowConfirmModal(false);
            setConfirmAction(null);
            setConfirmMessage('');
            setPendingAction(null);
        }
    };

    const handleCancelConfirm = () => {
        setShowConfirmModal(false);
        setConfirmAction(null);
        setConfirmMessage('');
        setPendingAction(null);
    };

    const hasAccess = (moduleId) => {
        const access = userAccess.find(a => a.MODULE === moduleId);
        return access && (access.HASACCESS === 1 || access.HASACCESS === '1' || access.HASACCESS === true);
    };

    const handlePOConfirmationOfficerToggle = () => {
        const isCurrentlyActive = confirmByUsers.some(u => 
            u.LOCNCODE === 'Purchasing' && 
            u.CONFIRMNAME === selectedUser.requester && 
            (u.ACTIVE === 1 || u.ACTIVE === '1' || u.ACTIVE === true)
        );
        
        if (isCurrentlyActive) {
            // Deactivate existing record - show confirmation
            setConfirmAction('deactivatePOOfficer');
            setConfirmMessage(`Are you sure you want to deactivate ${selectedUser.requester} as a Purchase Order Confirmation Officer?`);
            setShowConfirmModal(true);
        } else {
            // Add new user or activate existing inactive one
            const existingUser = confirmByUsers.find(u => 
                u.LOCNCODE === 'Purchasing' && 
                u.CONFIRMNAME === selectedUser.requester
            );
            
            if (existingUser) {
                // Activate existing user - show confirmation
                setConfirmAction('activatePOOfficer');
                setConfirmMessage(`Are you sure you want to activate ${selectedUser.requester} as a Purchase Order Confirmation Officer?`);
                setShowConfirmModal(true);
            } else {
                // Add new user with confirmation
                handleAddUserToConfirmByWithConfirmation();
            }
        }
    };

    const handlePOApproverToggle = () => {
        const isCurrentlyActive = approveByUsers.some(u =>
            u.LOCNCODE === 'PURCHASING' &&
            u.APPROVENAME === selectedUser.requester &&
            (u.ACTIVE === 1 || u.ACTIVE === '1' || u.ACTIVE === true)
        );

        if (isCurrentlyActive) {
            // Deactivate existing record - show confirmation
            setConfirmAction('deactivatePOApprover');
            setConfirmMessage(`Are you sure you want to deactivate ${selectedUser.requester} as a Purchase Order Approver?`);
            setShowConfirmModal(true);
        } else {
            // Add new user or activate existing inactive one
            const existingUser = approveByUsers.find(u =>
                u.LOCNCODE === 'PURCHASING' &&
                u.APPROVENAME === selectedUser.requester
            );

            if (existingUser) {
                // Activate existing user - show confirmation
                setConfirmAction('activatePOApprover');
                setConfirmMessage(`Are you sure you want to activate ${selectedUser.requester} as a Purchase Order Approver?`);
                setShowConfirmModal(true);
            } else {
                // Add new user with confirmation
                handleAddUserToApproveByWithConfirmation();
            }
        }
    };

    const handleAuthorizationToggle = () => {
        const isCurrentlyActive = authorizationUsers.some(u =>
            u.ACTION === 'RR Distribution of Account' &&
            u.NAME === selectedUser.requester &&
            (u.ACTIVE === 1 || u.ACTIVE === '1' || u.ACTIVE === true)
        );

        if (isCurrentlyActive) {
            // Deactivate existing record - show confirmation
            setConfirmAction('deactivateAuthorization');
            setConfirmMessage(`Are you sure you want to deactivate ${selectedUser.requester} for RR Distribution of Account?`);
            setShowConfirmModal(true);
        } else {
            // Add new user or activate existing inactive one
            const existingUser = authorizationUsers.find(u =>
                u.ACTION === 'RR Distribution of Account' &&
                u.NAME === selectedUser.requester
            );

            if (existingUser) {
                // Activate existing user - show confirmation
                setConfirmAction('activateAuthorization');
                setConfirmMessage(`Are you sure you want to activate ${selectedUser.requester} for RR Distribution of Account?`);
                setShowConfirmModal(true);
            } else {
                // Add new user with confirmation
                handleAddUserToAuthorizationWithConfirmation();
            }
        }
    };

    const handleAddUserToApproveBy = async () => {
        try {
            const result = await addUserToApproveBy('PURCHASING', selectedUser.requester, 1);
            if (result.success) {
                setSuccessMessage('User added as Purchase Order Approver successfully!');
                fetchApproveByUsers();
                setTimeout(() => setSuccessMessage(''), 3000);
            } else {
                setErrorMessage(result.message || 'Failed to add user as PO Approver');
            }
        } catch (error) {
            console.error('Error adding user to approve by:', error);
            setErrorMessage('An error occurred while adding user as PO Approver');
        }
    };

    const handleAddUserToApproveByWithConfirmation = () => {
        setConfirmAction('addUserToApproveBy');
        setConfirmMessage(`Are you sure you want to add ${selectedUser.requester} as a Purchase Order Approver?`);
        setShowConfirmModal(true);
    };

    const handleAddUserToAuthorization = async () => {
        try {
            const result = await addUserToAuthorization('RR Distribution of Account', selectedUser.requester, 1);
            if (result.success) {
                setSuccessMessage('User added for RR Distribution of Account successfully!');
                fetchAuthorizationUsers();
                setTimeout(() => setSuccessMessage(''), 3000);
            } else {
                setErrorMessage(result.message || 'Failed to add user for RR Distribution of Account');
            }
        } catch (error) {
            console.error('Error adding user to authorization:', error);
            setErrorMessage('An error occurred while adding user for RR Distribution of Account');
        }
    };

    const handleAddUserToAuthorizationWithConfirmation = () => {
        setConfirmAction('addUserToAuthorization');
        setConfirmMessage(`Are you sure you want to add ${selectedUser.requester} for RR Distribution of Account?`);
        setShowConfirmModal(true);
    };

    const filteredUsers = users
        .filter(u => {
            const matchesSearch = u.requester.toLowerCase().includes(searchQuery.toLowerCase()) ||
                u.email.toLowerCase().includes(searchQuery.toLowerCase()) || u.id.toString().includes(searchQuery) ||
                u.department.toLowerCase().includes(searchQuery.toLowerCase()) || u.jobTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
                u.jobLevel?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                u.status.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesStatus = filterStatus === 'all' || u.status === filterStatus;
            return matchesSearch && matchesStatus;
        })
        .sort((a, b) => {
            if (sortBy === 'date') {
                return new Date(b.requestDate) - new Date(a.requestDate);
            } else if (sortBy === 'requester') {
                return a.requester.localeCompare(b.requester);
            } else if (sortBy === 'status') {
                return a.status.localeCompare(b.status);
            }
            return 0;
        });

    const getStatusColor = (status) => {
        if (status === 'ACTIVE') {
            return 'bg-green-100 text-green-800 border-green-300';
        } else if (status === 'INACTIVE') {
            return 'bg-red-100 text-red-800 border-red-300';
        }
        return 'bg-gray-100 text-gray-800 border-gray-300';
    };

    // Set up Pusher listeners for real-time user access updates
    useSocketMultiple('user-access-broadcast', {
        'user-access-granted': useCallback((data) => {
            console.log('User access granted event received:', data);
            // Update access list if it's for the currently selected user
            if (selectedUser?.employeeID === data.employeeID) {
                setUserAccess(prev => {
                    const existing = prev.find(a => a.MODULE === data.module);
                    if (existing) {
                        return prev.map(a => a.MODULE === data.module ? { ...a, HASACCESS: 1, MODIFIEDBY: data.grantedBy, DATEMODIFIED: new Date(data.timestamp) } : a);
                    } else {
                        return [...prev, {
                            ROWID: Date.now(),
                            EMPLOYEEID: data.employeeID,
                            EMPLOYEENAME: data.employeeName,
                            MODULE: data.module,
                            HASACCESS: 1,
                            CREATEDBY: data.grantedBy,
                            DATECREATED: new Date(data.timestamp),
                            MODIFIEDBY: data.grantedBy,
                            DATEMODIFIED: new Date(data.timestamp)
                        }];
                    }
                });
            }
        }, [selectedUser?.employeeID]),
        'user-access-revoked': useCallback((data) => {
            console.log('User access revoked event received:', data);
            // Update access list if it's for the currently selected user
            if (selectedUser?.employeeID === data.employeeID) {
                setUserAccess(prev => prev.filter(a => a.MODULE !== data.module));
            }
        }, [selectedUser?.employeeID]),
        'user-access-updated': useCallback((data) => {
            console.log('User access updated event received:', data);
            // Refresh access for current user if needed
            if (selectedUser) {
                loadUserAccess(selectedUser);
            }
        }, [selectedUser]),
        'user-default-access-granted': useCallback((data) => {
            console.log('User default access granted event received:', data);
            // Update access for the newly approved user if they're currently selected
            if (selectedUser && selectedUser.employeeID === data.employeeID) {
                // Refresh access data for the selected user
                loadUserAccess(selectedUser);
            }
        }, [selectedUser])
    });

    // Automatically fetch confirm by, approve by, and authorization users when selectedUser changes
    useEffect(() => {
        if (selectedUser) {
            fetchConfirmByUsers();
            fetchApproveByUsers();
            fetchAuthorizationUsers();
        }
    }, [selectedUser]);

    if (loading || pageLoading) {
        return (
        <div className={`flex flex-col h-screen ${darkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
                <Loader loading={true} />
                <HeaderNavBar />
            </div>
        );
    }

    return (
        <div className={`flex flex-col h-screen ${darkMode ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'}`}>
            <HeaderNavBar />

            <div className="flex flex-1 overflow-hidden pt-14">
                {/* Left Panel - Users List */}
                <ContentLeftPanel
                    sidebarOpen={sidebarOpen}
                    headerTitle="User Access Management"
                    onSidebarClose={() => setSidebarOpen(false)}
                    searchQuery={searchQuery}
                    onSearchChange={setSearchQuery}
                    filterStatus={filterStatus}
                    onFilterStatusChange={setFilterStatus}
                    sortBy={sortBy}
                    onSortByChange={setSortBy}
                    approvals={filteredUsers}
                    allApprovals={users}
                    selectedApprovalId={selectedUser?.id}
                    onApprovalSelect={handleSelectUser}
                    getStatusColor={getStatusColor}
                    filterType={"accounts"}
                    isLoading={pageLoading}
                />

                {/* Right Panel - Access Management */}
                <div className="flex-1 flex flex-col overflow-hidden">
                    <SideNotchOpenLeftPanel
                        sidebarOpen={sidebarOpen}
                        setSidebarOpen={setSidebarOpen}
                    />

                    {selectedUser ? (
                        <div className="flex-1 overflow-y-auto">
                            {detailsLoading ? (
                                <SkeletonUserAccountsDetail />
                            ) : (
                                <div className="p-6">

                                    {/* Success/Error Messages */}
                                    {successMessage && (
                                        <div className={`mb-6 p-4 ${darkMode ? 'bg-green-900 border-green-700' : 'bg-green-50 border-green-200'} border rounded-lg flex items-center gap-3`}>
                                            <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                            </svg>
                                            <p className={`font-medium ${darkMode ? 'text-green-300' : 'text-green-800'}`}>{successMessage}</p>
                                        </div>
                                    )}

                                    {errorMessage && (
                                        <div className={`mb-6 p-4 ${darkMode ? 'bg-red-900 border-red-700' : 'bg-red-50 border-red-200'} border rounded-lg flex items-center gap-3`}>
                                            <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                            </svg>
                                            <p className={`font-medium ${darkMode ? 'text-red-300' : 'text-red-800'}`}>{errorMessage}</p>
                                        </div>
                                    )}

                                    {/* User Header */}
                                    <div className={`mb-6 p-4 ${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg border ${darkMode ? 'border-gray-600' : 'border-gray-200'}`}>
                                        <div className="flex items-center justify-between mb-2">
                                            <h3 className="text-lg font-semibold">Managing Access for:</h3>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div>
                                                <p className="text-sm text-gray-500">Name</p>
                                                <p className="font-medium">{selectedUser.requester}</p>
                                            </div>
                                            <div>
                                                <p className="text-sm text-gray-500">Employee ID</p>
                                                <p className="font-medium">{selectedUser.employeeID}</p>
                                            </div>
                                            <div>
                                                <p className="text-sm text-gray-500">Department</p>
                                                <p className="font-medium">{selectedUser.department}</p>
                                            </div>
                                            <div>
                                                <p className="text-sm text-gray-500">Job Title</p>
                                                <p className="font-medium">{selectedUser.jobTitle}</p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Access Permissions */}
                                    <div className={`mb-6 ${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg border ${darkMode ? 'border-gray-600' : 'border-gray-200'}`}>
                                        <div className="p-4 border-b border-gray-200">
                                            <h3 className="text-lg font-semibold">Module Access Permissions</h3>
                                            <p className="text-sm text-gray-500 mt-1">Grant or revoke access to system modules</p>
                                        </div>

                                        <div className="p-4">
                                            {availableModules.length === 0 ? (
                                                <div className="text-center py-8">
                                                    <svg className="w-12 h-12 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                    </svg>
                                                    <p className="text-gray-500">Loading modules...</p>
                                                </div>
                                            ) : (
                                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                                    {availableModules.map((module) => {
                                                        const accessGranted = hasAccess(module.id);
                                                        const isLoading = accessLoading[module.id];

                                                        return (
                                                            <div key={module.id} className={`p-4 border rounded-lg ${darkMode ? 'border-gray-600 bg-gray-700' : 'border-gray-200 bg-gray-50'}`}>
                                                                <div className="flex items-start justify-between mb-2">
                                                                    <div className="flex-1">
                                                                        <h4 className="font-medium text-sm">{module.name}</h4>
                                                                        <p className="text-xs text-gray-500 mt-1">{module.description}</p>
                                                                    </div>
                                                                    <button
                                                                        onClick={() => handleAccessToggle(module.id, accessGranted)}
                                                                        disabled={isLoading}
                                                                        className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 ${
                                                                            accessGranted
                                                                                ? 'bg-blue-600'
                                                                                : 'bg-gray-200'
                                                                        } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                                                                    >
                                                                        <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                                                                            accessGranted ? 'translate-x-5' : 'translate-x-0'
                                                                        }`} />
                                                                        {isLoading && (
                                                                            <svg className="absolute inset-0 m-auto w-4 h-4 text-white animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                                <circle cx="12" cy="12" r="1" />
                                                                            </svg>
                                                                        )}
                                                                    </button>
                                                                </div>

                                                                <div className="flex items-center gap-2">
                                                                    <div className={`w-2 h-2 rounded-full ${accessGranted ? 'bg-green-500' : 'bg-gray-400'}`} />
                                                                    <span className={`text-xs font-medium ${accessGranted ? 'text-green-600' : 'text-gray-500'}`}>
                                                                        {accessGranted ? 'Access Granted' : 'No Access'}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Authorization Category */}
                                    <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} mb-6 rounded-lg border ${darkMode ? 'border-gray-600' : 'border-gray-200'}`}>
                                        <div className="p-4 border-b border-gray-200">
                                            <h3 className="text-lg font-semibold">Authorization</h3>
                                            <p className="text-sm text-gray-500 mt-1">Handles review, verification, and approval activities.</p>
                                        </div>

                                        <div className="p-4">
                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                                {/* PO Confirmation Officer Card */}
                                                <div className={`p-4 border rounded-lg ${
                                                    confirmByUsers.some(u => 
                                                        u.LOCNCODE === 'Purchasing' && 
                                                        u.CONFIRMNAME === selectedUser.requester && 
                                                        (u.ACTIVE === 1 || u.ACTIVE === '1' || u.ACTIVE === true)
                                                    ) 
                                                        ? 'border-green-500 bg-green-50' + (darkMode ? ' bg-green-900/20' : '') 
                                                        : 'border-gray-200 bg-gray-50' + (darkMode ? ' bg-gray-700' : '')
                                                }`}>
                                                    <div className="flex items-start justify-between mb-2">
                                                        <div className="flex-1">
                                                            <h4 className="font-medium text-sm">PO Confirmation Officer</h4>
                                                            <p className="text-xs text-gray-500 mt-1">Enable this user to confirm purchase orders</p>
                                                        </div>
                                                        <button
                                                            onClick={handlePOConfirmationOfficerToggle}
                                                            className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 ${
                                                                confirmByUsers.some(u => 
                                                                    u.LOCNCODE === 'Purchasing' && 
                                                                    u.CONFIRMNAME === selectedUser.requester && 
                                                                    (u.ACTIVE === 1 || u.ACTIVE === '1' || u.ACTIVE === true)
                                                                )
                                                                    ? 'bg-blue-600'
                                                                    : 'bg-gray-200'
                                                            }`}
                                                        >
                                                            <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                                                                confirmByUsers.some(u => 
                                                                    u.LOCNCODE === 'Purchasing' && 
                                                                    u.CONFIRMNAME === selectedUser.requester && 
                                                                    (u.ACTIVE === 1 || u.ACTIVE === '1' || u.ACTIVE === true)
                                                                ) ? 'translate-x-5' : 'translate-x-0'
                                                            }`} />
                                                        </button>
                                                    </div>

                                                    <div className="flex items-center gap-2">
                                                        <div className={`w-2 h-2 rounded-full ${
                                                            confirmByUsers.some(u => 
                                                                u.LOCNCODE === 'Purchasing' && 
                                                                u.CONFIRMNAME === selectedUser.requester && 
                                                                (u.ACTIVE === 1 || u.ACTIVE === '1' || u.ACTIVE === true)
                                                            ) ? 'bg-green-500' : 'bg-gray-400'
                                                        }`} />
                                                        <span className={`text-xs font-medium ${
                                                            confirmByUsers.some(u => 
                                                                u.LOCNCODE === 'Purchasing' && 
                                                                u.CONFIRMNAME === selectedUser.requester && 
                                                                (u.ACTIVE === 1 || u.ACTIVE === '1' || u.ACTIVE === true)
                                                            ) ? 'text-green-600' : 'text-gray-500'
                                                        }`}>
                                                            {confirmByUsers.some(u => 
                                                                u.LOCNCODE === 'Purchasing' && 
                                                                u.CONFIRMNAME === selectedUser.requester && 
                                                                (u.ACTIVE === 1 || u.ACTIVE === '1' || u.ACTIVE === true)
                                                            ) ? 'Active' : 'Inactive'}
                                                        </span>
                                                    </div>
                                                </div>

                                                {/* PO Approver Card */}
                                                <div className={`p-4 border rounded-lg ${
                                                    approveByUsers.some(u => 
                                                        u.LOCNCODE === 'PURCHASING' && 
                                                        u.APPROVENAME === selectedUser.requester && 
                                                        (u.ACTIVE === 1 || u.ACTIVE === '1' || u.ACTIVE === true)
                                                    ) 
                                                        ? 'border-green-500 bg-green-50' + (darkMode ? ' bg-green-900/20' : '') 
                                                        : 'border-gray-200 bg-gray-50' + (darkMode ? ' bg-gray-700' : '')
                                                }`}>
                                                    <div className="flex items-start justify-between mb-2">
                                                        <div className="flex-1">
                                                            <h4 className="font-medium text-sm">PO Approver</h4>
                                                            <p className="text-xs text-gray-500 mt-1">Enable this user to approve purchase orders</p>
                                                        </div>
                                                        <button
                                                            onClick={handlePOApproverToggle}
                                                            className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 ${
                                                                approveByUsers.some(u => 
                                                                    u.LOCNCODE === 'PURCHASING' && 
                                                                    u.APPROVENAME === selectedUser.requester && 
                                                                    (u.ACTIVE === 1 || u.ACTIVE === '1' || u.ACTIVE === true)
                                                                )
                                                                    ? 'bg-blue-600'
                                                                    : 'bg-gray-200'
                                                            }`}
                                                        >
                                                            <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                                                                approveByUsers.some(u => 
                                                                    u.LOCNCODE === 'PURCHASING' && 
                                                                    u.APPROVENAME === selectedUser.requester && 
                                                                    (u.ACTIVE === 1 || u.ACTIVE === '1' || u.ACTIVE === true)
                                                                ) ? 'translate-x-5' : 'translate-x-0'
                                                            }`} />
                                                        </button>
                                                    </div>

                                                    <div className="flex items-center gap-2">
                                                        <div className={`w-2 h-2 rounded-full ${
                                                            approveByUsers.some(u => 
                                                                u.LOCNCODE === 'PURCHASING' && 
                                                                u.APPROVENAME === selectedUser.requester && 
                                                                (u.ACTIVE === 1 || u.ACTIVE === '1' || u.ACTIVE === true)
                                                            ) ? 'bg-green-500' : 'bg-gray-400'
                                                        }`} />
                                                        <span className={`text-xs font-medium ${
                                                            approveByUsers.some(u => 
                                                                u.LOCNCODE === 'PURCHASING' && 
                                                                u.APPROVENAME === selectedUser.requester && 
                                                                (u.ACTIVE === 1 || u.ACTIVE === '1' || u.ACTIVE === true)
                                                            ) ? 'text-green-600' : 'text-gray-500'
                                                        }`}>
                                                            {approveByUsers.some(u => 
                                                                u.LOCNCODE === 'PURCHASING' && 
                                                                u.APPROVENAME === selectedUser.requester && 
                                                                (u.ACTIVE === 1 || u.ACTIVE === '1' || u.ACTIVE === true)
                                                            ) ? 'Active' : 'Inactive'}
                                                        </span>
                                                    </div>
                                                </div>

                                                {/* RR Distribution of Account Card */}
                                                <div className={`p-4 border rounded-lg ${
                                                    authorizationUsers.some(u =>
                                                        u.ACTION === 'RR Distribution of Account' &&
                                                        u.NAME === selectedUser.requester &&
                                                        (u.ACTIVE === 1 || u.ACTIVE === '1' || u.ACTIVE === true)
                                                    )
                                                        ? 'border-green-500 bg-green-50' + (darkMode ? ' bg-green-900/20' : '')
                                                        : 'border-gray-200 bg-gray-50' + (darkMode ? ' bg-gray-700' : '')
                                                }`}>
                                                    <div className="flex items-start justify-between mb-2">
                                                        <div className="flex-1">
                                                            <h4 className="font-medium text-sm">RR Distribution of Account</h4>
                                                            <p className="text-xs text-gray-500 mt-1">Enable this user for RR Distribution of Account</p>
                                                        </div>
                                                        <button
                                                            onClick={handleAuthorizationToggle}
                                                            className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 ${
                                                                authorizationUsers.some(u =>
                                                                    u.ACTION === 'RR Distribution of Account' &&
                                                                    u.NAME === selectedUser.requester &&
                                                                    (u.ACTIVE === 1 || u.ACTIVE === '1' || u.ACTIVE === true)
                                                                )
                                                                    ? 'bg-blue-600'
                                                                    : 'bg-gray-200'
                                                            }`}
                                                        >
                                                            <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                                                                authorizationUsers.some(u =>
                                                                    u.ACTION === 'RR Distribution of Account' &&
                                                                    u.NAME === selectedUser.requester &&
                                                                    (u.ACTIVE === 1 || u.ACTIVE === '1' || u.ACTIVE === true)
                                                                ) ? 'translate-x-5' : 'translate-x-0'
                                                            }`} />
                                                        </button>
                                                    </div>

                                                    <div className="flex items-center gap-2">
                                                        <div className={`w-2 h-2 rounded-full ${
                                                            authorizationUsers.some(u =>
                                                                u.ACTION === 'RR Distribution of Account' &&
                                                                u.NAME === selectedUser.requester &&
                                                                (u.ACTIVE === 1 || u.ACTIVE === '1' || u.ACTIVE === true)
                                                            ) ? 'bg-green-500' : 'bg-gray-400'
                                                        }`} />
                                                        <span className={`text-xs font-medium ${
                                                            authorizationUsers.some(u =>
                                                                u.ACTION === 'RR Distribution of Account' &&
                                                                u.NAME === selectedUser.requester &&
                                                                (u.ACTIVE === 1 || u.ACTIVE === '1' || u.ACTIVE === true)
                                                            ) ? 'text-green-600' : 'text-gray-500'
                                                        }`}>
                                                            {authorizationUsers.some(u =>
                                                                u.ACTION === 'RR Distribution of Account' &&
                                                                u.NAME === selectedUser.requester &&
                                                                (u.ACTIVE === 1 || u.ACTIVE === '1' || u.ACTIVE === true)
                                                            ) ? 'Active' : 'Inactive'}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Access History */}
                                    {userAccess.length > 0 && (
                                        <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg border ${darkMode ? 'border-gray-600' : 'border-gray-200'}`}>
                                            <button
                                                onClick={() => setIsAccessRecordsOpen(!isAccessRecordsOpen)}
                                                className={`w-full p-4 text-left border-b border-gray-200 hover:bg-gray-50 ${darkMode ? 'hover:bg-gray-700' : ''} transition-colors`}
                                            >
                                                <div className="flex items-center justify-between">
                                                    <div>
                                                        <h3 className="text-lg font-semibold">Current Access Records</h3>
                                                        <p className="text-sm text-gray-500 mt-1">Modules with granted access</p>
                                                    </div>
                                                    <div className="flex items-center space-x-4">
                                                        <span className="text-sm font-medium text-gray-600">
                                                            {userAccess.length} {userAccess.length === 1 ? 'record' : 'records'}
                                                        </span>
                                                        <svg 
                                                            className={`w-5 h-5 text-gray-500 transition-transform ${isAccessRecordsOpen ? 'rotate-180' : ''}`}
                                                            fill="none" 
                                                            stroke="currentColor" 
                                                            viewBox="0 0 24 24"
                                                        >
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                                        </svg>
                                                    </div>
                                                </div>
                                            </button>

                                            {isAccessRecordsOpen && (
                                                <div className="p-4 border-t border-gray-200">
                                                    <div className="overflow-x-auto">
                                                        <table className="min-w-full divide-y divide-gray-200">
                                                            <thead className={`${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                                                                <tr>
                                                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Module</th>
                                                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Granted By</th>
                                                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date Granted</th>
                                                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Modified</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody className={`${darkMode ? 'bg-gray-800' : 'bg-white'} divide-y divide-gray-200`}>
                                                                {userAccess.map((access) => (
                                                                    <tr key={access.ROWID} className={`hover:bg-gray-50 ${darkMode ? 'hover:bg-gray-700' : ''} transition-colors`}>
                                                                        <td className="px-4 py-3 whitespace-nowrap text-sm font-medium">
                                                                            {availableModules.find(m => m.id === access.MODULE)?.name || access.MODULE}
                                                                        </td>
                                                                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                                                                            {access.CREATEDBY}
                                                                        </td>
                                                                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                                                                            {new Date(access.DATECREATED).toLocaleDateString()}
                                                                        </td>
                                                                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                                                                            {access.MODIFIEDBY} on {new Date(access.DATEMODIFIED).toLocaleDateString()}
                                                                        </td>
                                                                    </tr>
                                                                ))}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    

                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="flex items-center justify-center h-full">
                            <div className={`text-center ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                <svg className="w-16 h-16 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                </svg>
                                <p className="text-lg font-medium">Select a user to manage access permissions</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Confirmation Modal */}
            <ConfirmModal
                isOpen={showConfirmModal}
                title="Confirm Access Change"
                message={confirmMessage}
                confirmButtonText="Confirm"
                confirmButtonColor="blue"
                onConfirm={handleConfirmAction}
                onCancel={handleCancelConfirm}
                isLoading={Object.values(accessLoading).some(loading => loading)}
            />

        </div>
    );
}

export default function UserAccessPage() {
    return (
        <ProtectedRoute>
            <UserAccessContent />
        </ProtectedRoute>
    );
}
