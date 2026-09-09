import { useState, useEffect, useMemo } from 'react';
import { Building2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface PropertyLogoProps {
  name?: string;
  logoUrl?: string | null;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  showBadge?: boolean;
}

const GRADIENTS = [
  'from-blue-600 via-indigo-600 to-violet-700',
  'from-emerald-600 via-teal-600 to-cyan-700',
  'from-amber-600 via-orange-600 to-rose-600',
  'from-purple-600 via-fuchsia-600 to-pink-600',
  'from-sky-600 via-blue-700 to-indigo-800',
  'from-teal-600 via-emerald-600 to-green-700',
];

export const PropertyLogo = ({
  name = 'Property',
  logoUrl,
  size = 'md',
  className,
  showBadge = true,
}: PropertyLogoProps) => {
  const [imageError, setImageError] = useState(false);

  // Reset error if URL changes
  useEffect(() => {
    setImageError(false);
  }, [logoUrl]);

  // Generate deterministic gradient based on property name
  const gradientClass = useMemo(() => {
    let hash = 0;
    const cleanName = (name || '').trim();
    for (let i = 0; i < cleanName.length; i++) {
      hash = cleanName.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % GRADIENTS.length;
    return GRADIENTS[index];
  }, [name]);

  // Generate 1-2 character initials
  const initials = useMemo(() => {
    const clean = (name || 'Property').trim();
    const words = clean.split(/\s+/).filter(Boolean);
    if (words.length >= 2) {
      return (words[0][0] + words[1][0]).toUpperCase();
    }
    return clean.slice(0, 2).toUpperCase();
  }, [name]);

  const sizeClasses = {
    xs: 'h-6 w-6 text-[10px] rounded-md',
    sm: 'h-7 w-7 text-xs rounded-lg',
    md: 'h-10 w-10 text-sm sm:text-base rounded-xl',
    lg: 'h-12 w-12 text-base rounded-2xl',
    xl: 'h-16 w-16 text-xl rounded-2xl',
  };

  const badgeSizeClasses = {
    xs: 'h-2 w-2',
    sm: 'h-2.5 w-2.5',
    md: 'h-3.5 w-3.5',
    lg: 'h-4 w-4',
    xl: 'h-5 w-5',
  };

  // If valid custom logo URL exists and hasn't failed to load
  if (logoUrl && !imageError) {
    return (
      <div
        className={cn(
          'relative overflow-hidden bg-background border border-border/80 flex items-center justify-center shrink-0 shadow-xs',
          sizeClasses[size],
          className
        )}
        title={name}
      >
        <img
          src={logoUrl}
          alt={name}
          onError={() => setImageError(true)}
          className="h-full w-full object-contain p-0.5"
        />
      </div>
    );
  }

  // Fallback: Elegant Property Badge with Initials & Building Icon
  return (
    <div
      className={cn(
        'relative overflow-hidden bg-gradient-to-br text-white font-extrabold flex items-center justify-center shrink-0 shadow-xs border border-white/20 select-none tracking-tight',
        gradientClass,
        sizeClasses[size],
        className
      )}
      title={name}
    >
      <span className="leading-none drop-shadow-xs">{initials}</span>
      {showBadge && (
        <Building2
          className={cn(
            'absolute bottom-0.5 right-0.5 opacity-35 text-white pointer-events-none',
            badgeSizeClasses[size]
          )}
        />
      )}
    </div>
  );
};
