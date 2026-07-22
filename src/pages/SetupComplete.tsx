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

  useEffect(() => {
    if (!creationResult) navigate("/", { replace: true });
  }, [creationResult, navigate]);

  if (!creationResult) return null;

  const finish = (target: string) => {
    reset();
    // Leaving setup also rebuilds the dashboard providers from the newly
    // created PG. A full replacement avoids a race between clearing the setup
    // result and React Router's protected-route redirect.
    window.location.replace(target);
  };

  const goBack = () => {
    navigate("/setup/capacity");
  };

  return (
    <PGHubShell variant="light" className="pgh-ready pgh-ready--journey pgh-ready--fullscreen">
      <div className="pgh-ready__journey w-full min-h-screen relative flex flex-col justify-between overflow-hidden">
        {/* Full upper screen image container with Back button on top-leftmost side */}
        <div className="pgh-ready__hero-banner relative w-full h-[40vh] sm:h-[45vh] overflow-hidden">
          <img src={journeyComplete} alt="Completed PG property" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/20 to-black/80" />
          <button 
            type="button" 
            onClick={goBack} 
            className="absolute top-4 left-4 z-30 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-black/60 text-white backdrop-blur-md text-xs font-bold border border-white/20 hover:bg-black/80 transition-all shadow-lg"
          >
            <ArrowLeft size={16} /> Back
          </button>
        </div>

        {/* Full screen card downside without gaps */}
        <section className="pgh-ready__sheet pgh-ready__sheet--fullscreen w-full flex-1 bg-white rounded-t-3xl -mt-6 relative z-10 p-6 flex flex-col justify-between shadow-2xl border-t border-slate-100">
          <div className="pgh-ready__copy text-center pt-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 leading-tight mb-2">
              Your PG is<br /><em className="text-blue-600 not-italic">ready to manage smarter</em>
            </h1>
            <p className="text-slate-600 text-sm"><strong>{creationResult.pgName}</strong> has been created successfully.</p>
          </div>

          <div className="pgh-ready__stats grid grid-cols-3 gap-3 my-4" aria-label="Property summary">
            <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 text-center">
              <strong className="block text-2xl font-extrabold text-blue-600">{creationResult.floors}</strong>
              <span className="text-xs text-slate-500 font-semibold">Floors</span>
            </div>
            <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 text-center">
              <strong className="block text-2xl font-extrabold text-blue-600">{creationResult.rooms}</strong>
              <span className="text-xs text-slate-500 font-semibold">Rooms</span>
            </div>
            <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 text-center">
              <strong className="block text-2xl font-extrabold text-blue-600">{creationResult.beds}</strong>
              <span className="text-xs text-slate-500 font-semibold">Beds</span>
            </div>
          </div>

          <div className="pgh-ready__buttons pt-2 pb-2">
            <PGHubButton onClick={() => finish("/")} className="w-full h-14 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-2xl font-bold text-base shadow-lg shadow-blue-500/25">
              Open dashboard
            </PGHubButton>
          </div>
        </section>
      </div>
    </PGHubShell>
  );
}
