import type { ButtonHTMLAttributes, ReactNode } from "react";
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
    <div className="pgh-button-motion">
      <button
        {...props}
        type={props.type ?? "button"}
        className={`pgh-button pgh-button--${variant} ${className}`}
        disabled={disabled || loading}
        onClick={(event) => {
          if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
            try { navigator.vibrate(10); } catch { /* ignore */ }
          }
          void Haptics.impact({ style: ImpactStyle.Light }).catch(() => undefined);
          onClick?.(event);
        }}
      >
        {loading ? <Loader2 className="pgh-spin" size={20} /> : children}
        {!loading && showArrow && <ArrowRight size={20} />}
      </button>
    </div>
  );
}
