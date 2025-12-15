'use client'
import { Suspense, useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '../../utils/authContext'
import Loader from '../_components/loader';
import Link from 'next/link';
import { verifyOTP, resendOTP } from './_actions';

// Ensure this page is treated as dynamic to avoid prerendering issues
export const dynamic = 'force-dynamic';

function OTPContent() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const { login } = useAuth()
    const [email, setEmail] = useState('')
    const [otp, setOtp] = useState('')
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)
    const [resendTimer, setResendTimer] = useState(0)
    const [expirationTimer, setExpirationTimer] = useState(600) // 10 minutes in seconds

    useEffect(() => {
        const emailParam = searchParams.get('email')
        if (emailParam) {
            setEmail(decodeURIComponent(emailParam))
        }
    }, [searchParams])

    useEffect(() => {
        let interval;
        if (resendTimer > 0) {
            interval = setInterval(() => {
                setResendTimer(prev => prev - 1)
            }, 1000)
        }
        return () => clearInterval(interval)
    }, [resendTimer])

    useEffect(() => {
        let interval;
        if (expirationTimer > 0) {
            interval = setInterval(() => {
                setExpirationTimer(prev => {
                    if (prev <= 1) {
                        setError('OTP has expired. Please request a new one.')
                        return 0
                    }
                    return prev - 1
                })
            }, 1000)
        }
        return () => clearInterval(interval)
    }, [expirationTimer])

    const formatTime = (seconds) => {
        const minutes = Math.floor(seconds / 60)
        const secs = seconds % 60
        return `${minutes}:${secs.toString().padStart(2, '0')}`
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        setError('')
        
        if (expirationTimer <= 0) {
            setError('OTP has expired. Please request a new one.')
            return
        }

        setLoading(true)

        try {
            const result = await verifyOTP(email, otp)

            if (!result.success) {
                setError(result.message || 'Invalid OTP')
                setLoading(false)
                return
            }

            login(result.user)
            router.push('/dashboard')
        } catch (err) {
            setError('OTP verification failed. Please try again.')
            console.error(err)
            setLoading(false)
        }
    }

    const handleResend = async () => {
        setResendTimer(60)
        setExpirationTimer(600)
        setOtp('')
        setError('')
        await resendOTP(email)
    }

    return (
        <div className="min-h-screen flex items-center justify-center px-4 bg-gradient-to-br from-blue-600 via-blue-500 to-green-400 animate-gradient">
            <Loader loading = {loading}/>
            <div className="max-w-md w-full p-8 bg-white rounded-lg shadow-xl">
                <div className="text-center mb-8">
                    <div className="flex justify-center mb-4">
                        <img src="/SANTEH-LOGO/SFC.png" alt="SANTEH Logo" className="" />
                    </div>
                    <h3 className="text-gray-600 text-sm mt-2">Verify Your Identity</h3>
                    <p className="text-gray-500 text-xs mt-2">Enter the OTP sent to your email</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <div className="flex justify-between items-center mb-2">
                            <label htmlFor="otp" className="block text-sm font-medium text-gray-700">
                                One-Time Password
                            </label>
                            <span className={`text-xs font-semibold ${expirationTimer <= 120 ? 'text-red-500' : 'text-gray-500'}`}>
                                {formatTime(expirationTimer)}
                            </span>
                        </div>
                        <input
                            id="otp"
                            type="text"
                            required
                            value={otp}
                            onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                            placeholder="000000"
                            maxLength="6"
                            disabled={expirationTimer <= 0}
                            className="text-black text-center text-2xl tracking-widest mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
                        />
                    </div>

                    {error && (
                        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
                            {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading || otp.length !== 6 || expirationTimer <= 0}
                        className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition"
                    >
                        {loading ? 'Verifying...' : 'Verify OTP'}
                    </button>
                </form>

                <div className="mt-6 text-center space-y-3">
                    <p className="text-sm text-gray-600">
                        Didn't receive the code?{' '}
                        <button
                            onClick={handleResend}
                            disabled={resendTimer > 0 || loading}
                            className="text-blue-600 hover:text-blue-700 font-medium disabled:text-gray-400"
                        >
                            {resendTimer > 0 ? `Resend in ${resendTimer}s` : 'Resend OTP'}
                        </button>
                    </p>
                    <Link href="/login" className="text-sm text-gray-600 hover:text-gray-700 block">
                        Back to Login
                    </Link>
                </div>
            </div>
        </div>
    )
}

export default function OTPPage() {
    return (
        <Suspense fallback={null}>
            <OTPContent />
        </Suspense>
    )
}
