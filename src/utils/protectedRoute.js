'use client';

import { useAuth } from './authContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import Loader from '../app/_components/loader';

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  if (loading) {
    return <Loader />;
  }

  if (!user) {
    return null;
  }

  return children;
}
