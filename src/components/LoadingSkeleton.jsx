export default function LoadingSkeleton({ variant = "card", className = "" }) {
  if (variant === "block") {
    return (
      <div className={`animate-pulse space-y-3 ${className}`}>
        <div className="h-4 w-3/5 rounded-full bg-slate-800/70" />
        <div className="h-4 w-4/5 rounded-full bg-slate-800/70" />
        <div className="h-4 w-2/5 rounded-full bg-slate-800/70" />
      </div>
    );
  }

  if (variant === "panel") {
    return (
      <div className={`animate-pulse space-y-4 ${className}`}>
        <div className="h-40 rounded-2xl bg-slate-800/70" />
        <div className="h-4 w-2/3 rounded-full bg-slate-800/70" />
        <div className="h-4 w-1/2 rounded-full bg-slate-800/70" />
        <div className="h-10 w-1/3 rounded-full bg-slate-800/70" />
      </div>
    );
  }

  return (
    <div className={`animate-pulse space-y-4 ${className}`}>
      <div className="h-32 rounded-2xl bg-slate-800/70" />
      <div className="h-4 w-2/3 rounded-full bg-slate-800/70" />
      <div className="h-3 w-1/2 rounded-full bg-slate-800/70" />
      <div className="h-3 w-4/5 rounded-full bg-slate-800/70" />
    </div>
  );
}
