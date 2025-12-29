export default function Button({ className = "", variant = "primary", ...props }) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-full px-5 py-3 text-sm font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2";
  const variants = {
    primary:
      "bg-emerald-400 text-slate-950 shadow-[0_12px_32px_rgba(16,185,129,0.35)] hover:-translate-y-0.5 hover:shadow-[0_16px_40px_rgba(16,185,129,0.45)] focus-visible:outline-emerald-300",
    ghost:
      "border border-slate-800 bg-slate-900/70 text-slate-100 hover:bg-slate-900 focus-visible:outline-slate-500",
  };

  return (
    <button className={`${base} ${variants[variant]} ${className}`} {...props} />
  );
}
