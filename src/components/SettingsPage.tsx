import { useState } from "react";
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
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { usePG } from "@/contexts/PGContext";
import { useTheme } from "@/components/ThemeProvider";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { SubscriptionDetailsSheet } from "@/components/subscription";
import { motion } from "framer-motion";
import { ThreeDScene } from "@/components/ThreeDScene";

const APP_VERSION = "1.0.0";
const SUPPORT_EMAIL = "support@pgmanagement.app";

interface SettingItemProps {
  icon: React.ReactNode;
  label: string;
  description?: string;
  onClick?: () => void;
  trailing?: React.ReactNode;
  destructive?: boolean;
}

const SettingItem = ({ icon, label, description, onClick, trailing, destructive }: SettingItemProps) => (
  <button
    type="button"
    onClick={onClick}
    className={`flex w-full items-center gap-3 rounded-xl px-4 py-3.5 text-left transition-all active:scale-[0.98] ${
      destructive
        ? "hover:bg-destructive/10 text-destructive"
        : "hover:bg-accent/60"
    }`}
  >
    <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
      destructive ? "bg-destructive/10" : "bg-primary/10"
    }`}>
      {icon}
    </div>
    <div className="min-w-0 flex-1">
      <p className={`text-sm font-medium ${destructive ? "text-destructive" : "text-foreground"}`}>{label}</p>
      {description && <p className="text-xs text-muted-foreground mt-0.5 truncate">{description}</p>}
    </div>
    {trailing || (onClick && <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />)}
  </button>
);

const SectionHeader = ({ title }: { title: string }) => (
  <div className="px-4 pb-1 pt-5">
    <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</h3>
  </div>
);

export const SettingsPage = () => {
  const { user, isAdmin, isOwner, isStaff, role, signOut } = useAuth();
  const { currentPG } = usePG();
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();
  const [subscriptionSheetOpen, setSubscriptionSheetOpen] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

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
      const { error } = await supabase.rpc('delete_user_account');
      if (error) {
        console.warn("RPC account deletion failed, attempting client-side data wipe fallback:", error.message);
        
        // Cascade fallback - delete properties (cascades to rooms/tenants under user RLS)
        const { error: deletePgsError } = await supabase.from('pgs').delete().eq('owner_id', user?.id);
        if (deletePgsError) throw deletePgsError;
        
        // Clean up profile
        await supabase.from('profiles').delete().eq('user_id', user?.id);
      }
      
      await signOut();
      window.location.href = "/auth";
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
    window.location.href = "/auth";
  };

  const handleShareApp = async () => {
    const shareData = {
      title: "PG Manager",
      text: "Manage your PG/Hostel easily with PG Manager - Track tenants, collect rent, send reminders!",
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
    if (isStaff) return { label: "Staff", color: "bg-pending/15 text-pending" };
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
        className="space-y-2"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Profile Card */}
        <motion.div variants={itemVariants}>
          <Card className="overflow-hidden border-primary/15 bg-gradient-to-br from-primary/8 via-card to-card relative">
            {/* 3D Background */}
            <div className="absolute right-0 top-0 h-full w-32 opacity-40">
              <ThreeDScene variant="orbs" className="h-full w-full" />
            </div>
            <CardContent className="p-5 relative z-10">
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary/15 ring-2 ring-primary/20">
                  <User className="h-7 w-7 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="truncate text-base font-bold">{user?.email || "User"}</h2>
                  <div className="mt-1 flex items-center gap-2">
                    <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-semibold ${roleBadge.color}`}>
                      <Shield className="h-3 w-3" />
                      {roleBadge.label}
                    </span>
                    {currentPG && (
                      <span className="truncate text-xs text-muted-foreground">
                        · {currentPG.name}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Preferences */}
        <motion.div variants={itemVariants}>
          <Card>
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
                icon={<Bell className="h-4 w-4 text-primary" />}
                label="Notifications"
                description="Manage push notification preferences"
                onClick={() => {}}
              />
            </CardContent>
          </Card>
        </motion.div>

        {/* PG Management */}
        <motion.div variants={itemVariants}>
          <Card>
            <SectionHeader title="PG Management" />
            <CardContent className="p-2">
              <SettingItem
                icon={<Building className="h-4 w-4 text-primary" />}
                label="Manage Properties"
                description={currentPG ? `Current: ${currentPG.name}` : "Setup your PG"}
                onClick={() => {}}
              />
              {isAdmin && (
                <SettingItem
                  icon={<Users className="h-4 w-4 text-primary" />}
                  label="Staff Management"
                  description="Add or manage staff access"
                  onClick={() => {}}
                />
              )}
              <SettingItem
                icon={<CreditCard className="h-4 w-4 text-primary" />}
                label="Subscription"
                description="View plan & billing details"
                onClick={() => setSubscriptionSheetOpen(true)}
              />
            </CardContent>
          </Card>
        </motion.div>

        {/* Security */}
        <motion.div variants={itemVariants}>
          <Card>
            <SectionHeader title="Security" />
            <CardContent className="p-2">
              <SettingItem
                icon={<Lock className="h-4 w-4 text-primary" />}
                label="Change Password"
                description="Update your account password"
                onClick={() => {}}
              />
              <SettingItem
                icon={<ShieldCheck className="h-4 w-4 text-primary" />}
                label="Login Activity"
                description="View recent sign-in sessions"
                onClick={() => {}}
              />
            </CardContent>
          </Card>
        </motion.div>

        {/* Support & Share */}
        <motion.div variants={itemVariants}>
          <Card>
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
          <Card>
            <SectionHeader title="Legal" />
            <CardContent className="p-2">
              <SettingItem
                icon={<ShieldCheck className="h-4 w-4 text-primary" />}
                label="Privacy Policy"
                onClick={() => navigate("/legal#privacy")}
              />
              <SettingItem
                icon={<FileText className="h-4 w-4 text-primary" />}
                label="Terms & Conditions"
                onClick={() => navigate("/legal#terms")}
              />
              <SettingItem
                icon={<FileText className="h-4 w-4 text-primary" />}
                label="Refund Policy"
                onClick={() => navigate("/legal#refunds")}
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
              <span className="text-xs font-medium">PG Manager</span>
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

      <SubscriptionDetailsSheet open={subscriptionSheetOpen} onOpenChange={setSubscriptionSheetOpen} />

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
                <li>Your user profile, settings, and staff/owner permissions</li>
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
    </>
  );
};
