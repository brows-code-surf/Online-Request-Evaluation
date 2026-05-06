import { motion } from "framer-motion";

export const ChartCard = ({ title, children, delay, className = "", darkMode, loading = false, loadingHeight = 175 }) => {
  if (loading) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay }}
        className={`group relative overflow-hidden rounded-xl ${darkMode ? 'bg-gray-800' : 'bg-white'} backdrop-blur-sm border ${darkMode ? 'border-gray-700' : 'border-gray-200'} p-4 sm:p-6 shadow-lg ${className}`}
      >
        <div className="animate-pulse">
          <div className={`h-4 sm:h-6 ${darkMode ? 'bg-gray-700' : 'bg-gray-200'} rounded mb-4 sm:mb-6`}></div>
          <div className={`${darkMode ? 'bg-gray-700' : 'bg-gray-200'} rounded`} style={{ height: `${loadingHeight}px` }}></div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      className={`group relative overflow-hidden rounded-xl ${darkMode ? 'bg-gray-800' : 'bg-white'} backdrop-blur-sm border ${darkMode ? 'border-gray-700' : 'border-gray-200'} p-4 sm:p-6 shadow-lg hover:shadow-xl transition-all duration-300 ${className}`}
    >
      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

      <div className="relative">
        <h2 className={`text-sm sm:text-base lg:text-xl font-semibold ${darkMode ? 'text-white' : 'text-gray-900'} mb-4 sm:mb-6`}>{title}</h2>
        {children}
      </div>
    </motion.div>
  );
};
