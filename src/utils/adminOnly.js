// components/AdminOnly.js
'use client';

import { useAuth } from './authContext';

export default function AdminOnly({ children }) {
  const { user, loading, isAdmin } = useAuth();

  if (loading) return null;
  if (!user || !isAdmin()) return null;

  return <>{children}</>;
}
