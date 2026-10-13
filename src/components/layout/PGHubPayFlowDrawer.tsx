import { 
  LayoutGrid, 
  CreditCard, 
  Users, 
  Building2, 
  Bed, 
  Zap, 
  ReceiptText, 
  UserMinus, 
  BarChart3, 
  Sparkles, 
  Settings, 
  X,
  LogOut,
  Moon,
  Sun,
} from "lucide-react";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/components/ThemeProvider";

interface PGHubPayFlowDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activeTab?: string;
  onSelectTab?: (tab: string) => void;
  onOpenProperties?: () => void;
  onOpenReports?: () => void;
  onOpenUtilities?: () => void;
  onOpenMoveOuts?: () => void;
  onOpenDayGuests?: () => void;
  onOpenSecurityDeposit?: () => void;
  onOpenAuditHistory?: () => void;
}

export const PGHubPayFlowDrawer = ({
  open,
  onOpenChange,
  activeTab,
  onSelectTab,
  onOpenProperties,
  onOpenReports,
  onOpenUtilities,
  onOpenMoveOuts,
  onOpenDayGuests,
  onOpenSecurityDeposit,
  onOpenAuditHistory,
}: PGHubPayFlowDrawerProps) => {
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const { theme, setTheme } = useTheme();

  const handleAction = (callback?: () => void, tabName?: string, routePath?: string) => {
    onOpenChange(false);
    if (callback) {
      callback();
    } else if (tabName && onSelectTab) {
      onSelectTab(tabName);
    } else if (routePath) {
      navigate(routePath);
    }
  };

  const menuItems = [
    {
      id: "dashboard",
      label: "Overview",
      icon: <LayoutGrid className="h-4 w-4" />,
      action: () => handleAction(undefined, "dashboard"),
    },
    {
      id: "reconciliation",
      label: "Payments",
      icon: <CreditCard className="h-4 w-4" />,
      action: () => handleAction(undefined, "reconciliation"),
    },
    {
      id: "rooms",
      label: "Tenants",
      icon: <Users className="h-4 w-4" />,
      action: () => handleAction(undefined, "rooms"),
    },
    {
      id: "properties",
      label: "Properties",
      icon: <Building2 className="h-4 w-4" />,
      action: () => {
        if (onOpenProperties) {
          handleAction(onOpenProperties);
        } else {
          handleAction(undefined, "settings");
        }
      },
    },
    {
      id: "rooms-beds",
      label: "Rooms & Beds",
      icon: <Bed className="h-4 w-4" />,
      action: () => handleAction(undefined, "rooms"),
    },
    {
      id: "utilities",
      label: "Utilities",
      icon: <Zap className="h-4 w-4" />,
      action: () => {
        if (onOpenUtilities) {
          handleAction(onOpenUtilities);
        } else {
          handleAction(undefined, undefined, "/?tab=rent-sheet&openAc=true");
        }
      },
    },
    {
      id: "rent-sheet",
      label: "Receipts",
      icon: <ReceiptText className="h-4 w-4" />,
      action: () => handleAction(undefined, "rent-sheet"),
    },
    {
      id: "move-outs",
      label: "Move-outs",
      icon: <UserMinus className="h-4 w-4" />,
      action: () => {
        if (onOpenMoveOuts) {
          handleAction(onOpenMoveOuts);
        } else {
          handleAction(undefined, undefined, "/left-tenants");
        }
      },
    },
    {
      id: "reports",
      label: "Reports",
      icon: <BarChart3 className="h-4 w-4" />,
      action: () => {
        if (onOpenReports) {
          handleAction(onOpenReports);
        } else {
          handleAction(undefined, "settings");
        }
      },
    },
    {
      id: "subscription",
      label: "Subscription",
      icon: <Sparkles className="h-4 w-4" />,
      action: () => handleAction(undefined, undefined, "/subscription"),
    },
    {
      id: "settings",
      label: "Settings",
      icon: <Settings className="h-4 w-4" />,
      action: () => handleAction(undefined, "settings"),
    },
  ];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent 
        side="right" 
        className="w-[205px] max-w-[80vw] p-0 border-l border-white/10 bg-[#121316] text-white flex flex-col justify-between shadow-2xl"
      >
        <div className="flex flex-col h-full overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-3.5 py-3 border-b border-white/10 shrink-0">
            <h2 className="text-sm font-bold tracking-tight text-white flex items-center gap-1.5">
              PG Hub
            </h2>
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="p-1 rounded-md text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
              aria-label="Close menu"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Navigation Links */}
          <div className="flex-1 overflow-y-auto py-2 px-2 space-y-0.5">
            {/* Theme Toggle placed at the top above Overview */}
            <button
              type="button"
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="group flex w-full items-center gap-2.5 px-2.5 py-2 rounded-lg text-left text-xs font-semibold text-gray-200 hover:text-white hover:bg-white/[0.08] active:bg-white/[0.12] transition-all mb-1 border-b border-white/10 pb-2"
            >
              <div className="shrink-0">
                {theme === 'dark' ? (
                  <Sun className="h-4 w-4 text-amber-400 group-hover:text-amber-300" />
                ) : (
                  <Moon className="h-4 w-4 text-indigo-300 group-hover:text-indigo-200" />
                )}
              </div>
              <span className="flex-1 truncate">{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
            </button>

            {menuItems.map((item, index) => {
              const isActive = activeTab && item.id === activeTab;
              return (
                <button
                  key={index}
                  type="button"
                  onClick={item.action}
                  className={`group flex w-full items-center gap-2.5 px-2.5 py-2 rounded-lg text-left text-xs font-semibold transition-all ${
                    isActive
                      ? "bg-white/[0.12] text-white shadow-sm"
                      : "text-gray-300 hover:text-white hover:bg-white/[0.08] active:bg-white/[0.12]"
                  }`}
                >
                  <div className={`shrink-0 ${isActive ? "text-white" : "text-gray-400 group-hover:text-white"}`}>
                    {item.icon}
                  </div>
                  <span className="flex-1 truncate">{item.label}</span>
                </button>
              );
            })}
          </div>

          {/* Footer with sign out */}
          <div className="p-2 border-t border-white/10 shrink-0">
            <button
              type="button"
              onClick={async () => {
                onOpenChange(false);
                await signOut();
                window.location.replace("/onboarding");
              }}
              className="flex w-full items-center gap-2 px-2.5 py-2 rounded-lg text-left text-xs font-semibold text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition-all"
            >
              <LogOut className="h-3.5 w-3.5 shrink-0" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};
