import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Building,
  Users,
  Receipt,
  Bell,
  BarChart3,
  Smartphone,
  Crown,
  Check,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  Copy,
  Upload,
  Loader2,
  MessageCircle,
  Wallet,
  CreditCard,
  Clock,
  LogOut,
  Zap,
} from 'lucide-react';
import { PGSetupWizard } from './PGSetupWizard';
import { usePG } from '@/contexts/PGContext';
import { useSubscription } from '@/hooks/useSubscription';
import { useRazorpay } from '@/hooks/useRazorpay';
import { useAuth } from '@/hooks/useAuth';
import { SUBSCRIPTION_PLANS, ADMIN_UPI_ID, PAYMENT_METHODS, ADMIN_WHATSAPP } from '@/types/pg';
import { toast } from 'sonner';

interface OnboardingFlowProps {
  onComplete: () => void;
}

type Step = 'welcome' | 'features' | 'plans' | 'payment' | 'pending' | 'setup';

const FEATURES = [
  {
    icon: Building,
    title: 'Multi-PG Management',
    description: 'Manage multiple PGs from a single dashboard',
  },
  {
    icon: Users,
    title: 'Tenant Tracking',
    description: 'Track all tenants, rooms, and occupancy',
  },
  {
    icon: Receipt,
    title: 'Smart Receipts',
    description: 'Generate beautiful payment receipts instantly',
  },
  {
    icon: Bell,
    title: 'Payment Reminders',
    description: 'Send image-based reminders via WhatsApp',
  },
  {
    icon: BarChart3,
    title: 'Daily Reports',
    description: 'Get daily activity summary with all collections',
  },
  {
    icon: Smartphone,
    title: 'UPI-First Payments',
    description: 'Accept payments via UPI, GPay, PhonePe',
  },
];

const PAYMENT_ICONS = {
  upi: Smartphone,
  gpay: Wallet,
  phonepe: CreditCard,
  paytm: Smartphone,
};

