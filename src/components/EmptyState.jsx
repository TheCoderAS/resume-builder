import { FiInbox } from "react-icons/fi";

export default function EmptyState({
  title,
  description,
  action,
  icon: Icon = FiInbox,
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-[24px] border border-dashed border-slate-800 bg-slate-900/40 p-8 text-center">
      <div className="rounded-full border border-slate-700 bg-slate-950/70 p-3 text-emerald-200">
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <p className="text-sm font-semibold text-slate-100">{title}</p>
        {description ? (
          <p className="mt-1 text-xs text-slate-400">{description}</p>
        ) : null}
      </div>
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}
