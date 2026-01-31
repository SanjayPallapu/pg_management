import { useState } from 'react';
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
  Shield,
  Crown,
  Check,
  ChevronRight,
  Sparkles,
  Image,
  Calendar,
} from 'lucide-react';
import { PGSetupWizard } from './PGSetupWizard';
import { usePG } from '@/contexts/PGContext';
import { SUBSCRIPTION_PLANS, ADMIN_UPI_ID } from '@/types/pg';

interface OnboardingFlowProps {
  onComplete: () => void;
}

type Step = 'welcome' | 'features' | 'plans' | 'setup';

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

export const OnboardingFlow = ({ onComplete }: OnboardingFlowProps) => {
  const [step, setStep] = useState<Step>('welcome');
  const { refreshPGs } = usePG();

  const handleSetupComplete = () => {
    refreshPGs();
    onComplete();
  };

  const renderStep = () => {
    switch (step) {
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

            <div className="flex justify-center pt-4">
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
              <Card className="relative">
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
                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={() => setStep('setup')}
                  >
                    Start with Manual
                  </Button>
                </CardContent>
              </Card>

              {/* Automatic Plan */}
              <Card className="relative border-primary ring-2 ring-primary/20">
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
                  <Button 
                    className="w-full"
                    onClick={() => setStep('setup')}
                  >
                    Start with Automatic
                  </Button>
                </CardContent>
              </Card>
            </div>

            <p className="text-center text-sm text-muted-foreground">
              Pay via UPI to 9390418552@kotak811 • Admin will activate manually
            </p>
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
