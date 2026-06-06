import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import featureMultiPG from '@/assets/features/multi-pg.png';
import featureTenants from '@/assets/features/tenant-tracking.png';
import featureReceipts from '@/assets/features/smart-receipts.png';
import featureReminders from '@/assets/features/payment-reminders.png';
import featureReports from '@/assets/features/daily-reports.png';
import featureUPI from '@/assets/features/upi-payments.png';
import {
  Crown,
  Check,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  Loader2,
  Clock,
  LogOut,
  Zap,
  CreditCard,
} from 'lucide-react';
import { PGSetupWizard } from './PGSetupWizard';
import { usePG } from '@/contexts/PGContext';
import { useRazorpay } from '@/hooks/useRazorpay';
import { useAuth } from '@/hooks/useAuth';
import { SUBSCRIPTION_PLANS, SUBSCRIPTION_PLAN_ORDER, type SubscriptionPlanKey } from '@/types/pg';
import { toast } from 'sonner';

interface OnboardingFlowProps {
  onComplete: () => void;
}

type Step = 'welcome' | 'features' | 'plans' | 'payment' | 'setup';

const FEATURES = [
  {
    image: featureMultiPG,
    title: 'Multi-PG Management',
    description: 'Manage multiple PGs from a single dashboard',
  },
  {
    image: featureTenants,
    title: 'Tenant Tracking',
    description: 'Track all tenants, rooms, and occupancy',
  },
  {
    image: featureReceipts,
    title: 'Smart Receipts',
    description: 'Generate beautiful payment receipts instantly',
  },
  {
    image: featureReminders,
    title: 'Payment Reminders',
    description: 'Send image-based reminders via WhatsApp',
  },
  {
    image: featureReports,
    title: 'Daily Reports',
    description: 'Get daily activity summary with all collections',
  },
  {
    image: featureUPI,
    title: 'Online Collections',
    description: 'Collect subscription payments using Razorpay auto-renewal',
  },
];

