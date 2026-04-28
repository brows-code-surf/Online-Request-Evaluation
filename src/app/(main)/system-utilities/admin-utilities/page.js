'use client';

import Link from 'next/link';
import { useAuth } from '@/utils/authContext';
import HeaderNavBar from '@/app/_components/headerNavBar.js';
import { ArrowRight, Settings } from 'lucide-react';

export default function AdminUtilities() {
  const { darkMode } = useAuth();

  const utilities = [
    {
      name: 'Delete Receiving',
      description: 'Manage and delete receiving transactions',
      href: '/system-utilities/admin-utilities/delete-receiving',
      icon: Settings
    },
    {
      name: 'Distribution of Accounts',
      description: 'Unpost distribution of accounts for receiving transactions',
      href: '/system-utilities/admin-utilities/distribution-of-accounts',
      icon: Settings
    }
    // Add more utilities here as needed
  ];

  return (
    <div className={`min-h-screen mt-15 ${darkMode ? 'bg-gray-900 dark' : 'bg-white'}`}>
      <HeaderNavBar />
      <div className="p-4 sm:p-6">
        <div className="max-w-4xl mx-auto">
          <h1 className={`text-2xl font-bold mb-6 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            Admin Utilities
          </h1>
          <p className={`mb-8 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
            Access transactional utilities for system administration.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {utilities.map((utility, index) => (
              <Link
                key={index}
                href={utility.href}
                className={`block p-6 rounded-lg border transition-all duration-200 hover:shadow-lg ${
                  darkMode
                    ? 'bg-gray-800 border-gray-700 hover:bg-gray-750'
                    : 'bg-white border-gray-200 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <utility.icon className={`h-6 w-6 ${darkMode ? 'text-blue-400' : 'text-blue-600'}`} />
                    <div>
                      <h3 className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                        {utility.name}
                      </h3>
                      <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                        {utility.description}
                      </p>
                    </div>
                  </div>
                  <ArrowRight className={`h-5 w-5 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} />
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}