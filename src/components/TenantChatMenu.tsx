import { Bell, ClipboardList, MessageCircle, MessageSquare, Receipt, User } from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

interface TenantChatMenuProps {
  tenantId: string;
  tenantName: string;
  phone: string;
  profileComplete?: boolean;
  message?: string;
  onReceipt?: () => void;
  onReminder?: () => void;
  className?: string;
}

export function TenantChatMenu({
  tenantId,
  tenantName,
  phone,
  profileComplete = false,
  message,
  onReceipt,
  onReminder,
  className,
}: TenantChatMenuProps) {
  const navigate = useNavigate();
  const digits = phone.replace(/\D/g, "");
  const whatsappPhone = digits.startsWith("91") ? digits : `91${digits}`;
  const profilePath = `/tenant-profile/${tenantId}`;

  const openWhatsApp = () => {
    const suffix = message ? `?text=${encodeURIComponent(message)}` : "";
    window.open(`https://wa.me/${whatsappPhone}${suffix}`, "_blank", "noopener,noreferrer");
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          onClick={(event) => event.stopPropagation()}
          className={cn(
            "grid h-9 w-9 place-items-center rounded-xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-600 transition-colors hover:bg-emerald-500/20 dark:text-emerald-400",
            className,
          )}
          aria-label={`Chat and profile options for ${tenantName}`}
          title="Chat and tenant options"
        >
          <MessageCircle className="h-[18px] w-[18px]" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuItem onSelect={() => navigate(profilePath)} className="gap-2">
          <User className="h-4 w-4" />
          Open Profile
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={openWhatsApp} className="gap-2">
          <MessageSquare className="h-4 w-4" />
          Chat with Tenant
        </DropdownMenuItem>
        {onReminder && (
          <DropdownMenuItem onSelect={onReminder} className="gap-2">
            <Bell className="h-4 w-4" />
            Payment Reminder
          </DropdownMenuItem>
        )}
        {onReceipt && (
          <DropdownMenuItem onSelect={onReceipt} className="gap-2">
            <Receipt className="h-4 w-4" />
            Generate Receipt
          </DropdownMenuItem>
        )}
        <DropdownMenuItem
          onSelect={() => navigate(profileComplete ? profilePath : `${profilePath}/share`)}
          className="gap-2"
        >
          <ClipboardList className="h-4 w-4" />
          {profileComplete ? "View Complete Profile" : "Complete Tenant Profile"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
