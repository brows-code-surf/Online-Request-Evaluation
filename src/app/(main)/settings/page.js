'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '../../../utils/authContext';
import UserPassword from '../_components/userPassword';
import ConfirmModal from '../_components/confirmModal';
import { getUserSettings, updateDarkMode, updateEmailNotification, changePassword } from './_actions';
import HeaderNavBar from '@/app/_components/headerNavBar';
import Loader from '@/app/_components/loader';

export default function SettingsPage() {
    const { user, darkMode, setDarkMode } = useAuth();
    const [settings, setSettings] = useState({ isDarkMode: 0, isEmailNotification: 1 });
    const [loading, setLoading] = useState(true);
    const [updating, setUpdating] = useState(false);
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [pendingEmailSetting, setPendingEmailSetting] = useState(null);

    // Password change state
    const [isChangingPassword, setIsChangingPassword] = useState(false);
    const [passwordData, setPasswordData] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
    });
    const [passwordErrors, setPasswordErrors] = useState({});
    const [changePasswordLoading, setChangePasswordLoading] = useState(false);
    const [showCurrentPassword, setShowCurrentPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    useEffect(() => {
        loadUserSettings();
    }, [user]);

    // Sync local settings state with global darkMode context
    useEffect(() => {
        setSettings(prev => ({ ...prev, isDarkMode: darkMode ? 1 : 0 }));
    }, [darkMode]);

    const loadUserSettings = async () => {
        if (!user?.employeeID) return;

        try {
            const result = await getUserSettings(user.employeeID);
            if (result.success) {
                setSettings(result.settings);
                // Sync with context
                setDarkMode(result.settings.isDarkMode === 1);
            }
        } catch (error) {
            console.error('Error loading settings:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleDarkModeToggle = async () => {
        if (!user?.employeeID) return;

        setUpdating(true);
        const newValue = !settings.isDarkMode;

        try {
            const result = await updateDarkMode(user.employeeID, newValue);
            if (result.success) {
                setSettings(prev => ({ ...prev, isDarkMode: newValue ? 1 : 0 }));
                setDarkMode(newValue);
            }
        } catch (error) {
            console.error('Error updating dark mode:', error);
        } finally {
            setUpdating(false);
        }
    };

    const handleEmailNotificationToggle = () => {
        const newValue = !settings.isEmailNotification;
        // If turning off, show confirmation
        if (!newValue) {
            setPendingEmailSetting(newValue);
            setShowConfirmModal(true);
        } else {
            // If turning on, update directly
            updateEmailNotificationSetting(newValue);
        }
    };

    const updateEmailNotificationSetting = async (newValue) => {
        if (!user?.employeeID) return;

        setUpdating(true);
        try {
            const result = await updateEmailNotification(user.employeeID, newValue);
            if (result.success) {
                setSettings(prev => ({ ...prev, isEmailNotification: newValue ? 1 : 0 }));
            }
        } catch (error) {
            console.error('Error updating email notification:', error);
        } finally {
            setUpdating(false);
        }
    };

    const confirmEmailNotificationChange = async () => {
        if (pendingEmailSetting !== null) {
            await updateEmailNotificationSetting(pendingEmailSetting);
            setPendingEmailSetting(null);
            setShowConfirmModal(false);
        }
    };

    // Password change handlers
    const handlePasswordChange = (e) => {
        const { name, value } = e.target;
        setPasswordData(prev => ({ ...prev, [name]: value }));
        if (passwordErrors[name]) {
            setPasswordErrors(prev => ({ ...prev, [name]: '' }));
        }
    };

    const handleChangePassword = async () => {
        if (!user?.employeeID) return;

        setChangePasswordLoading(true);
        try {
            const result = await changePassword({
                employeeID: user.employeeID,
                currentPassword: passwordData.currentPassword,
                newPassword: passwordData.newPassword
            });

            if (result.success) {
                setIsChangingPassword(false);
                setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
                setPasswordErrors({});
                // Optionally show success message
            } else {
                setPasswordErrors({ currentPassword: result.message });
            }
        } catch (error) {
            console.error('Error changing password:', error);
            setPasswordErrors({ newPassword: 'Failed to change password' });
        } finally {
            setChangePasswordLoading(false);
        }
    };

    const handleCancelPasswordChange = () => {
        setIsChangingPassword(false);
        setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
        setPasswordErrors({});
    };

    const handleTogglePasswordChange = () => {
        setIsChangingPassword(!isChangingPassword);
    };

    if (loading) {
        return (
            <Loader/>
        );
    }

    return (
        <div className={`min-h-screen ${darkMode ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'} py-8`}>
            <HeaderNavBar/>
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">

                {/* Header */}
                <div className="mb-8 mt-10">
                    <h1 className={`text-3xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>Settings</h1>
                    <p className={`mt-2 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Manage your account preferences and security settings</p>
                </div>

                <div className="space-y-6">

                    {/* Dark Mode */}
                    <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-md overflow-hidden`}>
                        <div className="bg-gradient-to-r from-purple-500 to-purple-600 px-6 py-4">
                            <h2 className="text-xl font-bold text-white">Appearance</h2>
                        </div>
                        <div className="px-6 py-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>Dark Mode</h3>
                                    <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Toggle between light and dark theme</p>
                                </div>
                                <button
                                    onClick={handleDarkModeToggle}
                                    disabled={updating}
                                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${
                                        settings.isDarkMode ? 'bg-indigo-600' : (darkMode ? 'bg-gray-600' : 'bg-gray-200')
                                    } ${updating ? 'opacity-50 cursor-not-allowed' : ''}`}
                                >
                                    <span
                                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                            settings.isDarkMode ? 'translate-x-6' : 'translate-x-1'
                                        }`}
                                    />
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Email Notifications */}
                    <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-md overflow-hidden`}>
                        <div className="bg-gradient-to-r from-blue-500 to-blue-600 px-6 py-4">
                            <h2 className="text-xl font-bold text-white">Notifications</h2>
                        </div>
                        <div className="px-6 py-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>Email Notifications</h3>
                                    <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Receive email notifications for important updates</p>
                                </div>
                                <button
                                    onClick={handleEmailNotificationToggle}
                                    disabled={updating}
                                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                                        settings.isEmailNotification ? 'bg-blue-600' : (darkMode ? 'bg-gray-600' : 'bg-gray-200')
                                    } ${updating ? 'opacity-50 cursor-not-allowed' : ''}`}
                                >
                                    <span
                                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                            settings.isEmailNotification ? 'translate-x-6' : 'translate-x-1'
                                        }`}
                                    />
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Activity Logs Link */}
                    <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-md overflow-hidden`}>
                        <div className="bg-gradient-to-r from-green-500 to-green-600 px-6 py-4">
                            <h2 className="text-xl font-bold text-white">Activity Logs</h2>
                        </div>
                        <div className="px-6 py-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>View Activity Logs</h3>
                                    <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>View your complete activity history and system events</p>
                                </div>
                                <Link
                                    href="/settings/activity-logs"
                                    className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg font-semibold transition"
                                >
                                    View Logs
                                </Link>
                            </div>
                        </div>
                    </div>

                    {/* Change Password */}
                    <UserPassword
                        isChangingPassword={isChangingPassword}
                        passwordData={passwordData}
                        passwordErrors={passwordErrors}
                        changePasswordLoading={changePasswordLoading}
                        onPasswordChange={handlePasswordChange}
                        onChangePassword={handleChangePassword}
                        onCancelPasswordChange={handleCancelPasswordChange}
                        onTogglePasswordChange={handleTogglePasswordChange}
                        showCurrentPassword={showCurrentPassword}
                        showNewPassword={showNewPassword}
                        showConfirmPassword={showConfirmPassword}
                        onToggleCurrentPassword={() => setShowCurrentPassword(!showCurrentPassword)}
                        onToggleNewPassword={() => setShowNewPassword(!showNewPassword)}
                        onToggleConfirmPassword={() => setShowConfirmPassword(!showConfirmPassword)}
                    />

                </div>

                {/* Confirmation Modal */}
                <ConfirmModal
                    isOpen={showConfirmModal}
                    title="Disable Email Notifications"
                    message="Are you sure you want to disable email notifications? You will no longer receive important updates via email."
                    confirmButtonText="Disable"
                    confirmButtonColor="red"
                    onConfirm={confirmEmailNotificationChange}
                    onCancel={() => {
                        setShowConfirmModal(false);
                        setPendingEmailSetting(null);
                    }}
                    isLoading={updating}
                />

            </div>
        </div>
    );
}
