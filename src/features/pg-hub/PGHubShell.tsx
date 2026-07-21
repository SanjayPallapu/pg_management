import { useEffect, type ReactNode } from "react";
import "./pg-hub.css";

type PGHubShellProps = {
  children: ReactNode;
  variant?: "dark" | "light";
  className?: string;
};

export function PGHubShell({ children, variant = "light", className = "" }: PGHubShellProps) {
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, []);

  return (
    <main className={`pgh-shell pgh-shell--${variant} ${className}`}>
      <div className="pgh-safe-area">
        {variant === "dark" && (
          <div className="pgh-orbs" aria-hidden="true">
            <span className="pgh-orb pgh-orb--one" />
            <span className="pgh-orb pgh-orb--two" />
          </div>
        )}
        {children}
      </div>
    </main>
  );
}
