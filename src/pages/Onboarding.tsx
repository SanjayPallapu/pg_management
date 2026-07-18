import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { PremiumOnboarding } from "@/components/pg/PremiumOnboarding";

export default function Onboarding() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  if (isAuthenticated) {
    navigate("/", { replace: true });
    return null;
  }

  return (
    <PremiumOnboarding
      onComplete={() => {
        localStorage.setItem("hasCompletedOnboarding", "true");
        navigate("/auth", { replace: true });
      }}
    />
  );
}
