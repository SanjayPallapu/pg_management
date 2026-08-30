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
  Bot, 
  Sparkles, 
  Settings, 
  X,
  LogOut
} from "lucide-react";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

interface PGHubPayFlowDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectTab?: (tab: string) => void;
  onOpenProperties?: () => void;
  onOpenReports?: () => void;
  onOpenUtilities?: () => void;
  onOpenMoveOuts?: () => void;
  onOpenAIAssistant?: () => void;
  onOpenDayGuests?: () => void;
  onOpenSecurityDeposit?: () => void;
  onOpenAuditHistory?: () => void;
}

export const PGHubPayFlowDrawer = ({
  open,
  onOpenChange,
  onSelectTab,
  onOpenProperties,
  onOpenReports,
  onOpenUtilities,
  onOpenMoveOuts,
  onOpenAIAssistant,
  onOpenDayGuests,
  onOpenSecurityDeposit,
  onOpenAuditHistory,
}: PGHubPayFlowDrawerProps) => {
  const navigate = useNavigate();
  const { signOut } = useAuth();

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
      label: "Overview",
      icon: <LayoutGrid className="h-5 w-5 text-gray-300 group-hover:text-white" />,
      action: () => handleAction(undefined, "dashboard"),
    },
    {
      label: "Payments",
      icon: <CreditCard className="h-5 w-5 text-gray-300 group-hover:text-white" />,
      action: () => handleAction(undefined, "reconciliation"),
    },
    {
      label: "Tenants",
      icon: <Users className="h-5 w-5 text-gray-300 group-hover:text-white" />,
      action: () => handleAction(undefined, "rooms"),
    },
    {
      label: "Properties",
      icon: <Building2 className="h-5 w-5 text-gray-300 group-hover:text-white" />,
      action: () => {
        if (onOpenProperties) {
          handleAction(onOpenProperties);
        } else {
          handleAction(undefined, "settings");
        }
      },
    },
    {
      label: "Rooms & Beds",
      icon: <Bed className="h-5 w-5 text-gray-300 group-hover:text-white" />,
      action: () => handleAction(undefined, "rooms"),
    },
    {
      label: "Utilities",
      icon: <Zap className="h-5 w-5 text-gray-300 group-hover:text-white" />,
      action: () => {
        if (onOpenUtilities) {
          handleAction(onOpenUtilities);
        } else {
          handleAction(undefined, undefined, "/?tab=rent-sheet&openAc=true");
        }
      },
    },
    {
      label: "Receipts",
      icon: <ReceiptText className="h-5 w-5 text-gray-300 group-hover:text-white" />,
      action: () => handleAction(undefined, "rent-sheet"),
    },
    {
      label: "Move-outs",
      icon: <UserMinus className="h-5 w-5 text-gray-300 group-hover:text-white" />,
      action: () => {
        if (onOpenMoveOuts) {
          handleAction(onOpenMoveOuts);
        } else {
          handleAction(undefined, undefined, "/left-tenants");
        }
      },
    },
    {
      label: "Reports",
      icon: <BarChart3 className="h-5 w-5 text-gray-300 group-hover:text-white" />,
      action: () => {
        if (onOpenReports) {
          handleAction(onOpenReports);
        } else {
          handleAction(undefined, "settings");
        }
      },
    },
    {
      label: "AI Assistant",
      icon: <Bot className="h-5 w-5 text-gray-300 group-hover:text-white" />,
      action: () => {
        if (onOpenAIAssistant) {
          handleAction(onOpenAIAssistant);
        } else {
          navigate("/voice");
        }
      },
    },
    {
      label: "Subscription",
      icon: <Sparkles className="h-5 w-5 text-gray-300 group-hover:text-white" />,
      action: () => handleAction(undefined, undefined, "/subscription"),
    },
    {
      label: "Settings",
      icon: <Settings className="h-5 w-5 text-gray-300 group-hover:text-white" />,
      action: () => handleAction(undefined, "settings"),
    },
  ];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent 
        side="left" 
        className="w-[280px] sm:w-[320px] p-0 border-r border-white/10 bg-[#121316] text-white flex flex-col justify-between"
      >
        <div className="flex flex-col h-full overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-5 pt-6 pb-4 border-b border-white/10">
            <h2 className="text-lg sm:text-xl font-bold tracking-tight text-white flex items-center gap-2">
              PG Hub PayFlow
            </h2>
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
              aria-label="Close menu"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Navigation Links */}
          <div className="flex-1 overflow-y-auto py-3 px-3 space-y-1">
            {menuItems.map((item, index) => (
              <button
                key={index}
                type="button"
                onClick={item.action}
                className="group flex w-full items-center gap-3.5 px-3 py-2.5 rounded-xl text-left text-sm font-semibold text-gray-200 hover:text-white hover:bg-white/[0.08] active:bg-white/[0.12] transition-all"
              >
                <div className="shrink-0">{item.icon}</div>
                <span className="flex-1 truncate">{item.label}</span>
              </button>
            ))}
          </div>

          {/* Footer with sign out */}
          <div className="p-3 border-t border-white/10">
            <button
              type="button"
              onClick={async () => {
                onOpenChange(false);
                await signOut();
                window.location.replace("/onboarding");
              }}
              className="flex w-full items-center gap-3 px-3 py-2.5 rounded-xl text-left text-xs font-semibold text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition-all"
            >
              <LogOut className="h-4 w-4 shrink-0" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};
