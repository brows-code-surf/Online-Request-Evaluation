import { motion } from "framer-motion";

export const ChartCard = ({ title, children, delay }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      className="group relative overflow-hidden rounded-xl bg-glass-bg/70 backdrop-blur-glass border border-glass-border p-6 shadow-glass hover:shadow-hover transition-all duration-300"
    >
      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-accent/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      
      <div className="relative">
        <h2 className="text-xl font-semibold text-foreground mb-6">{title}</h2>
        {children}
      </div>
    </motion.div>
  );
};
