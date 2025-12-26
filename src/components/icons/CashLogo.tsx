import { motion } from 'framer-motion';

export const CashLogo = ({ className = "h-6 w-6" }: { className?: string }) => {
  return (
    <motion.svg
      viewBox="0 0 80 60"
      className={className}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      {/* Back bill (bottom) */}
      <motion.g
        initial={{ y: 10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.2 }}
      >
        <rect x="10" y="28" width="55" height="28" rx="3" fill="#4CAF50" />
        <rect x="12" y="30" width="51" height="24" rx="2" fill="#66BB6A" stroke="#2E7D32" strokeWidth="1" />
        <circle cx="37.5" cy="42" r="8" fill="#4CAF50" stroke="#2E7D32" strokeWidth="1" />
        <text x="37.5" y="46" fontSize="10" fontWeight="bold" fill="#2E7D32" textAnchor="middle">$</text>
      </motion.g>
      
      {/* Front bill (top) */}
      <motion.g
        initial={{ y: -10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.1 }}
      >
        <rect x="5" y="12" width="55" height="28" rx="3" fill="#4CAF50" />
        <rect x="7" y="14" width="51" height="24" rx="2" fill="#81C784" stroke="#388E3C" strokeWidth="1" />
        <circle cx="32.5" cy="26" r="8" fill="#66BB6A" stroke="#388E3C" strokeWidth="1" />
        <text x="32.5" y="30" fontSize="10" fontWeight="bold" fill="#2E7D32" textAnchor="middle">$</text>
      </motion.g>
      
      {/* Coin stack on right */}
      <motion.g
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ duration: 0.3, delay: 0.4 }}
      >
        <ellipse cx="65" cy="45" rx="10" ry="5" fill="#8D6E63" />
        <ellipse cx="65" cy="42" rx="10" ry="5" fill="#A1887F" />
        <ellipse cx="65" cy="39" rx="10" ry="5" fill="#BCAAA4" />
        <ellipse cx="65" cy="36" rx="10" ry="5" fill="#D7CCC8" stroke="#8D6E63" strokeWidth="0.5" />
      </motion.g>
    </motion.svg>
  );
};
