'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ToastContainer, toast } from 'react-toastify';
import Loader from '../_components/loader';
import LoaderButton from '../_components/loaderButton';
import { sendPasswordResetOTP, resendPasswordResetOTP, verifyPasswordResetOTP, resetPassword } from './_actions';
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';
import { validatePassword } from '@/utils/passwordRequirements';

export default function ForgotPasswordPage() {
    const router = useRouter();
    const [step, setStep] = useState('email'); // 'email', 'otp', 'reset'
    const [loading, setLoading] = useState(false);
    const [email, setEmail] = useState('');
    const [otp, setOtp] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [passwordValidation, setPasswordValidation] = useState({ valid: false, score: 0, feedback: '' });
    const [resendTimer, setResendTimer] = useState(0);

    const handlePasswordChange = (e) => {
        const password = e.target.value;
        setNewPassword(password);
        if (password) {
            const validation = validatePassword(password);
            setPasswordValidation(validation);
        } else {
            setPasswordValidation({ valid: false, score: 0, feedback: '' });
        }
    };

    const handleSendOTP = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            const result = await sendPasswordResetOTP(email);
            if (result.success) {
                setStep('otp');
                setResendTimer(60);
                setOtp('');
                toast.success('OTP sent to your email');
            } else {
                toast.error(result.message);
            }
        } catch (error) {
            toast.error('Error sending OTP. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyOTP = async (e) => {
        e.preventDefault();

        if (!otp || otp.length !== 6) {
            toast.error('Please enter a valid 6-digit OTP');
            return;
        }

        setLoading(true);

        try {
            const result = await verifyPasswordResetOTP(email, otp);
            if (result.success) {
                setStep('reset');
                setResendTimer(0);
                toast.success('OTP verified successfully');
            } else {
                toast.error(result.message);
            }
        } catch (error) {
            toast.error('Error verifying OTP. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleResendOTP = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            const result = await resendPasswordResetOTP(email);
            if (result.success) {
                setResendTimer(60);
                setOtp('');
                toast.success('New OTP sent to your email');
            } else {
                toast.error(result.message);
            }
        } catch (error) {
            toast.error('Error resending OTP. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleResetPassword = async (e) => {
        e.preventDefault();

        if (!newPassword || !confirmPassword) {
            toast.error('Please fill in all password fields');
            return;
        }

        if (!passwordValidation.valid) {
            toast.error(passwordValidation.feedback);
            return;
        }

        if (newPassword !== confirmPassword) {
            toast.error('Passwords do not match');
            return;
        }

        setLoading(true);

        try {
            const result = await resetPassword(email, newPassword);
            if (result.success) {
                toast.success('Password reset successfully! Redirecting to login...');
                setTimeout(() => {
                    router.push('/login');
                }, 2000);
            } else {
                toast.error(result.message);
            }
        } catch (error) {
            toast.error('Error resetting password. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    // Timer effect for resend countdown
    React.useEffect(() => {
        let interval;
        if (resendTimer > 0 && step === 'otp') {
            interval = setInterval(() => {
                setResendTimer(prev => prev - 1);
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [resendTimer, step]);

    return (
        <div className="min-h-screen flex items-center justify-center px-4 bg-gradient-to-br from-blue-600 via-blue-500 to-green-400 animate-gradient">
            <Loader loading={loading} />
            <ToastContainer
                position="top-center"
                autoClose={3000}
                hideProgressBar={false}
                newestOnTop
                closeOnClick
                pauseOnHover
                theme="colored"
            />

            <div className="max-w-md w-full p-10 bg-white rounded-lg shadow-lg">
                <div className="flex items-center justify-between mb-8">
                    <button
                        className="text-gray-500 hover:text-gray-700"
                        onClick={() => router.push('/login')}
                    >
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-6 w-6"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={2}
                        >
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                        </svg>
                    </button>
                    <h2 className="text-2xl font-bold text-gray-900 flex-1 text-center">
                        Reset Password
                    </h2>
                    <div className="w-6" />
                </div>

                {/* Step Indicator */}
                <div className="flex justify-between mb-8">
                    <div className={`flex-1 h-1 rounded-full mr-2 ${step === 'email' || step === 'otp' || step === 'reset' ? 'bg-blue-600' : 'bg-gray-300'}`} />
                    <div className={`flex-1 h-1 rounded-full mr-2 ${step === 'otp' || step === 'reset' ? 'bg-blue-600' : 'bg-gray-300'}`} />
                    <div className={`flex-1 h-1 rounded-full ${step === 'reset' ? 'bg-blue-600' : 'bg-gray-300'}`} />
                </div>

                {/* Step 1: Email Input */}
                {step === 'email' && (
                    <form onSubmit={handleSendOTP} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Email Address
                            </label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                className="w-full text-black px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="Enter your email"
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={loading || !email}
                            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold py-2 px-4 rounded-lg transition"
                        >
                            {loading ? <LoaderButton loading={true} /> : 'Send OTP'}
                        </button>
                    </form>
                )}

                {/* Step 2: OTP Verification */}
                {step === 'otp' && (
                    <form onSubmit={handleVerifyOTP} className="space-y-4">
                        <div>
                            <p className="text-sm text-gray-600 mb-4">
                                Enter the 6-digit OTP sent to {email}
                            </p>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                One-Time Password
                            </label>
                            <input
                                type="text"
                                value={otp}
                                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                maxLength="6"
                                required
                                className="w-full text-black px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-center text-2xl tracking-widest"
                                placeholder="000000"
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={loading || otp.length !== 6}
                            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold py-2 px-4 rounded-lg transition"
                        >
                            {loading ? <LoaderButton loading={true} /> : 'Verify OTP'}
                        </button>
                        <button
                            type="button"
                            onClick={handleResendOTP}
                            disabled={resendTimer > 0 || loading}
                            className="w-full bg-gray-300 hover:bg-gray-400 disabled:bg-gray-200 text-gray-800 font-semibold py-2 px-4 rounded-lg transition"
                        >
                            {resendTimer > 0 ? `Resend OTP in ${resendTimer}s` : 'Resend OTP'}
                        </button>
                        <button
                            type="button"
                            onClick={() => setStep('email')}
                            className="w-full bg-gray-300 hover:bg-gray-400 text-gray-800 font-semibold py-2 px-4 rounded-lg transition"
                        >
                            Back
                        </button>
                    </form>
                )}

                {/* Step 3: Reset Password */}
                {step === 'reset' && (
                    <form onSubmit={handleResetPassword} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                New Password
                            </label>
                            <div className="relative">
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={newPassword}
                                    onChange={handlePasswordChange}
                                    required
                                    className="w-full text-black px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="Enter new password"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-2 text-gray-600"
                                >
                                    {showPassword ? (
                                        <EyeSlashIcon className="h-5 w-5" />
                                    ) : (
                                        <EyeIcon className="h-5 w-5" />
                                    )}
                                </button>
                            </div>
                            {newPassword && (
                                <div className="mt-2">
                                    <div className="flex gap-1 mb-2">
                                        {[...Array(4)].map((_, i) => (
                                            <div
                                                key={i}
                                                className={`h-1 flex-1 rounded ${i < passwordValidation.score ? 'bg-blue-600' : 'bg-gray-300'}`}
                                            />
                                        ))}
                                    </div>
                                    <p className={`text-xs ${passwordValidation.valid ? 'text-green-600' : 'text-red-600'}`}>
                                        {passwordValidation.feedback}
                                    </p>
                                </div>
                            )}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Confirm Password
                            </label>
                            <div className="relative">
                                <input
                                    type={showConfirmPassword ? 'text' : 'password'}
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    required
                                    className="w-full text-black px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="Confirm new password"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                    className="absolute right-3 top-2 text-gray-600"
                                >
                                    {showConfirmPassword ? (
                                        <EyeSlashIcon className="h-5 w-5" />
                                    ) : (
                                        <EyeIcon className="h-5 w-5" />
                                    )}
                                </button>
                            </div>
                            {confirmPassword && newPassword !== confirmPassword && (
                                <p className="text-xs text-red-600 mt-1">Passwords do not match</p>
                            )}
                        </div>

                        <button
                            type="submit"
                            disabled={loading || !newPassword || !confirmPassword || !passwordValidation.valid}
                            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold py-2 px-4 rounded-lg transition"
                        >
                            {loading ? <LoaderButton loading={true} /> : 'Reset Password'}
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
}
