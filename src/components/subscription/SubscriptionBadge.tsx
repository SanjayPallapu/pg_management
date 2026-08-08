import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Crown, AlertTriangle } from "lucide-react";
import { usePG } from "@/contexts/PGContext";
import { useNavigate } from "react-router-dom";
import { differenceInDays } from "date-fns";
import { SUBSCRIPTION_PLANS, type SubscriptionPlanKey } from "@/types/pg";

export const SubscriptionBadge = () => {
  const { subscription, isProUser } = usePG();
  const navigate = useNavigate();

  // Calculate days until expiry
  const daysUntilExpiry = subscription?.expiresAt 
    ? differenceInDays(new Date(subscription.expiresAt), new Date())
    : null;
  
  const isExpiringSoon = daysUntilExpiry !== null && daysUntilExpiry <= 7 && daysUntilExpiry > 0;
  const isExpired = daysUntilExpiry !== null && daysUntilExpiry <= 0;

  if (isExpired || subscription?.status === "expired") {
    return (
      <Badge variant="destructive" className="cursor-pointer" onClick={() => navigate("/subscription")}>
        Expired · Renew
      </Badge>
    );
  }

  if (subscription?.billingCycle === "trial" && subscription?.status === "active") {
    return (
      <Badge variant="outline" onClick={() => navigate("/subscription")} className="cursor-pointer border-violet-300 text-violet-600 dark:text-violet-300">
        <Crown className="mr-1 h-3 w-3" />
        {isExpiringSoon ? `Trial · ${daysUntilExpiry}d` : "Free Trial"}
      </Badge>
    );
  }

  if (isProUser) {
    const planKey = (subscription?.billingCycle || "monthly") as SubscriptionPlanKey;
    const planLabel = SUBSCRIPTION_PLANS[planKey]?.name || "Pro";
    if (isExpiringSoon) {
      return (
        <Badge 
          variant="outline" 
          onClick={() => navigate("/subscription")}
          className="text-amber-600 border-amber-400 bg-amber-50 dark:bg-amber-900/20 cursor-pointer"
        >
          <AlertTriangle className="h-3 w-3 mr-1" />
          {daysUntilExpiry}d left
        </Badge>
      );
    }
    
    return (
      <Badge 
        onClick={() => navigate("/subscription")}
        className="bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0 cursor-pointer"
      >
        <Crown className="h-3 w-3 mr-1" />
        {planLabel}
      </Badge>
    );
  }

  if (subscription?.status === "pending") {
    return <Badge variant="outline" onClick={() => navigate("/subscription")} className="cursor-pointer border-amber-300 text-amber-600">Plan pending</Badge>;
  }

  if (subscription?.plan === "free" || subscription?.status === "free") {
    return <Badge variant="outline" onClick={() => navigate("/subscription")} className="cursor-pointer">Free</Badge>;
  }

  return (
    <Button 
      variant="outline" 
      size="sm" 
      onClick={() => navigate("/subscription")}
      className="text-xs"
    >
      <Crown className="h-3 w-3 mr-1 text-amber-500" />
      Upgrade
    </Button>
  );
};
