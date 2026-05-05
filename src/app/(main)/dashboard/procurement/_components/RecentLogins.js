import { motion } from "framer-motion";
import { Clock, User } from "lucide-react";

const formatDateTime = (date) => {
    if (!date) return '-';
    return new Date(date).toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'UTC'
    });
};

export const RecentLogins = ({ users, delay, darkMode }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      className={`group relative overflow-hidden rounded-2xl ${darkMode ? 'bg-gray-800' : 'bg-white'} backdrop-blur-sm border ${darkMode ? 'border-gray-700' : 'border-gray-200'} p-4 shadow-sm hover:shadow-lg transition-all duration-300`}
    >
      <div className="relative">
        <h3 className={`text-sm font-semibold ${darkMode ? 'text-white' : 'text-gray-900'} mb-3 flex items-center`}>
          <User className="h-4 w-4 mr-2" />
          Recently Logged In Users
        </h3>

        <div className="space-y-2 max-h-64 overflow-y-auto">
          {users.slice(0, 10).map((user, index) => (
            <motion.div
              key={user.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: delay + index * 0.1 }}
              className={`flex items-center space-x-3 p-2 rounded-lg hover:${darkMode ? 'bg-gray-700/50' : 'bg-gray-50/50'} transition-colors duration-200`}
            >
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white text-xs font-medium">
                {user.name.split(' ').map(n => n[0]).join('')}
              </div>

              <div className="flex-1 min-w-0">
                <p className={`text-xs font-medium ${darkMode ? 'text-white' : 'text-gray-900'} truncate`}>
                  {user.name}
                </p>
                <div className="flex items-center space-x-1">
                  <Clock className={`h-3 w-3 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`} />
                  <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'} truncate`}>
                    {formatDateTime(user.lastLogin) || 'Never'}
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.div>
  );
};
