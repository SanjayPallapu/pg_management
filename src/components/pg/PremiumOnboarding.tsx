import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  ChevronRight,
  ChevronLeft,
  Sparkles,
  Home,
  Users,
  ReceiptText,
  TrendingUp,
  CheckCircle2,
  Building2,
  Zap,
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
    iconGradient: 'from-blue-500 to-cyan-500',
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
    iconGradient: 'from-emerald-500 to-teal-500',
  },
  {
    id: 'reports',
    icon: Zap,
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
    iconGradient: 'from-amber-500 to-orange-500',
  },
];

export const PremiumOnboarding = ({ onComplete }: PremiumOnboardingProps) => {
  const [step, setStep] = useState<Step>('intro');
  const [currentFeature, setCurrentFeature] = useState(0);
  const [direction, setDirection] = useState(0);

  const goToNextFeature = () => {
    setDirection(1);
    if (currentFeature < FEATURE_SCREENS.length - 1) {
      setCurrentFeature(currentFeature + 1);
    } else {
      setStep('benefits');
      setCurrentFeature(0);
    }
  };

  const goToPrevFeature = () => {
    setDirection(-1);
    if (currentFeature > 0) {
      setCurrentFeature(currentFeature - 1);
    } else {
      setStep('intro');
    }
  };

  const renderStep = () => {
    switch (step) {
      case 'intro':
        return (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="flex flex-col items-center justify-center min-h-screen px-6 py-12 text-center"
          >
            {/* Floating 3D Building Icon */}
            <motion.div
              animate={{ y: [-20, 20, -20] }}
              transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
              className="mb-12"
            >
              <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center shadow-2xl shadow-blue-500/40">
                <Building2 className="w-12 h-12 text-white" />
              </div>
            </motion.div>

            {/* Content */}
            <div className="space-y-6 max-w-lg mx-auto">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2 }}
                className="space-y-4"
              >
                <h1 className="text-5xl font-bold bg-gradient-to-r from-blue-200 to-cyan-200 bg-clip-text text-transparent leading-tight">
                  Welcome to PG Manager
                </h1>
                <p className="text-lg text-slate-400 leading-relaxed">
                  Smart management for your PG. Track tenants, collect rent, and grow your business with ease.
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="flex flex-col gap-3 pt-6"
              >
                <Button
                  onClick={() => setStep('features')}
                  className="w-full h-12 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white font-semibold rounded-xl shadow-lg shadow-blue-500/30 transition-all hover:shadow-blue-500/50 flex items-center justify-center gap-2"
                >
                  Explore Features
                  <ChevronRight className="w-5 h-5" />
                </Button>
                <Button
                  onClick={() => setStep('setup')}
                  variant="ghost"
                  className="w-full h-12 text-white hover:bg-white/10 rounded-xl border border-white/10"
                >
                  Skip to Setup
                </Button>
              </motion.div>
            </div>

            {/* Progress dots */}
            <div className="absolute bottom-8 flex gap-2">
              {['intro', 'features', 'benefits'].map((s) => (
                <div
                  key={s}
                  className={`h-1.5 rounded-full transition-all ${
                    s === 'intro' ? 'w-6 bg-blue-500' : 'w-1.5 bg-white/20'
                  }`}
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
            className="min-h-screen flex flex-col items-center justify-center px-6 py-12 space-y-8"
          >
            {/* Header */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center space-y-3 w-full max-w-2xl"
            >
              <div className="inline-flex items-center justify-center gap-2 px-3 py-1 bg-white/10 rounded-full border border-white/20">
                <Sparkles className="h-4 w-4 text-blue-400" />
                <span className="text-xs font-semibold text-blue-300">CORE FEATURES</span>
              </div>
              <h2 className="text-4xl font-bold text-white">Everything You Need</h2>
              <p className="text-slate-400 text-base">
                Powerful tools to manage every aspect of your PG
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
                  {/* Feature Card */}
                  <Card className="overflow-hidden border border-white/10 bg-gradient-to-br from-white/5 to-white/[0.02] backdrop-blur-xl">
                    <CardContent className="p-8 space-y-6">
                      {/* Icon + Title */}
                      <div className="space-y-4">
                        <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${FEATURE_SCREENS[currentFeature].iconGradient} flex items-center justify-center shadow-lg`}>
                          {(() => {
                            const Icon = FEATURE_SCREENS[currentFeature].icon;
                            return <Icon className="h-8 w-8 text-white" />;
                          })()}
                        </div>
                        <div className="text-left">
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
                            transition={{ delay: idx * 0.08 }}
                            className="flex items-center gap-3"
                          >
                            <CheckCircle2 className="h-5 w-5 text-emerald-400 flex-shrink-0" />
                            <span className="text-slate-300 text-sm">{benefit}</span>
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
                {currentFeature === FEATURE_SCREENS.length - 1 ? 'Continue' : 'Next'} <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            {/* Progress dots */}
            <div className="flex gap-2 mt-8">
              {['intro', 'features', 'benefits'].map((s) => (
                <div
                  key={s}
                  className={`h-1.5 rounded-full transition-all ${
                    s === 'features' ? 'w-6 bg-blue-500' : 'w-1.5 bg-white/20'
                  }`}
                />
              ))}
            </div>
          </motion.div>
        );

      case 'benefits':
        return (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="min-h-screen flex flex-col justify-between px-6 py-12"
          >
            <div className="space-y-8 max-w-2xl mx-auto w-full">
              {/* Header */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center space-y-3"
              >
                <div className="inline-flex items-center justify-center gap-2 px-3 py-1 bg-white/10 rounded-full border border-white/20">
                  <TrendingUp className="h-4 w-4 text-blue-400" />
                  <span className="text-xs font-semibold text-blue-300">WHY CHOOSE US</span>
                </div>
                <h2 className="text-4xl font-bold text-white">Built for Growth</h2>
                <p className="text-slate-400 text-base">
                  Trusted by PG owners to streamline operations and maximize revenue
                </p>
              </motion.div>

              {/* Benefits Grid */}
              <div className="grid sm:grid-cols-2 gap-4">
                {[
                  { title: 'Real-Time Insights', desc: 'Live occupancy & payment status', icon: TrendingUp },
                  { title: 'Smart Reminders', desc: 'Automated payment notifications', icon: Zap },
                  { title: 'Easy Management', desc: 'Simplified tenant & room tracking', icon: Users },
                  { title: 'Instant Receipts', desc: 'Professional digital receipts', icon: ReceiptText },
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
                            <p className="text-sm text-slate-400">{benefit.desc}</p>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  );
                })}
              </div>
            </div>

            {/* Bottom CTA */}
            <div className="max-w-2xl mx-auto w-full flex gap-3 mt-12">
              <Button
                onClick={() => setStep('features')}
                variant="ghost"
                className="flex-1 gap-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg border border-white/10"
              >
                <ChevronLeft className="h-4 w-4" /> Back
              </Button>
              <Button
                onClick={() => setStep('setup')}
                className="flex-1 h-11 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white font-semibold rounded-lg shadow-lg shadow-blue-500/30 flex items-center justify-center gap-2"
              >
                Create My PG <ChevronRight className="h-4 w-4" />
              </Button>
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
    <div className="relative min-h-screen w-full bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 overflow-hidden">
      {/* Animated background gradients */}
      <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full bg-gradient-to-br from-blue-600/20 to-transparent opacity-40 blur-[120px] pointer-events-none animate-pulse" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[600px] h-[600px] rounded-full bg-gradient-to-br from-cyan-600/20 to-transparent opacity-30 blur-[120px] pointer-events-none animate-pulse" style={{ animationDelay: '2s' }} />
      <div className="absolute top-[50%] left-[50%] -translate-x-1/2 w-[400px] h-[400px] rounded-full bg-gradient-to-br from-slate-600/10 to-transparent opacity-20 blur-[100px] pointer-events-none" />

      {/* Skip button */}
      <button
        onClick={() => setStep('setup')}
        className="absolute top-6 right-6 z-50 text-sm font-medium text-gray-400 hover:text-white transition-colors py-2 px-4 rounded-lg hover:bg-white/5"
      >
        Skip
      </button>

      {/* Content */}
      <div className="relative z-10 w-full">
        <AnimatePresence mode="wait">
          {renderStep()}
        </AnimatePresence>
      </div>
    </div>
  );
};
