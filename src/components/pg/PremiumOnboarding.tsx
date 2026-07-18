import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ThreeDScene } from '@/components/ThreeDScene';
import {
  ChevronRight,
  ChevronLeft,
  Sparkles,
  Home,
  Users,
  ReceiptText,
  TrendingUp,
  CheckCircle2,
} from 'lucide-react';
import { PGSetupWizard } from './PGSetupWizard';

interface PremiumOnboardingProps {
  onComplete: () => void;
}

type Step = 'intro' | 'features' | 'benefits' | 'setup';

const FEATURE_SCREENS = [
  {
    id: 'manage',
    icon: Home,
    title: 'Manage Rooms & Tenants',
    description: 'Organize your entire property structure with rooms, floors, and tenant profiles in one place.',
    benefits: [
      'Real-time occupancy tracking',
      'Multi-floor management',
      'Tenant profile management',
      'Room assignment automation'
    ],
    gradient: 'from-blue-600/20 to-cyan-600/20',
    accentColor: 'text-blue-400',
  },
  {
    id: 'payments',
    icon: ReceiptText,
    title: 'Track Rent & Digital Receipts',
    description: 'Never miss a payment with smart tracking and instant digital receipt generation.',
    benefits: [
      'Payment reminders via WhatsApp',
      'Instant receipt generation',
      'Payment history & analytics',
      'Multiple payment modes support'
    ],
    gradient: 'from-emerald-600/20 to-teal-600/20',
    accentColor: 'text-emerald-400',
  },
  {
    id: 'reports',
    icon: TrendingUp,
    title: 'Run Your PG Smarter',
    description: 'Access powerful analytics and reports to optimize occupancy and maximize revenue.',
    benefits: [
      'Real-time analytics dashboard',
      'Payment analytics & insights',
      'Occupancy trends & forecasting',
      'Revenue optimization tools'
    ],
    gradient: 'from-amber-600/20 to-orange-600/20',
    accentColor: 'text-amber-400',
  },
];

