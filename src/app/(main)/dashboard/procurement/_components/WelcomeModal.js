'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles } from 'lucide-react';
import { useAuth } from '@/utils/authContext';

export const WelcomeModal = ({ isOpen, onClose }) => {
  const { user, darkMode } = useAuth();
  const [currentTime, setCurrentTime] = useState('');

  useEffect(() => {
    // Update time every second for live greeting
    const updateTime = () => {
      const now = new Date();
      const hours = now.getHours();
      let greeting = 'Good morning';

      if (hours >= 12 && hours < 17) {
        greeting = 'Good afternoon';
      } else if (hours >= 17) {
        greeting = 'Good evening';
      }

      setCurrentTime(greeting);
    };

    updateTime();
    const interval = setInterval(updateTime, 60000); // Update every minute

    return () => clearInterval(interval);
  }, []);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.8, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.8, y: 20 }}
          transition={{
            type: "spring",
            stiffness: 300,
            damping: 30,
            duration: 0.3
          }}
          className={`relative max-w-md w-full ${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-2xl shadow-2xl overflow-hidden`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Gradient background */}
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500 via-purple-500 to-green-400 opacity-10" />

          {/* Close button */}
          <button
            onClick={onClose}
            className={`absolute top-4 right-4 p-2 rounded-full transition-colors ${
              darkMode
                ? 'hover:bg-gray-700 text-gray-400 hover:text-white'
                : 'hover:bg-gray-100 text-gray-500 hover:text-gray-700'
            }`}
          >
            <X className="h-5 w-5" />
          </button>

          <div className="relative p-8">
            {/* Icon */}
            <div className="flex justify-center mb-6">
              <div className="p-4 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full">
                <Sparkles className="h-8 w-8 text-white" />
              </div>
            </div>

            {/* Content */}
            <div className="text-center">
              <h2 className={`text-2xl font-bold mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                Welcome back!
              </h2>

              <p className={`text-lg mb-4 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                {currentTime}, {user?.empName?.split(' ')[0] || 'User'}!
              </p>

              <p className={`text-sm mb-6 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                We're glad to see you today. Have a productive day ahead!
              </p>

              {/* Action buttons */}
              <div className="flex gap-3 justify-center">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={onClose}
                  className="px-6 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-medium rounded-lg shadow-lg hover:shadow-xl transition-all duration-200"
                >
                  Get Started
                </motion.button>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
