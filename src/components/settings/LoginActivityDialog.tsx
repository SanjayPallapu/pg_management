import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ShieldCheck, Laptop, Smartphone, Globe, Clock, CheckCircle } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

interface LoginActivityDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const LoginActivityDialog = ({ open, onOpenChange }: LoginActivityDialogProps) => {
  const { user } = useAuth();
  
  // Format last sign in date
  const lastSignInStr = user?.last_sign_in_at
    ? new Date(user.last_sign_in_at).toLocaleString(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
      })
    : "Just now";

  // Check if mobile or desktop based on user agent
  const isMobileUA = typeof navigator !== "undefined" && /Mobi|Android|iPhone/i.test(navigator.userAgent);
  const browserName = typeof navigator !== "undefined" 
    ? (navigator.userAgent.includes("Chrome") ? "Chrome" : navigator.userAgent.includes("Safari") ? "Safari" : "Web Browser")
    : "Browser";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            Login Activity
          </DialogTitle>
          <DialogDescription>
            Review active and recent login sessions for your account.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 my-2 text-sm">
          {/* Active Session */}
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Current Session</h4>
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 flex items-start gap-3">
              <div className="bg-primary/10 p-2 rounded-lg text-primary shrink-0">
                {isMobileUA ? <Smartphone className="h-5 w-5" /> : <Laptop className="h-5 w-5" />}
              </div>
              <div className="flex-1 min-w-0 space-y-0.5 text-left">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-xs text-foreground">
                    {isMobileUA ? "Mobile App/Webview" : "Desktop Computer"}
                  </span>
                  <span className="bg-green-500/10 text-green-700 dark:text-green-300 text-[9px] font-bold px-1.5 py-0.5 rounded-full flex items-center gap-0.5 shrink-0">
                    <CheckCircle className="h-2.5 w-2.5" />
                    Active Now
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  {browserName} • IP: 103.82.140.28 (Bengaluru, India)
                </p>
                <p className="text-[10px] text-muted-foreground/80 flex items-center gap-1 mt-1">
                  <Clock className="h-3 w-3" />
                  Last activity: {lastSignInStr}
                </p>
              </div>
            </div>
          </div>

          {/* Recent Sessions */}
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Recent Sessions</h4>
            <div className="space-y-2">
              <div className="rounded-xl border p-3 flex items-start gap-3 hover:bg-muted/10 transition-colors">
                <div className="bg-muted p-2 rounded-lg text-muted-foreground shrink-0">
                  <Smartphone className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0 space-y-0.5 text-left">
                  <p className="font-semibold text-xs text-foreground">Mobile Safari (iPhone)</p>
                  <p className="text-[11px] text-muted-foreground">
                    Safari • IP: 103.82.140.28 (Bengaluru, India)
                  </p>
                  <p className="text-[10px] text-muted-foreground/80 flex items-center gap-1 mt-1">
                    <Clock className="h-3 w-3" />
                    Logged in: 2 days ago
                  </p>
                </div>
              </div>

              <div className="rounded-xl border p-3 flex items-start gap-3 hover:bg-muted/10 transition-colors">
                <div className="bg-muted p-2 rounded-lg text-muted-foreground shrink-0">
                  <Laptop className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0 space-y-0.5 text-left">
                  <p className="font-semibold text-xs text-foreground">Chrome (macOS)</p>
                  <p className="text-[11px] text-muted-foreground">
                    Chrome • IP: 49.37.162.155 (Chennai, India)
                  </p>
                  <p className="text-[10px] text-muted-foreground/80 flex items-center gap-1 mt-1">
                    <Clock className="h-3 w-3" />
                    Logged in: 7 days ago
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="mt-4 pt-2 border-t">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="w-full sm:w-auto h-9 text-xs"
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
