import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { CalendarClock, Check, Clock, Loader2, RotateCcw } from "lucide-react";
import { useRooms } from "@/hooks/useRooms";
import { toast } from "@/hooks/use-toast";
import { parseDateOnly } from "@/utils/dateOnly";
import { format as fmtDate } from "date-fns";

interface SetPaymentDateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenant: {
    id: string;
    name: string;
    roomNo?: string;
    startDate: string;
    paymentDueDay?: number | null;
    paymentDelayDays?: number | null;
  } | null;
  onSuccess?: () => void;
}

export const SetPaymentDateDialog = ({
  open,
  onOpenChange,
  tenant,
  onSuccess,
}: SetPaymentDateDialogProps) => {
  const { updateTenant } = useRooms();
  const [dueDay, setDueDay] = useState<number | null>(null);
  const [delayDays, setDelayDays] = useState<number>(0);
  const [isSaving, setIsSaving] = useState(false);

  const joinDay = tenant?.startDate
    ? parseDateOnly(tenant.startDate).getDate()
    : 1;

  useEffect(() => {
    if (tenant) {
      setDueDay(tenant.paymentDueDay ?? null);
      setDelayDays(tenant.paymentDelayDays ?? 0);
    }
  }, [tenant, open]);

  if (!tenant) return null;

  const handlePresetDelay = (days: number) => {
    let targetDay = joinDay + days;
    if (targetDay > 31) targetDay = 31;
    setDueDay(targetDay);
    setDelayDays(days);
  };

  const handleCustomDayChange = (val: number) => {
    if (val < 1) val = 1;
    if (val > 31) val = 31;
    setDueDay(val);
    const diff = val >= joinDay ? val - joinDay : val + (30 - joinDay);
    setDelayDays(diff);
  };

  const handleResetToJoiningDate = () => {
    setDueDay(null);
    setDelayDays(0);
  };

  const handleSave = async () => {
    if (!tenant) return;
    setIsSaving(true);
    try {
      await updateTenant.mutateAsync({
        tenantId: tenant.id,
        updates: {
          paymentDueDay: dueDay,
          paymentDelayDays: delayDays,
        },
        tenantName: tenant.name,
      });

      toast({
        title: dueDay ? "Payment Date Set" : "Reset to Joining Date",
        description: dueDay
          ? `${tenant.name} will pay on the ${dueDay}th of every month (${delayDays}d delay). Moved to Delayed tab!`
          : `${tenant.name} will follow standard joining due date.`,
      });

      onSuccess?.();
      onOpenChange(false);
    } catch (err: any) {
      toast({
        title: "Failed to update payment date",
        description: err.message || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const todayDate = new Date().getDate();
  const isDelayedSet = dueDay !== null && dueDay !== undefined && dueDay !== joinDay;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
              <CalendarClock className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold">Set Agreed Payment Date</DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                {tenant.name} {tenant.roomNo ? `• Room ${tenant.roomNo}` : ""}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Information banner */}
          <div className="p-3 rounded-xl bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800/40 text-xs text-purple-900 dark:text-purple-200 leading-relaxed">
            <p className="font-semibold mb-1">💡 How Delayed Payment Works</p>
            By default, rent is due on the joining day (<strong>Day {joinDay}</strong>). When you set an agreed date, this tenant is <strong>excluded from Overdue</strong> and placed into the <strong>Delayed tab</strong> until that date arrives.
          </div>

          {/* Joining Date Info */}
          <div className="flex items-center justify-between text-xs px-1 text-muted-foreground">
            <span>Joining Date:</span>
            <span className="font-semibold text-foreground">
              {tenant.startDate ? fmtDate(parseDateOnly(tenant.startDate), "dd MMM yyyy") : "N/A"} (Day {joinDay})
            </span>
          </div>

          {/* Quick presets */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Quick Delay Presets (from Joining Day)</Label>
            <div className="grid grid-cols-4 gap-2">
              {[5, 7, 10, 14].map((days) => {
                const targetDay = Math.min(31, joinDay + days);
                const isSelected = dueDay === targetDay;
                return (
                  <Button
                    key={days}
                    type="button"
                    variant={isSelected ? "default" : "outline"}
                    size="sm"
                    className={`h-9 flex flex-col items-center justify-center p-1 text-[11px] ${
                      isSelected ? "bg-purple-600 hover:bg-purple-700 text-white" : ""
                    }`}
                    onClick={() => handlePresetDelay(days)}
                  >
                    <span className="font-bold">+{days} Days</span>
                    <span className="text-[9px] opacity-80">Day {targetDay}</span>
                  </Button>
                );
              })}
            </div>
          </div>

          {/* Custom Day of Month Input */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <Label htmlFor="customDay" className="text-xs font-semibold">
                Or Exact Day of Month (1 - 31)
              </Label>
              {isDelayedSet && (
                <Badge variant="secondary" className="text-[10px] bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300">
                  Agreed Day: {dueDay}th
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Input
                id="customDay"
                type="number"
                min={1}
                max={31}
                placeholder={`e.g. 14 (Day of month)`}
                value={dueDay ?? ""}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10);
                  if (!isNaN(val)) {
                    handleCustomDayChange(val);
                  } else {
                    setDueDay(null);
                    setDelayDays(0);
                  }
                }}
                className="h-10 text-sm font-semibold"
              />
              <span className="text-xs text-muted-foreground whitespace-nowrap">of every month</span>
            </div>
          </div>

          {/* Live Outcome Card */}
          <div className={`p-3 rounded-xl border transition-colors ${
            isDelayedSet
              ? "bg-purple-500/10 border-purple-500/30 text-purple-900 dark:text-purple-200"
              : "bg-muted/40 border-border text-muted-foreground"
          }`}>
            <div className="flex items-start gap-2">
              <Clock className="h-4 w-4 mt-0.5 shrink-0 text-purple-600 dark:text-purple-400" />
              <div className="text-xs space-y-1">
                {isDelayedSet ? (
                  <>
                    <p className="font-semibold text-foreground">
                      Expected on the {dueDay}th of every month ({delayDays} days delay)
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {todayDate <= dueDay!
                        ? `✅ Currently within agreed grace period (${dueDay! - todayDate} days left). Tenant will be in the Delayed tab and NOT in Overdue.`
                        : `⚠️ Agreed date of ${dueDay}th has already passed this month. Tenant will be shown in Overdue.`}
                    </p>
                  </>
                ) : (
                  <>
                    <p className="font-semibold text-foreground">Standard Due Date: Day {joinDay}</p>
                    <p className="text-[11px]">
                      Tenant pays on joining day ({joinDay}th). If unpaid when today passes Day {joinDay}, tenant appears in Overdue.
                    </p>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Reset button if custom day is active */}
          {isDelayedSet && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="w-full text-xs text-muted-foreground hover:text-foreground flex items-center justify-center gap-1.5 h-8"
              onClick={handleResetToJoiningDate}
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Reset to Standard Joining Day (Day {joinDay})
            </Button>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSaving}
          >
            Cancel
          </Button>
          <Button
            type="button"
            className="bg-purple-600 hover:bg-purple-700 text-white gap-1.5"
            onClick={handleSave}
            disabled={isSaving}
          >
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Check className="h-4 w-4" />
                Save Payment Date
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
