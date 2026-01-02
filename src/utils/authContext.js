'use client';

import { createContext, useContext, useState, useEffect } from 'react';
import { clearSessionActivity } from '@/utils/sessionTimeout';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [darkMode, setDarkMode] = useState(() => {
    // Initialize darkMode from localStorage if available
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('darkMode');
        return stored ? JSON.parse(stored) : false;
      } catch (error) {
        return false;
      }
    }
    return false;
  });

  useEffect(() => {
    // Check if user is already logged in
    try {
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        try {
          const userData = JSON.parse(storedUser);
          setUser(userData);
          // Load dark mode setting
          loadDarkModeSetting(userData.employeeID);
        } catch (error) {
          localStorage.removeItem('user');
        }
      }
    } catch (error) {
      console.error('localStorage access failed:', error);
    }
    setLoading(false);
  }, []);

  // Persist darkMode to localStorage whenever it changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('darkMode', JSON.stringify(darkMode));
      } catch (error) {
        console.error('Error saving dark mode to localStorage:', error);
      }
    }
  }, [darkMode]);

  const loadDarkModeSetting = async (employeeID) => {
    if (!employeeID) return;
    try {
      const response = await fetch('/api/user-settings?employeeID=' + employeeID);
      if (response.ok) {
        const data = await response.json();
        setDarkMode(data.isDarkMode === 1);
      }
    } catch (error) {
      console.error('Error loading dark mode setting:', error);
    }
  };

  // Dark mode is now handled per page/component to scope it

  const login = (userData) => {
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
    // Load dark mode setting for the newly logged in user
    loadDarkModeSetting(userData.employeeID);
  };

  const logout = () => {
    localStorage.removeItem('user');
    clearSessionActivity();
    setUser(null);
  };

  const isAdmin = () => {
    const isAdminUser = user?.department?.trim().toUpperCase() === "MIS";
    return isAdminUser;
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, isAdmin, darkMode, setDarkMode }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
