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
          console.log('Redirecting to /request-evaluation')
          router.replace('/request-evaluation')
        } else {
          console.log('Redirecting to /login')
          router.replace('/login')
        }
      }, 100)
    }
  }, [user, loading, router])

  return (
    <Loader loading={loading}>
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-500 to-blue-600">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-white mb-4">SANTEH</h1>
          <p className="text-blue-100 text-lg">Online Requests Evaluation System</p>
        </div>
      </div>
    </Loader>
  )
}
