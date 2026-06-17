import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEffect, useState, useRef } from "react";
import { cn } from "@/lib/utils";
import { useTheme } from "@/components/ThemeProvider";
import { gsap } from "gsap";

interface ThemeToggleProps {
  className?: string;
}

export function ThemeToggle({ className }: ThemeToggleProps) {
  const [mounted, setMounted] = useState(false);
  const { theme, setTheme } = useTheme();
  const iconRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === "dark" ? "light" : "dark";
    
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!prefersReducedMotion && iconRef.current) {
      // 180-degree rotation and scale-bounce effect using GSAP
      gsap.fromTo(iconRef.current, 
        { rotate: 0, scale: 0.8, opacity: 0.5 },
        { rotate: 180, scale: 1, opacity: 1, duration: 0.4, ease: "back.out(1.8)" }
      );
    }
    
    setTheme(nextTheme);
  };

  if (!mounted) {
    return (
      <Button variant="ghost" size="icon" className={cn("relative h-9 w-9 rounded-full", className)}>
        <span className="sr-only">Toggle theme</span>
      </Button>
    );
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleTheme}
      className={cn("relative h-9 w-9 rounded-full overflow-hidden hover:bg-muted/50 transition-colors", className)}
    >
      <div ref={iconRef} className="flex items-center justify-center">
        {theme === "dark" ? (
          <Moon className="h-5 w-5 text-foreground" />
        ) : (
          <Sun className="h-5 w-5 text-foreground" />
        )}
      </div>
      <span className="sr-only">Toggle theme</span>
    </Button>
  );
}
