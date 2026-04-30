'use client';

import Link from 'next/link';
import { useAuth } from '@/utils/authContext';
import HeaderNavBar from '@/app/_components/headerNavBar.js';
import { ArrowRight, Settings } from 'lucide-react';

export default function AdminUtilities() {
  const { darkMode } = useAuth();

  const utilities = [
    {
      name: 'Receiving Entries Utility',
      description: 'Manage and edit receiving transactions',
      href: '/system-utilities/admin-utilities/receiving-utilities',
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
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h1 className={`text-3xl md:text-4xl font-bold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              Admin Utilities
            </h1>
            <p className={`text-lg max-w-2xl mx-auto ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
              Access transactional utilities for system administration. Manage receiving entries and distribution accounts efficiently.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {utilities.map((utility, index) => (
              <Link
                key={index}
                href={utility.href}
                className={`group block p-8 rounded-2xl border-2 transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 focus:outline-none focus:ring-4 focus:ring-blue-300 ${
                  darkMode
                    ? 'bg-gradient-to-br from-gray-800 to-gray-850 border-gray-700 hover:border-gray-600 hover:shadow-gray-900/50'
                    : 'bg-gradient-to-br from-white to-gray-50 border-gray-200 hover:border-blue-300 hover:shadow-gray-200/50'
                }`}
                aria-label={`Navigate to ${utility.name}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-4">
                    <div className={`p-3 rounded-xl ${darkMode ? 'bg-blue-600/20' : 'bg-blue-100'}`}>
                      <utility.icon className={`h-8 w-8 ${darkMode ? 'text-blue-400' : 'text-blue-600'}`} />
                    </div>
                    <div className="flex-1">
                      <h3 className={`text-xl font-bold mb-2 ${darkMode ? 'text-white' : 'text-gray-900'} group-hover:text-blue-600 transition-colors`}>
                        {utility.name}
                      </h3>
                      <p className={`text-base leading-relaxed ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                        {utility.description}
                      </p>
                    </div>
                  </div>
                  <ArrowRight className={`h-6 w-6 transition-transform group-hover:translate-x-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} />
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}