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
  Home,
  LayoutList,
  CheckCircle,
  Clock as ClockIcon,
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

type Step = 'welcome' | 'features' | 'benefits' | 'plans' | 'payment' | 'setup' | 'success';

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
  {
    icon: Building2,
    title: 'Manage Rooms',
    description: 'Easy room and tenant management with real-time updates',
    color: 'from-purple-500 to-purple-600',
    textColor: 'text-purple-600',
  },
  {
    icon: ReceiptText,
    title: 'Track Rent',
    description: 'Automated rent tracking and instant digital receipts',
    color: 'from-orange-500 to-orange-600',
    textColor: 'text-orange-600',
  },
  {
    icon: TrendingUp,
    title: 'Smart Analytics',
    description: 'Real-time occupancy, payment reminders, and analytics',
    color: 'from-blue-500 to-blue-600',
    textColor: 'text-blue-600',
  },
  {
    icon: Users,
    title: 'Tenant Mgmt',
    description: 'Manage tenants, verify identity, track check-ins',
    color: 'from-green-500 to-green-600',
    textColor: 'text-green-600',
  },
  {
    icon: CreditCard,
    title: 'Collect Rent',
    description: 'Online and offline payment collection tracking',
    color: 'from-pink-500 to-pink-600',
    textColor: 'text-pink-600',
  },
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

  const handleStartPayment = async (planKey: SubscriptionPlanKey) => {
    try {
      setIsCheckingStatus(true);
      await initiatePayment(planKey);
    } catch (error) {
      console.error('Payment error:', error);
      toast.error('Payment failed. Please try again.');
    } finally {
      setIsCheckingStatus(false);
    }
  };

  const nextFeature = () => {
    setDirection(1);
    setCurrentFeature((prev) => (prev + 1) % PREMIUM_FEATURES.length);
  };

  const prevFeature = () => {
    setDirection(-1);
    setCurrentFeature((prev) => (prev - 1 + PREMIUM_FEATURES.length) % PREMIUM_FEATURES.length);
  };

  const renderStep = () => {
    switch (step) {
      case 'welcome':
        return (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="min-h-screen flex flex-col items-center justify-center px-6 py-12"
          >
            {/* Status Bar */}
            <div className="absolute top-0 left-0 right-0 h-8 flex items-center justify-between px-4 text-xs font-medium text-slate-700">
              <span>9:41</span>
              <div className="flex gap-1">
                <span>📶</span>
                <span>📡</span>
                <span>🔋</span>
              </div>
            </div>

            {/* Skip Button */}
            <button
              onClick={() => setStep('setup')}
              className="absolute top-14 left-6 flex items-center gap-2 px-4 py-2 rounded-full bg-white/80 text-slate-600 text-sm font-medium hover:bg-white transition-all"
            >
              Skip <ChevronRight className="w-4 h-4" />
            </button>

            {/* Progress Dots */}
            <div className="absolute top-14 right-6 flex gap-2">
              <div className="w-2 h-2 rounded-full bg-blue-500" />
              <div className="w-2 h-2 rounded-full bg-slate-300" />
              <div className="w-2 h-2 rounded-full bg-slate-300" />
            </div>

            {/* Main Content */}
            <div className="space-y-6 max-w-lg text-center mt-12">
              <motion.h1
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.1 }}
                className="text-5xl font-bold text-slate-900"
              >
                Manage Your PG
                <span className="block text-purple-600">Effortlessly</span>
              </motion.h1>

              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="text-lg text-slate-600"
              >
                Manage rooms, tenants, rent, receipts and reports from one beautiful dashboard.
              </motion.p>

              {/* Stats Grid */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="grid grid-cols-2 gap-3 my-12"
              >
                <div className="bg-gradient-to-br from-purple-100 to-purple-50 rounded-2xl p-4 border border-purple-200">
                  <div className="bg-gradient-to-br from-purple-500 to-purple-600 w-10 h-10 rounded-xl flex items-center justify-center mb-2">
                    <Home className="w-5 h-5 text-white" />
                  </div>
                  <div className="text-2xl font-bold text-slate-900">23</div>
                  <div className="text-xs text-slate-600">Rooms</div>
                </div>

                <div className="bg-gradient-to-br from-orange-100 to-orange-50 rounded-2xl p-4 border border-orange-200">
                  <div className="bg-gradient-to-br from-orange-500 to-orange-600 w-10 h-10 rounded-xl flex items-center justify-center mb-2">
                    <CreditCard className="w-5 h-5 text-white" />
                  </div>
                  <div className="text-2xl font-bold text-slate-900">₹82K</div>
                  <div className="text-xs text-slate-600">Monthly Rent</div>
                </div>

                <div className="bg-gradient-to-br from-blue-100 to-blue-50 rounded-2xl p-4 border border-blue-200">
                  <div className="bg-gradient-to-br from-blue-500 to-blue-600 w-10 h-10 rounded-xl flex items-center justify-center mb-2">
                    <ReceiptText className="w-5 h-5 text-white" />
                  </div>
                  <div className="text-2xl font-bold text-slate-900">12</div>
                  <div className="text-xs text-slate-600">Receipts</div>
                </div>

                <div className="bg-gradient-to-br from-green-100 to-green-50 rounded-2xl p-4 border border-green-200">
                  <div className="bg-gradient-to-br from-green-500 to-green-600 w-10 h-10 rounded-xl flex items-center justify-center mb-2">
                    <Users className="w-5 h-5 text-white" />
                  </div>
                  <div className="text-2xl font-bold text-slate-900">42</div>
                  <div className="text-xs text-slate-600">Tenants</div>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="flex flex-col gap-3"
              >
                <Button
                  onClick={() => setStep('features')}
                  className="w-full h-14 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white font-semibold rounded-full text-lg shadow-lg shadow-purple-500/30 transition-all"
                >
                  Next <ChevronRight className="w-5 h-5 ml-2" />
                </Button>
              </motion.div>
            </div>
          </motion.div>
        );

      case 'features':
        return (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="min-h-screen flex flex-col items-center justify-center px-6 py-12"
          >
            {/* Status Bar */}
            <div className="absolute top-0 left-0 right-0 h-8 flex items-center justify-between px-4 text-xs font-medium text-slate-700">
              <span>9:41</span>
              <div className="flex gap-1">📶 📡 🔋</div>
            </div>

            {/* Skip Button */}
            <button
              onClick={() => setStep('setup')}
              className="absolute top-14 left-6 flex items-center gap-2 px-4 py-2 rounded-full bg-white/80 text-slate-600 text-sm font-medium hover:bg-white transition-all"
            >
              Skip <ChevronRight className="w-4 h-4" />
            </button>

            {/* Progress Dots */}
            <div className="absolute top-14 right-6 flex gap-2">
              <div className="w-2 h-2 rounded-full bg-slate-300" />
              <div className="w-2 h-2 rounded-full bg-purple-500" />
              <div className="w-2 h-2 rounded-full bg-slate-300" />
            </div>

            <div className="space-y-8 max-w-lg w-full mt-12">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="text-center space-y-3"
              >
                <h2 className="text-5xl font-bold text-slate-900">
                  Everything In<span className="block text-purple-600">One Place</span>
                </h2>
                <p className="text-slate-600 text-base">
                  Track occupancy, manage tenants and know every room status instantly.
                </p>
              </motion.div>

              {/* Feature Carousel */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="space-y-4"
              >
                <AnimatePresence mode="wait">
                  <motion.div
                    key={currentFeature}
                    initial={{ opacity: 0, x: direction > 0 ? 50 : -50 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: direction > 0 ? -50 : 50 }}
                    transition={{ duration: 0.3 }}
                  >
                    <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-3xl p-8 border border-slate-200 space-y-6">
                      <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${PREMIUM_FEATURES[currentFeature].color} flex items-center justify-center`}>
                        {(() => {
                          const Icon = PREMIUM_FEATURES[currentFeature].icon;
                          return <Icon className="w-8 h-8 text-white" />;
                        })()}
                      </div>

                      <div className="space-y-2">
                        <h3 className="text-2xl font-bold text-slate-900">
                          {PREMIUM_FEATURES[currentFeature].title}
                        </h3>
                        <p className="text-slate-600 text-sm leading-relaxed">
                          {PREMIUM_FEATURES[currentFeature].description}
                        </p>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-slate-700 text-sm">
                          <Check className="w-4 h-4 text-green-500" />
                          Real-time updates
                        </div>
                        <div className="flex items-center gap-2 text-slate-700 text-sm">
                          <Check className="w-4 h-4 text-green-500" />
                          Instant notifications
                        </div>
                        <div className="flex items-center gap-2 text-slate-700 text-sm">
                          <Check className="w-4 h-4 text-green-500" />
                          Smart analytics
                        </div>
                      </div>
                    </div>
                  </motion.div>
                </AnimatePresence>

                {/* Pagination */}
                <div className="flex justify-center gap-2">
                  {PREMIUM_FEATURES.map((_, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        setDirection(idx > currentFeature ? 1 : -1);
                        setCurrentFeature(idx);
                      }}
                      className={`h-2 rounded-full transition-all ${
                        idx === currentFeature
                          ? 'w-8 bg-purple-600'
                          : 'w-2 bg-slate-300 hover:bg-slate-400'
                      }`}
                    />
                  ))}
                </div>
              </motion.div>

              {/* Navigation */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="flex gap-3 pt-4"
              >
                <Button
                  onClick={() => setStep('welcome')}
                  variant="ghost"
                  className="flex-1 text-slate-600 hover:text-slate-900 hover:bg-slate-200 rounded-full"
                >
                  <ChevronLeft className="w-4 h-4" /> Back
                </Button>
                <Button
                  onClick={() => setStep('benefits')}
                  className="flex-1 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white rounded-full"
                >
                  Next <ChevronRight className="w-4 h-4" />
                </Button>
              </motion.div>
            </div>
          </motion.div>
        );

      case 'benefits':
        return (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="min-h-screen flex flex-col items-center justify-center px-6 py-12"
          >
            {/* Status Bar */}
            <div className="absolute top-0 left-0 right-0 h-8 flex items-center justify-between px-4 text-xs font-medium text-slate-700">
              <span>9:41</span>
              <div className="flex gap-1">📶 📡 🔋</div>
            </div>

            {/* Skip Button */}
            <button
              onClick={() => setStep('setup')}
              className="absolute top-14 left-6 flex items-center gap-2 px-4 py-2 rounded-full bg-white/80 text-slate-600 text-sm font-medium hover:bg-white transition-all"
            >
              Skip <ChevronRight className="w-4 h-4" />
            </button>

            {/* Progress Dots */}
            <div className="absolute top-14 right-6 flex gap-2">
              <div className="w-2 h-2 rounded-full bg-slate-300" />
              <div className="w-2 h-2 rounded-full bg-slate-300" />
              <div className="w-2 h-2 rounded-full bg-purple-500" />
            </div>

            <div className="space-y-8 max-w-lg w-full mt-12">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="text-center space-y-3"
              >
                <h2 className="text-5xl font-bold text-slate-900">
                  Run Your PG<span className="block text-purple-600">Smarter</span>
                </h2>
                <p className="text-slate-600 text-base">
                  Get real-time insights, payment reminders and smart reports to grow your business.
                </p>
              </motion.div>

              {/* Benefits Grid */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="grid grid-cols-2 gap-4"
              >
                {PREMIUM_FEATURES.map((feature, idx) => {
                  const Icon = feature.icon;
                  return (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.2 + idx * 0.1 }}
                      className="bg-white rounded-2xl p-4 border border-slate-200 hover:shadow-lg transition-all"
                    >
                      <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-3`}>
                        <Icon className="w-6 h-6 text-white" />
                      </div>
                      <h3 className="font-semibold text-slate-900 text-sm mb-1">{feature.title}</h3>
                      <p className="text-xs text-slate-600">{feature.description}</p>
                    </motion.div>
                  );
                })}
              </motion.div>

              {/* Navigation */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="flex gap-3 pt-4"
              >
                <Button
                  onClick={() => setStep('features')}
                  variant="ghost"
                  className="flex-1 text-slate-600 hover:text-slate-900 hover:bg-slate-200 rounded-full"
                >
                  <ChevronLeft className="w-4 h-4" /> Back
                </Button>
                <Button
                  onClick={() => setStep('plans')}
                  className="flex-1 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white rounded-full"
                >
                  Continue <ChevronRight className="w-4 h-4" />
                </Button>
              </motion.div>
            </div>
          </motion.div>
        );

      case 'plans':
        return (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="min-h-screen bg-gradient-to-br from-purple-50 via-slate-50 to-blue-50 flex flex-col items-center justify-center px-6 py-12"
          >
            <div className="space-y-12 max-w-5xl w-full">
              {/* Header */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="text-center space-y-3"
              >
                <h2 className="text-5xl font-bold">
                  <span className="text-slate-900">Choose Your </span>
                  <span className="bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">Plan</span>
                </h2>
                <p className="text-lg text-slate-600 max-w-2xl mx-auto">
                  Start with a 30-day free trial. No credit card required. Upgrade or cancel anytime.
                </p>
              </motion.div>

              {/* Plans Cards */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="grid grid-cols-1 sm:grid-cols-3 gap-6"
              >
                {paidPlans.map((planKey, idx) => {
                  const plan = SUBSCRIPTION_PLANS[planKey];
                  const isSelected = selectedPlan === planKey;
                  const isPopular = idx === 1; // Middle card is popular

                  return (
                    <motion.div
                      key={planKey}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.2 + idx * 0.1 }}
                      onClick={() => setSelectedPlan(planKey)}
                      className={`relative rounded-3xl p-8 cursor-pointer transition-all duration-300 ${
                        isSelected
                          ? 'ring-2 ring-purple-600 shadow-2xl scale-105'
                          : 'hover:shadow-lg'
                      } ${
                        isPopular
                          ? 'bg-gradient-to-br from-purple-600 to-blue-600 text-white shadow-xl'
                          : 'bg-white text-slate-900 border border-slate-200 hover:border-purple-300'
                      }`}
                    >
                      {/* Popular Badge */}
                      {isPopular && (
                        <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                          <div className="bg-gradient-to-r from-amber-400 to-orange-400 text-slate-900 px-4 py-1 rounded-full text-sm font-bold">
                            Most Popular
                          </div>
                        </div>
                      )}

                      {/* Plan Name & Icon */}
                      <div className="space-y-4 mb-6">
                        <div className="flex items-center gap-3">
                          {idx === 0 && <Zap className={`w-6 h-6 ${isPopular ? 'text-amber-300' : 'text-orange-500'}`} />}
                          {idx === 1 && <Crown className={`w-6 h-6 ${isPopular ? 'text-amber-300' : 'text-purple-600'}`} />}
                          {idx === 2 && <TrendingUp className={`w-6 h-6 ${isPopular ? 'text-amber-300' : 'text-blue-600'}`} />}
                          <h3 className={`text-2xl font-bold capitalize`}>
                            {plan.name}
                          </h3>
                        </div>
                        <p className={`text-sm ${isPopular ? 'text-purple-100' : 'text-slate-600'}`}>
                          {plan.description}
                        </p>
                      </div>

                      {/* Price */}
                      <div className="space-y-1 mb-8 pb-8 border-b border-opacity-20" style={{ borderColor: isPopular ? 'rgba(255,255,255,0.2)' : undefined }}>
                        <div className="flex items-baseline gap-1">
                          <span className={`text-4xl font-bold`}>
                            {plan.price === 0 ? 'Free' : `₹${plan.price}`}
                          </span>
                          {plan.price > 0 && (
                            <span className={`text-sm font-medium ${isPopular ? 'text-purple-100' : 'text-slate-600'}`}>
                              /{plan.billingCycle}
                            </span>
                          )}
                        </div>
                        {plan.price === 0 && (
                          <p className={`text-sm font-medium ${isPopular ? 'text-purple-100' : 'text-slate-600'}`}>
                            30 days free trial
                          </p>
                        )}
                      </div>

                      {/* Features */}
                      <div className="space-y-3 mb-8">
                        {[
                          `Up to ${idx === 0 ? '1' : idx === 1 ? '3' : '∞'} PG${idx === 0 ? '' : 's'}`,
                          `${idx === 0 ? 'Basic' : idx === 1 ? 'Advanced' : 'Full'} room management`,
                          `${idx === 0 ? 'Email' : 'WhatsApp'} reminders`,
                          idx !== 0 && 'Priority support',
                          idx === 2 && 'Custom reports',
                        ].filter(Boolean).map((feature, featureIdx) => (
                          <div key={featureIdx} className="flex items-center gap-3">
                            <CheckCircle className={`w-5 h-5 flex-shrink-0 ${
                              isPopular ? 'text-amber-300' : 'text-purple-500'
                            }`} />
                            <span className={`text-sm ${isPopular ? 'text-purple-50' : 'text-slate-700'}`}>
                              {feature}
                            </span>
                          </div>
                        ))}
                      </div>

                      {/* CTA Button */}
                      <button
                        onClick={() => setSelectedPlan(planKey)}
                        className={`w-full py-3 px-4 rounded-xl font-semibold transition-all duration-200 ${
                          isSelected || isPopular
                            ? isPopular
                              ? 'bg-white text-purple-600 hover:bg-slate-50'
                              : 'bg-purple-600 text-white hover:bg-purple-700'
                            : 'bg-slate-100 text-slate-900 hover:bg-slate-200'
                        }`}
                      >
                        {isSelected && isPopular ? 'Selected ✓' : isSelected ? 'Selected ✓' : 'Choose Plan'}
                      </button>
                    </motion.div>
                  );
                })}
              </motion.div>

              {/* CTA Buttons */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="flex flex-col gap-3 max-w-xl mx-auto w-full"
              >
                <button
                  onClick={() => handleStartPayment(selectedPlan)}
                  disabled={isCheckingStatus || razorpayLoading}
                  className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-semibold py-4 px-6 rounded-2xl transition-all disabled:opacity-50"
                >
                  {isCheckingStatus || razorpayLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin inline mr-2" />
                      Processing...
                    </>
                  ) : (
                    <>
                      Get Started with {SUBSCRIPTION_PLANS[selectedPlan].name} <ChevronRight className="w-4 h-4 inline ml-2" />
                    </>
                  )}
                </button>
                <button
                  onClick={() => setStep('benefits')}
                  className="w-full text-slate-600 hover:text-slate-900 font-semibold py-3 px-6 rounded-2xl hover:bg-slate-200 transition-all"
                >
                  <ChevronLeft className="w-4 h-4 inline mr-2" /> Back
                </button>
              </motion.div>
            </div>
          </motion.div>
        );

      case 'setup':
        return (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <PGSetupWizard onComplete={onComplete} isAddingNew={true} />
          </motion.div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-purple-50 via-slate-50 to-blue-50 overflow-hidden">
      {/* Animated background shapes */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-20 left-10 w-40 h-40 bg-purple-200/20 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-10 w-40 h-40 bg-blue-200/20 rounded-full blur-3xl" />
      </div>

      <AnimatePresence mode="wait">
        {renderStep()}
      </AnimatePresence>
    </div>
  );
};
