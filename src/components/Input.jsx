export default function Input({ label, error, className = "", ...props }) {
  return (
    <label className="flex flex-col gap-2 text-sm font-medium text-slate-200">
      <span>{label}</span>
      <input
        className={`rounded-2xl border border-slate-800 bg-slate-950/70 px-4 py-3 text-slate-100 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/40 ${className}`}
        {...props}
      />
      {error ? <span className="text-xs text-rose-300">{error}</span> : null}
    </label>
  );
}
