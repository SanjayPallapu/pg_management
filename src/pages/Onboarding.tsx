import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import onboardingScreen1 from "@/assets/pg-hub/onboarding-screen-1.png";
import onboardingScreen2 from "@/assets/pg-hub/onboarding-screen-2.png";
import onboardingScreen3 from "@/assets/pg-hub/onboarding-screen-3.png";
import { PGHubShell } from "@/features/pg-hub/PGHubShell";
import {
  completeOnboarding,
  hasCompletedOnboarding,
  shouldShowOnboardingAfterLogout,
} from "@/lib/onboardingState";

const slides = [
  {
    id: "grow",
    titleTop: "Manage Smarter",
    titleBottom: "with PG HUB",
    subheading: "Fill rooms faster. Manage less manually.",
    body: "Track occupancy, tenants, rent, and payments in one simple app.",
    accent: "#8B5CF6",
    image: onboardingScreen1,
  },
  {
    id: "rent",
    titleTop: "Never Miss",
    titleBottom: "Rent Again",
    subheading: "Automate reminders and collect rent on time.",
    body: "Track payments, send reminders, and generate receipts without chasing tenants.",
    accent: "#A855F7",
    image: onboardingScreen2,
  },
  {
    id: "everything",
    titleTop: "Everything in",
    titleBottom: "One Place",
    subheading: "Rooms, tenants, payments, and reports—all connected.",
    body: "Manage your entire PG from one dashboard with real-time updates and reminders.",
    accent: "#9A67FF",
    image: onboardingScreen3,
  },
] as const;

export default function Onboarding() {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading } = useAuth();
  const [active, setActive] = useState(0);

  useEffect(() => {
    if (isLoading) return;
    if (shouldShowOnboardingAfterLogout()) return;
    if (isAuthenticated) {
      navigate("/", { replace: true });
      return;
    }
    if (hasCompletedOnboarding()) {
      navigate("/auth", { replace: true });
    }
  }, [isAuthenticated, isLoading, navigate]);

  const finish = () => {
    completeOnboarding();
    navigate("/auth", { replace: true });
  };

  const goTo = (next: number) => {
    if (next < 0 || next >= slides.length) return;
    setActive(next);
  };

  const next = () => {
    if (active === slides.length - 1) finish();
    else goTo(active + 1);
  };

  if (isLoading) {
    return <div className="min-h-screen grid place-items-center bg-[#080711]"><Loader2 className="h-8 w-8 animate-spin text-violet-400" /></div>;
  }

  const slide = slides[active];

  return (
    <PGHubShell variant="dark" className="pgh-onboarding">
      <div className="pgh-onboarding__page">
        <section key={slide.id} className={`pgh-onboarding__slide pgh-onboarding__slide--${slide.id}`}>
          <img className="pgh-onboarding__background" src={slide.image} alt="" aria-hidden="true" />
          <div className="pgh-onboarding__shade" aria-hidden="true" />
          <div className="pgh-onboarding__copy">
            <h1>{slide.titleTop}{" "}<em style={{ color: slide.accent }}>{slide.titleBottom}</em></h1>
            <strong>{slide.subheading}</strong>
            <p>{slide.body}</p>
          </div>
        </section>

        <footer className="pgh-onboarding__footer">
          <div className="pgh-dots" aria-label={`Slide ${active + 1} of ${slides.length}`}>
            {slides.map((item, index) => (
              <button key={item.id} type="button" className={index === active ? "is-active" : ""} onClick={() => goTo(index)} aria-label={`Go to slide ${index + 1}`} />
            ))}
          </div>
          <div className={`pgh-onboarding__nav ${active === 0 ? "is-first" : ""}`}>
            {active > 0 && (
              <button type="button" className="pgh-onboarding__nav-button pgh-onboarding__nav-button--back" onClick={() => goTo(active - 1)}>
                <ArrowLeft size={20} /> Back
              </button>
            )}
            <button type="button" className="pgh-onboarding__nav-button pgh-onboarding__nav-button--next" onClick={next}>
              Next <ArrowRight size={20} />
            </button>
          </div>
        </footer>
      </div>
    </PGHubShell>
  );
}
