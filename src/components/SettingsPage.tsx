import { useState, useEffect } from "react";
import { addDays, format, differenceInDays } from "date-fns";
import type { Room } from "@/types";
import { SUBSCRIPTION_PLANS, type SubscriptionPlanKey } from "@/types/pg";
import { HelpFAQ } from "@/components/HelpFAQ";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/proxyClient";
import {
  User,
  Crown,
  Moon,
  Sun,
  Shield,
  FileText,
  Mail,
  Trash2,
  LogOut,
  ChevronRight,
  Star,
  Share2,
  HelpCircle,
  Info,
  Bell,
  Building,
  CreditCard,
  Users,
  Lock,
  ExternalLink,
  Smartphone,
  Globe,
  ShieldCheck,
  Loader2,
  ArrowLeft,
  FileBarChart,
  FileClock,
  ContactRound,
  Mic,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Reports } from "./Reports";
import { useAuth } from "@/hooks/useAuth";
import { usePG } from "@/contexts/PGContext";
import { useTheme } from "@/components/ThemeProvider";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { SubscriptionDetailsSheet, AdminPaymentApproval, UpgradeDialog } from "@/components/subscription";
import { NotificationPreferencesSheet } from "./settings/NotificationPreferencesSheet";
import { ManagePropertiesSheet } from "./settings/ManagePropertiesSheet";
import { AuditHistorySheet } from "@/components/AuditHistorySheet";

import { ChangePasswordDialog } from "./settings/ChangePasswordDialog";
import { LoginActivityDialog } from "./settings/LoginActivityDialog";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import pgHubLogo from "@/assets/pg-hub/pg-hub-logo.png";

const APP_VERSION = "1.0.0";
const SUPPORT_EMAIL = "support.pghub@gmail.com";
const PLAY_STORE_URL = "https://play.google.com/store/apps/details?id=com.sanjay.pgmanagement";
const APP_SHARE_TEXT = "PG Hub – Smart PG Management\nManage rooms, tenants & rent easily.\n\n📱 Download the app:";

const blobToBase64 = async (blob: Blob) => {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let binary = "";
  const chunkSize = 0x8000;
  for (let index = 0; index < bytes.length; index += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize));
  }
  return btoa(binary);
};

interface SettingItemProps {
  icon: React.ReactNode;
  label: string;
  description?: string;
  onClick?: () => void;
  trailing?: React.ReactNode;
  destructive?: boolean;
}

