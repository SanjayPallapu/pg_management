const ONBOARDING_COMPLETED_KEY = "hasCompletedOnboarding";
const ONBOARDING_AFTER_LOGOUT_KEY = "showOnboardingAfterLogout";

export const hasCompletedOnboarding = () =>
  localStorage.getItem(ONBOARDING_COMPLETED_KEY) === "true";

export const shouldShowOnboardingAfterLogout = () =>
  localStorage.getItem(ONBOARDING_AFTER_LOGOUT_KEY) === "true";

export const restartOnboardingAfterLogout = () => {
  localStorage.removeItem(ONBOARDING_COMPLETED_KEY);
  localStorage.setItem(ONBOARDING_AFTER_LOGOUT_KEY, "true");
};

export const completeOnboarding = () => {
  localStorage.setItem(ONBOARDING_COMPLETED_KEY, "true");
  localStorage.removeItem(ONBOARDING_AFTER_LOGOUT_KEY);
};
