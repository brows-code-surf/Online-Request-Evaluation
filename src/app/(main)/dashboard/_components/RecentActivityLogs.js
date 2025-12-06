import { motion } from "framer-motion";
import { Clock, Activity as ActivityIcon } from "lucide-react";

export const RecentActivityLogs = ({ logs, delay }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      className="group relative overflow-hidden rounded-2xl bg-white/50 backdrop-blur-sm border border-gray-200/50 p-4 shadow-sm hover:shadow-lg transition-all duration-300"
    >
      <div className="relative">
        <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center">
          <ActivityIcon className="h-4 w-4 mr-2" />
          Recent Activity Logs
        </h3>

        <div className="space-y-2 max-h-64 overflow-y-auto">
          {logs.slice(0, 10).map((log, index) => (
            <motion.div
              key={log.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: delay + index * 0.1 }}
              className="flex items-start space-x-3 p-2 rounded-lg hover:bg-gray-50/50 transition-colors duration-200"
            >
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-green-400 to-blue-500 flex items-center justify-center text-white text-xs font-medium">
                <ActivityIcon className="h-4 w-4" />
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-900 leading-tight">
                  {log.activity}
                </p>
                <div className="flex items-center space-x-1 mt-1">
                  <Clock className="h-3 w-3 text-gray-400" />
                  <p className="text-xs text-gray-500">
                    {log.createdBy} • {log.dateCreated ? new Date(log.dateCreated).toLocaleString('en-US', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit'
                    }) : 'Unknown'}
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
