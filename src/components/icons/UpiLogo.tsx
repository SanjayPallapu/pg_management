import { motion } from 'framer-motion';

export const UpiLogo = ({ className = "h-6 w-6" }: { className?: string }) => {
  return (
    <motion.svg
      viewBox="0 0 120 50"
      className={className}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      {/* UPI Text - Stylized like the official logo */}
      <motion.text
        x="5"
        y="35"
        fontSize="32"
        fontWeight="bold"
        fill="#5f6368"
        fontFamily="Arial, sans-serif"
        initial={{ x: -20, opacity: 0 }}
        animate={{ x: 5, opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        UPI
      </motion.text>
      
      {/* Triangle shapes - Orange, Green, Light Green */}
      <motion.g
        initial={{ x: 20, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        {/* Orange triangle (top) */}
        <motion.polygon
          points="75,8 95,8 85,22"
          fill="#F47920"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.3, delay: 0.3 }}
        />
        
        {/* Green triangle (middle-right) */}
        <motion.polygon
          points="85,12 105,12 95,26"
          fill="#00843D"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.3, delay: 0.4 }}
        />
        
        {/* Light green triangle (bottom) */}
        <motion.polygon
          points="95,16 115,16 105,30"
          fill="#8CC63F"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.3, delay: 0.5 }}
        />
      </motion.g>
    </motion.svg>
  );
};
