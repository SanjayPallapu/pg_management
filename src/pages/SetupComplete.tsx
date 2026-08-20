import { useEffect } from "react";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import journeyComplete from "@/assets/pg-hub/ready-building.png";
import { PGHubButton } from "@/features/pg-hub/PGHubButton";
import { PGHubShell } from "@/features/pg-hub/PGHubShell";
import { usePGSetupDraft } from "@/features/pg-hub/PGSetupDraftContext";

export default function SetupComplete() {
  const navigate = useNavigate();
  const { creationResult, reset } = usePGSetupDraft();
  const selectedPlanKey = sessionStorage.getItem("pgh_selected_plan") || "trial";
  const planLabel = selectedPlanKey === "trial"
    ? "7-Day Free Trial Active"
    : selectedPlanKey === "monthly" ? "Basic Plan Active"
    : selectedPlanKey === "pro" ? "Plus Plan Active"
    : "Pro Plan Active";

  useEffect(() => {
    if (!creationResult) navigate("/", { replace: true });
  }, [creationResult, navigate]);

  if (!creationResult) return null;

  const finish = (target: string) => {
    reset();
    sessionStorage.removeItem("pgh_selected_plan");
    // Leaving setup also rebuilds the dashboard providers from the newly
    // created PG. A full replacement avoids a race between clearing the setup
    // result and React Router's protected-route redirect.
    window.location.replace(target);
  };

  const goBack = () => {
    navigate("/setup/subscription");
  };

  return (
    <PGHubShell variant="dark" className="pgh-ready pgh-ready--fullscreen bg-slate-900 text-white h-dvh max-h-dvh overflow-hidden">
      <div className="w-full h-full relative flex flex-col justify-between p-4 bg-gradient-to-b from-slate-950 via-slate-900 to-indigo-950 overflow-hidden">
        {/* Top bar with Back button on top-leftmost side */}
        <div className="w-full flex items-center justify-between z-20 pt-1 shrink-0">
          <button 
            type="button" 
            onClick={goBack} 
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-white/10 text-white backdrop-blur-md text-xs font-bold border border-white/15 hover:bg-white/20 transition-all active:scale-95 shadow-md"
          >
            <ArrowLeft size={16} /> Back
          </button>
          <span className="px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-xs font-extrabold flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            {planLabel}
          </span>
        </div>

        {/* Center content - full screen without cards */}
        <div className="flex-1 flex flex-col items-center justify-center text-center py-2 z-10 max-w-md mx-auto w-full space-y-4 min-h-0 overflow-hidden">
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-3xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white shadow-2xl shadow-blue-500/40 shrink-0">
            <CheckCircle2 size={36} />
          </div>

          <div className="space-y-1">
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white leading-tight">
              Your PG is<br />
              <span className="bg-gradient-to-r from-blue-400 via-indigo-300 to-sky-400 bg-clip-text text-transparent">ready to manage smarter</span>
            </h1>
            <p className="text-slate-300 text-sm font-medium">
              <strong className="text-white font-bold">{creationResult.pgName}</strong> has been created successfully.
            </p>
          </div>

          <div className="w-full grid grid-cols-3 gap-2.5 py-2" aria-label="Property summary">
            <div className="bg-white/5 border border-white/10 rounded-2xl p-3 text-center backdrop-blur-md">
              <strong className="block text-2xl font-black text-blue-400">{creationResult.floors}</strong>
              <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Floors</span>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-2xl p-3 text-center backdrop-blur-md">
              <strong className="block text-2xl font-black text-blue-400">{creationResult.rooms}</strong>
              <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Rooms</span>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-2xl p-3 text-center backdrop-blur-md">
              <strong className="block text-2xl font-black text-blue-400">{creationResult.beds}</strong>
              <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Beds</span>
            </div>
          </div>
        </div>

        {/* Bottom fixed action button */}
        <div className="w-full max-w-md mx-auto z-20 pb-2 shrink-0">
          <PGHubButton onClick={() => finish("/")} className="w-full h-12 bg-gradient-to-r from-blue-600 via-indigo-600 to-sky-500 text-white rounded-2xl font-extrabold text-sm shadow-xl shadow-blue-500/30 active:scale-98 transition-all">
            Open dashboard
          </PGHubButton>
        </div>
      </div>
    </PGHubShell>
  );
}
