'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from './_components/authContext'
import Loader from './_components/loader'

export default function Home() {
  const router = useRouter()
  const { user, loading } = useAuth()

  useEffect(() => {
    if (!loading) {
      if (user) {
        router.push('/request-evaluation')
      } else {
        router.push('/login')
      }
    }
  }, [user, loading, router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-500 to-blue-600">
      <Loader />
      <div className="text-center">
        <h1 className="text-4xl font-bold text-white mb-4">SANTEH</h1>
        <p className="text-blue-100 text-lg">Online Requests Evaluation System</p>
      </div>
    </div>
  )
}
