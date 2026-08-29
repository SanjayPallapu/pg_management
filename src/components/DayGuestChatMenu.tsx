import { Bell, MessageCircle, MessageSquare, Receipt, Pencil, Trash2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

interface DayGuestChatMenuProps {
  guestName: string;
  phone: string;
  isPaid?: boolean;
  isPartial?: boolean;
  message?: string;
  onReminder?: () => void;
  onReceipt?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  className?: string;
}

export function DayGuestChatMenu({
  guestName,
  phone,
  isPaid = false,
  isPartial = false,
  message,
  onReminder,
  onReceipt,
  onEdit,
  onDelete,
  className,
}: DayGuestChatMenuProps) {
  const digits = phone.replace(/\D/g, "");
  const whatsappPhone = digits.startsWith("91") ? digits : `91${digits}`;

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
            "grid h-9 w-9 place-items-center rounded-xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-600 transition-colors hover:bg-emerald-500/20 dark:text-emerald-400 cursor-pointer active:scale-95",
            className
          )}
          aria-label={`Chat and options for ${guestName}`}
          title="Chat and guest options"
        >
          <MessageCircle className="h-[18px] w-[18px]" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuItem onSelect={openWhatsApp} className="gap-2 cursor-pointer">
          <MessageSquare className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          <span>Chat with Guest</span>
        </DropdownMenuItem>

        {onReminder && !isPaid && (
          <DropdownMenuItem onSelect={onReminder} className="gap-2 cursor-pointer">
            <Bell className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            <span>Payment Reminder</span>
          </DropdownMenuItem>
        )}

        {onReceipt && (isPaid || isPartial) && (
          <DropdownMenuItem onSelect={onReceipt} className="gap-2 cursor-pointer">
            <Receipt className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            <span>Generate Receipt</span>
          </DropdownMenuItem>
        )}

        {(onEdit || onDelete) && <DropdownMenuSeparator />}

        {onEdit && (
          <DropdownMenuItem onSelect={onEdit} className="gap-2 cursor-pointer">
            <Pencil className="h-4 w-4 text-muted-foreground" />
            <span>Edit Guest</span>
          </DropdownMenuItem>
        )}

        {onDelete && (
          <DropdownMenuItem onSelect={onDelete} className="gap-2 text-destructive cursor-pointer">
            <Trash2 className="h-4 w-4" />
            <span>Delete Guest</span>
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
