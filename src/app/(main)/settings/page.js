'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '../../../utils/authContext';
import ProtectedRoute from '@/utils/protectedRoute';
import UserPassword from '../_components/userPassword';
import { getUserSettings, updateDarkMode, changePassword } from './_actions';
import HeaderNavBar from '@/app/_components/headerNavBar';
import Loader from '@/app/_components/loader';
import HelpSupportModal from '../_components/helpSupportModal';

export default function SettingsPage() {
    const { user, darkMode, setDarkMode } = useAuth();
    const [settings, setSettings] = useState({ isDarkMode: 0 });
    const [loading, setLoading] = useState(true);
    const [updating, setUpdating] = useState(false);
    const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);

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
            <Loader />
        );
    }

    return (
        <ProtectedRoute>
            <div className={`min-h-screen ${darkMode ? 'bg-gray-900' : 'bg-gray-50'} transition-colors duration-300`}>
                <HeaderNavBar />

                {/* Main Content Container */}
                <div className="pt-16 pb-12">
                    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">

                        {/* Page Header */}
                        <div className="mb-10 mt-8">
                            <div className="text-center">
                                <h1 className={`text-4xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'} mb-3`}>
                                    Settings
                                </h1>
                                <p className={`text-lg ${darkMode ? 'text-gray-300' : 'text-gray-600'} max-w-2xl mx-auto`}>
                                    Manage your account preferences, security settings, and system preferences
                                </p>
                            </div>
                        </div>

                        {/* Settings Grid */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

                            {/* Left Column - Preferences */}
                            <div className="space-y-8">

                                {/* Appearance Settings */}
                                <div className={`${darkMode ? 'bg-gray-800/50' : 'bg-white'} rounded-2xl shadow-lg border ${darkMode ? 'border-gray-700' : 'border-gray-200'} overflow-hidden backdrop-blur-sm`}>
                                    <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-700 px-8 py-6">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                                                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zM21 5a2 2 0 00-2-2h-4a2 2 0 00-2 2v12a4 4 0 004 4h4a2 2 0 002-2V5z" />
                                                </svg>
                                            </div>
                                            <h2 className="text-2xl font-bold text-white">Appearance</h2>
                                        </div>
                                        <p className="text-indigo-100 mt-2">Customize your visual experience</p>
                                    </div>

                                    <div className="px-8 py-8">
                                        <div className="flex items-center justify-between">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-12 h-12 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-xl flex items-center justify-center">
                                                        <svg className={`w-6 h-6 ${darkMode ? 'text-indigo-400' : 'text-indigo-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                                                        </svg>
                                                    </div>
                                                    <div>
                                                        <h3 className={`text-xl font-semibold ${darkMode ? 'text-white' : 'text-gray-900'} mb-1`}>Dark Mode</h3>
                                                        <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Switch between light and dark themes</p>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="ml-6">
                                                <button
                                                    onClick={handleDarkModeToggle}
                                                    disabled={updating}
                                                    className={`relative inline-flex h-7 w-14 items-center rounded-full transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${settings.isDarkMode
                                                        ? 'bg-gradient-to-r from-indigo-600 to-purple-600 shadow-lg'
                                                        : `${darkMode ? 'bg-gray-600' : 'bg-gray-200'}`}
                                                        } ${updating ? 'opacity-50 cursor-not-allowed' : ''}`}
                                                >
                                                    <span
                                                        className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition-transform duration-300 ${settings.isDarkMode ? 'translate-x-8' : 'translate-x-1'
                                                            }`}
                                                    />
                                                </button>
                                            </div>
                                        </div>

                                        {/* Theme Preview */}
                                        <div className={`mt-6 p-4 rounded-xl border-2 transition-all duration-300 ${darkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'
                                            }`}>
                                            <div className="flex items-center gap-3">
                                                <div className={`w-4 h-4 rounded-full ${darkMode ? 'bg-gray-600' : 'bg-gray-300'}`}></div>
                                                <div className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                                                    Current theme: <span className="font-semibold">{darkMode ? 'Dark' : 'Light'}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Activity Logs Card */}
                                <div className={`${darkMode ? 'bg-gray-800/50' : 'bg-white'} rounded-2xl shadow-lg border ${darkMode ? 'border-gray-700' : 'border-gray-200'} overflow-hidden backdrop-blur-sm`}>
                                    <div className="bg-gradient-to-r from-emerald-600 via-green-600 to-emerald-700 px-8 py-6">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                                                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                                </svg>
                                            </div>
                                            <h2 className="text-2xl font-bold text-white">Activity Logs</h2>
                                        </div>
                                        <p className="text-emerald-100 mt-2">Monitor your account activity</p>
                                    </div>

                                    <div className="px-8 py-8">
                                        <div className="flex items-start justify-between">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-4 mb-3">
                                                    <div className="w-12 h-12 bg-gradient-to-br from-emerald-100 to-green-100 rounded-xl flex items-center justify-center">
                                                        <svg className={`w-6 h-6 ${darkMode ? 'text-emerald-400' : 'text-emerald-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                        </svg>
                                                    </div>
                                                    <div>
                                                        <h3 className={`text-xl font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>Activity History</h3>
                                                        <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>View detailed logs of your account activity</p>
                                                    </div>
                                                </div>
                                                <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'} space-y-1`}>
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                                                        <span>Login attempts and sessions</span>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                                                        <span>Password changes and security events</span>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                                                        <span>System interactions and preferences</span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="ml-6">
                                                <Link
                                                    href="/settings/activity-logs"
                                                    className="inline-flex items-center gap-2 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white px-6 py-3 rounded-xl font-semibold transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                                                >
                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                                    </svg>
                                                    View Logs
                                                </Link>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Right Column - Security */}
                            <div className="space-y-8">

                                {/* Password Security Card */}
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

                                {/* Account Information Card */}
                                <div className={`${darkMode ? 'bg-gray-800/50' : 'bg-white'} rounded-2xl shadow-lg border ${darkMode ? 'border-gray-700' : 'border-gray-200'} overflow-hidden backdrop-blur-sm`}>
                                    <div className="bg-gradient-to-r from-blue-600 via-cyan-600 to-blue-700 px-8 py-6">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                                                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                                </svg>
                                            </div>
                                            <h2 className="text-2xl font-bold text-white">Account Information</h2>
                                        </div>
                                        <p className="text-blue-100 mt-2">Your current account details</p>
                                    </div>

                                    <div className="px-8 py-8">
                                        <div className="space-y-6">
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 bg-gradient-to-br from-blue-100 to-cyan-100 rounded-xl flex items-center justify-center">
                                                    <svg className={`w-6 h-6 ${darkMode ? 'text-blue-400' : 'text-blue-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                                                    </svg>
                                                </div>
                                                <div>
                                                    <p className={`text-sm font-medium ${darkMode ? 'text-gray-400' : 'text-gray-500'} uppercase tracking-wide`}>Email Address</p>
                                                    <p className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{user?.email || 'Not available'}</p>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 bg-gradient-to-br from-blue-100 to-cyan-100 rounded-xl flex items-center justify-center">
                                                    <svg className={`w-6 h-6 ${darkMode ? 'text-blue-400' : 'text-blue-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                                                    </svg>
                                                </div>
                                                <div>
                                                    <p className={`text-sm font-medium ${darkMode ? 'text-gray-400' : 'text-gray-500'} uppercase tracking-wide`}>Employee ID</p>
                                                    <p className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{user?.employeeID || 'Not available'}</p>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 bg-gradient-to-br from-blue-100 to-cyan-100 rounded-xl flex items-center justify-center">
                                                    <svg className={`w-6 h-6 ${darkMode ? 'text-blue-400' : 'text-blue-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3a2 2 0 012-2h4a2 2 0 012 2v4m-6 4v10a2 2 0 002 2h4a2 2 0 002-2V11M9 11h6" />
                                                    </svg>
                                                </div>
                                                <div>
                                                    <p className={`text-sm font-medium ${darkMode ? 'text-gray-400' : 'text-gray-500'} uppercase tracking-wide`}>Account Status</p>
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                                                        <p className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>Active</p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Footer Information */}
                    <div className="mt-6 text-center">
                        <div
                            onClick={() => setIsHelpModalOpen(true)}
                            className={`inline-flex items-center gap-2 px-4 py-2 ${darkMode ? 'bg-gray-800/50 hover:bg-gray-800' : 'bg-gray-100 hover:bg-gray-200'} rounded-full border ${darkMode ? 'border-gray-700' : 'border-gray-200'} cursor-pointer transition-colors`}
                        >
                            <svg className={`w-4 h-4 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                                Need help? Contact support or visit our help center
                            </span>
                        </div>
                    </div>
                </div>
            </div>
            <HelpSupportModal
                isOpen={isHelpModalOpen}
                onClose={() => setIsHelpModalOpen(false)}
            />
        </ProtectedRoute>
    );
}
