import { useState, useEffect } from "react";
import { format } from "date-fns";
import type { Room } from "@/types";
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
  ContactRound,
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

import { ChangePasswordDialog } from "./settings/ChangePasswordDialog";
import { LoginActivityDialog } from "./settings/LoginActivityDialog";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";

const APP_VERSION = "1.0.0";
const SUPPORT_EMAIL = "support@pgmanager.in";

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
      const { error } = await (supabase as any).rpc('delete_user_account');
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
    } catch (err: any) {
      console.error("Account deletion failed:", err);
      toast.error(err?.message || "Failed to delete account. Please contact support.");
    } finally {
      setIsDeleting(false);
      setDeleteConfirmOpen(false);
      setConfirmEmailInput("");
      setConfirmDeleteText("");
    }
  };

  const isDark = theme === "dark";

  const handleSignOut = async () => {
    await signOut();
    window.location.replace("/onboarding");
  };

  const handleShareApp = async () => {
    const shareData = {
      title: "PG HUB",
      text: "Manage your PG/Hostel easily with PG HUB - Track tenants, collect rent, send reminders!",
      url: "https://pgmanager.app",
    };
    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(shareData.url);
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
        className="space-y-4 pb-8"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <motion.div variants={itemVariants} className="px-1 pt-1">
          <h1 className="text-xl font-black tracking-tight">Settings</h1>
          <p className="text-xs text-muted-foreground">Manage your property, account, and preferences</p>
        </motion.div>

        {/* Profile Card */}
        <motion.div variants={itemVariants}>
          <Card className="relative overflow-hidden rounded-3xl border-0 bg-gradient-to-br from-[#0e6ce7] via-[#155bc7] to-[#243b8f] text-white shadow-lg shadow-blue-900/15">
            <div className="absolute -right-8 -top-10 h-32 w-32 rounded-full bg-white/10" />
            <div className="absolute -bottom-12 right-16 h-28 w-28 rounded-full bg-cyan-300/10" />
            <CardContent className="relative z-10 p-5">
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/25">
                  <User className="h-7 w-7 text-white" />
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="truncate text-base font-bold">{user?.user_metadata?.full_name || user?.email || "Owner"}</h2>
                  {user?.email && <p className="truncate text-xs text-blue-100">{user.email}</p>}
                  <div className="mt-1 flex items-center gap-2">
                    <span className="inline-flex items-center gap-1 rounded-md bg-white/15 px-2 py-0.5 text-[11px] font-semibold text-white">
                      <Shield className="h-3 w-3" />
                      {roleBadge.label}
                    </span>
                    {currentPG && (
                      <span className="truncate text-xs text-blue-100">
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
          <Card className="rounded-2xl border border-violet-500/20 bg-gradient-to-r from-violet-500/10 via-purple-500/5 to-transparent shadow-xs">
            <CardContent className="p-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-500/15 text-violet-600 dark:text-violet-300">
                  <Crown className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">Subscription</p>
                  <p className="truncate text-sm font-bold">
                    {subscription?.billingCycle === 'trial' ? 'Free Trial' : (subscription?.status === 'active' ? 'Pro Plan' : 'Free Plan')}
                  </p>
                  <p className="truncate text-xs text-muted-foreground mt-0.5">
                    {subscription?.expiresAt ? (
                      <>Expires on <strong className="font-bold text-foreground">{format(new Date(subscription.expiresAt), 'dd MMM yyyy')}</strong></>
                    ) : (
                      'No active expiration date'
                    )}
                  </p>
                </div>
              </div>
              <Button size="sm" variant="outline" className="rounded-xl text-xs font-bold shrink-0 border-violet-500/30 text-violet-600 dark:text-violet-300 hover:bg-violet-500/10" onClick={() => navigate('/subscription')}>
                Manage
              </Button>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={itemVariants} className="grid grid-cols-3 gap-2">
          <button type="button" onClick={() => setPropertiesOpen(true)} className="rounded-2xl border border-border/70 bg-card p-3 text-center shadow-sm transition-all active:scale-95">
            <Building className="mx-auto h-5 w-5 text-blue-600" /><span className="mt-2 block text-[10px] font-bold">Properties</span>
          </button>
          <button type="button" onClick={() => setReportsOpen(true)} className="rounded-2xl border border-border/70 bg-card p-3 text-center shadow-sm transition-all active:scale-95">
            <FileBarChart className="mx-auto h-5 w-5 text-emerald-600" /><span className="mt-2 block text-[10px] font-bold">Reports</span>
          </button>
          <button type="button" onClick={() => navigate('/subscription')} className="rounded-2xl border border-border/70 bg-card p-3 text-center shadow-sm transition-all active:scale-95">
            <CreditCard className="mx-auto h-5 w-5 text-violet-600" /><span className="mt-2 block text-[10px] font-bold">Billing</span>
          </button>
        </motion.div>

        {/* Preferences */}
        <motion.div variants={itemVariants}>
          <Card className="rounded-2xl border-border/70 shadow-sm">
            <SectionHeader title="Preferences" />
            <CardContent className="p-2">
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
            </CardContent>
          </Card>
        </motion.div>

        {/* Security */}
        <motion.div variants={itemVariants}>
          <Card className="rounded-2xl border-border/70 shadow-sm">
            <SectionHeader title="Security" />
            <CardContent className="p-2">
              <SettingItem
                icon={<Lock className="h-4 w-4 text-primary" />}
                label="Change Password"
                description="Update your account password"
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
          <Card className="rounded-2xl border-border/70 shadow-sm">
            <SectionHeader title="Support" />
            <CardContent className="p-2">
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
          <Card className="rounded-2xl border-border/70 shadow-sm">
            <SectionHeader title="Legal" />
            <CardContent className="p-2">
              <SettingItem
                icon={<ShieldCheck className="h-4 w-4 text-primary" />}
                label="Privacy & Legal Policies"
                onClick={() => navigate("/legal")}
              />
            </CardContent>
          </Card>
        </motion.div>

        {/* Danger Zone */}
        <motion.div variants={itemVariants}>
          <Card className="border-destructive/20">
            <CardContent className="p-2 space-y-1">
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
          <div className="flex flex-col items-center gap-1 py-6 text-center">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Smartphone className="h-4 w-4" />
              <span className="text-xs font-medium">PG HUB</span>
            </div>
            <p className="text-[11px] text-muted-foreground/70">
              Version {APP_VERSION} · Made with ❤️ in India
            </p>
            <p className="text-[10px] text-muted-foreground/50 mt-1">
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
