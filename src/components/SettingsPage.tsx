import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
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
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { usePG } from "@/contexts/PGContext";
import { useTheme } from "@/components/ThemeProvider";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { SubscriptionDetailsSheet } from "@/components/subscription";
import { motion } from "framer-motion";

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

  const isDark = theme === "dark";

  const handleSignOut = async () => {
    await signOut();
    toast.success("Signed out successfully");
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
        toast.success("Link copied to clipboard!");
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
          <Card className="overflow-hidden border-primary/15 bg-gradient-to-br from-primary/8 via-card to-card">
            <CardContent className="p-5">
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
                onClick={() => toast.info("Notification settings coming soon")}
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
                onClick={() => toast.info("Switch PG from the top-left dropdown")}
              />
              {isAdmin && (
                <SettingItem
                  icon={<Users className="h-4 w-4 text-primary" />}
                  label="Staff Management"
                  description="Add or manage staff access"
                  onClick={() => toast.info("Staff management coming soon")}
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
                onClick={() => toast.info("Password change coming soon")}
              />
              <SettingItem
                icon={<ShieldCheck className="h-4 w-4 text-primary" />}
                label="Login Activity"
                description="View recent sign-in sessions"
                onClick={() => toast.info("Login activity coming soon")}
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
                onClick={() => window.open(`mailto:${SUPPORT_EMAIL}?subject=Help%20Request`, "_blank")}
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
            <CardContent className="p-2">
              <SettingItem
                icon={<LogOut className="h-4 w-4 text-destructive" />}
                label="Sign Out"
                description="Sign out from your account"
                onClick={handleSignOut}
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
    </>
  );
};
