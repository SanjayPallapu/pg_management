import { useNavigate, useLocation } from 'react-router-dom';
import { useRef, useEffect, useState } from 'react';
import {
  LayoutDashboard,
  Building,
  Receipt,
  Settings,
} from 'lucide-react';
import { useActiveTab } from '@/contexts/ActiveTabContext';
import { useRent } from '@/contexts/RentContext';

const NAV_ITEMS = [
  { value: 'dashboard', label: 'Home', icon: LayoutDashboard, path: '/' },
  { value: 'rooms', label: 'Rooms', icon: Building, path: '/?tab=rooms' },
  { value: 'rent-sheet', label: 'Rent', icon: Receipt, path: '/?tab=rent-sheet' },
  { value: 'settings', label: 'Settings', icon: Settings, path: '/?tab=settings' },
];

interface BottomNavProps {
  /** When used inside Index.tsx, pass the active tab and setter for in-page tab switching */
  activeTab?: string;
  onTabChange?: (tab: string) => void;
  visible?: boolean;
  rentCollected?: number;
  pendingRent?: number;
}

export const BottomNav = ({ activeTab: propActiveTab, onTabChange, visible = true, rentCollected, pendingRent }: BottomNavProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { activeTab: contextActiveTab, setActiveTab: setContextTab } = useActiveTab();
  const navRef = useRef<HTMLElement>(null);
  const [navHeight, setNavHeight] = useState(0);

  // Scroll visibility management (works globally across all pages, scroll containers, and sheets)
  const [internalVisible, setInternalVisible] = useState(true);
  const lastScrollTopMap = useRef<Map<HTMLElement, number>>(new Map());

  const isOnIndex = location.pathname === '/';
  // Use prop if provided (Index.tsx), otherwise use context (dialogs/sheets/sub-pages)
  const currentTab = propActiveTab ?? contextActiveTab;

  // Try to use RentContext to get collected/pending rent statistics on deep sub-pages and sheets
  let contextCollected: number | undefined;
  let contextPending: number | undefined;
  try {
    const rentContext = useRent();
    if (rentContext) {
      contextCollected = rentContext.getTotalCollected();
      contextPending = rentContext.getTotalPending();
    }
  } catch (e) {
    // Silently fall back if called outside RentProvider (e.g. auth/landing pages)
  }

  const finalCollected = rentCollected !== undefined ? rentCollected : contextCollected;
  const finalPending = pendingRent !== undefined ? pendingRent : contextPending;
  const showBanner = finalCollected !== undefined && finalPending !== undefined;

  // Measure nav height so the status banner knows where to position itself
  useEffect(() => {
    if (navRef.current) {
      const resizeObserver = new ResizeObserver((entries) => {
        for (const entry of entries) {
          setNavHeight(entry.contentRect.height + entry.target.getBoundingClientRect().height - entry.contentRect.height);
        }
      });
      resizeObserver.observe(navRef.current);
      setNavHeight(navRef.current.getBoundingClientRect().height);
      return () => resizeObserver.disconnect();
    }
  }, []);

  // Global Capturing Scroll Listener: detects scroll direction inside ANY container (including Radix UI sheets)
  useEffect(() => {
    const handleGlobalScroll = (event: Event) => {
      const target = event.target as HTMLElement;
      if (!target || !(target instanceof HTMLElement)) return;

      // Ensure we only respond to scrollable vertical containers
      const isScrollable = target.scrollHeight > target.clientHeight;
      if (!isScrollable) return;

      const currentScrollY = target.scrollTop;
      const lastScrollY = lastScrollTopMap.current.get(target) ?? 0;
      const delta = currentScrollY - lastScrollY;

      // Respond instantly to scroll direction with a tiny threshold
      if (currentScrollY < 10) {
        setInternalVisible(true);
      } else if (delta > 2) {
        setInternalVisible(false);
      } else if (delta < -2) {
        setInternalVisible(true);
      }
      lastScrollTopMap.current.set(target, currentScrollY);
    };

    // Use capturing phase (true) to intercept scroll events inside portal sheets/dialogs
    window.addEventListener('scroll', handleGlobalScroll, true);
    return () => {
      window.removeEventListener('scroll', handleGlobalScroll, true);
    };
  }, []);

  const handleClick = (item: typeof NAV_ITEMS[0]) => {
    setContextTab(item.value);
    if (isOnIndex && onTabChange) {
      onTabChange(item.value);
    }
    // Always navigate — this will cause React to re-render and close any open dialogs
    navigate(`/?tab=${item.value}`, { replace: true });
    
    // Dispatch tab-click event to notify components to reset their stack / close active sheets
    window.dispatchEvent(new CustomEvent('tab-click', { detail: { tab: item.value } }));
  };

  // Combine parent visibility controls (e.g. settings-based manual hides) with the scroll state
  const isVisible = visible === false ? false : internalVisible;

  return (
    <>
      {/* Status Banner — always sticky at bottom, Swiggy-style. Floats on top of sheets at z-[56] */}
      {showBanner && (
        <div
          className="status-banner-container fixed left-0 right-0 z-[56] transition-[bottom] duration-200 ease-out"
          style={{
            bottom: isVisible ? `${navHeight}px` : '0px',
          }}
        >
          <div className="bg-background/95 border-t border-border/40 py-2 text-center text-[11px] font-bold tracking-wider shadow-[0_-4px_10px_rgba(0,0,0,0.05)] flex items-center justify-center gap-3 backdrop-blur-md">
            <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
              </span>
              <span>COLLECTED: <span className="font-extrabold text-[12px] text-emerald-700 dark:text-emerald-300">₹{finalCollected.toLocaleString()}</span></span>
            </div>
            <span className="text-muted-foreground/30 font-light">|</span>
            <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-500">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-amber-500"></span>
              </span>
              <span>PENDING: <span className="font-extrabold text-[12px] text-amber-700 dark:text-amber-400">₹{finalPending.toLocaleString()}</span></span>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Nav — hides on scroll down, shows on scroll up. Floats on top of sheets at z-[55] */}
      <nav
        ref={navRef}
        className={`bottom-nav-container fixed bottom-0 left-0 right-0 z-[55] border-t border-border/70 bg-background/95 px-3 pt-1.5 pb-[calc(0.375rem+env(safe-area-inset-bottom,0px))] shadow-[0_-10px_30px_rgba(0,0,0,0.18)] backdrop-blur-xl transition-transform duration-200 ease-out ${
          isVisible
            ? 'translate-y-0'
            : 'translate-y-full'
        }`}
      >
        <div className="mx-auto grid max-w-md grid-cols-4 gap-0.5 rounded-2xl bg-muted/40 p-1">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.value;
          return (
            <button
              key={item.value}
              type="button"
              onClick={() => handleClick(item)}
              className={`flex min-h-12 flex-col items-center justify-center gap-0.5 rounded-xl px-1 text-[10px] font-medium transition-all ${
                isActive
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground active:bg-background/80'
              }`}
            >
              <Icon className="h-5 w-5" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>
      </nav>
    </>
  );
};
