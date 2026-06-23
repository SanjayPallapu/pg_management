import { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { BottomNav } from './BottomNav';

interface AppLayoutProps {
  children: ReactNode;
  /** Page title shown in the header */
  title?: string;
  /** Show back button (default: true) */
  showBack?: boolean;
  /** Show bottom nav (default: true) */
  showBottomNav?: boolean;
  /** Extra header actions on the right */
  headerActions?: ReactNode;
}

export const AppLayout = ({
  children,
  title,
  showBack = true,
  showBottomNav = true,
  headerActions,
}: AppLayoutProps) => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      {/* Header with back button */}
      {(showBack || title || headerActions) && (
        <header className="sticky top-0 z-40 border-b border-border/70 bg-background/95 backdrop-blur-xl">
          <div className="flex h-14 items-center gap-3 px-4">
            {showBack && (
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="flex h-9 w-9 items-center justify-center rounded-xl text-muted-foreground hover:bg-muted/60 hover:text-foreground transition-colors"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
            )}
            {title && (
              <h1 className="text-lg font-semibold truncate">{title}</h1>
            )}
            {headerActions && (
              <div className="ml-auto flex items-center gap-2">
                {headerActions}
              </div>
            )}
          </div>
        </header>
      )}

      {/* Page content with bottom padding for nav */}
      <div className={showBottomNav ? 'pb-[calc(5rem+env(safe-area-inset-bottom))]' : ''}>
        {children}
      </div>

      {/* Bottom navigation */}
      {showBottomNav && <BottomNav />}
    </div>
  );
};
