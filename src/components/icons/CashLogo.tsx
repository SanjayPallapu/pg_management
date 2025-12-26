import { motion } from 'framer-motion';

export const CashLogo = ({ className = "h-6 w-6" }: { className?: string }) => {
  return (
    <motion.svg
      viewBox="0 0 100 100"
      className={className}
      initial={{ rotate: 0 }}
      animate={{ rotate: [0, -2, 2, 0] }}
      transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
    >
      <defs>
        <linearGradient id="cashGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#4ade80" />
          <stop offset="50%" stopColor="#22c55e" />
          <stop offset="100%" stopColor="#16a34a" />
        </linearGradient>
        <linearGradient id="noteGradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#dcfce7" />
          <stop offset="100%" stopColor="#86efac" />
        </linearGradient>
      </defs>
      
      {/* Back note */}
      <motion.rect
        x="15"
        y="28"
        width="70"
        height="44"
        rx="4"
        fill="#15803d"
        initial={{ x: 15 }}
        animate={{ x: [15, 18, 15] }}
        transition={{ duration: 2, repeat: Infinity }}
      />
      
      {/* Front note */}
      <motion.rect
        x="10"
        y="32"
        width="70"
        height="44"
        rx="4"
        fill="url(#noteGradient)"
        stroke="#16a34a"
        strokeWidth="2"
        initial={{ y: 32 }}
        animate={{ y: [32, 30, 32] }}
        transition={{ duration: 1.5, repeat: Infinity }}
      />
      
      {/* Rupee symbol circle */}
      <motion.circle
        cx="45"
        cy="54"
        r="16"
        fill="url(#cashGradient)"
        initial={{ scale: 1 }}
        animate={{ scale: [1, 1.05, 1] }}
        transition={{ duration: 1, repeat: Infinity }}
      />
      
      {/* Rupee symbol ₹ */}
      <motion.g
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
      >
        {/* Top horizontal line */}
        <motion.line
          x1="37"
          y1="46"
          x2="53"
          y2="46"
          stroke="white"
          strokeWidth="3"
          strokeLinecap="round"
        />
        {/* Middle horizontal line */}
        <motion.line
          x1="37"
          y1="52"
          x2="53"
          y2="52"
          stroke="white"
          strokeWidth="3"
          strokeLinecap="round"
        />
        {/* Vertical stem */}
        <motion.path
          d="M40 46 L40 52 L50 64"
          fill="none"
          stroke="white"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.8, delay: 0.5 }}
        />
      </motion.g>
      
      {/* Sparkle effects */}
      <motion.circle
        cx="70"
        cy="38"
        r="2"
        fill="#fbbf24"
        initial={{ opacity: 0, scale: 0 }}
        animate={{ opacity: [0, 1, 0], scale: [0, 1, 0] }}
        transition={{ duration: 1.5, repeat: Infinity, delay: 0.5 }}
      />
      <motion.circle
        cx="65"
        cy="68"
        r="1.5"
        fill="#fbbf24"
        initial={{ opacity: 0, scale: 0 }}
        animate={{ opacity: [0, 1, 0], scale: [0, 1, 0] }}
        transition={{ duration: 1.5, repeat: Infinity, delay: 1 }}
      />
    </motion.svg>
  );
};
