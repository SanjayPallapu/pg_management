import { useEffect, type ReactNode } from "react";
import { motion } from "framer-motion";
import "./pg-hub.css";

type PGHubShellProps = {
  children: ReactNode;
  variant?: "dark" | "light";
  className?: string;
  disableMotion?: boolean;
};

export function PGHubShell({ children, variant = "light", className = "", disableMotion = false }: PGHubShellProps) {
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, []);

  if (disableMotion) {
    return (
      <main className={`pgh-shell pgh-shell--${variant} ${className}`}>
        <div className="pgh-safe-area">{children}</div>
      </main>
    );
  }

  return (
    <main className={`pgh-shell pgh-shell--${variant} ${className}`}>
      <motion.div
        className="pgh-safe-area"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: .38, ease: [0.22, 1, 0.36, 1] }}
      >
        {variant === "dark" && (
          <div className="pgh-orbs" aria-hidden="true">
            <motion.span
              className="pgh-orb pgh-orb--one"
              animate={{ x: [0, 28, -8, 0], y: [0, 20, -16, 0], scale: [1, 1.08, 0.98, 1] }}
              transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
            />
            <motion.span
              className="pgh-orb pgh-orb--two"
              animate={{ x: [0, -24, 12, 0], y: [0, -18, 22, 0], scale: [1, 0.94, 1.06, 1] }}
              transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
            />
          </div>
        )}
        {children}
      </motion.div>
    </main>
  );
}
