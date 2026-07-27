import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Gift, Copy, Check, Share2, Sparkles, ShieldCheck, Users, Zap, Tag } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { getReferralStats, shareReferralInvite, validateAndApplyReferralCode } from "@/utils/referralHelper";
import { toast } from "sonner";
import { useBackGesture } from "@/hooks/useBackGesture";

interface ReferralDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ReferralDialog = ({ open, onOpenChange }: ReferralDialogProps) => {
  const { user } = useAuth();
  useBackGesture(open, () => onOpenChange(false));

  const stats = getReferralStats(user?.id, user?.email);
  const [copied, setCopied] = useState(false);
  const [inputCode, setInputCode] = useState("");
  const [isApplying, setIsApplying] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(stats.referralCode);
    setCopied(true);
    toast.success("Referral code copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async () => {
    try {
      const result = await shareReferralInvite(stats.referralCode);
      if (result === "copied") toast.success("Invite copied. Share it anywhere.");
    } catch {
      toast.error("Could not open sharing. Please copy your code instead.");
    }
  };

  const handleApplyCode = () => {
    if (!inputCode.trim()) return;
    setIsApplying(true);
    const res = validateAndApplyReferralCode(inputCode, stats.referralCode);
    setIsApplying(false);

    if (res.success) {
      toast.success(res.message);
      setInputCode("");
    } else {
      toast.error(res.message);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-6 rounded-3xl border-border bg-card shadow-2xl">
        <DialogHeader className="text-center sm:text-left space-y-1">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-500 text-white shadow-sm">
              <Gift className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-black text-foreground flex items-center gap-1.5">
                Refer PG Owners & Earn
                <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-[10px] px-2 font-bold">
                  30% OFF
                </Badge>
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Get 1 Month Free for every PG owner who subscribes!
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Promo Offer Banner */}
        <div className="rounded-2xl bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 p-4 text-white shadow-md relative overflow-hidden my-2">
          <div className="absolute right-[-10px] top-[-10px] opacity-20">
            <Sparkles className="h-20 w-20" />
          </div>
          <div className="relative z-10 space-y-1">
            <div className="inline-flex items-center gap-1 bg-white/20 backdrop-blur px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wide">
              <Zap className="h-3 w-3 fill-yellow-300 text-yellow-300" />
              Limited Campaign
            </div>
            <h3 className="text-base font-black">Give 30% OFF, Get 1 Month Free!</h3>
            <p className="text-xs text-purple-100 font-medium">
              Your friend gets <strong className="text-yellow-300 font-extrabold">30% OFF</strong> their first month. You get <strong className="text-yellow-300 font-extrabold">1 Month Free</strong> once they subscribe.
            </p>
          </div>
        </div>

        {/* Referral Code Share Box */}
        <div className="space-y-2 py-1">
          <label className="text-xs font-extrabold text-foreground flex items-center justify-between">
            <span>Your Referral Code</span>
            <span className="text-[11px] text-muted-foreground font-normal">Share with fellow PG owners</span>
          </label>
          <div className="flex items-center gap-2">
            <div className="flex-1 bg-muted/60 px-4 py-2.5 rounded-2xl border border-border/80 font-mono text-sm font-black text-primary text-center tracking-widest select-all">
              {stats.referralCode}
            </div>
            <Button
              variant="outline"
              onClick={handleCopy}
              className="rounded-2xl h-10 px-4 font-bold border-border"
            >
              {copied ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>

          <Button
            onClick={handleShare}
            className="w-full mt-2 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold py-5 shadow-md flex items-center justify-center gap-2 text-xs"
          >
            <Share2 className="h-4 w-4" />
            Share Invite
          </Button>
        </div>

        {/* Referral Tracker Stats */}
        <div className="grid grid-cols-3 gap-2 py-2 text-center">
          <div className="bg-muted/40 p-2.5 rounded-2xl border border-border/40">
            <p className="text-[10px] text-muted-foreground font-bold uppercase">Invited</p>
            <p className="text-lg font-black text-foreground">{stats.totalInvited}</p>
          </div>
          <div className="bg-muted/40 p-2.5 rounded-2xl border border-border/40">
            <p className="text-[10px] text-muted-foreground font-bold uppercase">Paid Friends</p>
            <p className="text-lg font-black text-emerald-600 dark:text-emerald-400">{stats.activePaidReferrals}</p>
          </div>
          <div className="bg-muted/40 p-2.5 rounded-2xl border border-border/40">
            <p className="text-[10px] text-muted-foreground font-bold uppercase">Free Months</p>
            <p className="text-lg font-black text-primary">{stats.freeMonthsEarned} / {stats.maxMonthsPerYear}</p>
          </div>
        </div>

        {/* Redeem Friend's Code Section */}
        <div className="border-t border-border/60 pt-3 mt-1 space-y-2">
          <label className="text-xs font-extrabold text-foreground flex items-center gap-1.5">
            <Tag className="h-3.5 w-3.5 text-primary" />
            Have a Referral Code? (Get 30% OFF)
          </label>
          <div className="flex gap-2">
            <Input
              placeholder="e.g. PGHUB-OWNER123"
              value={inputCode}
              onChange={(e) => setInputCode(e.target.value)}
              className="rounded-2xl text-xs uppercase"
            />
            <Button
              onClick={handleApplyCode}
              disabled={isApplying || !inputCode.trim()}
              className="rounded-2xl font-bold text-xs px-4"
            >
              Apply
            </Button>
          </div>
        </div>

        {/* Footer info */}
        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground justify-center pt-2">
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
          <span>Reward activates automatically upon friend's first payment.</span>
        </div>
      </DialogContent>
    </Dialog>
  );
};
