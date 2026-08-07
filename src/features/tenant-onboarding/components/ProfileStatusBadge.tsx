import React from "react";

type ProfileStatusBadgeProps = {
  status: "complete" | "incomplete";
  onClick?: () => void;
};

export const ProfileStatusBadge: React.FC<ProfileStatusBadgeProps> = ({
  status,
  onClick,
}) => {
  const isComplete = status === "complete";

  const badgeSrc = isComplete
    ? "/assets/badges/green-profile-badge.png"
    : "/assets/badges/grey-profile-badge.png";

  const label = isComplete ? "Profile Complete" : "Profile Incomplete";
  const chipColor = isComplete
    ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/40"
    : "bg-slate-700/40 text-slate-200 border-slate-600";

  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-3 rounded-full px-3 py-2 bg-slate-900/60 border border-slate-700 hover:border-violet-500 hover:bg-slate-900 transition-colors"
    >
      <img
        src={badgeSrc}
        alt={label}
        width={40}
        height={40}
        className="shrink-0"
      />
      <div className={`px-3 py-1 rounded-full text-xs font-medium ${chipColor}`}>
        {label}
      </div>
    </button>
  );
};
