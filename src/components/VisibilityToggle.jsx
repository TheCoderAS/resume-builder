export default function VisibilityToggle({ enabled, onChange }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!enabled)}
      className={`flex w-full items-center justify-between rounded-2xl border px-4 py-4 text-sm font-medium transition ${
        enabled
          ? "border-emerald-400/60 bg-emerald-400/10 text-emerald-200"
          : "border-slate-800 bg-slate-950/70 text-slate-200"
      }`}
    >
      <span>
        {enabled ? "Public link enabled" : "Keep my resume private"}
      </span>
      <span
        className={`h-6 w-11 rounded-full p-1 transition ${
          enabled ? "bg-emerald-400" : "bg-slate-700"
        }`}
      >
        <span
          className={`block h-4 w-4 rounded-full bg-slate-950 transition ${
            enabled ? "translate-x-5" : "translate-x-0"
          }`}
        />
      </span>
    </button>
  );
}
