import React, { useState } from "react";
import { Home } from "lucide-react";
// import your actual form field components / hooks here

const TOTAL_STEPS = 8;

export const PublicTenantOnboardingForm: React.FC<{ tenantName?: string }> = ({
  tenantName,
}) => {
  const [step, setStep] = useState(1);

  const goNext = () => {
    setStep((prev) => Math.min(prev + 1, TOTAL_STEPS));
  };

  const goBack = () => {
    setStep((prev) => Math.max(prev - 1, 1));
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 flex flex-col">
      <header className="px-6 py-4 flex items-center justify-between border-b border-slate-800">
        <div className="flex items-center gap-2">
          <Home className="h-5 w-5" />
          <div>
            <div className="text-sm font-bold">Tenant Onboarding</div>
            <div className="text-xs text-slate-400">
              Welcome{tenantName ? `, ${tenantName}` : ""}
            </div>
          </div>
        </div>
        <div className="text-sm text-slate-300">
          Step {step} of {TOTAL_STEPS}
        </div>
      </header>

      <main className="flex-1 flex justify-center px-4 py-8">
        <div className="w-full max-w-5xl">
          {/* Replace this switch with your real step components */}
          {step === 1 && (
            <div className="grid md:grid-cols-2 gap-8 items-center">
              <div className="space-y-4">
                <h1 className="text-3xl md:text-4xl font-semibold">
                  Welcome to PGHub
                </h1>
                <p className="text-slate-300">
                  Complete your profile so we can make your stay safer, smoother,
                  and more comfortable.
                </p>
              </div>
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col justify-between">
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-400 mb-2">
                    Tenant onboarding
                  </p>
                  <h2 className="text-xl font-semibold mb-2">Complete your profile</h2>
                  <p className="text-sm text-slate-300 mb-6">
                    Takes around 3–5 minutes. You can edit details later.
                  </p>
                </div>
                <button
                  className="mt-4 w-full py-3 rounded-xl bg-violet-500 hover:bg-violet-600 text-sm font-medium"
                  onClick={goNext}
                >
                  Get started
                </button>
              </div>
            </div>
          )}

          {step > 1 && step < TOTAL_STEPS && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
              <p className="text-sm text-slate-300 mb-4">
                This is a placeholder for steps 2–7 (personal details, ID, contact, stay, payment, rules).
                Wire your existing form fields and validation here.
              </p>
              <div className="flex justify-between">
                <button
                  type="button"
                  className="px-4 py-2 rounded-lg border border-slate-700 text-sm text-slate-200"
                  onClick={goBack}
                >
                  Back
                </button>
                <button
                  type="button"
                  className="px-4 py-2 rounded-lg bg-violet-500 hover:bg-violet-600 text-sm font-medium"
                  onClick={goNext}
                >
                  Continue
                </button>
              </div>
            </div>
          )}

          {step === TOTAL_STEPS && (
            <div className="min-h-[60vh] flex flex-col items-center justify-center text-center space-y-6">
              <div className="relative">
                {/* Use the green badge asset here if available */}
                <img
                  src="/assets/badges/green-profile-badge.png"
                  alt="Profile complete badge"
                  className="w-40 h-40 mx-auto"
                />
              </div>
              <div className="space-y-2 max-w-md">
                <h1 className="text-2xl md:text-3xl font-semibold">Profile Submitted!</h1>
                <p className="text-sm text-slate-300">
                  Thank you. Your profile has been submitted successfully. Your PG
                  owner will review your details and confirm your stay soon.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <button className="px-5 py-2.5 rounded-xl bg-violet-500 hover:bg-violet-600 text-sm font-medium">
                  Back to home
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};
