import { motion } from "framer-motion";

export const StatCard = ({ title, value, icon: Icon, colorClass, delay }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
      className="group relative overflow-hidden rounded-xl bg-glass-bg/50 backdrop-blur-glass border border-glass-border p-6 shadow-glass hover:shadow-hover transition-all duration-300"
    >
      {/* Gradient overlay on hover */}
      <div className={`absolute inset-0 bg-gradient-to-br ${colorClass} opacity-0 group-hover:opacity-5 transition-opacity duration-300`} />
      
      <div className="relative flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-muted-foreground mb-1">{title}</p>
          <motion.p
            initial={{ scale: 0.5 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.5, delay: delay + 0.2 }}
            className="text-3xl font-bold text-foreground"
          >
            {value}
          </motion.p>
        </div>
        
        <motion.div
          whileHover={{ rotate: 360, scale: 1.1 }}
          transition={{ duration: 0.6, ease: "easeInOut" }}
          className={`p-3 rounded-lg ${colorClass} bg-opacity-10`}
        >
          <Icon className={`h-6 w-6 ${colorClass.replace('from-', 'text-').replace('to-', '').split(' ')[0]}`} />
        </motion.div>
      </div>
      
      {/* Decorative element */}
      <div className={`absolute -right-8 -bottom-8 w-24 h-24 rounded-full ${colorClass} opacity-5 blur-2xl group-hover:opacity-10 transition-opacity duration-300`} />
    </motion.div>
  );
};
