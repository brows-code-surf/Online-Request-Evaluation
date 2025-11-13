'use client';
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';
import { validatePassword } from '@/utils/passwordRequirements';

export default function UserPassword({
    isChangingPassword,
    passwordData,
    passwordErrors,
    changePasswordLoading,
    onPasswordChange,
    onChangePassword,
    onCancelPasswordChange,
    onTogglePasswordChange,
    showCurrentPassword,
    showNewPassword,
    showConfirmPassword,
    onToggleCurrentPassword,
    onToggleNewPassword,
    onToggleConfirmPassword
}) {
    const passwordValidation = validatePassword(passwordData.newPassword);

    return (
        <div className="bg-white rounded-lg shadow-md overflow-hidden">

            {/* Card Header */}
            <div className="bg-gradient-to-r from-orange-500 to-orange-600 px-6 py-4">
                <h2 className="text-xl font-bold text-white">Security Settings</h2>
            </div>

            {/* Card Content */}
            <div className="px-6 py-6">
                {isChangingPassword ? (
                    <div className="space-y-4">

                        {/* Current Password */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Current Password
                            </label>
                            <div className="relative">
                                <input
                                    type={showCurrentPassword ? "text" : "password"}
                                    name="currentPassword"
                                    value={passwordData.currentPassword}
                                    onChange={onPasswordChange}
                                    className={`w-full text-black px-4 py-2 pr-10 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 ${passwordErrors.currentPassword ? 'border-red-500' : 'border-gray-300'}`}
                                    placeholder="Enter your current password"
                                />
                                <button
                                    type="button"
                                    onClick={onToggleCurrentPassword}
                                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 hover:text-gray-700"
                                >
                                    {showCurrentPassword ? (
                                        <EyeSlashIcon className="h-5 w-5" />
                                    ) : (
                                        <EyeIcon className="h-5 w-5" />
                                    )}
                                </button>
                            </div>
                            {passwordErrors.currentPassword && (
                                <p className="text-red-600 text-xs mt-1">{passwordErrors.currentPassword}</p>
                            )}
                        </div>

                        {/* New Password */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                New Password
                            </label>
                            <div className="relative">
                                <input
                                    type={showNewPassword ? "text" : "password"}
                                    name="newPassword"
                                    value={passwordData.newPassword}
                                    onChange={onPasswordChange}
                                    className={`w-full text-black px-4 py-2 pr-10 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 ${passwordErrors.newPassword ? 'border-red-500' : 'border-gray-300'}`}
                                    placeholder="Enter your new password"
                                />
                                <button
                                    type="button"
                                    onClick={onToggleNewPassword}
                                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 hover:text-gray-700"
                                >
                                    {showNewPassword ? (
                                        <EyeSlashIcon className="h-5 w-5" />
                                    ) : (
                                        <EyeIcon className="h-5 w-5" />
                                    )}
                                </button>
                            </div>
                            {passwordData.newPassword && (
                                <div className="mt-2 p-3 bg-gray-50 rounded-lg">
                                    <p className={`text-sm font-medium ${passwordValidation.valid ? 'text-green-700' : 'text-gray-700'}`}>
                                        {passwordValidation.feedback}
                                    </p>
                                    <div className="mt-2 space-y-1 text-xs">
                                        <div className={passwordData.newPassword.length >= 8 ? 'text-green-600' : 'text-gray-500'}>
                                            ✓ At least 8 characters
                                        </div>
                                        <div className={/[A-Z]/.test(passwordData.newPassword) ? 'text-green-600' : 'text-gray-500'}>
                                            ✓ At least one uppercase letter
                                        </div>
                                        <div className={/\d/.test(passwordData.newPassword) ? 'text-green-600' : 'text-gray-500'}>
                                            ✓ At least one number
                                        </div>
                                        <div className={/[!@#$%^&*(),.?":{}|<>_\-\\[\]\/~]/.test(passwordData.newPassword) ? 'text-green-600' : 'text-gray-500'}>
                                            ✓ At least one special character
                                        </div>
                                    </div>
                                </div>
                            )}
                            {passwordErrors.newPassword && (
                                <p className="text-red-600 text-xs mt-1">{passwordErrors.newPassword}</p>
                            )}
                        </div>

                        {/* Confirm Password */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Confirm Password
                            </label>
                            <div className="relative">
                                <input
                                    type={showConfirmPassword ? "text" : "password"}
                                    name="confirmPassword"
                                    value={passwordData.confirmPassword}
                                    onChange={onPasswordChange}
                                    className={`w-full text-black px-4 py-2 pr-10 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 ${passwordErrors.confirmPassword ? 'border-red-500' : 'border-gray-300'}`}
                                    placeholder="Confirm your new password"
                                />
                                <button
                                    type="button"
                                    onClick={onToggleConfirmPassword}
                                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 hover:text-gray-700"
                                >
                                    {showConfirmPassword ? (
                                        <EyeSlashIcon className="h-5 w-5" />
                                    ) : (
                                        <EyeIcon className="h-5 w-5" />
                                    )}
                                </button>
                            </div>
                            {passwordErrors.confirmPassword && (
                                <p className="text-red-600 text-xs mt-1">{passwordErrors.confirmPassword}</p>
                            )}
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-3 pt-4">
                            <button
                                onClick={onChangePassword}
                                disabled={changePasswordLoading || !passwordValidation.valid}
                                className="flex-1 bg-orange-600 hover:bg-orange-700 disabled:bg-orange-400 text-white font-semibold py-2 px-4 rounded-lg transition flex items-center justify-center gap-2"
                            >
                                {changePasswordLoading ? (
                                    <>
                                        <svg className="w-5 h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <circle cx="12" cy="12" r="1" />
                                        </svg>
                                        Updating...
                                    </>
                                ) : (
                                    <>
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                        </svg>
                                        Change Password
                                    </>
                                )}
                            </button>
                            <button
                                onClick={onCancelPasswordChange}
                                className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-800 font-semibold py-2 px-4 rounded-lg transition"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="text-lg font-semibold text-gray-900 mb-1">Password</h3>
                            <p className="text-gray-600 text-sm">Change your account password regularly to keep your account secure</p>
                        </div>
                        <button
                            onClick={onTogglePasswordChange}
                            className="bg-orange-600 hover:bg-orange-700 text-white px-6 py-2 rounded-lg font-semibold transition"
                        >
                            Change Password
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