export const OnboardingFlow = ({ onComplete }: OnboardingFlowProps) => {
  const { refreshPGs, subscription, refreshSubscription, pgs } = usePG();
  const { createPaymentRequest, uploadPaymentScreenshot, isUploading, isPending } = useSubscription();
  const { signOut, isAdmin } = useAuth();
  const { initiatePayment, isLoading: razorpayLoading } = useRazorpay();
  const [step, setStep] = useState<Step>('welcome');
  const [selectedPlan, setSelectedPlan] = useState<'manual' | 'automatic'>('manual');
  const [selectedMethod, setSelectedMethod] = useState<string | null>(null);
  const [screenshotUrl, setScreenshotUrl] = useState<string | null>(null);
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);

  // Admins skip the payment flow entirely - go straight to setup
  // Active subscribers also skip to setup
  const isSubscriptionActive = subscription?.status === 'active';
  const shouldSkipToSetup = isAdmin || isSubscriptionActive;

  // Effect to redirect admins/active subscribers to setup
  useEffect(() => {
    if (shouldSkipToSetup && step !== 'setup') {
      setStep('setup');
    }
  }, [shouldSkipToSetup, step]);

  const handleSignOut = async () => {
    await signOut();
    window.location.reload();
  };

  const currentPlan = SUBSCRIPTION_PLANS[selectedPlan];

  // Determine effective step:
  // 1. Admin users or active subscribers go to setup
  // 2. Pending subscription shows pending step
  // 3. Otherwise show current step in flow
  const effectiveStep = shouldSkipToSetup ? 'setup' : (isPending ? 'pending' : step);

  const handleCheckStatus = async () => {
    setIsCheckingStatus(true);
    try {
      await refreshSubscription();
      // After refresh, check the NEW subscription status
      const { data } = await import('@/integrations/supabase/client').then(m => 
        m.supabase.from('subscriptions').select('status').maybeSingle()
      );
      
      if (data?.status === 'active') {
        toast.success('Your subscription is now active! Redirecting to setup...');
        setStep('setup');
      } else {
        toast.info('Payment is still under review');
      }
    } catch (err) {
      toast.error('Failed to check status');
    } finally {
      setIsCheckingStatus(false);
    }
  };

  const handleSetupComplete = () => {
    refreshPGs();
    onComplete();
  };

  const copyUPI = () => {
    navigator.clipboard.writeText(ADMIN_UPI_ID);
    toast.success('UPI ID copied!');
  };

  const handleMethodSelect = (methodId: string) => {
    setSelectedMethod(methodId);
    
    const amount = currentPlan.price;
    const upiUrl = `upi://pay?pa=${ADMIN_UPI_ID}&pn=PG%20Manager&am=${amount}&cu=INR&tn=${selectedPlan}%20Plan`;
    
    if (methodId !== 'upi') {
      window.open(upiUrl, '_blank');
    } else {
      copyUPI();
    }
  };

  const openWhatsApp = () => {
    const message = `Hi, I have paid ₹${currentPlan.price} for ${currentPlan.name} Plan subscription. Please verify and activate my account.`;
    window.open(`https://wa.me/${ADMIN_WHATSAPP}?text=${encodeURIComponent(message)}`, '_blank');
  };

  const handleScreenshotUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const url = await uploadPaymentScreenshot(file);
    if (url) {
      setScreenshotUrl(url);
      toast.success('Screenshot uploaded!');
    }
  };

  const handleSubmitPayment = async () => {
    if (!selectedMethod) {
      toast.error('Please select a payment method');
      return;
    }

    await createPaymentRequest.mutateAsync({
      amount: currentPlan.price,
      paymentMethod: selectedMethod,
      screenshotUrl: screenshotUrl || undefined,
    });

    await refreshSubscription();
  };

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
            <div className="h-20 w-20 rounded-full bg-primary/10 mx-auto flex items-center justify-center">
              <Building className="h-10 w-10 text-primary" />
            </div>
            
            <div>
              <h1 className="text-3xl font-bold mb-2">Welcome to PG Manager</h1>
              <p className="text-muted-foreground">
                The smartest way to manage your PG/Hostel business
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
                      <div className="h-10 w-10 rounded-full bg-primary/10 mx-auto flex items-center justify-center mb-3">
                        <feature.icon className="h-5 w-5 text-primary" />
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
            className="space-y-6 max-w-2xl mx-auto"
          >
            <div className="text-center mb-8">
              <Badge variant="secondary" className="mb-4">
                <Crown className="h-3 w-3 mr-1" /> Pricing
              </Badge>
              <h2 className="text-2xl font-bold">Choose your plan</h2>
              <p className="text-muted-foreground mt-2">Unlock unlimited PGs and features</p>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              {/* Manual Plan */}
              <Card 
                className={`relative cursor-pointer transition-all ${selectedPlan === 'manual' ? 'border-primary ring-2 ring-primary/20' : 'hover:border-primary/50'}`}
                onClick={() => setSelectedPlan('manual')}
              >
                <CardContent className="pt-6">
                  <h3 className="text-xl font-bold mb-2">Manual</h3>
                  <div className="text-3xl font-bold mb-4">
                    ₹{SUBSCRIPTION_PLANS.manual.price} <span className="text-sm font-normal text-muted-foreground">/month</span>
                  </div>
                  <ul className="space-y-3 mb-6">
                    <li className="flex items-center gap-2 text-sm">
                      <Check className="h-4 w-4 text-primary" /> <strong>Unlimited</strong> PGs
                    </li>
                    <li className="flex items-center gap-2 text-sm">
                      <Check className="h-4 w-4 text-primary" /> <strong>Unlimited</strong> tenants
                    </li>
                    <li className="flex items-center gap-2 text-sm">
                      <Check className="h-4 w-4 text-primary" /> Manual WhatsApp reminders
                    </li>
                    <li className="flex items-center gap-2 text-sm">
                      <Check className="h-4 w-4 text-primary" /> AI logo generator
                    </li>
                  </ul>
                </CardContent>
              </Card>

              {/* Automatic Plan */}
              <Card 
                className={`relative cursor-pointer transition-all ${selectedPlan === 'automatic' ? 'border-primary ring-2 ring-primary/20' : 'hover:border-primary/50'}`}
                onClick={() => setSelectedPlan('automatic')}
              >
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0">
                    <Crown className="h-3 w-3 mr-1" /> Best Value
                  </Badge>
                </div>
                <CardContent className="pt-6">
                  <h3 className="text-xl font-bold mb-2 flex items-center gap-2">
                    Automatic <Crown className="h-5 w-5 text-amber-500" />
                  </h3>
                  <div className="text-3xl font-bold mb-4">
                    ₹{SUBSCRIPTION_PLANS.automatic.price} <span className="text-sm font-normal text-muted-foreground">/month</span>
                  </div>
                  <ul className="space-y-3 mb-6">
                    <li className="flex items-center gap-2 text-sm">
                      <Check className="h-4 w-4 text-primary" /> Everything in Manual
                    </li>
                    <li className="flex items-center gap-2 text-sm">
                      <Check className="h-4 w-4 text-primary" /> <strong>Automated</strong> image reminders
                    </li>
                    <li className="flex items-center gap-2 text-sm">
                      <Check className="h-4 w-4 text-primary" /> Daily activity reports
                    </li>
                    <li className="flex items-center gap-2 text-sm">
                      <Check className="h-4 w-4 text-primary" /> Multi-admin support
                    </li>
                  </ul>
                </CardContent>
              </Card>
            </div>

            <div className="flex gap-3">
              <Button variant="ghost" onClick={() => setStep('features')} className="flex-1">
                <ChevronLeft className="mr-1 h-4 w-4" /> Back
              </Button>
              <Button 
                size="lg" 
                onClick={() => setStep('payment')} 
                className="flex-[2]"
              >
                Continue to Payment - ₹{currentPlan.price}
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
                <CreditCard className="h-3 w-3 mr-1" /> Payment
              </Badge>
              <h2 className="text-2xl font-bold">{currentPlan.name} Plan - ₹{currentPlan.price}/month</h2>
            </div>

            {/* Razorpay Online Payment */}
            <Button
              className="w-full gap-2 py-6 text-base"
              onClick={() => {
                initiatePayment({
                  plan: selectedPlan,
                  amount: currentPlan.price,
                  onSuccess: async () => {
                    await refreshSubscription();
                    setStep('setup');
                  },
                });
              }}
              disabled={razorpayLoading}
            >
              {razorpayLoading ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Processing...</>
              ) : (
                <><Zap className="h-5 w-5" /> Pay ₹{currentPlan.price} Online (Card/UPI/Net Banking)</>
              )}
            </Button>

            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">Or pay manually via UPI</span>
              </div>
            </div>

            {/* UPI Details */}
            <div className="text-center p-4 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground mb-2">Pay to UPI ID</p>
              <div className="flex items-center justify-center gap-2">
                <code className="text-lg font-mono font-bold">{ADMIN_UPI_ID}</code>
                <Button variant="ghost" size="icon" onClick={copyUPI}>
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-2xl font-bold text-primary mt-2">₹{currentPlan.price}</p>
            </div>

            {/* Payment Methods */}
            <div className="grid grid-cols-2 gap-3">
              {PAYMENT_METHODS.map((method) => {
                const Icon = PAYMENT_ICONS[method.id as keyof typeof PAYMENT_ICONS];
                return (
                  <Card
                    key={method.id}
                    className={`cursor-pointer transition-all ${selectedMethod === method.id ? 'border-primary ring-2 ring-primary/20' : 'hover:border-primary/50'}`}
                    onClick={() => handleMethodSelect(method.id)}
                  >
                    <CardContent className="py-4 text-center">
                      <Icon className="h-8 w-8 mx-auto mb-2 text-primary" />
                      <p className="font-medium text-sm">{method.name}</p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Screenshot Upload */}
            {selectedMethod && (
              <div className="space-y-3">
                <p className="text-sm text-center text-muted-foreground">
                  After payment, upload screenshot for quick verification
                </p>
                <div className="border-2 border-dashed rounded-lg p-4 text-center">
                  {screenshotUrl ? (
                    <div className="space-y-2">
                      <img 
                        src={screenshotUrl} 
                        alt="Payment proof" 
                        className="h-32 mx-auto object-contain rounded"
                      />
                      <Button variant="outline" size="sm" asChild>
                        <label className="cursor-pointer">
                          Change
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={handleScreenshotUpload}
                          />
                        </label>
                      </Button>
                    </div>
                  ) : (
                    <label className="cursor-pointer block">
                      {isUploading ? (
                        <Loader2 className="h-8 w-8 mx-auto animate-spin text-muted-foreground" />
                      ) : (
                        <>
                          <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                          <p className="text-sm text-muted-foreground">
                            Upload payment screenshot
                          </p>
                        </>
                      )}
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleScreenshotUpload}
                        disabled={isUploading}
                      />
                    </label>
                  )}
                </div>

                <Button 
                  onClick={handleSubmitPayment} 
                  className="w-full"
                  disabled={createPaymentRequest.isPending}
                >
                  {createPaymentRequest.isPending ? (
                    <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Submitting...</>
                  ) : (
                    <>Submit Payment Request</>
                  )}
                </Button>

                <Button 
                  variant="outline" 
                  onClick={openWhatsApp} 
                  className="w-full gap-2"
                >
                  <MessageCircle className="h-4 w-4" />
                  Contact Admin on WhatsApp
                </Button>
              </div>
            )}

            <Button variant="ghost" onClick={() => setStep('plans')} className="w-full">
              Back to Plans
            </Button>
          </motion.div>
        );

      case 'pending':
        return (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="text-center space-y-6 max-w-md mx-auto"
          >
            <div className="h-20 w-20 rounded-full bg-amber-100 dark:bg-amber-900/30 mx-auto flex items-center justify-center">
              <Clock className="h-10 w-10 text-amber-600" />
            </div>
            
            <div>
              <h1 className="text-2xl font-bold mb-2">Payment Under Review</h1>
              <p className="text-muted-foreground">
                Your payment is being reviewed by admin. You'll get access once approved.
              </p>
            </div>

            <div className="flex flex-col gap-3 pt-4">
              <Button onClick={openWhatsApp} variant="outline" className="gap-2">
                <MessageCircle className="h-4 w-4" />
                Contact Admin for Quick Activation
              </Button>
              <Button 
                variant="ghost" 
                onClick={handleCheckStatus}
                disabled={isCheckingStatus}
              >
                {isCheckingStatus ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Checking...</>
                ) : (
                  'Check Status'
                )}
              </Button>
              <Button 
                variant="ghost" 
                onClick={handleSignOut}
                className="text-muted-foreground gap-2"
              >
                <LogOut className="h-4 w-4" />
                Sign Out
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
