import { useParams } from "react-router-dom";
import { PublicTenantOnboardingForm } from "@/features/tenant-onboarding/components/PublicTenantOnboardingForm";

export default function TenantOnboardingFormPage() {
  const { token } = useParams<{ token: string }>();

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-orange-50 dark:from-slate-950 dark:to-red-950/30 p-4">
        <div className="max-w-md w-full text-center">
          <h1 className="text-xl font-bold mb-2">Invalid Link</h1>
          <p className="text-sm text-muted-foreground">
            The onboarding link is invalid. Please contact your PG owner.
          </p>
        </div>
      </div>
    );
  }

  return <PublicTenantOnboardingForm token={token} />;
}
