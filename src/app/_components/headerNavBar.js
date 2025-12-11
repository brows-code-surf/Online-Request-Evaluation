'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '../../utils/authContext';
import { logoutUser } from '../login/_actions';
import { NotificationBell } from './notificationBell';
import { getUnreadNotificationCount } from '../_actions/notifications';
import { useSocketMultiple } from '../../hooks/useSocketMultiple';
import useClickOutside from '../../utils/useClickOutsideClose';
import HelpSupportModal from '../(main)/_components/helpSupportModal';

export default function HeaderNavBar() {
  const router = useRouter();
  const pathname = usePathname();
  const { logout, user, loading, isAdmin, darkMode } = useAuth();
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const notifRef = useRef(null);
  const profileRef = useRef(null);
  const notifButtonRef = useRef(null);
  const profileButtonRef = useRef(null);
  useClickOutside(notifRef, (event) => {
    if (!notifButtonRef.current || !notifButtonRef.current.contains(event.target)) {
      setIsNotificationOpen(false);
    }
  });
  useClickOutside(profileRef, (event) => {
    if (!profileButtonRef.current || !profileButtonRef.current.contains(event.target)) {
      setIsProfileOpen(false);
    }
  });

  // Fetch unread notification count
  useEffect(() => {
    const fetchUnreadCount = async () => {
      if (user?.empName) {
        try {
          const result = await getUnreadNotificationCount(user.empName);
          if (result.success) {
            setUnreadCount(result.count);
          }
        } catch (error) {
          console.error('Error fetching unread count:', error);
        }
      }
    };

    fetchUnreadCount();
  }, [user?.empName]);

  // Listen for notification updates via socket
  useSocketMultiple(`user-${user?.empName}`, {
    'new-notification': () => {
      setUnreadCount(prev => prev + 1);
    },
    'notification-count-updated': (data) => {
      setUnreadCount(data.count);
    }
  });

  // Extract initials from user name or email
  const getInitials = () => {
    if (user?.empName) {
      return user.empName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 3);
    }
    if (user?.email) {
      return user.email.split('@')[0].slice(0, 2).toUpperCase();
    }
    return 'U';
  };

  const handleLogout = async () => {
    try {
      await logoutUser();
      logout();
      router.push('/login');
    } catch (error) {
      console.error('Logout error:', error);
      logout();
      router.push('/login');
    }
  };

  const isUserAdmin = user && isAdmin();

  return (
    <header className={`fixed top-0 left-0 right-0 ${darkMode ? 'bg-gray-800' : 'bg-white'} shadow-md z-50 border-b-[3px] border-blue-600`}>
      <div className="flex items-center justify-between px-6 py-1 max-w-full">

        <div className="flex items-center">
          <Link href="/request-evaluation" className="flex items-center gap-2">
            <img src={darkMode ? "/SANTEH-LOGO/SFC-GRAY.png" : "/SANTEH-LOGO/SFC.png"}
              alt="SANTEH Logo"
              className="w-30 h-10 object-contain"
            />
          </Link>
        </div>

        {/* Right Section - Navigation, Notifications & Profile */}
        <div className="flex items-center gap-4">

          {/* Hamburger Menu */}
          <button
            onClick={() => {
              setIsMenuOpen(!isMenuOpen);
              setIsProfileOpen(false);
              setIsNotificationOpen(false);
            }}
            className={`md:hidden p-2 ${darkMode ? 'text-gray-300' : 'text-gray-600'} hover:text-blue-600 transition rounded-full hover:${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          {/* Navigation - Desktop */}
          <nav className="hidden md:flex gap-6">
            <Link
              href="/request-evaluation"
              className={`text-sm font-medium transition ${pathname === '/request-evaluation'
                ? 'text-blue-600 border-b-2 border-blue-600 pb-1'
                : `${darkMode ? 'text-gray-300' : 'text-gray-600'} hover:text-blue-600`
                }`}
            >
              Request Evaluation
            </Link>
            {isUserAdmin && (
              <>
                <Link
                  href="/dashboard"
                  className={`text-sm font-medium transition ${pathname === '/dashboard'
                    ? 'text-blue-600 border-b-2 border-blue-600 pb-1'
                    : `${darkMode ? 'text-gray-300' : 'text-gray-600'} hover:text-blue-600`
                    }`}
                >
                  Dashboard
                </Link>
                <Link
                  href="/user-approval"
                  className={`text-sm font-medium transition ${pathname === '/user-approval'
                    ? 'text-blue-600 border-b-2 border-blue-600 pb-1'
                    : `${darkMode ? 'text-gray-300' : 'text-gray-600'} hover:text-blue-600`
                    }`}
                >
                  User Account Approvals
                </Link>
                <Link
                  href="/user-accounts"
                  className={`text-sm font-medium transition ${pathname === '/user-accounts'
                    ? 'text-blue-600 border-b-2 border-blue-600 pb-1'
                    : `${darkMode ? 'text-gray-300' : 'text-gray-600'} hover:text-blue-600`
                    }`}
                >
                  User Accounts
                </Link>
              </>
            )}
          </nav>

          {/* Notification Bell */}
          <div className="relative">
            <button
              ref={notifButtonRef}
              onClick={() => {
                if (isNotificationOpen) {
                  setIsNotificationOpen(false);
                } else {
                  setIsNotificationOpen(true);
                  setIsProfileOpen(false);
                  setIsMenuOpen(false);
                }
              }}
              className={`relative p-2 ${darkMode ? 'text-gray-300' : 'text-gray-600'} hover:text-blue-600 transition rounded-full hover:${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                />
              </svg>
              {unreadCount > 0 && (
                <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white transform translate-x-1 -translate-y-1 bg-red-600 rounded-full">
                  {unreadCount}
                </span>
              )}
            </button>

            {/* Notification Dropdown */}
            {isNotificationOpen && (
              <NotificationBell
                ref={notifRef} />
            )}
          </div>

          {/* Divider */}
          <div className={`hidden sm:block w-px h-6 ${darkMode ? 'bg-gray-600' : 'bg-gray-300'}`}></div>

          {/* User Profile Dropdown */}
          <div className="relative">
            <button
              ref={profileButtonRef}
              onClick={() => {
                if (isProfileOpen) {
                  setIsProfileOpen(false);
                } else {
                  setIsProfileOpen(true);
                  setIsNotificationOpen(false);
                  setIsMenuOpen(false);
                }
              }}
              className={`flex items-center gap-2 p-2 ${darkMode ? 'text-gray-200' : 'text-gray-700'} hover:text-blue-600 transition rounded-full hover:${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}
            >
              <div className="w-9 h-9 bg-gradient-to-br from-blue-500 via-blue-600 to-blue-800 rounded-full flex items-center justify-center text-white font-semibold text-sm shadow-md hover:shadow-lg transition-all duration-300">
                {getInitials()}
              </div>
              <svg
                className={`w-4 h-4 transition ${isProfileOpen ? 'rotate-180' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 14l-7 7m0 0l-7-7m7 7V3"
                />
              </svg>
            </button>

            {/* Profile Dropdown Menu */}
            {isProfileOpen && (
              <div ref={profileRef} className={`absolute right-0 mt-2 w-56 ${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-xl border ${darkMode ? 'border-gray-700' : 'border-gray-200'} overflow-hidden z-50`}>
                {/* User Info Section */}
                <div className="px-4 py-4 bg-gradient-to-r from-blue-500 to-blue-600">
                  <p className="text-white font-semibold text-lg">{user?.empName || 'User'}</p>
                  <p className="text-blue-100 text-sm">{user?.email || 'email@example.com'}</p>
                </div>

                {/* Menu Items */}
                <div className="py-2">
                  <Link
                    href="/user-profile"
                    className={`block px-4 py-3 ${darkMode ? 'text-gray-200 hover:bg-gray-700' : 'text-gray-700 hover:bg-gray-50'} hover:text-blue-600 transition text-sm font-medium`}
                  >
                    <svg className="w-4 h-4 inline mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    My Profile
                  </Link>

                  <Link
                    href="/settings"
                    className={`block px-4 py-3 ${darkMode ? 'text-gray-200 hover:bg-gray-700' : 'text-gray-700 hover:bg-gray-50'} hover:text-blue-600 transition text-sm font-medium`}
                  >
                    <svg className="w-4 h-4 inline mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    Settings
                  </Link>

                  <button
                    onClick={() => {
                      setIsHelpModalOpen(true);
                      setIsProfileOpen(false);
                    }}
                    className={`w-full text-left block px-4 py-3 ${darkMode ? 'text-gray-200 hover:bg-gray-700' : 'text-gray-700 hover:bg-gray-50'} hover:text-blue-600 transition text-sm font-medium`}
                  >
                    <svg className="w-4 h-4 inline mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Help & Support
                  </button>
                </div>

                {/* Divider */}
                <div className={`border-t ${darkMode ? 'border-gray-600' : 'border-gray-200'}`}></div>

                {/* Logout */}
                <button
                  onClick={handleLogout}
                  className={`w-full px-4 py-3 text-red-600 hover:${darkMode ? 'bg-red-900' : 'bg-red-50'} transition text-sm font-medium text-left`}
                >
                  <svg className="w-4 h-4 inline mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  Sign Out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {isMenuOpen && (
        <div className={`md:hidden ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border-b px-6 py-3 space-y-3`}>
          <Link
            href="/request-evaluation"
            className={`block px-3 py-2 rounded text-sm font-medium transition ${pathname === '/request-evaluation'
              ? 'bg-blue-100 text-blue-600'
              : `${darkMode ? 'text-gray-200 hover:bg-gray-700' : 'text-gray-700 hover:bg-gray-100'}`
              }`}
            onClick={() => setIsMenuOpen(false)}
          >
            Request Evaluation
          </Link>
          {isUserAdmin && (
            <>
              <Link
                href="/dashboard"
                className={`block px-3 py-2 rounded text-sm font-medium transition ${pathname === '/dashboard'
                  ? 'bg-blue-100 text-blue-600'
                  : `${darkMode ? 'text-gray-200 hover:bg-gray-700' : 'text-gray-700 hover:bg-gray-100'}`
                  }`}
                onClick={() => setIsMenuOpen(false)}
              >
                Dashboard
              </Link>
              <Link
                href="/user-approval"
                className={`block px-3 py-2 rounded text-sm font-medium transition ${pathname === '/user-approval'
                  ? 'bg-blue-100 text-blue-600'
                  : `${darkMode ? 'text-gray-200 hover:bg-gray-700' : 'text-gray-700 hover:bg-gray-100'}`
                  }`}
                onClick={() => setIsMenuOpen(false)}
              >
                User Account Approvals
              </Link>
              <Link
                href="/user-accounts"
                className={`block px-3 py-2 rounded text-sm font-medium transition ${pathname === '/user-accounts'
                  ? 'bg-blue-100 text-blue-600'
                  : `${darkMode ? 'text-gray-200 hover:bg-gray-700' : 'text-gray-700 hover:bg-gray-100'}`
                  }`}
                onClick={() => setIsMenuOpen(false)}
              >
                User Accounts
              </Link>
            </>
          )}
        </div>
      )}

      {/* Help & Support Modal */}
      <HelpSupportModal
        isOpen={isHelpModalOpen}
        onClose={() => setIsHelpModalOpen(false)}
      />
    </header>
  );
}
