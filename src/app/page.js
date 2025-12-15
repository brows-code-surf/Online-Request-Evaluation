'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '../utils/authContext'
import Loader from './_components/loader'

export default function Home() {
  const router = useRouter()
  const { user, loading } = useAuth()
  const hasRedirected = useRef(false)

  useEffect(() => {
    console.log('Home useEffect: loading=', loading, 'user=', user)
    if (!loading && !hasRedirected.current) {
      hasRedirected.current = true
      setTimeout(() => {
        if (user) {
          console.log('Redirecting to /dashboard')
          router.replace('/dashboard')
        } else {
          console.log('Redirecting to /login')
          router.replace('/login')
        }
      }, 3000)
    }
  }, [user, loading, router])

  return (
    <Loader loading={loading}>
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-300 to-green-200">
        <div className="text-center">
          <img
            src="/SANTEH-LOGO/SFC_NOBG.png"
            alt="SANTEH Logo"
            className="w-full h-32 mx-auto mb-6"
          />
          <p className="text-gray-800 text-lg">Online Requests Evaluation System</p>
          <div className="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mt-4"></div>
        </div>
      </div>
    </Loader>
  )
}