export const OnboardingFlow = ({ onComplete }: OnboardingFlowProps) => {
  const { refreshPGs, subscription, refreshSubscription } = usePG();
  const { signOut, isAdmin } = useAuth();
  const { initiatePayment, isLoading: razorpayLoading } = useRazorpay();
  const [step, setStep] = useState<Step>('welcome');
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlanKey>('monthly');
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);

  const paidPlans = useMemo(() => SUBSCRIPTION_PLAN_ORDER.filter((key) => key !== 'trial'), []);
  const currentPlan = SUBSCRIPTION_PLANS[selectedPlan];
  const hasActiveTrial = subscription?.billingCycle === 'trial' && subscription?.status === 'active';
  const isSubscriptionActive = subscription?.status === 'active';
  const shouldSkipToSetup = isAdmin || isSubscriptionActive;

  useEffect(() => {
    if (shouldSkipToSetup && step !== 'setup') {
      setStep('setup');
    }
  }, [shouldSkipToSetup, step]);

  const handleSignOut = async () => {
    await signOut();
    window.location.reload();
  };

  const handleCheckStatus = async () => {
    setIsCheckingStatus(true);
    try {
      await refreshSubscription();
      toast.success('Subscription refreshed');
    } catch {
      toast.error('Failed to refresh subscription');
    } finally {
      setIsCheckingStatus(false);
    }
  };

  const handleSetupComplete = () => {
    refreshPGs();
    onComplete();
  };

  const effectiveStep = shouldSkipToSetup ? 'setup' : step;

  const renderStep = () => {
    switch (effectiveStep) {
      case 'welcome':
        return (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="text-center space-y-6 max-w-md mx-auto"
          >
            <div className="flex justify-center">
              <img src="/lovable-uploads/4750b6dd-66dc-43e5-9618-00293cb0be71.jpg" alt="PG Manager" className="h-28 w-28 rounded-2xl object-cover shadow-lg" />
            </div>

            <div>
              <h1 className="text-3xl font-bold mb-2">Welcome to PG Manager</h1>
              <p className="text-muted-foreground">
                Multi-owner PG management with 1 month free trial and auto-renewing subscriptions.
              </p>
            </div>

            <div className="flex flex-col gap-3 pt-4">
              <Button size="lg" onClick={() => setStep('features')} className="w-full">
                Get Started <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
              <Button variant="ghost" onClick={handleSignOut} className="w-full gap-2 text-muted-foreground">
                <LogOut className="h-4 w-4" /> Sign Out
              </Button>
            </div>
          </motion.div>
        );

      case 'features':
        return (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6 max-w-2xl mx-auto"
          >
            <div className="text-center mb-8">
              <Badge className="mb-4">
                <Sparkles className="h-3 w-3 mr-1" /> Features
              </Badge>
              <h2 className="text-2xl font-bold">Everything you need to manage your PG</h2>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {FEATURES.map((feature, index) => (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card className="h-full hover:border-primary/50 transition-colors">
                    <CardContent className="pt-4 text-center">
                      <div className="h-14 w-14 rounded-2xl mx-auto mb-3 overflow-hidden shadow-md">
                        <img src={feature.image} alt={feature.title} className="h-full w-full object-cover" />
                      </div>
                      <h3 className="font-semibold text-sm mb-1">{feature.title}</h3>
                      <p className="text-xs text-muted-foreground">{feature.description}</p>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>

            <div className="flex justify-center gap-3 pt-4">
              <Button variant="ghost" onClick={() => setStep('welcome')}>
                <ChevronLeft className="mr-1 h-4 w-4" /> Back
              </Button>
              <Button size="lg" onClick={() => setStep('plans')}>
                View Plans <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </motion.div>
        );

      case 'plans':
        return (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6 max-w-3xl mx-auto"
          >
            <div className="text-center mb-8">
              <Badge variant="secondary" className="mb-4">
                <Crown className="h-3 w-3 mr-1" /> Pricing
              </Badge>
              <h2 className="text-2xl font-bold">Start free, then choose your billing cycle</h2>
              <p className="text-muted-foreground mt-2">Every owner gets 1 month free trial. Paid plans auto-renew through Razorpay.</p>
            </div>

            <Card className="border-primary ring-2 ring-primary/20 bg-primary/5">
              <CardContent className="pt-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-xl font-bold">{SUBSCRIPTION_PLANS.trial.name}</h3>
                    <p className="text-sm text-muted-foreground mt-1">{SUBSCRIPTION_PLANS.trial.description}</p>
                  </div>
                  <div className="text-right">
                    <div className="text-3xl font-bold">Free</div>
                    <div className="text-sm text-muted-foreground">{SUBSCRIPTION_PLANS.trial.periodLabel}</div>
                  </div>
                </div>
                <ul className="space-y-2 mt-4 text-sm">
                  <li className="flex items-center gap-2"><Check className="h-4 w-4 text-primary" /> Unlimited PGs, rooms, and tenants during trial</li>
                  <li className="flex items-center gap-2"><Check className="h-4 w-4 text-primary" /> All reminder, AC bill, analytics, and receipt features unlocked</li>
                  <li className="flex items-center gap-2"><Check className="h-4 w-4 text-primary" /> Upgrade anytime to keep auto-renewal active</li>
                </ul>
              </CardContent>
            </Card>

            <div className="grid md:grid-cols-3 gap-4">
              {paidPlans.map((planKey) => {
                const plan = SUBSCRIPTION_PLANS[planKey];
                const isSelected = selectedPlan === planKey;
                return (
                  <Card
                    key={planKey}
                    className={`relative cursor-pointer transition-all ${isSelected ? 'border-primary ring-2 ring-primary/20' : 'hover:border-primary/50'}`}
                    onClick={() => setSelectedPlan(planKey)}
                  >
                    {planKey === 'yearly' && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                        <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0">
                          Best Value
                        </Badge>
                      </div>
                    )}
                    <CardContent className="pt-6">
                      <h3 className="text-xl font-bold mb-2">{plan.name}</h3>
                      <div className="text-3xl font-bold mb-4">
                        ₹{plan.price} <span className="text-sm font-normal text-muted-foreground">{plan.periodLabel}</span>
                      </div>
                      <p className="text-sm text-muted-foreground mb-4">{plan.description}</p>
                      <ul className="space-y-2 text-sm">
                        <li className="flex items-center gap-2"><Check className="h-4 w-4 text-primary" /> Unlimited PG owners</li>
                        <li className="flex items-center gap-2"><Check className="h-4 w-4 text-primary" /> Auto-renewing billing</li>
                        <li className="flex items-center gap-2"><Check className="h-4 w-4 text-primary" /> Full Pro feature access</li>
                      </ul>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            <div className="flex gap-3">
              <Button variant="ghost" onClick={() => setStep('features')} className="flex-1">
                <ChevronLeft className="mr-1 h-4 w-4" /> Back
              </Button>
              <Button size="lg" onClick={() => setStep('payment')} className="flex-[2]">
                Continue - ₹{currentPlan.price}
              </Button>
            </div>
          </motion.div>
        );

      case 'payment':
        return (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6 max-w-md mx-auto"
          >
            <div className="text-center mb-4">
              <Badge variant="secondary" className="mb-4">
                <CreditCard className="h-3 w-3 mr-1" /> Subscription Checkout
              </Badge>
              <h2 className="text-2xl font-bold">{currentPlan.name} - ₹{currentPlan.price}</h2>
              <p className="text-sm text-muted-foreground mt-2">
                {hasActiveTrial ? 'Your free trial is already active. Authorize auto-renewal for later billing.' : 'You will start with a 1 month free trial, then billing begins automatically.'}
              </p>
            </div>

            <Card className="border-border">
              <CardContent className="pt-4 space-y-3 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Trial</span><span>1 month free</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">After trial</span><span>{currentPlan.periodLabel === '/month' ? `₹${currentPlan.price} every month` : currentPlan.periodLabel === '/3 months' ? `₹${currentPlan.price} every 3 months` : `₹${currentPlan.price} every year`}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Billing</span><span>Auto-renewing</span></div>
              </CardContent>
            </Card>

            <Button
              className="w-full gap-2 py-6 text-base"
              onClick={() => {
                initiatePayment({
                  plan: selectedPlan,
                  onSuccess: async () => {
                    await refreshSubscription();
                    setStep('setup');
                  },
                });
              }}
              disabled={razorpayLoading}
            >
              {razorpayLoading ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Starting Checkout...</>
              ) : (
                <><Zap className="h-5 w-5" /> Continue with Razorpay</>
              )}
            </Button>

            <div className="flex gap-3">
              <Button variant="ghost" onClick={() => setStep('plans')} className="flex-1">Back</Button>
              <Button variant="outline" onClick={handleCheckStatus} disabled={isCheckingStatus} className="flex-1">
                {isCheckingStatus ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Refreshing...</> : 'Refresh Status'}
              </Button>
            </div>
          </motion.div>
        );

      case 'setup':
        return (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
          >
            <PGSetupWizard onComplete={handleSetupComplete} />
          </motion.div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <AnimatePresence mode="wait">
        {renderStep()}
      </AnimatePresence>
    </div>
  );
};