export const PremiumOnboarding = ({ onComplete }: PremiumOnboardingProps) => {
  const [step, setStep] = useState<Step>('intro');
  const [currentFeature, setCurrentFeature] = useState(0);

  const handleSetupComplete = () => {
    onComplete();
  };

  const renderStep = () => {
    switch (step) {
      case 'intro':
        return (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="flex flex-col items-center justify-center min-h-screen px-6 py-12 text-center relative"
          >
            {/* Floating 3D Building */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-64 h-80 sm:w-80 sm:h-96">
                <ThreeDScene variant="building" className="w-full h-full" />
              </div>
            </div>

            {/* Content overlay */}
            <div className="relative z-10 space-y-8 max-w-lg mx-auto backdrop-blur-sm">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2 }}
                className="space-y-4"
              >
                <h1 className="text-4xl sm:text-5xl font-bold bg-gradient-to-r from-slate-100 via-slate-50 to-slate-200 bg-clip-text text-transparent">
                  Welcome to PG Manager
                </h1>
                <p className="text-lg text-slate-400 leading-relaxed">
                  Manage rooms, track rent, and run your PG with real-time occupancy, payment reminders, and powerful analytics.
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="flex flex-col gap-3 pt-8"
              >
                <Button
                  size="lg"
                  onClick={() => setStep('features')}
                  className="w-full h-12 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white font-semibold rounded-xl shadow-lg shadow-blue-500/30 transition-all hover:shadow-blue-500/50"
                >
                  Explore Features <ChevronRight className="ml-2 h-5 w-5" />
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  onClick={() => setStep('setup')}
                  className="w-full h-12 border-white/10 text-white hover:bg-white/5 rounded-xl"
                >
                  Skip to Setup
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
            className="min-h-screen px-6 py-12 space-y-8"
          >
            {/* Header */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center space-y-3 mb-8"
            >
              <div className="flex items-center justify-center gap-2">
                <Sparkles className="h-5 w-5 text-amber-400" />
                <span className="text-sm font-semibold text-amber-400">CORE FEATURES</span>
              </div>
              <h2 className="text-3xl sm:text-4xl font-bold text-white">
                Everything You Need
              </h2>
            </motion.div>

            {/* Feature Carousel */}
            <div className="max-w-2xl mx-auto">
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentFeature}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-6"
                >
                  {/* Feature Card */}
                  <Card className="relative overflow-hidden border border-white/10 bg-gradient-to-br from-white/5 to-white/[0.02] backdrop-blur-xl">
                    <CardContent className="p-8 space-y-6">
                      {/* Icon + Title */}
                      <div className="space-y-4">
                        <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${FEATURE_SCREENS[currentFeature].gradient} flex items-center justify-center shadow-lg`}>
                          {(() => {
                            const Icon = FEATURE_SCREENS[currentFeature].icon;
                            return <Icon className={`h-8 w-8 ${FEATURE_SCREENS[currentFeature].accentColor}`} />;
                          })()}
                        </div>
                        <div>
                          <h3 className="text-2xl font-bold text-white mb-2">
                            {FEATURE_SCREENS[currentFeature].title}
                          </h3>
                          <p className="text-slate-400 text-base leading-relaxed">
                            {FEATURE_SCREENS[currentFeature].description}
                          </p>
                        </div>
                      </div>

                      {/* Benefits List */}
                      <div className="space-y-3 pt-4 border-t border-white/5">
                        {FEATURE_SCREENS[currentFeature].benefits.map((benefit, idx) => (
                          <motion.div
                            key={idx}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: idx * 0.1 }}
                            className="flex items-center gap-3"
                          >
                            <CheckCircle2 className="h-5 w-5 text-emerald-400 flex-shrink-0" />
                            <span className="text-slate-300">{benefit}</span>
                          </motion.div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Pagination Dots */}
                  <div className="flex items-center justify-center gap-2">
                    {FEATURE_SCREENS.map((_, idx) => (
                      <motion.button
                        key={idx}
                        onClick={() => setCurrentFeature(idx)}
                        className={`h-2 rounded-full transition-all ${
                          idx === currentFeature
                            ? 'w-8 bg-gradient-to-r from-blue-500 to-blue-400'
                            : 'w-2 bg-white/20 hover:bg-white/40'
                        }`}
                        whileHover={{ scale: 1.2 }}
                        whileTap={{ scale: 0.95 }}
                      />
                    ))}
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Navigation Buttons */}
            <div className="max-w-2xl mx-auto flex gap-3 justify-between pt-8">
              <Button
                variant="ghost"
                onClick={() => {
                  if (currentFeature > 0) {
                    setCurrentFeature(currentFeature - 1);
                  } else {
                    setStep('intro');
                  }
                }}
                className="gap-2 text-slate-400 hover:text-white hover:bg-white/10"
              >
                <ChevronLeft className="h-4 w-4" /> Back
              </Button>

              <div className="flex gap-3 flex-1 justify-end">
                {currentFeature === FEATURE_SCREENS.length - 1 ? (
                  <Button
                    onClick={() => setStep('benefits')}
                    className="h-11 px-6 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white font-semibold rounded-xl shadow-lg shadow-blue-500/30"
                  >
                    Continue <ChevronRight className="ml-2 h-4 w-4" />
                  </Button>
                ) : (
                  <Button
                    onClick={() => setCurrentFeature(currentFeature + 1)}
                    className="h-11 px-6 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white font-semibold rounded-xl shadow-lg shadow-blue-500/30"
                  >
                    Next <ChevronRight className="ml-2 h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          </motion.div>
        );

      case 'benefits':
        return (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="min-h-screen px-6 py-12 space-y-8 flex flex-col justify-between"
          >
            {/* Content */}
            <div className="space-y-8 max-w-2xl mx-auto w-full">
              {/* Header */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center space-y-3"
              >
                <div className="flex items-center justify-center gap-2">
                  <TrendingUp className="h-5 w-5 text-blue-400" />
                  <span className="text-sm font-semibold text-blue-400">WHY CHOOSE US</span>
                </div>
                <h2 className="text-3xl sm:text-4xl font-bold text-white">
                  Built for Growth
                </h2>
                <p className="text-slate-400 text-base">
                  Trusted by PG owners across India to streamline operations and maximize revenue
                </p>
              </motion.div>

              {/* Benefits Grid */}
              <div className="grid sm:grid-cols-2 gap-4">
                {[
                  {
                    title: 'Real-Time Insights',
                    description: 'Live occupancy, payment status, and revenue analytics',
                    icon: TrendingUp,
                  },
                  {
                    title: 'Smart Reminders',
                    description: 'Automated payment reminders via WhatsApp',
                    icon: Users,
                  },
                  {
                    title: 'Multi-Owner Support',
                    description: 'Collaborate with other PG owners seamlessly',
                    icon: Home,
                  },
                  {
                    title: 'Instant Receipts',
                    description: 'Generate professional digital receipts in seconds',
                    icon: ReceiptText,
                  },
                ].map((benefit, idx) => {
                  const Icon = benefit.icon;
                  return (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.1 }}
                    >
                      <Card className="border border-white/10 bg-gradient-to-br from-white/[0.08] to-white/[0.02] hover:border-blue-500/30 transition-all h-full">
                        <CardContent className="p-6 space-y-3">
                          <div className="w-10 h-10 rounded-lg bg-blue-600/20 flex items-center justify-center">
                            <Icon className="h-5 w-5 text-blue-400" />
                          </div>
                          <div>
                            <h4 className="font-semibold text-white mb-1">{benefit.title}</h4>
                            <p className="text-sm text-slate-400">{benefit.description}</p>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  );
                })}
              </div>
            </div>

            {/* Bottom CTA */}
            <div className="max-w-2xl mx-auto w-full flex gap-3">
              <Button
                variant="ghost"
                onClick={() => setStep('features')}
                className="flex-1 gap-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl"
              >
                <ChevronLeft className="h-4 w-4" /> Back
              </Button>
              <Button
                onClick={() => setStep('setup')}
                className="flex-1 h-11 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white font-semibold rounded-xl shadow-lg shadow-blue-500/30"
              >
                Create My PG <ChevronRight className="ml-2 h-4 w-4" />
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
            <PGSetupWizard onComplete={handleSetupComplete} isAddingNew={true} />
          </motion.div>
        );
    }
  };

  return (
    <div className="relative min-h-[100dvh] w-full bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 overflow-hidden">
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
