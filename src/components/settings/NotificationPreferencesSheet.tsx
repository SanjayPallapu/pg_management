import { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Bell, MessageSquare, Mail, Smartphone } from "lucide-react";
import { toast } from "sonner";

interface NotificationPreferencesSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const NotificationPreferencesSheet = ({ open, onOpenChange }: NotificationPreferencesSheetProps) => {
  const [preferences, setPreferences] = useState({
    whatsappReminders: true,
    pushAlerts: true,
    dailyDigests: false,
    emailReports: true,
  });

  // Load preferences from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem("notification_preferences");
    if (stored) {
      try {
        setPreferences(JSON.parse(stored));
      } catch (e) {
        console.error("Failed to parse notification preferences:", e);
      }
    }
  }, [open]);

  const handleToggle = (key: keyof typeof preferences, value: boolean) => {
    const updated = { ...preferences, [key]: value };
    setPreferences(updated);
    localStorage.setItem("notification_preferences", JSON.stringify(updated));
    toast.success("Preferences updated successfully");
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent 
        side="right" 
        className="w-full max-w-full sm:max-w-xl p-0 [&>button]:hidden bg-background"
      >
        <div className="flex flex-col h-full bg-slate-50/50 dark:bg-slate-900/50">
          <SheetHeader className="px-4 pt-4 pb-2 border-b bg-background shrink-0">
            <div className="flex items-center gap-2">
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => onOpenChange(false)} 
                className="h-8 w-8 shrink-0"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <Bell className="h-4 w-4 text-primary shrink-0" />
                <SheetTitle className="text-base font-bold text-left truncate">
                  Notification Preferences
                </SheetTitle>
              </div>
            </div>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 bg-background">
            <div className="rounded-xl border bg-card p-4 space-y-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex gap-3">
                  <div className="bg-green-500/10 p-2 rounded-lg text-green-500 h-9 w-9 flex items-center justify-center shrink-0">
                    <MessageSquare className="h-5 w-5" />
                  </div>
                  <div className="space-y-0.5">
                    <Label htmlFor="whatsappReminders" className="text-sm font-semibold">
                      WhatsApp Reminders
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Send automated due reminders to tenants via WhatsApp
                    </p>
                  </div>
                </div>
                <Switch
                  id="whatsappReminders"
                  checked={preferences.whatsappReminders}
                  onCheckedChange={(val) => handleToggle("whatsappReminders", val)}
                />
              </div>

              <div className="flex items-start justify-between gap-4">
                <div className="flex gap-3">
                  <div className="bg-blue-500/10 p-2 rounded-lg text-blue-500 h-9 w-9 flex items-center justify-center shrink-0">
                    <Smartphone className="h-5 w-5" />
                  </div>
                  <div className="space-y-0.5">
                    <Label htmlFor="pushAlerts" className="text-sm font-semibold">
                      App Push Notifications
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Get alert notifications when rent is collected or important activity occurs
                    </p>
                  </div>
                </div>
                <Switch
                  id="pushAlerts"
                  checked={preferences.pushAlerts}
                  onCheckedChange={(val) => handleToggle("pushAlerts", val)}
                />
              </div>

              <div className="flex items-start justify-between gap-4">
                <div className="flex gap-3">
                  <div className="bg-amber-500/10 p-2 rounded-lg text-amber-500 h-9 w-9 flex items-center justify-center shrink-0">
                    <Bell className="h-5 w-5" />
                  </div>
                  <div className="space-y-0.5">
                    <Label htmlFor="dailyDigests" className="text-sm font-semibold">
                      Daily Overview Digest
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Receive a summary of today's collections, check-ins, and pending tasks at 9 PM
                    </p>
                  </div>
                </div>
                <Switch
                  id="dailyDigests"
                  checked={preferences.dailyDigests}
                  onCheckedChange={(val) => handleToggle("dailyDigests", val)}
                />
              </div>

              <div className="flex items-start justify-between gap-4">
                <div className="flex gap-3">
                  <div className="bg-purple-500/10 p-2 rounded-lg text-purple-500 h-9 w-9 flex items-center justify-center shrink-0">
                    <Mail className="h-5 w-5" />
                  </div>
                  <div className="space-y-0.5">
                    <Label htmlFor="emailReports" className="text-sm font-semibold">
                      Monthly Email Reports
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Get detailed financial statements and profit/loss reports emailed at month-end
                    </p>
                  </div>
                </div>
                <Switch
                  id="emailReports"
                  checked={preferences.emailReports}
                  onCheckedChange={(val) => handleToggle("emailReports", val)}
                />
              </div>
            </div>

            <div className="text-center py-4">
              <p className="text-xs text-muted-foreground">
                Settings are synced with your active browser profile.
              </p>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};
