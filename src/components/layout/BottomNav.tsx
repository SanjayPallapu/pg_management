import { useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Building,
  Receipt,
  Settings,
} from 'lucide-react';
import { useActiveTab } from '@/contexts/ActiveTabContext';

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
}

export const BottomNav = ({ activeTab: propActiveTab, onTabChange, visible = true }: BottomNavProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { activeTab: contextActiveTab, setActiveTab: setContextTab } = useActiveTab();

  const isOnIndex = location.pathname === '/';
  // Use prop if provided (Index.tsx), otherwise use context (dialogs/sheets/sub-pages)
  const currentTab = propActiveTab ?? contextActiveTab;

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

  return (
    <nav className={`fixed bottom-0 left-0 right-0 z-50 border-t border-border/70 bg-background/95 px-3 pt-1.5 pb-[calc(0.375rem+env(safe-area-inset-bottom,0px))] shadow-[0_-10px_30px_rgba(0,0,0,0.18)] backdrop-blur-xl transition-all duration-300 ease-in-out ${
      visible 
        ? 'translate-y-0 opacity-100' 
        : 'translate-y-full opacity-0 pointer-events-none'
    }`}>
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
  );
};
