export default function LoaderOverlay({ label = "Loading..." }) {
  return (
    <div className="loader-overlay fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm">
      <div className="flex items-center gap-3 rounded-full border border-slate-800 bg-slate-950/80 px-6 py-4 text-sm font-semibold text-slate-100 shadow-[0_20px_60px_rgba(15,23,42,0.6)]">
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-emerald-300 border-t-transparent" />
        {label}
      </div>
    </div>
  );
}
