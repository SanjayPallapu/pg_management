import { motion } from 'framer-motion';

export const UpiLogo = ({ className = "h-6 w-6" }: { className?: string }) => {
  return (
    <motion.svg
      viewBox="0 0 100 100"
      className={className}
      initial={{ scale: 0.9 }}
      animate={{ scale: [0.9, 1, 0.9] }}
      transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
    >
      {/* UPI Logo - Stylized */}
      <defs>
        <linearGradient id="upiGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#097969" />
          <stop offset="50%" stopColor="#40916c" />
          <stop offset="100%" stopColor="#52b788" />
        </linearGradient>
      </defs>
      
      {/* Background circle */}
      <motion.circle
        cx="50"
        cy="50"
        r="45"
        fill="url(#upiGradient)"
        initial={{ opacity: 0.8 }}
        animate={{ opacity: [0.8, 1, 0.8] }}
        transition={{ duration: 1.5, repeat: Infinity }}
      />
      
      {/* U letter */}
      <motion.path
        d="M25 30 L25 55 Q25 70 35 70 Q45 70 45 55 L45 30"
        fill="none"
        stroke="white"
        strokeWidth="6"
        strokeLinecap="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 1, delay: 0.2 }}
      />
      
      {/* P letter */}
      <motion.path
        d="M52 30 L52 70 M52 30 L65 30 Q75 30 75 42 Q75 54 65 54 L52 54"
        fill="none"
        stroke="white"
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 1, delay: 0.4 }}
      />
      
      {/* I letter with dot animation */}
      <motion.line
        x1="82"
        y1="38"
        x2="82"
        y2="70"
        stroke="white"
        strokeWidth="6"
        strokeLinecap="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.5, delay: 0.6 }}
      />
      
      {/* Dot on I with pulse */}
      <motion.circle
        cx="82"
        cy="28"
        r="4"
        fill="white"
        initial={{ scale: 0 }}
        animate={{ scale: [1, 1.3, 1] }}
        transition={{ duration: 1, repeat: Infinity, delay: 0.8 }}
      />
    </motion.svg>
  );
};
