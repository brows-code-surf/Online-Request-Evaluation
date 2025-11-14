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
    const { login } = useAuth()

    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)
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

    const handleSubmit = async (e) => {
        e.preventDefault()
        setError('')
        setLoading(true)

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
                setLoading(false)
                return
            }

            router.push(`/OTP?email=${encodeURIComponent(result.email)}`)
        } catch (err) {
            setError('Login failed. Please try again.')
            console.error(err)
            setLoading(false)
        }
    }

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <div className="min-h-screen flex items-center justify-center px-4 bg-gradient-to-br from-blue-600 via-blue-500 to-green-400 animate-gradient">
            <Loader loading={loading} />
            <div className="max-w-md w-full p-8 bg-white rounded-lg shadow-xl">
                <div className="text-center mb-8">
                    <div className="flex justify-center mb-4">
                        <img src="/SANTEH-LOGO/SFC.png" alt="SANTEH Logo" className="" />
                    </div>
                    <h3 className="text-gray-600 text-sm mt-2">Online Requests Evaluation System</h3>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
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
                            className="text-black mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                        />
                    </div>

                    <div>
                        <label
                            htmlFor="password"
                            className="block text-sm font-medium text-gray-700 mb-2"
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
                                className="text-black block w-full px-3 py-2 pr-10 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                disabled={rateLimitTimer > 0}
                                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 hover:text-gray-700 disabled:cursor-not-allowed"
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
                        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
                            {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading || rateLimitTimer > 0}
                        className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition"
                    >
                        {rateLimitTimer > 0 
                            ? `Try again in ${formatTime(rateLimitTimer)}`
                            : loading 
                            ? 'Signing in...' 
                            : 'Sign In'
                        }
                    </button>

                    <button
                        type="button"
                        onClick={() => router.push('/signup')}
                        disabled={rateLimitTimer > 0}
                        className="w-full flex justify-center py-2 px-4 border border-blue-500 rounded-md shadow-sm text-sm font-medium text-blue-700 hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Request Account
                    </button>

                    <div className="flex items-center justify-center">
                        <Link href="/forgot-password" className="text-sm text-blue-600 hover:text-blue-700">
                            Forgot password?
                        </Link>
                    </div>
                </form>
            </div>
        </div>
    )
}
