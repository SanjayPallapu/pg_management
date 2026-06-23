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
    <div className="flex flex-col h-screen bg-background">
      {/* Header with back button */}
      {(showBack || title || headerActions) && (
        <header className="shrink-0 border-b border-border/70 bg-background/95 backdrop-blur-xl z-40">
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

      {/* Page content - scrollable */}
      <div className="flex-1 overflow-y-auto">
        {children}
      </div>

      {/* Bottom navigation - always at bottom */}
      {showBottomNav && <BottomNav />}
    </div>
  );
};
