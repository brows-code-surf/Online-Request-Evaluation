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
import SkeletonLoader from './skeletonLoader';
import { getIconById } from '../../utils/iconConstants';

export default function HeaderNavBar() {
  const router = useRouter();
  const pathname = usePathname();
  const { logout, user, loading, isAdmin, darkMode } = useAuth();
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isUserSetupOpen, setIsUserSetupOpen] = useState(false);
  const [isSystemUtilitiesOpen, setIsSystemUtilitiesOpen] = useState(false);
  const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [mounted, setMounted] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [accessibleModules, setAccessibleModules] = useState([]);
  const [modulesLoading, setModulesLoading] = useState(false);
  const [dynamicDropdowns, setDynamicDropdowns] = useState({});

  // Helper function to close all dropdowns
  const closeAllDropdowns = () => {
    setIsProfileOpen(false);
    setIsNotificationOpen(false);
    setIsMenuOpen(false);
    setDynamicDropdowns({});
  };

  useEffect(() => setMounted(true), []);

  const notifRef = useRef(null);
  const profileRef = useRef(null);
  const userSetupRef = useRef(null);
  const systemUtilitiesRef = useRef(null);
  const notifButtonRef = useRef(null);
  const profileButtonRef = useRef(null);
  const userSetupButtonRef = useRef(null);
  const systemUtilitiesButtonRef = useRef(null);
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
  useClickOutside(userSetupRef, (event) => {
    if (!userSetupButtonRef.current || !userSetupButtonRef.current.contains(event.target)) {
      setIsUserSetupOpen(false);
    }
  });
  useClickOutside(systemUtilitiesRef, (event) => {
    if (!systemUtilitiesButtonRef.current || !systemUtilitiesButtonRef.current.contains(event.target)) {
      setIsSystemUtilitiesOpen(false);
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

  // Fetch accessible modules
  useEffect(() => {
    const fetchAccessibleModules = async () => {
      if (user?.employeeID) {
        setModulesLoading(true);
        try {
          const response = await fetch(`/api/user-access?employeeID=${user.employeeID}`);
          const data = await response.json();
          if (data.success) {
            // console.log('Fetched modules:', data.modules);
            // console.log('Current pathname:', pathname);
            setAccessibleModules(data.modules);
          } else {
            console.error('API Error:', data.error);
            setAccessibleModules([]);
          }
        } catch (error) {
          console.error('Error fetching accessible modules:', error);
          setAccessibleModules([]);
        } finally {
          setModulesLoading(false);
        }
      }
    };

    if (mounted && user?.employeeID) {
      fetchAccessibleModules();
    }
  }, [user?.employeeID, mounted, pathname]);

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
    setLoggingOut(true);
    try {
      await logoutUser();
      logout();
      router.push('/login');
    } catch (error) {
      console.error('Logout error:', error);
      logout();
      router.push('/login');
    } finally {
      setLoggingOut(false);
    }
  };

  const isUserAdmin = user && isAdmin();
  const theme = mounted ? darkMode : false;

  // Helper function to check if a link is active
  const isLinkActive = (moduleLink) => {
    if (!moduleLink) return false;
    // Remove query parameters and hash from pathname for comparison
    const cleanPathname = pathname.split('?')[0].split('#')[0];
    const cleanModuleLink = moduleLink.split('?')[0].split('#')[0];
    return cleanPathname === cleanModuleLink;
  };

  // Process accessible modules into navigation structure
  const processModulesForNavigation = () => {
    if (!accessibleModules.length) return { directLinks: [], dropdowns: [] };

    const directLinks = [];
    const dropdowns = [];
    const parentMap = {};

    // Group modules by parent
    accessibleModules.forEach(module => {
      if (module.parent_name) {
        // Child module
        if (!parentMap[module.parent_name]) {
          parentMap[module.parent_name] = { children: [], parentInfo: null };
        }
        parentMap[module.parent_name].children.push(module);
      } else {
        // Parent module - check if it has children
        if (!parentMap[module.module_name]) {
          parentMap[module.module_name] = { children: [], parentInfo: module };
        } else {
          parentMap[module.module_name].parentInfo = module;
        }
      }
    });

    // Process grouped modules
    Object.entries(parentMap).forEach(([parentName, { children, parentInfo }]) => {
      if (children.length > 0) {
        // Has children - create dropdown
        dropdowns.push({
          name: parentName,
          link: parentInfo?.module_link || '',
          children: children
        });
      } else if (parentInfo) {
        // No children - direct link
        directLinks.push(parentInfo);
      }
    });

    return { directLinks, dropdowns };
  };

  const { directLinks, dropdowns } = processModulesForNavigation();

  return (
    <header className={`fixed top-0 left-0 right-0 ${theme ? 'bg-gray-800' : 'bg-white'} shadow-md z-50 border-b-[3px] border-blue-600`}>
      <div className="flex items-center justify-between px-6 py-1 max-w-full">

        <div className="flex items-center">
          <Link href="/dashboard" className="flex items-center gap-2">
            <img src={theme ? "/SANTEH-LOGO/SFC-GRAY.png" : "/SANTEH-LOGO/SFC.png"}
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
              if (isMenuOpen) {
                setIsMenuOpen(false);
              } else {
                closeAllDropdowns();
                setIsMenuOpen(true);
              }
            }}
            className={`md:hidden p-2 ${theme ? 'text-gray-300' : 'text-gray-600'} hover:text-blue-600 transition rounded-full hover:${theme ? 'bg-gray-700' : 'bg-gray-100'}`}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          {/* Navigation - Desktop */}
          <nav className="hidden md:flex gap-6">
            {/* Loading Skeleton */}
            {modulesLoading ? (
              <>
                <SkeletonLoader height="h-4" width="w-16" />
                <SkeletonLoader height="h-4" width="w-20" />
                <SkeletonLoader height="h-4" width="w-18" />
                <SkeletonLoader height="h-4" width="w-24" />
              </>
            ) : (
              <>
                {/* Dynamic Navigation Links */}
                {directLinks.map((module) => {
                  const moduleIcon = module.icon ? getIconById(module.icon) : null;
                  return (
                    <Link
                      key={module.module_id}
                      href={module.module_link}
                      className={`flex items-center gap-2 text-sm font-medium transition ${isLinkActive(module.module_link)
                        ? 'text-blue-600 border-b-2 border-blue-600 pb-1'
                        : `${theme ? 'text-gray-300' : 'text-gray-600'} hover:text-blue-600`
                        }`}
                    >
                      {moduleIcon && <moduleIcon.icon className="w-4 h-4" />}
                      {module.module_name}
                    </Link>
                  );
                })}

            {/* Dynamic Dropdowns */}
            {dropdowns.map((dropdown) => {
              const isOpen = dynamicDropdowns[dropdown.name] || false;
              // Find the parent module icon if it exists
              const parentModule = accessibleModules.find(m => m.module_name === dropdown.name && !m.parent_name);
              const parentIcon = parentModule?.icon ? getIconById(parentModule.icon) : null;

              return (
                <div key={dropdown.name} className="relative">
                  <button
                    onClick={() => {
                      const newState = !dynamicDropdowns[dropdown.name];
                      // Close all other dropdowns first
                      closeAllDropdowns();
                      // Then set this dropdown's state
                      if (newState) {
                        setDynamicDropdowns({ [dropdown.name]: true });
                      }
                    }}
                    className={`flex items-center gap-2 text-sm font-medium transition ${
                      dropdown.children.some(child => isLinkActive(child.module_link))
                        ? 'text-blue-600 border-b-2 border-blue-600 pb-1'
                        : `${theme ? 'text-gray-300' : 'text-gray-600'} hover:text-blue-600`
                      }`}
                  >
                    {parentIcon && <parentIcon.icon className="w-4 h-4" />}
                    {dropdown.name}
                    <svg
                      className={`w-4 h-4 transition ${isOpen ? 'rotate-180' : ''}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </button>

                  {/* Dynamic Dropdown Menu */}
                  {isOpen && (
                    <div className={`absolute left-0 mt-2 w-max min-w-48 ${theme ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-xl border ${theme ? 'border-gray-700' : 'border-gray-200'} overflow-hidden z-50`}>
                      <div className="py-1">
                        {dropdown.children.map((child) => {
                          const childIcon = child.icon ? getIconById(child.icon) : null;
                          return (
                            <Link
                              key={child.module_id}
                              href={child.module_link}
                              className={`flex items-center gap-3 px-4 py-2 text-sm font-medium transition ${isLinkActive(child.module_link)
                                ? 'bg-blue-50 text-blue-600'
                                : `${theme ? 'text-gray-200 hover:bg-gray-700' : 'text-gray-700 hover:bg-gray-50'}`
                                }`}
                              onClick={() => setDynamicDropdowns(prev => ({
                                ...prev,
                                [dropdown.name]: false
                              }))}
                            >
                              {childIcon && <childIcon.icon className="w-4 h-4" />}
                              {child.module_name}
                            </Link>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
              </>
            )}
          </nav>

          {/* Notification Bell */}
          <div className="relative z-50">
            <button
              ref={notifButtonRef}
              onClick={() => {
                if (isNotificationOpen) {
                  setIsNotificationOpen(false);
                } else {
                  closeAllDropdowns();
                  setIsNotificationOpen(true);
                }
              }}
              className={`relative p-2 ${theme ? 'text-gray-300' : 'text-gray-600'} hover:text-blue-600 transition rounded-full hover:${theme ? 'bg-gray-700' : 'bg-gray-100'}`}
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
              {mounted && unreadCount > 0 && (
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
          <div className={`hidden sm:block w-px h-6 ${theme ? 'bg-gray-600' : 'bg-gray-300'}`}></div>

          {/* User Profile Dropdown */}
          <div className="relative">
            <button
              ref={profileButtonRef}
              onClick={() => {
                if (isProfileOpen) {
                  setIsProfileOpen(false);
                } else {
                  closeAllDropdowns();
                  setIsProfileOpen(true);
                }
              }}
              className={`flex items-center gap-2 p-2 ${theme ? 'text-gray-200' : 'text-gray-700'} hover:text-blue-600 transition rounded-full hover:${theme ? 'bg-gray-700' : 'bg-gray-100'}`}
            >
              <div className="w-9 h-9 bg-gradient-to-br from-blue-500 via-blue-600 to-blue-800 rounded-full flex items-center justify-center text-white font-semibold text-sm shadow-md hover:shadow-lg transition-all duration-300">
                {mounted ? getInitials() : 'U'}
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
              <div ref={profileRef} className={`absolute right-0 mt-2 w-56 ${theme ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-xl border ${theme ? 'border-gray-700' : 'border-gray-200'} overflow-hidden z-50`}>
                {/* User Info Section */}
                <div className="px-4 py-4 bg-gradient-to-r from-blue-500 to-blue-600">
                  <p className="text-white font-semibold text-lg">{mounted ? (user?.empName || 'User') : 'User'}</p>
                  <p className="text-blue-100 text-sm">{mounted ? (user?.email || 'email@example.com') : 'email@example.com'}</p>
                </div>

                {/* Menu Items */}
                <div className="py-2">
                  <Link
                    href="/user-profile"
                    className={`block px-4 py-3 ${theme ? 'text-gray-200 hover:bg-gray-700' : 'text-gray-700 hover:bg-gray-50'} hover:text-blue-600 transition text-sm font-medium`}
                  >
                    <svg className="w-4 h-4 inline mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    My Profile
                  </Link>

                  <Link
                    href="/settings"
                    className={`block px-4 py-3 ${theme ? 'text-gray-200 hover:bg-gray-700' : 'text-gray-700 hover:bg-gray-50'} hover:text-blue-600 transition text-sm font-medium`}
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
                    className={`w-full text-left block px-4 py-3 ${theme ? 'text-gray-200 hover:bg-gray-700' : 'text-gray-700 hover:bg-gray-50'} hover:text-blue-600 transition text-sm font-medium`}
                  >
                    <svg className="w-4 h-4 inline mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Help & Support
                  </button>
                </div>

                {/* Divider */}
                <div className={`border-t ${theme ? 'border-gray-600' : 'border-gray-200'}`}></div>

                {/* Logout */}
                <button
                  onClick={handleLogout}
                  disabled={loggingOut}
                  className={`w-full px-4 py-3 text-red-600 transition text-sm font-medium text-left ${loggingOut ? 'opacity-50 cursor-not-allowed' : ''} ${theme ? 'hover:bg-red-900' : 'hover:bg-red-50'}`}
                >
                  <svg className="w-4 h-4 inline mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  {loggingOut ? 'Logging out...' : 'Sign Out'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/*Mobile View Humburger*/}
      {isMenuOpen && (
        <div className={`md:hidden ${theme ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border-b px-6 py-3 space-y-3`}>
          {/* Loading Skeleton for Mobile */}
          {modulesLoading ? (
            <>
              <SkeletonLoader height="h-4" width="w-20" />
              <SkeletonLoader height="h-4" width="w-24" />
              <SkeletonLoader height="h-4" width="w-18" />
              <div className="border-t border-gray-200 dark:border-gray-600 mt-2 pt-2">
                <SkeletonLoader height="h-3" width="w-16" className="mb-2" />
                <SkeletonLoader height="h-4" width="w-22" className="mt-1" />
                <SkeletonLoader height="h-4" width="w-20" className="mt-1" />
              </div>
            </>
          ) : (
            <>
              {/* Dynamic Mobile Navigation */}
              {directLinks.map((module) => {
                const moduleIcon = module.icon ? getIconById(module.icon) : null;
                return (
                  <Link
                    key={module.module_id}
                    href={module.module_link}
                    className={`flex items-center gap-3 px-3 py-2 rounded text-sm font-medium transition ${isLinkActive(module.module_link)
                      ? 'bg-blue-100 text-blue-600'
                      : `${theme ? 'text-gray-200 hover:bg-gray-700' : 'text-gray-700 hover:bg-gray-100'}`
                      }`}
                    onClick={() => setIsMenuOpen(false)}
                  >
                    {moduleIcon && <moduleIcon.icon className="w-4 h-4" />}
                    {module.module_name}
                  </Link>
                );
              })}

          {/* Dynamic Mobile Dropdowns */}
          {dropdowns.map((dropdown) => (
            <div key={dropdown.name}>
              <div className="border-t border-gray-200 dark:border-gray-600 mt-2 pt-2">
                <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
                  {dropdown.name}
                </div>
                {dropdown.children.map((child) => {
                  const childIcon = child.icon ? getIconById(child.icon) : null;
                  return (
                    <Link
                      key={child.module_id}
                      href={child.module_link}
                      className={`flex items-center gap-3 px-3 py-2 rounded text-sm font-medium transition mt-1 ${isLinkActive(child.module_link)
                        ? 'bg-blue-100 text-blue-600'
                        : `${theme ? 'text-gray-200 hover:bg-gray-700' : 'text-gray-700 hover:bg-gray-100'}`
                        }`}
                      onClick={() => setIsMenuOpen(false)}
                    >
                      {childIcon && <childIcon.icon className="w-4 h-4" />}
                      {child.module_name}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
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
