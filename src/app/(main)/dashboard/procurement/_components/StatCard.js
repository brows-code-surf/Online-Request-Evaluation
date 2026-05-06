import { motion } from "framer-motion";
import { LineChart, Line, ResponsiveContainer } from "recharts";
import { TrendingUp, TrendingDown } from "lucide-react";

export const StatCard = ({ title, value, icon: Icon, colorClass, delay, sparklineData, percentChange, darkMode, subtitle, loading = false }) => {
  const isPositive = percentChange !== undefined && percentChange !== null ? percentChange >= 0 : true;
  const TrendIcon = isPositive ? TrendingUp : TrendingDown;

  if (loading) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay }}
        className={`relative overflow-hidden rounded-2xl ${darkMode ? 'bg-gray-800' : 'bg-white'} backdrop-blur-sm border ${darkMode ? 'border-gray-700' : 'border-gray-200'} p-3 sm:p-4 shadow-sm`}
      >
        <div className="animate-pulse">
          <div className="flex items-start justify-between mb-2 sm:mb-3">
            <div className="flex-1 min-w-0">
              <div className={`h-3 ${darkMode ? 'bg-gray-700' : 'bg-gray-200'} rounded mb-2`}></div>
              <div className={`h-6 sm:h-8 ${darkMode ? 'bg-gray-700' : 'bg-gray-200'} rounded mb-1`}></div>
              <div className={`h-3 ${darkMode ? 'bg-gray-700' : 'bg-gray-200'} rounded w-3/4`}></div>
            </div>
            <div className={`w-6 h-6 sm:w-8 sm:h-8 ${darkMode ? 'bg-gray-700' : 'bg-gray-200'} rounded-lg`}></div>
          </div>
          <div className="flex items-center justify-between">
            <div className={`h-3 ${darkMode ? 'bg-gray-700' : 'bg-gray-200'} rounded w-1/2`}></div>
            <div className={`w-12 sm:w-16 h-5 sm:h-6 ${darkMode ? 'bg-gray-700' : 'bg-gray-200'} rounded`}></div>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
      className={`group relative overflow-hidden rounded-2xl ${darkMode ? 'bg-gray-800' : 'bg-white'} backdrop-blur-sm border ${darkMode ? 'border-gray-700' : 'border-gray-200'} p-3 sm:p-4 shadow-sm hover:shadow-lg transition-all duration-300`}
    >
      {/* Gradient overlay on hover */}
      <div className={`absolute inset-0 bg-gradient-to-br ${colorClass} opacity-0 group-hover:opacity-5 transition-opacity duration-300`} />

      <div className="relative">
        <div className="flex items-start justify-between mb-2 sm:mb-3">
          <div className="flex-1 min-w-0">
            <p className={`text-xs font-medium ${darkMode ? 'text-gray-300' : 'text-gray-600'} mb-1 truncate`}>{title}</p>
            <motion.p
              initial={{ scale: 0.5 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.5, delay: delay + 0.2 }}
              className={`text-xl sm:text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}
            >
              {typeof value === 'string' ? value : (value !== undefined && value !== null ? value.toLocaleString() : '0')}
            </motion.p>
            {subtitle && (
              <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'} mt-1 truncate`}>
                {subtitle}
              </p>
            )}
          </div>

          <motion.div
            whileHover={{ rotate: 360, scale: 1.1 }}
            transition={{ duration: 0.6, ease: "easeInOut" }}
            className={`p-1.5 sm:p-2 rounded-lg bg-gradient-to-br ${colorClass} bg-opacity-10 flex-shrink-0`}
          >
            <Icon className={`h-3 w-3 sm:h-4 sm:w-4 text-white`} />
          </motion.div>
        </div>

        {(sparklineData && percentChange !== undefined && percentChange !== null) && (
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-1 min-w-0 flex-1">
              <TrendIcon className={`h-3 w-3 flex-shrink-0 ${isPositive ? 'text-green-500' : 'text-red-500'}`} />
              <span className={`text-xs font-medium truncate ${isPositive ? 'text-green-500' : 'text-red-500'}`}>
                {isPositive ? '+' : ''}{percentChange.toFixed(1)}%
              </span>
            </div>

            <div className="w-12 sm:w-16 h-5 sm:h-6 flex-shrink-0 ml-2">
              <ResponsiveContainer width="100%" height="100%" minWidth={48} minHeight={20}>
                <LineChart data={sparklineData.map((value, index) => ({ value }))}>
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke={isPositive ? '#10b981' : '#ef4444'}
                    strokeWidth={1.5}
                    dot={false}
                    activeDot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>

      {/* Decorative element */}
      <div className={`absolute -right-2 sm:-right-4 -bottom-2 sm:-bottom-4 w-8 h-8 sm:w-12 sm:h-12 rounded-full ${colorClass} opacity-5 blur-xl group-hover:opacity-10 transition-opacity duration-300`} />
    </motion.div>
  );
};
