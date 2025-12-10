'use client';

import { useState, useEffect } from 'react';
import HeaderNavBar from '../../_components/headerNavBar';
import Loader from '@/app/_components/loader';
import ProtectedRoute from '@/utils/protectedRoute';
import { useAuth } from '../../../utils/authContext';
import UserProfileHeader from '../_components/userProfileHeader';
import UserPassword from '../_components/userPassword';
import { getUserProfile, updateUserProfile, changePassword } from './_actions';
import { JobTitles, Departments } from '@/utils/jobConstants';
import { validatePassword } from '@/utils/passwordRequirements';

function UserProfileContent() {
    const { user, loading, isAdmin, login, darkMode } = useAuth();
    const [pageLoading, setPageLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [isChangingPassword, setIsChangingPassword] = useState(false);
    const [saveLoading, setSaveLoading] = useState(false);
    const [changePasswordLoading, setChangePasswordLoading] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');
    const [errorMessage, setErrorMessage] = useState('');
    const [showCurrentPassword, setShowCurrentPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

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
        confirmPassword: '',
    });

    const [profileErrors, setProfileErrors] = useState({});
    const [passwordErrors, setPasswordErrors] = useState({});

    useEffect(() => {
        if (loading) return;
        fetchUserProfile();
    }, [loading]);

    const fetchUserProfile = async () => {
        setPageLoading(true);
        try {
            if (user) {
                setProfileData({
                    empName: user.empName || '',
                    email: user.email || '',
                    employeeID: user.employeeID || '',
                    jobTitle: user.jobTitle || '',
                    department: user.department || '',
                    location: user.location || '',
                    phone: user.phone || '',
                    dateOfBirth: user.dateOfBirth || '',
                    address: user.address || '',
                });
                console.log('User profile loaded:', user);
            }
        } catch (error) {
            console.error('Error fetching profile:', error);
            setErrorMessage('Failed to load profile');
        } finally {
            setPageLoading(false);
        }
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
        if (!passwordData.currentPassword) errors.currentPassword = 'Current password is required';
        if (!passwordData.newPassword) errors.newPassword = 'New password is required';
        
        // Use the stronger password validation
        const validation = validatePassword(passwordData.newPassword);
        if (!validation.valid) {
            errors.newPassword = validation.feedback;
        }
        
        if (!passwordData.confirmPassword) errors.confirmPassword = 'Please confirm password';
        if (passwordData.newPassword !== passwordData.confirmPassword) {
            errors.confirmPassword = 'Passwords do not match';
        }
        if (passwordData.currentPassword === passwordData.newPassword) {
            errors.newPassword = 'New password must be different from current password';
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

        setSaveLoading(true);
        setSuccessMessage('');
        setErrorMessage('');
        try {
            const result = await updateUserProfile(profileData);
            if (result.success) {
                setSuccessMessage('Profile updated successfully!');
                setIsEditing(false);

                // Refetch updated profile
                const fetchResult = await getUserProfile(profileData.email);
                if (fetchResult.success) {
                    const updatedUser = { ...user, ...fetchResult.data };
                    login(updatedUser);
                    setProfileData({
                        empName: updatedUser.empName || '',
                        email: updatedUser.email || '',
                        employeeID: updatedUser.employeeID || '',
                        jobTitle: updatedUser.jobTitle || '',
                        department: updatedUser.department || '',
                        location: updatedUser.location || '',
                        phone: updatedUser.phone || '',
                        dateOfBirth: updatedUser.dateOfBirth || '',
                        address: updatedUser.address || '',
                    });
                }

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

        setChangePasswordLoading(true);
        setSuccessMessage('');
        setErrorMessage('');
        try {
            const result = await changePassword({
                employeeID: user.employeeID,
                currentPassword: passwordData.currentPassword,
                newPassword: passwordData.newPassword,
            });
            if (result.success) {
                setSuccessMessage('Password changed successfully!');
                setPasswordData({
                    currentPassword: '',
                    newPassword: '',
                    confirmPassword: '',
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

    const handleCancelPasswordChange = () => {
        setIsChangingPassword(false);
        setPasswordData({
            currentPassword: '',
            newPassword: '',
            confirmPassword: '',
        });
        setPasswordErrors({});
        setShowCurrentPassword(false);
        setShowNewPassword(false);
        setShowConfirmPassword(false);
    };

    if (loading || pageLoading) {
        return (
            <div className="flex flex-col h-screen bg-gray-50">
                <Loader loading={true} />
                <HeaderNavBar />
            </div>
        );
    }

    const isUserAdmin = user && isAdmin();

    return (
        <div className={`flex flex-col h-screen ${darkMode ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'}`}>
            <Loader loading={pageLoading} />
            <HeaderNavBar />

            <div className="flex-1 overflow-y-auto pt-20 pb-8">
                <div className="max-w-4xl mx-auto px-4">

                    {/* Header */}
                    <div className="mb-8">
                        <h1 className={`text-4xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'} mb-2`}>My Profile</h1>
                        <p className={`${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Manage your account information and settings</p>
                    </div>

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

                    {/* Profile Header Component */}
                    <UserProfileHeader
                        profileData={profileData}
                        isEditing={isEditing}
                        isUserAdmin={isUserAdmin}
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
                                    fetchUserProfile();
                                }}
                                className={`flex-1 ${darkMode ? 'bg-gray-600 hover:bg-gray-500 text-white' : 'bg-gray-300 hover:bg-gray-400 text-gray-800'} font-semibold py-2 px-4 rounded-lg transition`}
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
                        showConfirmPassword={showConfirmPassword}
                        onToggleCurrentPassword={() => setShowCurrentPassword(!showCurrentPassword)}
                        onToggleNewPassword={() => setShowNewPassword(!showNewPassword)}
                        onToggleConfirmPassword={() => setShowConfirmPassword(!showConfirmPassword)}
                    />

                </div>
            </div>
        </div>
    );
}

export default function UserProfilePage() {
    return (
        <ProtectedRoute>
            <UserProfileContent />
        </ProtectedRoute>
    );
}
