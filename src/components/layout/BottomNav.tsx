import { useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Building,
  Receipt,
  FileBarChart,
  Settings,
} from 'lucide-react';
import { useActiveTab } from '@/contexts/ActiveTabContext';

const NAV_ITEMS = [
  { value: 'dashboard', label: 'Home', icon: LayoutDashboard, path: '/' },
  { value: 'rooms', label: 'Rooms', icon: Building, path: '/?tab=rooms' },
  { value: 'rent-sheet', label: 'Rent', icon: Receipt, path: '/?tab=rent-sheet' },
  { value: 'reports', label: 'Reports', icon: FileBarChart, path: '/?tab=reports' },
  { value: 'settings', label: 'Settings', icon: Settings, path: '/?tab=settings' },
];

interface BottomNavProps {
  /** When used inside Index.tsx, pass the active tab and setter for in-page tab switching */
  activeTab?: string;
  onTabChange?: (tab: string) => void;
}

export const BottomNav = ({ activeTab: propActiveTab, onTabChange }: BottomNavProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { activeTab: contextActiveTab, setActiveTab: setContextTab } = useActiveTab();

  const isOnIndex = location.pathname === '/';
  // Use prop if provided (Index.tsx), otherwise use context (dialogs/sheets/sub-pages)
  const currentTab = propActiveTab ?? contextActiveTab;

  const handleClick = (item: typeof NAV_ITEMS[0]) => {
    if (isOnIndex && onTabChange) {
      // In-page tab switch on Index
      onTabChange(item.value);
      setContextTab(item.value);
    } else {
      // Navigate to Index with tab param
      setContextTab(item.value);
      navigate(`/?tab=${item.value}`);
    }
  };

  return (
    <nav className="fixed inset-x-0 bottom-0 z-[100] border-t border-border/70 bg-background/95 px-3 pb-[calc(0.5rem+env(safe-area-inset-bottom))] pt-2 shadow-[0_-10px_30px_rgba(0,0,0,0.18)] backdrop-blur-xl">
      <div className="mx-auto grid max-w-md grid-cols-5 gap-0.5 rounded-2xl bg-muted/40 p-1">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.value;
          return (
            <button
              key={item.value}
              type="button"
              onClick={() => handleClick(item)}
              className={`flex min-h-14 flex-col items-center justify-center gap-0.5 rounded-xl px-1 text-[10px] font-medium transition-all ${
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
