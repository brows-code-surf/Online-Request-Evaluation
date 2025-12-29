'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '../../utils/authContext'
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';
import Loader from '../_components/loader';
import Link from 'next/link';
import { loginUser } from './_actions';

export default function Login() {
    const router = useRouter()
    const { user, loading, login } = useAuth()

    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [error, setError] = useState('')
    const [loginLoading, setLoginLoading] = useState(false)
    const [rateLimitTimer, setRateLimitTimer] = useState(0)

    useEffect(() => {
        let interval;
        if (rateLimitTimer > 0) {
            interval = setInterval(() => {
                setRateLimitTimer(prev => {
                    if (prev <= 1) {
                        clearInterval(interval)
                        return 0
                    }
                    return prev - 1
                });
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [rateLimitTimer]);

    useEffect(() => {
        if (user && !loading) {
            // Keep loading state until dashboard navigation completes
            setLoginLoading(true);
            router.push('/dashboard')
        }
    }, [user, loading, router]);

    useEffect(() => {
        const timer = setTimeout(() => {
            if (user) {
                router.push('/dashboard')
            }
        }, 3000);
        return () => clearTimeout(timer);
    }, [user, router]);

    const handleSubmit = async (e) => {
        e.preventDefault()
        setError('')
        setLoginLoading(true)

        try {
            const result = await loginUser(email, password)

            if (!result.success) {
                setError(result.message || 'Invalid email or password')
                // Check if it's a rate limit error and set timer
                if (result.message.includes('Too many login attempts')) {
                    const match = result.message.match(/(\d+)\s*minute/);
                    if (match) {
                        setRateLimitTimer(parseInt(match[1]) * 60);
                    }
                }
                setLoginLoading(false)
                return
            }

            // Check if OTP verification is required
            if (result.requiresOTP === false) {
                // User doesn't need OTP, log them in directly
                login(result.user, result.token)
                setLoginLoading(false)
                return
            }

            // OTP is required, redirect to OTP page
            router.push(`/OTP?email=${encodeURIComponent(result.email)}`)
        } catch (err) {
            setError('Login failed. Please try again.')
            console.error(err)
            setLoginLoading(false)
        }
    }

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    if (loading) {
        return <Loader loading={true} />
    }

    return (
        <div className="min-h-screen flex items-center justify-center px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-blue-600 via-blue-500 to-green-400 animate-gradient">
            <Loader loading={loginLoading} />
            <div className="max-w-md w-full p-8 sm:p-10 bg-white rounded-xl shadow-2xl border border-gray-100">
                <div className="text-center mb-10">
                    <div className="flex justify-center mb-6">
                        <img src="/SANTEH-LOGO/SFC.png" alt="SANTEH Logo" className="h-12 w-auto" />
                    </div>
                    <h3 className="text-gray-800 text-base font-semibold mt-2">Online Requests Evaluation System</h3>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label htmlFor="email" className="block text-sm font-semibold text-gray-800 mb-3">
                            Email Address
                        </label>
                        <input
                            id="email"
                            type="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="your@email.com"
                            disabled={rateLimitTimer > 0}
                            className="text-black mt-1 block w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:ring-opacity-50 disabled:bg-gray-100 disabled:cursor-not-allowed transition-all duration-200 hover:border-gray-400"
                        />
                    </div>

                    <div>
                        <label
                            htmlFor="password"
                            className="block text-sm font-semibold text-gray-800 mb-3"
                        >
                            Password
                        </label>
                        <div className="relative">
                            <input
                                id="password"
                                type={showPassword ? 'text' : 'password'}
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••"
                                disabled={rateLimitTimer > 0}
                                className="text-black block w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg shadow-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:ring-opacity-50 disabled:bg-gray-100 disabled:cursor-not-allowed transition-all duration-200 hover:border-gray-400"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                disabled={rateLimitTimer > 0}
                                className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-500 hover:text-gray-700 disabled:cursor-not-allowed transition-colors duration-200"
                            >
                                {showPassword ? (
                                    <EyeSlashIcon className="h-5 w-5" />
                                ) : (
                                    <EyeIcon className="h-5 w-5" />
                                )}
                            </button>
                        </div>
                    </div>

                    {error && (
                        <div className="bg-red-50 border border-red-300 text-red-700 px-4 py-3 rounded-lg text-sm font-medium shadow-sm">
                            {error}
                        </div>
                    )}

                    <div className="space-y-4">
                        <button
                            type="submit"
                            disabled={loginLoading || rateLimitTimer > 0}
                            className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 hover:shadow-md disabled:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 focus:ring-opacity-50 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98]"
                        >
                            {rateLimitTimer > 0
                                ? `Try again in ${formatTime(rateLimitTimer)}`
                                : loginLoading
                                ? 'Signing in...'
                                : 'Sign In'
                            }
                        </button>

                        <button
                            type="button"
                            onClick={() => router.push('/signup')}
                            disabled={rateLimitTimer > 0}
                            className="w-full flex justify-center py-3 px-4 border-2 border-blue-500 rounded-lg shadow-sm text-sm font-semibold text-blue-700 bg-white hover:bg-blue-50 hover:border-blue-600 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 focus:ring-opacity-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98]"
                        >
                            Request Account
                        </button>
                    </div>

                    <div className="flex items-center justify-center pt-2">
                        <Link href="/forgot-password" className="text-sm font-medium text-blue-600 hover:text-blue-800 transition-colors duration-200">
                            Forgot password?
                        </Link>
                    </div>
                </form>
            </div>
        </div>
    )
}
