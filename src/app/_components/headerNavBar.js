'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '../../utils/authContext';
import { logoutUser } from '../login/_actions';

export default function HeaderNavBar() {
  const router = useRouter();
  const pathname = usePathname();
  const { logout, user, loading, isAdmin } = useAuth();
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [notifications, setNotifications] = useState([
    { id: 1, message: 'Your account has been approved', time: '2 hours ago', read: false },
    { id: 2, message: 'New message from HR', time: '5 hours ago', read: false },
    { id: 3, message: 'System maintenance scheduled', time: '1 day ago', read: true },
  ]);

  const unreadCount = notifications.filter(n => !n.read).length;

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

  const markAsRead = (id) => {
    setNotifications(notifications.map(n =>
      n.id === id ? { ...n, read: true } : n
    ));
  };

  const isUserAdmin = user && isAdmin();

  return (
    <header className="fixed top-0 left-0 right-0 bg-white shadow-md z-50 border-b-[3px] border-blue-600">
      <div className="flex items-center justify-between px-6 py-1 max-w-full">

        <div className="flex items-center">
          <Link href="/request-evaluation" className="flex items-center gap-2">
            <img src="/SANTEH-LOGO/SFC.png" alt="SANTEH Logo" className="w-30 h-10" />
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
            className="md:hidden p-2 text-gray-600 hover:text-blue-600 transition rounded-full hover:bg-gray-100"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          {/* Navigation - Desktop */}
          <nav className="hidden md:flex gap-6">
            {isUserAdmin && (
              <>
                <Link
                  href="/user-approval"
                  className={`text-sm font-medium transition ${
                    pathname === '/user-approval'
                      ? 'text-blue-600 border-b-2 border-blue-600 pb-1'
                      : 'text-gray-600 hover:text-blue-600'
                  }`}
                >
                  User Account Approvals
                </Link>
                <Link
                  href="/user-accounts"
                  className={`text-sm font-medium transition ${
                    pathname === '/user-accounts'
                      ? 'text-blue-600 border-b-2 border-blue-600 pb-1'
                      : 'text-gray-600 hover:text-blue-600'
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
              onClick={() => {
                setIsNotificationOpen(!isNotificationOpen);
                setIsProfileOpen(false);
                setIsMenuOpen(false);
              }}
              className="relative p-2 text-gray-600 hover:text-blue-600 transition rounded-full hover:bg-gray-100"
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
              <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-xl border border-gray-200 z-50">
                <div className="p-4 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-800">Notifications</h3>
                </div>
                <div className="max-h-96 overflow-y-auto">
                  {notifications.length > 0 ? (
                    notifications.map(notification => (
                      <div
                        key={notification.id}
                        onClick={() => markAsRead(notification.id)}
                        className={`px-4 py-3 border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition ${!notification.read ? 'bg-blue-50' : ''
                          }`}
                      >
                        <div className="flex items-start gap-3">
                          <div className={`w-2 h-2 rounded-full mt-2 ${!notification.read ? 'bg-blue-600' : 'bg-gray-300'
                            }`}></div>
                          <div className="flex-1">
                            <p className="text-sm text-gray-800 font-medium">
                              {notification.message}
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                              {notification.time}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="px-4 py-8 text-center text-gray-500">
                      No notifications
                    </div>
                  )}
                </div>
                <div className="p-3 border-t border-gray-200 text-center">
                  <Link href="/notifications" className="text-blue-600 hover:text-blue-700 text-sm font-medium">
                    View All Notifications
                  </Link>
                </div>
              </div>
            )}
          </div>

          {/* Divider */}
          <div className="hidden sm:block w-px h-6 bg-gray-300"></div>

          {/* User Profile Dropdown */}
          <div className="relative">
            <button
              onClick={() => {
                setIsProfileOpen(!isProfileOpen);
                setIsNotificationOpen(false);
                setIsMenuOpen(false);
              }}
              className="flex items-center gap-2 p-2 text-gray-700 hover:text-blue-600 transition rounded-full hover:bg-gray-100"
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
              <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-xl border border-gray-200 overflow-hidden z-50">
                {/* User Info Section */}
                <div className="px-4 py-4 bg-gradient-to-r from-blue-500 to-blue-600">
                  <p className="text-white font-semibold text-lg">{user?.empName || 'User'}</p>
                  <p className="text-blue-100 text-sm">{user?.email || 'email@example.com'}</p>
                </div>

                {/* Menu Items */}
                <div className="py-2">
                  <Link
                    href="/user-profile"
                    className="block px-4 py-3 text-gray-700 hover:bg-gray-50 hover:text-blue-600 transition text-sm font-medium"
                  >
                    <svg className="w-4 h-4 inline mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    My Profile
                  </Link>

                  <Link
                    href="/settings"
                    className="block px-4 py-3 text-gray-700 hover:bg-gray-50 hover:text-blue-600 transition text-sm font-medium"
                  >
                    <svg className="w-4 h-4 inline mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    Settings
                  </Link>

                  <Link
                    href="/help"
                    className="block px-4 py-3 text-gray-700 hover:bg-gray-50 hover:text-blue-600 transition text-sm font-medium"
                  >
                    <svg className="w-4 h-4 inline mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Help & Support
                  </Link>
                </div>

                {/* Divider */}
                <div className="border-t border-gray-200"></div>

                {/* Logout */}
                <button
                  onClick={handleLogout}
                  className="w-full px-4 py-3 text-red-600 hover:bg-red-50 transition text-sm font-medium text-left"
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

      {/* Mobile Menu */}
      {isMenuOpen && isUserAdmin && (
        <div className="md:hidden bg-white border-b border-gray-200 px-6 py-3 space-y-3">
          <Link
            href="/user-approval"
            className={`block px-3 py-2 rounded text-sm font-medium transition ${
              pathname === '/user-approval'
                ? 'bg-blue-100 text-blue-600'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
            onClick={() => setIsMenuOpen(false)}
          >
            User Account Approvals
          </Link>
          <Link
            href="/user-accounts"
            className={`block px-3 py-2 rounded text-sm font-medium transition ${
              pathname === '/user-accounts'
                ? 'bg-blue-100 text-blue-600'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
            onClick={() => setIsMenuOpen(false)}
          >
            User Accounts
          </Link>
        </div>
      )}
    </header>
  );
}
