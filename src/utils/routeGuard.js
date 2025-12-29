'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from './authContext';
import Loader from '../app/_components/loader';

export function RouteGuard({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, loading } = useAuth();
  const [hasAccess, setHasAccess] = useState(null);
  const [checking, setChecking] = useState(true);

  // Routes that don't require authentication
  const publicRoutes = ['/login', '/signup', '/forgot-password', '/OTP'];

  // Routes that require admin access
  const adminRoutes = [];

  // Routes that require authentication but not necessarily specific module access
  const authenticatedRoutes = ['/dashboard', '/user-profile', '/settings'];

  useEffect(() => {
    const checkAccess = async () => {
      // Don't check access for public routes
      if (publicRoutes.some(route => pathname.startsWith(route))) {
        setHasAccess(true);
        setChecking(false);
        return;
      }

      // Wait for auth loading
      if (loading) return;

      // Check if user is authenticated
      if (!user) {
        router.push('/login');
        return;
      }

      // For authenticated routes (dashboard, profile, settings), just require login
      if (authenticatedRoutes.some(route => pathname.startsWith(route))) {
        setHasAccess(true);
        setChecking(false);
        return;
      }

      // For admin routes, check if user is admin
      if (adminRoutes.some(route => pathname.startsWith(route))) {
        // Check admin status - assuming this is available in user object
        const isAdmin = user?.department?.trim().toUpperCase() === "MIS";
        if (!isAdmin) {
          setHasAccess(false);
          setChecking(false);
          return;
        }
      }

      // Check specific module access via API
      try {
        const response = await fetch('/api/check-access', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            pathname: pathname,
            employeeID: user.employeeID
          })
        });

        const data = await response.json();

        if (data.success) {
          setHasAccess(data.hasAccess);
        } else {
          console.error('API Error:', data.error);
          setHasAccess(false);
        }
      } catch (error) {
        console.error('Error checking route access:', error);
        setHasAccess(false);
      }

      setChecking(false);
    };

    checkAccess();
  }, [pathname, user, loading, router]);

  // Show loading while checking access
  if (checking || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader/>
      </div>
    );
  }

  // Redirect unauthorized users
  if (hasAccess === false) {
    // router.push('/dashboard');
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-800 mb-4">Access Denied</h1>
          <p className="text-gray-600 mb-4">You don't have permission to access this page.</p>
          <button
            onClick={() => router.push('/dashboard')}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  // Render protected content
  return hasAccess ? children : null;
}

// Higher-order component for route protection
export function withRouteGuard(Component) {
  return function ProtectedComponent(props) {
    return (
      <RouteGuard>
        <Component {...props} />
      </RouteGuard>
    );
  };
}