const SettingItem = ({ icon, label, description, onClick, trailing, destructive }: SettingItemProps) => (
  <div
    role="button"
    tabIndex={0}
    onClick={onClick}
    onKeyDown={(event) => {
      if ((event.key === 'Enter' || event.key === ' ') && onClick) {
        event.preventDefault();
        onClick();
      }
    }}
    className={`flex w-full cursor-pointer items-center gap-3 rounded-xl px-3.5 py-3 text-left transition-all active:scale-[0.99] ${
      destructive
        ? "hover:bg-destructive/10 text-destructive"
        : "hover:bg-accent/60"
    }`}
  >
    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
      destructive ? "bg-destructive/10" : "bg-primary/10"
    }`}>
      {icon}
    </div>
    <div className="min-w-0 flex-1">
      <p className={`text-sm font-medium ${destructive ? "text-destructive" : "text-foreground"}`}>{label}</p>
      {description && <p className="text-xs text-muted-foreground mt-0.5 truncate">{description}</p>}
    </div>
    {trailing || (onClick && <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />)}
  </div>
);

const SectionHeader = ({ title }: { title: string }) => (
  <div className="px-4 pb-1 pt-5">
    <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</h3>
  </div>
);

export const SettingsPage = ({ rooms = [] }: { rooms?: Room[] }) => {
  const { user, isAdmin, isOwner, role, signOut } = useAuth();
  const { currentPG, subscription } = usePG();
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();
  const [subscriptionSheetOpen, setSubscriptionSheetOpen] = useState(false);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [adminApprovalOpen, setAdminApprovalOpen] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [reportsOpen, setReportsOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [propertiesOpen, setPropertiesOpen] = useState(false);
  const [auditOpen, setAuditOpen] = useState(false);

  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  const [loginActivityOpen, setLoginActivityOpen] = useState(false);

  // Close all open sheets/dialogs when switching tabs via bottom navigation
  useEffect(() => {
    const handleCloseAll = () => {
      setSubscriptionSheetOpen(false);
      setUpgradeOpen(false);
      setAdminApprovalOpen(false);
      setShowHelp(false);
      setReportsOpen(false);
      setDeleteConfirmOpen(false);
      setNotificationsOpen(false);
      setPropertiesOpen(false);
      setAuditOpen(false);

      setChangePasswordOpen(false);
      setLoginActivityOpen(false);
    };
    window.addEventListener('tab-click', handleCloseAll);
    return () => window.removeEventListener('tab-click', handleCloseAll);
  }, []);

  // Fetch pending approval count for admin badge
  const { data: pendingApprovalCount = 0 } = useQuery({
    queryKey: ['pending-approval-count'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('payment_requests')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');
      if (error) return 0;
      return count || 0;
    },
    enabled: isAdmin,
    refetchInterval: 30000, // refresh every 30s
  });

  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [confirmEmailInput, setConfirmEmailInput] = useState("");
  const [confirmDeleteText, setConfirmDeleteText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteAccount = async () => {
    if (confirmEmailInput.trim().toLowerCase() !== user?.email?.toLowerCase()) {
      toast.error("Email address does not match your registered email.");
      return;
    }
    if (confirmDeleteText.trim() !== "DELETE") {
      toast.error("Please type DELETE to confirm.");
      return;
    }

    setIsDeleting(true);
    try {
      const { error } = await supabase.rpc('delete_user_account' as never);
      if (error) {
        console.warn("RPC account deletion failed, attempting client-side data wipe fallback:", error.message);
        
        // Cascade fallback - delete properties (cascades to rooms/tenants under user RLS)
        const { error: deletePgsError } = await supabase.from('pgs').delete().eq('owner_id', user?.id);
        if (deletePgsError) throw deletePgsError;
        
        // Clean up profile
        await supabase.from('profiles').delete().eq('user_id', user?.id);
      }
      
      await signOut();
      window.location.replace("/onboarding");
    } catch (err: unknown) {
      console.error("Account deletion failed:", err);
      toast.error(err instanceof Error ? err.message : "Failed to delete account. Please contact support.");
    } finally {
      setIsDeleting(false);
      setDeleteConfirmOpen(false);
      setConfirmEmailInput("");
      setConfirmDeleteText("");
    }
  };

  const isDark = theme === "dark";

  const [hideVoice, setHideVoice] = useState(() => localStorage.getItem("hide_voice_agent") === "true");

  const toggleHideVoice = () => {
    setHideVoice(prev => {
      const next = !prev;
      localStorage.setItem("hide_voice_agent", next ? "true" : "false");
      window.dispatchEvent(new CustomEvent("voice_agent_visibility_change", { detail: { hidden: next } }));
      toast.success(next ? "Voice Assistant button hidden" : "Voice Assistant button visible");
      return next;
    });
  };

  const handleSignOut = async () => {
    await signOut();
    window.location.replace("/onboarding");
  };

  const handleShareApp = async () => {
    const shareData = {
      title: "PG Hub – Smart PG Management",
      text: APP_SHARE_TEXT,
      url: PLAY_STORE_URL,
    };
    try {
      const logoResponse = await fetch(pgHubLogo);
      const logoBlob = logoResponse.ok ? await logoResponse.blob() : null;

      const { Capacitor } = await import("@capacitor/core");
      if (Capacitor.isNativePlatform()) {
        const { Share } = await import("@capacitor/share");
        if (logoBlob) {
          const { Directory, Filesystem } = await import("@capacitor/filesystem");
          const fileName = "pg-hub-share-logo.png";
          await Filesystem.writeFile({ path: fileName, data: await blobToBase64(logoBlob), directory: Directory.Cache });
          const file = await Filesystem.getUri({ path: fileName, directory: Directory.Cache });
          await Share.share({ ...shareData, files: [file.uri], dialogTitle: "Share PG Hub" });
          return;
        }
        await Share.share({ ...shareData, dialogTitle: "Share PG Hub" });
        return;
      }

      if (navigator.share) {
        if (logoBlob) {
          const file = new File([logoBlob], "pg-hub-logo.png", { type: logoBlob.type || "image/png" });
          if (!navigator.canShare || navigator.canShare({ files: [file] })) {
            await navigator.share({ ...shareData, files: [file] });
            return;
          }
        }
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(`${shareData.text}\n${shareData.url}`);
        toast.success("PG Hub link copied");
      }
    } catch {
      // User cancelled share
    }
  };

  const handleRateApp = () => {
    // Opens Play Store listing (update with actual package name)
    window.open("https://play.google.com/store/apps/details?id=com.sanjay.pgmanagement", "_blank");
  };

  const getRoleBadge = () => {
    if (isAdmin) return { label: "Admin", color: "bg-primary/15 text-primary" };
    if (isOwner) return { label: "Owner", color: "bg-success/15 text-success" };

    return { label: "User", color: "bg-muted text-muted-foreground" };
  };

  const roleBadge = getRoleBadge();
  const subscriptionEndDate = subscription?.expiresAt
    ? new Date(subscription.expiresAt)
    : subscription?.billingCycle === "trial" && subscription.createdAt
      ? addDays(new Date(subscription.createdAt), 7)
      : null;
  const subscriptionPlanKey = subscription?.billingCycle && subscription.billingCycle in SUBSCRIPTION_PLANS
    ? subscription.billingCycle as SubscriptionPlanKey
    : null;
  const subscriptionPlanName = subscriptionPlanKey
    ? SUBSCRIPTION_PLANS[subscriptionPlanKey].name
    : "No active subscription";
  const subscriptionHasEnded = subscription?.status === "expired"
    || Boolean(subscriptionEndDate && subscriptionEndDate.getTime() <= Date.now());

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.04 },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 8 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.25 } },
  };

  if (showHelp) {
    return <HelpFAQ onBack={() => setShowHelp(false)} />;
  }

  return (
    <>
      <motion.div
        className="space-y-2.5 pb-4"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Profile Card & Subscription Banner — 2 cols on Desktop */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-2.5">
          <motion.div variants={itemVariants}>
            <Card className="relative h-full overflow-hidden rounded-2xl border-0 bg-gradient-to-br from-[#0e6ce7] via-[#155bc7] to-[#243b8f] text-white shadow-md">
              <div className="absolute -right-8 -top-10 h-32 w-32 rounded-full bg-white/10" />
              <div className="absolute -bottom-12 right-16 h-28 w-28 rounded-full bg-cyan-300/10" />
              <CardContent className="relative z-10 p-3.5 flex items-center h-full">
                <div className="flex items-center gap-3 w-full">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/15 ring-1 ring-white/25">
                    <User className="h-5 w-5 text-white" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h2 className="truncate text-sm sm:text-base font-bold">{user?.user_metadata?.full_name || user?.email || "Owner"}</h2>
                    {user?.email && <p className="truncate text-[11px] text-blue-100">{user.email}</p>}
                    <div className="mt-0.5 flex items-center gap-1.5">
                      <span className="inline-flex items-center gap-1 rounded-md bg-white/15 px-1.5 py-0.2 text-[10px] font-semibold text-white">
                        <Shield className="h-2.5 w-2.5" />
                        {roleBadge.label}
                      </span>
                      {currentPG && (
                        <span className="truncate text-[11px] text-blue-100">
                          · {currentPG.name}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Subscription Expiry Banner */}
          <motion.div variants={itemVariants}>
            <Card className="h-full rounded-2xl border border-violet-500/20 bg-gradient-to-r from-violet-500/10 via-purple-500/5 to-transparent shadow-xs">
              <CardContent className="p-3 sm:p-3.5 flex items-center justify-between gap-2.5 h-full">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-500/15 text-violet-600 dark:text-violet-300">
                    <Crown className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[9px] font-extrabold uppercase tracking-wider text-muted-foreground">Subscription</p>
                    <p className="truncate text-xs sm:text-sm font-bold">
                      {subscriptionPlanName}
                    </p>
                    <p className="truncate text-[11px] text-muted-foreground mt-0.2">
                      {subscriptionEndDate ? (
                        <>
                          {subscriptionHasEnded
                            ? 'Expired'
                            : subscription?.billingCycle === 'trial' ? 'Trial ends' : 'Renews'} on{' '}
                          <strong className="font-bold text-foreground">{format(subscriptionEndDate, 'dd MMM yyyy')}</strong>
                          {!subscriptionHasEnded && (() => {
                            const daysLeft = Math.max(0, differenceInDays(subscriptionEndDate, new Date()));
                            return ` (${daysLeft} ${daysLeft === 1 ? 'day' : 'days'} left)`;
                          })()}
                        </>
                      ) : (
                        subscription?.status === 'active' ? 'Active subscription' : 'Upgrade to continue'
                      )}
                    </p>
                  </div>
                </div>
                <Button size="sm" variant="outline" className="rounded-xl text-xs font-bold shrink-0 border-violet-500/30 text-violet-600 dark:text-violet-300 hover:bg-violet-500/10 h-7 px-2.5" onClick={() => navigate('/subscription')}>
                  Manage
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Quick Actions Grid — 4 Columns */}
        <motion.div variants={itemVariants} className="grid grid-cols-4 gap-2">
          <button type="button" onClick={() => setPropertiesOpen(true)} className="rounded-2xl border border-border/70 bg-card p-2 sm:p-2.5 text-center shadow-xs hover:border-primary/40 hover:bg-accent/40 transition-all active:scale-95">
            <Building className="mx-auto h-5 w-5 text-blue-600" /><span className="mt-1 block text-[10px] sm:text-xs font-bold">Properties</span>
          </button>
          <button type="button" onClick={() => setReportsOpen(true)} className="rounded-2xl border border-border/70 bg-card p-2 sm:p-2.5 text-center shadow-xs hover:border-primary/40 hover:bg-accent/40 transition-all active:scale-95">
            <FileBarChart className="mx-auto h-5 w-5 text-emerald-600" /><span className="mt-1 block text-[10px] sm:text-xs font-bold">Reports</span>
          </button>
          <button type="button" onClick={() => setAuditOpen(true)} className="rounded-2xl border border-border/70 bg-card p-2 sm:p-2.5 text-center shadow-xs hover:border-primary/40 hover:bg-accent/40 transition-all active:scale-95">
            <FileClock className="mx-auto h-5 w-5 text-amber-500" /><span className="mt-1 block text-[10px] sm:text-xs font-bold">Audit</span>
          </button>
          <button type="button" onClick={() => navigate('/subscription')} className="rounded-2xl border border-border/70 bg-card p-2 sm:p-2.5 text-center shadow-xs hover:border-primary/40 hover:bg-accent/40 transition-all active:scale-95">
            <CreditCard className="mx-auto h-5 w-5 text-violet-600" /><span className="mt-1 block text-[10px] sm:text-xs font-bold">Billing</span>
          </button>
        </motion.div>

        {/* Settings Sections Grid — 1 col on mobile, 2 on tablet, 3 on wide desktop */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2.5 sm:gap-3">
          {/* Preferences */}
          <motion.div variants={itemVariants}>
            <Card className="h-full rounded-2xl border-border/70 shadow-xs">
              <SectionHeader title="Preferences" />
              <CardContent className="p-1 sm:p-1.5">
                <SettingItem
                  icon={isDark ? <Moon className="h-4 w-4 text-primary" /> : <Sun className="h-4 w-4 text-primary" />}
                  label="Dark Mode"
                  description={isDark ? "Dark theme is active" : "Light theme is active"}
                  onClick={() => setTheme(isDark ? "light" : "dark")}
                  trailing={
                    <Switch
                      checked={isDark}
                      onCheckedChange={() => setTheme(isDark ? "light" : "dark")}
                      className="pointer-events-none"
                    />
                  }
                />
                <SettingItem
                  icon={<ContactRound className="h-4 w-4 text-primary" />}
                  label="Tenant Profiles"
                  description="Completed and incomplete tenant profiles"
                  onClick={() => navigate('/tenant-profiles')}
                />
                <SettingItem
                  icon={<Bell className="h-4 w-4 text-primary" />}
                  label="Notifications"
                  description="Manage push notification preferences"
                  onClick={() => setNotificationsOpen(true)}
                />
                <SettingItem
                  icon={<Mic className="h-4 w-4 text-primary" />}
                  label="Voice Assistant Button"
                  description={hideVoice ? "Floating voice button is hidden" : "Floating voice button is visible"}
                  onClick={() => toggleHideVoice()}
                  trailing={
                    <Switch
                      checked={!hideVoice}
                      onCheckedChange={() => toggleHideVoice()}
                      className="pointer-events-none"
                    />
                  }
                />
              </CardContent>
            </Card>
          </motion.div>

          {/* Security & Audit */}
          <motion.div variants={itemVariants}>
            <Card className="h-full rounded-2xl border-border/70 shadow-xs">
              <SectionHeader title="Security & Activity" />
              <CardContent className="p-1 sm:p-1.5">
                <SettingItem
                  icon={<FileClock className="h-4 w-4 text-amber-500" />}
                  label="Audit History"
                  description="Review tenant, room, and payment operation logs"
                  onClick={() => setAuditOpen(true)}
                />
                <SettingItem
                  icon={<Lock className="h-4 w-4 text-primary" />}
                  label="Change Password"
                  description="Verify current password & update"
                  onClick={() => setChangePasswordOpen(true)}
                />
                <SettingItem
                  icon={<ShieldCheck className="h-4 w-4 text-primary" />}
                  label="Login Activity"
                  description="View recent sign-in sessions"
                  onClick={() => setLoginActivityOpen(true)}
                />
              </CardContent>
            </Card>
          </motion.div>

          {/* Support & Share */}
          <motion.div variants={itemVariants}>
            <Card className="h-full rounded-2xl border-border/70 shadow-xs">
              <SectionHeader title="Support" />
              <CardContent className="p-1 sm:p-1.5">
                <SettingItem
                  icon={<HelpCircle className="h-4 w-4 text-primary" />}
                  label="Help & FAQ"
                  description="Get answers to common questions"
                  onClick={() => setShowHelp(true)}
                />
                <SettingItem
                  icon={<Mail className="h-4 w-4 text-primary" />}
                  label="Contact Support"
                  description={SUPPORT_EMAIL}
                  onClick={() => window.open(`mailto:${SUPPORT_EMAIL}`, "_blank")}
                />
                <SettingItem
                  icon={<Star className="h-4 w-4 text-primary" />}
                  label="Rate on Play Store"
                  description="Love the app? Leave a review ⭐"
                  onClick={handleRateApp}
                />
                <SettingItem
                  icon={<Share2 className="h-4 w-4 text-primary" />}
                  label="Share App"
                  description="Recommend to other PG owners"
                  onClick={handleShareApp}
                />
              </CardContent>
            </Card>
          </motion.div>

          {/* Legal */}
          <motion.div variants={itemVariants}>
            <Card className="h-full rounded-2xl border-border/70 shadow-xs">
              <SectionHeader title="Legal" />
              <CardContent className="p-1 sm:p-1.5">
                <SettingItem
                  icon={<ShieldCheck className="h-4 w-4 text-primary" />}
                  label="Privacy & Legal Policies"
                  description="Terms, privacy policy, and licenses"
                  onClick={() => navigate("/legal")}
                />
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Danger Zone */}
        <motion.div variants={itemVariants}>
          <Card className="border-destructive/20">
            <CardContent className="p-1 sm:p-1.5 space-y-0.5">
              <SettingItem
                icon={<LogOut className="h-4 w-4 text-destructive" />}
                label="Sign Out"
                description="Sign out from your account"
                onClick={handleSignOut}
                destructive
              />
              <SettingItem
                icon={<Trash2 className="h-4 w-4 text-destructive" />}
                label="Delete Account"
                description="Permanently delete your account and all PG data"
                onClick={() => setDeleteConfirmOpen(true)}
                destructive
              />
            </CardContent>
          </Card>
        </motion.div>

        {/* App Info */}
        <motion.div variants={itemVariants}>
          <div className="flex flex-col items-center gap-0.5 py-4 text-center">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Smartphone className="h-3.5 w-3.5" />
              <span className="text-xs font-medium">PG HUB</span>
            </div>
            <p className="text-[10px] text-muted-foreground/70">
              Version {APP_VERSION} · Made with ❤️ in India
            </p>
            <p className="text-[9px] text-muted-foreground/50">
              © {new Date().getFullYear()} PG Management. All rights reserved.
            </p>
          </div>
        </motion.div>
      </motion.div>

      <SubscriptionDetailsSheet 
        open={subscriptionSheetOpen} 
        onOpenChange={setSubscriptionSheetOpen} 
        onUpgradeClick={() => setUpgradeOpen(true)}
      />
      <UpgradeDialog open={upgradeOpen} onOpenChange={setUpgradeOpen} />
      {isAdmin && (
        <AdminPaymentApproval open={adminApprovalOpen} onOpenChange={setAdminApprovalOpen} />
      )}
      <NotificationPreferencesSheet open={notificationsOpen} onOpenChange={setNotificationsOpen} />
      <ManagePropertiesSheet open={propertiesOpen} onOpenChange={setPropertiesOpen} />
      <AuditHistorySheet open={auditOpen} onOpenChange={setAuditOpen} />

      <ChangePasswordDialog open={changePasswordOpen} onOpenChange={setChangePasswordOpen} />
      <LoginActivityDialog open={loginActivityOpen} onOpenChange={setLoginActivityOpen} />

      {/* 2-Step Verification Account Deletion Dialog */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="h-5 w-5" />
              Delete Account (2-Step Verification)
            </DialogTitle>
            <DialogDescription className="text-foreground/90 pt-2 font-medium">
              Are you absolutely sure you want to delete your account? This action is permanent and completely irreversible.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 my-2 text-sm">
            <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-4 text-xs text-destructive">
              <p className="font-semibold mb-1">What will be permanently deleted:</p>
              <ul className="list-disc pl-4 space-y-0.5 mt-1">
                <li>All properties (PGs) registered under this account</li>
                <li>All rooms, tenants, payment history, and utility bills data</li>
                <li>Your user profile, settings, and permissions</li>
              </ul>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-semibold">Step 1: Confirm your registered email address</Label>
              <p className="text-xs text-muted-foreground">Type your email: <span className="font-mono text-foreground font-semibold select-all">{user?.email}</span></p>
              <Input
                type="email"
                placeholder="Enter email address"
                value={confirmEmailInput}
                onChange={(e) => setConfirmEmailInput(e.target.value)}
                className="h-10 bg-background/50 rounded-lg text-sm mt-1"
                disabled={isDeleting}
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-semibold">Step 2: Type DELETE to confirm</Label>
              <p className="text-xs text-muted-foreground">Type <span className="font-mono text-foreground font-semibold">DELETE</span> in all capital letters below:</p>
              <Input
                type="text"
                placeholder="Type DELETE"
                value={confirmDeleteText}
                onChange={(e) => setConfirmDeleteText(e.target.value)}
                className="h-10 bg-background/50 rounded-lg text-sm mt-1"
                disabled={isDeleting}
              />
            </div>
          </div>

          <DialogFooter className="mt-4 pt-2 border-t border-border flex sm:justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setDeleteConfirmOpen(false);
                setConfirmEmailInput("");
                setConfirmDeleteText("");
              }}
              disabled={isDeleting}
              className="h-9 text-xs"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteAccount}
              disabled={
                isDeleting ||
                confirmEmailInput.trim().toLowerCase() !== user?.email?.toLowerCase() ||
                confirmDeleteText.trim() !== "DELETE"
              }
              className="h-9 text-xs font-medium"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="animate-spin h-4 w-4 mr-2" />
                  Deleting...
                </>
              ) : (
                "Delete Account & Data"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Sheet open={reportsOpen} onOpenChange={setReportsOpen}>
        <SheetContent 
          side="right" 
          className="w-full max-w-full sm:max-w-xl p-0 [&>button]:hidden bg-slate-50 dark:bg-slate-900"
        >
          <div className="flex flex-col h-full bg-slate-50/50 dark:bg-slate-900/50">
            <SheetHeader className="px-3 pt-3 pb-2 border-b bg-background shrink-0">
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" onClick={() => setReportsOpen(false)} className="h-8 w-8 shrink-0">
                  <ArrowLeft className="h-5 w-5" />
                </Button>
                <SheetTitle className="text-base font-bold text-left flex-1 min-w-0 truncate">
                  Reports & Analytics
                </SheetTitle>
              </div>
            </SheetHeader>
            <div className="flex-1 overflow-y-auto px-1 py-3 bg-background">
              <Reports rooms={rooms} />
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
};
