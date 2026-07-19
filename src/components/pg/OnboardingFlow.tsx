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
  Building2,
  Users,
  ReceiptText,
  TrendingUp,
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

type Step = 'welcome' | 'features' | 'benefits' | 'plans' | 'payment' | 'setup';

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

const PREMIUM_FEATURES = [
  { icon: Building2, title: 'Manage Rooms & Tenants', description: 'Easy room and tenant management with real-time updates' },
  { icon: ReceiptText, title: 'Track Rent & Digital Receipts', description: 'Automated rent tracking and instant digital receipts' },
  { icon: TrendingUp, title: 'Run Your PG Smarter', description: 'Real-time occupancy, payment reminders, and analytics' },
];

export const OnboardingFlow = ({ onComplete }: OnboardingFlowProps) => {
  const { refreshPGs, subscription, refreshSubscription } = usePG();
  const { signOut, isAdmin } = useAuth();
  const { initiatePayment, isLoading: razorpayLoading } = useRazorpay();
  const [step, setStep] = useState<Step>('welcome');
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlanKey>('monthly');
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);
  const [currentFeature, setCurrentFeature] = useState(0);
  const [direction, setDirection] = useState(0);

  const paidPlans = useMemo(() => SUBSCRIPTION_PLAN_ORDER.filter((key) => key !== 'trial'), []);
  const currentPlan = SUBSCRIPTION_PLANS[selectedPlan];
  const hasActiveTrial = subscription?.billingCycle === 'trial' && subscription?.status === 'active';
  const isSubscriptionActive = subscription?.status === 'active' || subscription?.status === 'free';
  const shouldSkipToSetup = isAdmin || isSubscriptionActive;

  useEffect(() => {
    if (shouldSkipToSetup && step !== 'setup') {
      setStep('setup');
    }
  }, [shouldSkipToSetup, step]);

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Sign out failed:', error);
    }
  };

  const goToNextFeature = () => {
    setDirection(1);
    if (currentFeature < PREMIUM_FEATURES.length - 1) {
      setCurrentFeature(currentFeature + 1);
    } else {
      setStep('plans');
    }
  };

  const goToPrevFeature = () => {
    setDirection(-1);
    if (currentFeature > 0) {
      setCurrentFeature(currentFeature - 1);
    } else {
      setStep('welcome');
    }
  };

  const handlePaymentSuccess = async () => {
    try {
      setIsCheckingStatus(true);
      await new Promise((resolve) => setTimeout(resolve, 1000));
      await refreshSubscription();
    } catch (error) {
      console.error('Payment success check failed:', error);
    } finally {
      setIsCheckingStatus(false);
    }
  };

  const handlePaymentInitiate = async () => {
    try {
      const plan = currentPlan.planKey;
      const result = await initiatePayment(plan);
      if (result && result.success) {
        await handlePaymentSuccess();
      }
    } catch (error) {
      toast.error('Payment initiation failed. Please try again.');
      console.error('Payment error:', error);
    }
  };

  const renderStep = () => {
    switch (step) {
      case 'welcome':
        return (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="flex flex-col items-center justify-center min-h-screen px-6 py-12 text-center space-y-8"
          >
            {/* Floating 3D Building Icon */}
            <motion.div
              animate={{ y: [-20, 20, -20] }}
              transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
              className="mt-12"
            >
              <div className="w-32 h-32 rounded-3xl bg-gradient-to-br from-blue-500 via-cyan-400 to-blue-600 flex items-center justify-center shadow-2xl shadow-blue-500/50">
                <Building2 className="w-16 h-16 text-white" />
              </div>
            </motion.div>

            {/* Content */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
              className="space-y-4 max-w-lg"
            >
              <h1 className="text-6xl font-bold bg-gradient-to-r from-blue-200 via-cyan-200 to-blue-300 bg-clip-text text-transparent leading-tight">
                Welcome to PG Manager
              </h1>
              <p className="text-lg text-slate-300 leading-relaxed">
                Multi-owner PG management with 1 month free trial and auto-renewing subscriptions.
              </p>
            </motion.div>

            {/* CTA Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="flex flex-col gap-3 pt-6 w-full max-w-md"
            >
              <Button
                size="lg"
                onClick={() => {
                  setCurrentFeature(0);
                  setStep('features');
                }}
                className="w-full h-12 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white font-semibold rounded-xl shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 transition-all flex items-center justify-center gap-2"
              >
                Explore Features <ChevronRight className="w-5 h-5" />
              </Button>
              <Button
                variant="ghost"
                onClick={() => setStep('plans')}
                className="w-full h-12 text-slate-300 hover:text-white hover:bg-white/5 rounded-xl border border-white/10"
              >
                View Pricing
              </Button>
              <Button
                variant="ghost"
                onClick={handleSignOut}
                className="w-full gap-2 text-slate-400 hover:text-white hover:bg-white/5 rounded-xl"
              >
                <LogOut className="h-4 w-4" /> Sign Out
              </Button>
            </motion.div>

            {/* Progress indicator */}
            <div className="flex gap-2 mt-12">
              {['welcome', 'features', 'plans'].map((s) => (
                <div
                  key={s}
                  className={`h-1.5 rounded-full transition-all ${s === 'welcome' ? 'w-6 bg-blue-500' : 'w-1.5 bg-white/20'}`}
                />
              ))}
            </div>
          </motion.div>
        );

      case 'features':
        return (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center justify-center min-h-screen px-6 py-12 space-y-8"
          >
            {/* Header */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center space-y-3 max-w-2xl"
            >
              <div className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-white/10 rounded-full border border-white/20 backdrop-blur-sm">
                <Sparkles className="h-4 w-4 text-blue-400" />
                <span className="text-sm font-semibold text-blue-300">CORE FEATURES</span>
              </div>
              <h2 className="text-5xl font-bold text-white">Everything You Need</h2>
              <p className="text-slate-300 text-lg">
                Powerful tools to manage every aspect of your PG efficiently
              </p>
            </motion.div>

            {/* Feature Carousel */}
            <div className="w-full max-w-2xl">
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentFeature}
                  initial={{ opacity: 0, x: direction > 0 ? 50 : -50 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: direction > 0 ? -50 : 50 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-6"
                >
                  {/* Premium Feature Card */}
                  <Card className="overflow-hidden border border-white/10 bg-gradient-to-br from-white/5 to-white/[0.02] backdrop-blur-xl">
                    <CardContent className="p-8 space-y-6" style={{ backgroundColor: 'rgba(255, 0, 0, 0)' }}>
                      {/* Icon + Title */}
                      <div className="space-y-4">
                        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-blue-500/30">
                          {(() => {
                            const Icon = PREMIUM_FEATURES[currentFeature].icon;
                            return <Icon className="h-8 w-8 text-white" />;
                          })()}
                        </div>
                        <div className="text-left">
                          <h3 className="text-3xl font-bold text-white mb-2">
                            {PREMIUM_FEATURES[currentFeature].title}
                          </h3>
                          <p className="text-slate-300 text-base leading-relaxed">
                            {PREMIUM_FEATURES[currentFeature].description}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Pagination Dots */}
                  <div className="flex items-center justify-center gap-2">
                    {PREMIUM_FEATURES.map((_, idx) => (
                      <motion.button
                        key={idx}
                        onClick={() => {
                          setDirection(idx > currentFeature ? 1 : -1);
                          setCurrentFeature(idx);
                        }}
                        className={`rounded-full transition-all ${
                          idx === currentFeature
                            ? 'w-8 h-2.5 bg-gradient-to-r from-blue-500 to-blue-400'
                            : 'w-2.5 h-2.5 bg-white/20 hover:bg-white/40'
                        }`}
                        whileHover={{ scale: 1.1 }}
                      />
                    ))}
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Navigation Buttons */}
            <div className="w-full max-w-2xl flex gap-3 justify-between pt-4">
              <Button
                onClick={goToPrevFeature}
                variant="ghost"
                className="gap-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg"
              >
                <ChevronLeft className="h-4 w-4" /> Back
              </Button>

              <Button
                onClick={goToNextFeature}
                className="gap-2 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white font-semibold rounded-lg shadow-lg shadow-blue-500/20"
              >
                {currentFeature === PREMIUM_FEATURES.length - 1 ? 'View Pricing' : 'Next'} <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            {/* Progress indicator */}
            <div className="flex gap-2 mt-8">
              {['welcome', 'features', 'plans'].map((s) => (
                <div
                  key={s}
                  className={`h-1.5 rounded-full transition-all ${s === 'features' ? 'w-6 bg-blue-500' : 'w-1.5 bg-white/20'}`}
                />
              ))}
            </div>
          </motion.div>
        );

      case 'plans':
        return (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6 max-w-3xl mx-auto py-12"
          >
            <div className="text-center mb-8">
              <Badge variant="secondary" className="mb-4">
                <Crown className="h-3 w-3 mr-1" /> Pricing
              </Badge>
              <h2 className="text-3xl font-bold text-white">Start free, then choose your billing cycle</h2>
              <p className="text-slate-400 mt-2">Every owner gets 1 month free trial. Paid plans auto-renew through Razorpay.</p>
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
                <ChevronLeft className="mr-2 h-4 w-4" /> Back
              </Button>
              <Button
                size="lg"
                onClick={() => setStep('payment')}
                disabled={!currentPlan}
                className="flex-1 gap-2"
              >
                Continue <ChevronRight className="h-4 w-4" />
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
            className="space-y-6 max-w-2xl mx-auto py-12"
          >
            <div className="text-center mb-8">
              <Badge className="mb-4">
                <CreditCard className="h-3 w-3 mr-1" /> Payment
              </Badge>
              <h2 className="text-2xl font-bold text-white">Complete Your Purchase</h2>
              <p className="text-gray-400 mt-2">Secure payment through Razorpay</p>
            </div>

            <Card className="border-white/[0.08] bg-white/[0.03]">
              <CardContent className="pt-6 space-y-4">
                <div className="flex justify-between items-center pb-4 border-b border-white/[0.08]">
                  <span className="text-gray-400">Plan:</span>
                  <span className="font-semibold text-white">{currentPlan?.name}</span>
                </div>
                <div className="flex justify-between items-center pb-4 border-b border-white/[0.08]">
                  <span className="text-gray-400">Billing Cycle:</span>
                  <span className="font-semibold text-white">{currentPlan?.periodLabel}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Amount:</span>
                  <span className="text-2xl font-bold text-white">₹{currentPlan?.price}</span>
                </div>
              </CardContent>
            </Card>

            <div className="flex gap-3">
              <Button variant="ghost" onClick={() => setStep('plans')} className="flex-1">
                <ChevronLeft className="mr-2 h-4 w-4" /> Back
              </Button>
              <Button
                size="lg"
                onClick={handlePaymentInitiate}
                disabled={razorpayLoading || isCheckingStatus}
                className="flex-1 gap-2"
              >
                {razorpayLoading || isCheckingStatus ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Processing...
                  </>
                ) : (
                  <>
                    Pay Now <ChevronRight className="h-4 w-4" />
                  </>
                )}
              </Button>
            </div>
          </motion.div>
        );

      case 'setup':
        return <PGSetupWizard onComplete={onComplete} />;

      default:
        return null;
    }
  };

  return (
    <div className="relative min-h-screen w-full bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 overflow-hidden">
      {/* Animated background gradients */}
      <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full bg-gradient-to-br from-blue-600/20 to-transparent opacity-40 blur-[120px] pointer-events-none animate-pulse" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[600px] h-[600px] rounded-full bg-gradient-to-br from-cyan-600/20 to-transparent opacity-30 blur-[120px] pointer-events-none animate-pulse" style={{ animationDelay: '2s' }} />
      <div className="absolute top-[50%] left-[50%] -translate-x-1/2 w-[400px] h-[400px] rounded-full bg-gradient-to-br from-slate-600/10 to-transparent opacity-20 blur-[100px] pointer-events-none" />

      {/* Content */}
      <div className="relative z-10 w-full">
        <AnimatePresence mode="wait">
          {renderStep()}
        </AnimatePresence>
      </div>
    </div>
  );
};
