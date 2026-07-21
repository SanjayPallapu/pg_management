import type { ButtonHTMLAttributes, ReactNode } from "react";
import { motion } from "framer-motion";
import { ArrowRight, Loader2 } from "lucide-react";
import { Haptics, ImpactStyle } from "@capacitor/haptics";

type PGHubButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  variant?: "primary" | "outline";
  loading?: boolean;
  showArrow?: boolean;
};

export function PGHubButton({
  children,
  variant = "primary",
  loading = false,
  showArrow = false,
  disabled,
  onClick,
  className = "",
  ...props
}: PGHubButtonProps) {
  return (
    <motion.div className="pgh-button-motion" whileTap={{ scale: disabled || loading ? 1 : 0.975 }}>
      <button
        {...props}
        type={props.type ?? "button"}
        className={`pgh-button pgh-button--${variant} ${className}`}
        disabled={disabled || loading}
        onClick={(event) => {
          void Haptics.impact({ style: ImpactStyle.Light }).catch(() => undefined);
          onClick?.(event);
        }}
      >
        <span className="pgh-button__shimmer" aria-hidden="true" />
        {loading ? <Loader2 className="pgh-spin" size={20} /> : children}
        {!loading && showArrow && <ArrowRight size={20} />}
      </button>
    </motion.div>
  );
}
