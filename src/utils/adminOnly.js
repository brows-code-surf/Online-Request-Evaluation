// components/AdminOnly.js
'use client';

import { useAuth } from './authContext';

export default function AdminOnly({ children }) {
  const { user, loading } = useAuth();

  if (loading) return null;
  if (!user || user.department !== "MIS") return null;

  return <>{children}</>;
}
