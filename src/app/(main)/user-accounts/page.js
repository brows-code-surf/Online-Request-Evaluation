'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import HeaderNavBar from '../../_components/headerNavBar';
import Loader from '@/app/_components/loader';
import ProtectedRoute from '@/utils/protectedRoute';
import { useAuth } from '../../../utils/authContext';
import UserProfileHeader from '../_components/userProfileHeader';
import UserPassword from '../_components/userPassword';
import { getUserProfile, updateUserProfile, changePassword, getAllUsers, setUserInactive, setUserActive } from './_actions';
import { JobTitles, Departments } from '@/utils/jobConstants';
import { validatePassword } from '@/utils/passwordRequirements';
import ContentLeftPanel from '../_components/contentLeftPanel';
import ConfirmModal from '../_components/confirmModal';
import { usePusherMultiple } from '@/hooks/usePusher';
import SideNotchOpenLeftPanel from '../_components/sideNotchOpenLeftPanel';

function UserAccountsContent() {
    const router = useRouter();
    const { user, loading, isAdmin, login } = useAuth();
    const [pageLoading, setPageLoading] = useState(true);
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [selectedUser, setSelectedUser] = useState(null);
    const [users, setUsers] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [sortBy, setSortBy] = useState('date');
    const [filterStatus, setFilterStatus] = useState('all');

    const [isEditing, setIsEditing] = useState(false);
    const [isChangingPassword, setIsChangingPassword] = useState(false);
    const [saveLoading, setSaveLoading] = useState(false);
    const [changePasswordLoading, setChangePasswordLoading] = useState(false);
    const [setInactiveLoading, setSetInactiveLoading] = useState(false);
    const [setActiveLoading, setSetActiveLoading] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');
    const [errorMessage, setErrorMessage] = useState('');
    const [showCurrentPassword, setShowCurrentPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [confirmAction, setConfirmAction] = useState(null);
    const [confirmMessage, setConfirmMessage] = useState('');

    const [profileData, setProfileData] = useState({
        empName: '',
        email: '',
        employeeID: '',
        jobTitle: '',
        department: '',
        location: ''
    });

    const [passwordData, setPasswordData] = useState({
        currentPassword: '',
        newPassword: '',
    });

    const [profileErrors, setProfileErrors] = useState({});
    const [passwordErrors, setPasswordErrors] = useState({});

    useEffect(() => {
        if (loading) return;
        if (!isAdmin()) {
            router.push('/request-evaluation');
            return;
        } else {
            fetchAllUsers();
        }
    }, [loading]);

    const fetchAllUsers = async () => {
        setPageLoading(true);
        try {
            const result = await getAllUsers();
            if (result.success) {
                setUsers(result.data);
                if (result.data.length > 0) {
                    setSelectedUser(result.data[0]);
                    loadUserProfile(result.data[0]);
                }
            }
        } catch (error) {
            console.error('Error fetching users:', error);
            setErrorMessage('Failed to load users');
        } finally {
            setPageLoading(false);
        }
    };

    const loadUserProfile = (userData) => {
        setProfileData({
            empName: userData.requester || '',
            email: userData.email || '',
            employeeID: userData.employeeID || '',
            jobTitle: userData.jobTitle || '',
            department: userData.department || '',
            location: userData.location || ''
        });
    };

    const handleSelectUser = (userData) => {
        setSelectedUser(userData);
        loadUserProfile(userData);
        setIsEditing(false);
        setIsChangingPassword(false);
    };

    const validateProfileForm = () => {
        const errors = {};
        if (!profileData.empName.trim()) errors.empName = 'Name is required';
        if (!profileData.email.trim()) errors.email = 'Email is required';
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profileData.email)) {
            errors.email = 'Invalid email format';
        }
        if (!profileData.jobTitle.trim()) errors.jobTitle = 'Job title is required';
        if (!profileData.department.trim()) errors.department = 'Department is required';
        if (!profileData.location.trim()) errors.location = 'Location is required';
        return errors;
    };

    const validatePasswordForm = () => {
        const errors = {};
        if (!passwordData.newPassword) errors.newPassword = 'New password is required';

        const validation = validatePassword(passwordData.newPassword);
        if (!validation.valid) {
            errors.newPassword = validation.feedback;
        }

        return errors;
    };

    const handleProfileChange = (e) => {
        const { name, value } = e.target;
        setProfileData(prev => ({
            ...prev,
            [name]: value
        }));
        if (profileErrors[name]) {
            setProfileErrors(prev => ({
                ...prev,
                [name]: ''
            }));
        }
    };

    const handleJobChange = (e) => {
        const jobValue = e.target.value;
        const job = JobTitles.find(j => j.value === jobValue);

        const departmentName = job
            ? Departments.find(d => d.id === job.departmentId)?.value
            : '';

        setProfileData(prev => ({
            ...prev,
            jobTitle: jobValue,
            department: departmentName
        }));
    };

    const handlePasswordChange = (e) => {
        const { name, value } = e.target;
        setPasswordData(prev => ({
            ...prev,
            [name]: value
        }));
        if (passwordErrors[name]) {
            setPasswordErrors(prev => ({
                ...prev,
                [name]: ''
            }));
        }
    };

    const handleSaveProfile = async () => {
        const errors = validateProfileForm();
        if (Object.keys(errors).length > 0) {
            setProfileErrors(errors);
            return;
        }

        setConfirmAction('saveProfile');
        setConfirmMessage(`Are you sure you want to update ${selectedUser.requester}'s profile information? This action cannot be undone.`);
        setShowConfirmModal(true);
    };

    const executeProfileUpdate = async () => {
        setSaveLoading(true);
        setSuccessMessage('');
        setErrorMessage('');
        try {
            const result = await updateUserProfile(profileData, user.employeeID);
            if (result.success) {
                setSuccessMessage(`${selectedUser.requester}'s profile has been updated successfully!`);
                setIsEditing(false);

                // Update the users list with the new profile data
                setUsers(users.map(u =>
                    u.employeeID === profileData.employeeID
                        ? {
                            ...u,
                            requester: profileData.empName,
                            email: profileData.email,
                            jobTitle: profileData.jobTitle,
                            department: profileData.department,
                            location: profileData.location
                        }
                        : u
                ));

                // Update the selected user to reflect changes
                setSelectedUser(prev => prev ? {
                    ...prev,
                    requester: profileData.empName,
                    email: profileData.email,
                    jobTitle: profileData.jobTitle,
                    department: profileData.department,
                    location: profileData.location
                } : null);

                setTimeout(() => setSuccessMessage(''), 3000);
            } else {
                setErrorMessage(result.message || 'Failed to update profile');
            }
        } catch (error) {
            setErrorMessage('An error occurred. Please try again.');
        } finally {
            setSaveLoading(false);
        }
    };

    const handleChangePassword = async () => {
        const errors = validatePasswordForm();
        if (Object.keys(errors).length > 0) {
            setPasswordErrors(errors);
            return;
        }

        setConfirmAction('changePassword');
        setConfirmMessage(`Are you sure you want to change the password for ${selectedUser.requester}? This action cannot be undone.`);
        setShowConfirmModal(true);
    };

    const executePasswordChange = async () => {
        setChangePasswordLoading(true);
        setSuccessMessage('');
        setErrorMessage('');
        try {
            const result = await changePassword({
                employeeID: selectedUser.employeeID,
                newPassword: passwordData.newPassword,
            });
            if (result.success) {
                setSuccessMessage(`Password for ${selectedUser.requester} has been changed successfully!`);
                setPasswordData({
                    currentPassword: '',
                    newPassword: '',
                });
                setIsChangingPassword(false);
                setShowCurrentPassword(false);
                setShowNewPassword(false);
                setShowConfirmPassword(false);
                setTimeout(() => setSuccessMessage(''), 3000);
            } else {
                setErrorMessage(result.message || 'Failed to change password');
            }
        } catch (error) {
            setErrorMessage('An error occurred. Please try again.');
        } finally {
            setChangePasswordLoading(false);
        }
    };

    const handleSetInactive = async () => {
        setConfirmAction('setInactive');
        setConfirmMessage(`Are you sure you want to set ${selectedUser.requester}'s account as inactive? They will not be able to access the system until reactivated.`);
        setShowConfirmModal(true);
    };

    const executeSetInactive = async () => {
        setSetInactiveLoading(true);
        setSuccessMessage('');
        setErrorMessage('');
        try {
            const result = await setUserInactive(selectedUser.employeeID);
            if (result.success) {
                setSuccessMessage(`${selectedUser.requester}'s account has been set to inactive successfully!`);

                // Update the users list
                setUsers(users.map(u =>
                    u.employeeID === selectedUser.employeeID
                        ? { ...u, status: 'INACTIVE' }
                        : u
                ));

                // Update selected user
                setSelectedUser(prev => prev ? { ...prev, status: 'INACTIVE' } : null);

                setTimeout(() => setSuccessMessage(''), 3000);
            } else {
                setErrorMessage(result.message || 'Failed to set user inactive');
            }
        } catch (error) {
            setErrorMessage('An error occurred. Please try again.');
        } finally {
            setSetInactiveLoading(false);
        }
    };

    const handleSetActive = async () => {
        setConfirmAction('setActive');
        setConfirmMessage(`Are you sure you want to set ${selectedUser.requester}'s account as active? They will regain access to the system.`);
        setShowConfirmModal(true);
    };

    const executeSetActive = async () => {
        setSetActiveLoading(true);
        setSuccessMessage('');
        setErrorMessage('');
        try {
            const result = await setUserActive(selectedUser.employeeID);
            if (result.success) {
                setSuccessMessage(`${selectedUser.requester}'s account has been set to active successfully!`);

                // Update the users list
                setUsers(users.map(u =>
                    u.employeeID === selectedUser.employeeID
                        ? { ...u, status: 'ACTIVE' }
                        : u
                ));

                // Update selected user
                setSelectedUser(prev => prev ? { ...prev, status: 'ACTIVE' } : null);

                setTimeout(() => setSuccessMessage(''), 3000);
            } else {
                setErrorMessage(result.message || 'Failed to set user active');
            }
        } catch (error) {
            setErrorMessage('An error occurred. Please try again.');
        } finally {
            setSetActiveLoading(false);
        }
    };

    const handleCancelPasswordChange = () => {
        setIsChangingPassword(false);
        setPasswordData({
            currentPassword: '',
            newPassword: '',
        });
        setPasswordErrors({});
        setShowCurrentPassword(false);
        setShowNewPassword(false);
        setShowConfirmPassword(false);
    };

    const handleConfirmAction = async () => {
        switch (confirmAction) {
            case 'saveProfile':
                await executeProfileUpdate();
                break;
            case 'changePassword':
                await executePasswordChange();
                break;
            case 'setInactive':
                await executeSetInactive();
                break;
            case 'setActive':
                await executeSetActive();
                break;
        }
        setShowConfirmModal(false);
        setConfirmAction(null);
        setConfirmMessage('');
    };

    const handleCancelConfirm = () => {
        setShowConfirmModal(false);
        setConfirmAction(null);
        setConfirmMessage('');
    };

    const filteredUsers = users
        .filter(u => {
            const matchesSearch = u.requester.toLowerCase().includes(searchQuery.toLowerCase()) ||
                u.email.toLowerCase().includes(searchQuery.toLowerCase());
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

    // Set up Pusher listeners for real-time user account updates
    usePusherMultiple('user-account-broadcast', {
        'user-profile-updated': useCallback((data) => {
            console.log('User profile updated event received:', data);
            // Update the users list with the new profile data
            setUsers(prevUsers => prevUsers.map(u =>
                u.employeeID === data.employeeID
                    ? {
                        ...u,
                        requester: data.empName,
                        email: data.email,
                        jobTitle: data.jobTitle,
                        department: data.department,
                        location: data.location
                    }
                    : u
            ));

            // Update selected user if it's the one being updated
            if (selectedUser?.employeeID === data.employeeID) {
                setSelectedUser(prev => prev ? {
                    ...prev,
                    requester: data.empName,
                    email: data.email,
                    jobTitle: data.jobTitle,
                    department: data.department,
                    location: data.location
                } : null);
            }
        }, [selectedUser?.employeeID]),
        'user-status-changed': useCallback((data) => {
            console.log('User status changed event received:', data);
            // Update the users list with the new status
            setUsers(prevUsers => prevUsers.map(u =>
                u.employeeID === data.employeeID
                    ? { ...u, status: data.newStatus }
                    : u
            ));

            // Update selected user if it's the one being updated
            if (selectedUser?.employeeID === data.employeeID) {
                setSelectedUser(prev => prev ? { ...prev, status: data.newStatus } : null);
            }
        }, [selectedUser?.employeeID]),
        'new-user-approved': useCallback(() => {
            console.log('New user approved event received - refetching all users');
            // Refetch all users to ensure complete data is loaded
            fetchAllUsers();
        }, [])
    });

    if (loading || pageLoading) {
        return (
            <div className="flex flex-col h-screen bg-gray-50">
                <Loader loading={true} />
                <HeaderNavBar />
            </div>
        );
    }

    return (
        <div className="flex flex-col h-screen bg-gray-50">
            <Loader loading={pageLoading} />
            <HeaderNavBar />

            <div className="flex flex-1 overflow-hidden pt-14">
                {/* Left Panel - Users List */}
                <ContentLeftPanel
                    sidebarOpen={sidebarOpen}
                    headerTitle="User Accounts"
                    onSidebarClose={() => setSidebarOpen(false)}
                    searchQuery={searchQuery}
                    onSearchChange={setSearchQuery}
                    filterStatus={filterStatus}
                    onFilterStatusChange={setFilterStatus}
                    sortBy={sortBy}
                    onSortByChange={setSortBy}
                    approvals={filteredUsers}
                    selectedApprovalId={selectedUser?.id}
                    onApprovalSelect={handleSelectUser}
                    getStatusColor={getStatusColor}
                />

                {/* Right Panel - Details */}
                <div className="flex-1 flex flex-col overflow-hidden">
                    <SideNotchOpenLeftPanel
                        sidebarOpen={sidebarOpen}
                        setSidebarOpen={setSidebarOpen}
                    />

                    {selectedUser ? (
                        <div className="flex-1 overflow-y-auto">
                            <div className="p-6">

                                {/* Success/Error Messages */}
                                {successMessage && (
                                    <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-3">
                                        <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                        </svg>
                                        <p className="text-green-800 font-medium">{successMessage}</p>
                                    </div>
                                )}

                                {errorMessage && (
                                    <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
                                        <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                        <p className="text-red-800 font-medium">{errorMessage}</p>
                                    </div>
                                )}

                                {/* Profile Header Component */}
                                <UserProfileHeader
                                    profileData={profileData}
                                    isEditing={isEditing}
                                    isUserAdmin={isAdmin()}
                                    onEditClick={() => setIsEditing(true)}
                                    profileErrors={profileErrors}
                                    onProfileChange={handleProfileChange}
                                    onJobChange={handleJobChange}
                                />

                                {isEditing && (
                                    <div className="flex gap-3 mb-6">
                                        <button
                                            onClick={handleSaveProfile}
                                            disabled={saveLoading}
                                            className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold py-2 px-4 rounded-lg transition flex items-center justify-center gap-2"
                                        >
                                            {saveLoading ? (
                                                <>
                                                    <svg className="w-5 h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <circle cx="12" cy="12" r="1" />
                                                    </svg>
                                                    Saving...
                                                </>
                                            ) : (
                                                <>
                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                    </svg>
                                                    Save Changes
                                                </>
                                            )}
                                        </button>
                                        <button
                                            onClick={() => {
                                                setIsEditing(false);
                                                loadUserProfile(selectedUser);
                                            }}
                                            className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-800 font-semibold py-2 px-4 rounded-lg transition"
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                )}

                                {/* Password Component */}
                                <UserPassword
                                    isChangingPassword={isChangingPassword}
                                    passwordData={passwordData}
                                    passwordErrors={passwordErrors}
                                    changePasswordLoading={changePasswordLoading}
                                    onPasswordChange={handlePasswordChange}
                                    onChangePassword={handleChangePassword}
                                    onCancelPasswordChange={handleCancelPasswordChange}
                                    onTogglePasswordChange={() => setIsChangingPassword(true)}
                                    showCurrentPassword={showCurrentPassword}
                                    showNewPassword={showNewPassword}
                                    showConfirmPasswordField={false}
                                    showCurrentPasswordField={false}
                                    onToggleCurrentPassword={() => setShowCurrentPassword(!showCurrentPassword)}
                                    onToggleNewPassword={() => setShowNewPassword(!showNewPassword)}
                                />

                                {/* Set Active/Inactive Buttons */}
                                <div className="mt-6 pt-6 border-t border-gray-200 flex gap-3">
                                    {selectedUser.status === 'INACTIVE' && (
                                        <button
                                            onClick={handleSetActive}
                                            disabled={setActiveLoading}
                                            className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white font-semibold py-2 px-4 rounded-lg transition flex items-center justify-center gap-2"
                                        >
                                            {setActiveLoading ? (
                                                <>
                                                    <svg className="w-5 h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <circle cx="12" cy="12" r="1" />
                                                    </svg>
                                                    Setting Active...
                                                </>
                                            ) : (
                                                <>
                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                    </svg>
                                                    Set Active
                                                </>
                                            )}
                                        </button>
                                    )}

                                    {selectedUser.status !== 'INACTIVE' && (
                                        <button
                                            onClick={handleSetInactive}
                                            disabled={setInactiveLoading}
                                            className="flex-1 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white font-semibold py-2 px-4 rounded-lg transition flex items-center justify-center gap-2"
                                        >
                                            {setInactiveLoading ? (
                                                <>
                                                    <svg className="w-5 h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <circle cx="12" cy="12" r="1" />
                                                    </svg>
                                                    Setting Inactive...
                                                </>
                                            ) : (
                                                <>
                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                    </svg>
                                                    Set Inactive
                                                </>
                                            )}
                                        </button>
                                    )}
                                </div>

                            </div>
                        </div>
                    ) : (
                        <div className="flex items-center justify-center h-full">
                            <div className="text-center text-gray-500">
                                <svg className="w-16 h-16 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <p className="text-lg font-medium">Select a user to view details</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Confirmation Modal */}
            <ConfirmModal
                isOpen={showConfirmModal}
                title="Confirm Action"
                message={confirmMessage}
                confirmButtonText="Confirm"
                confirmButtonColor="blue"
                onConfirm={handleConfirmAction}
                onCancel={handleCancelConfirm}
                isLoading={saveLoading || changePasswordLoading || setInactiveLoading || setActiveLoading}
            />

        </div>
    );
}

export default function UserAccountsPage() {
    return (
        <ProtectedRoute>
            <UserAccountsContent />
        </ProtectedRoute>
    );
}
