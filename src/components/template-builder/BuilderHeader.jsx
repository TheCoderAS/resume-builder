export default function BuilderHeader({
  name,
  onNameChange,
  category,
  onCategoryChange,
  status,
  onStatusChange,
  isPublic,
  onPublicChange,
  readOnly = false,
  categoryOptions,
  statusOptions,
  saveError,
  autosaveLabel,
}) {
  return (
    <div className="builder-header rounded-2xl border border-slate-800/80 bg-slate-950/90 px-4 py-4 sm:px-6">
      <div className="flex flex-wrap items-center gap-4">
        <label className="flex w-full flex-col gap-2 text-xs font-semibold tracking-wide text-slate-400 sm:w-auto">
          Name
          <input
            value={name}
            onChange={(event) => onNameChange(event.target.value)}
            disabled={readOnly}
            className="h-10 w-full rounded-lg border border-slate-800 bg-slate-900/70 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 sm:w-52"
          />
        </label>
        <label className="flex w-full flex-col gap-2 text-xs font-semibold tracking-wide text-slate-400 sm:w-auto">
          Category
          <select
            value={category}
            onChange={(event) => onCategoryChange(event.target.value)}
            disabled={readOnly}
            className="h-10 w-full rounded-lg border border-slate-800 bg-slate-900/70 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 sm:w-44"
          >
            {categoryOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex w-full flex-col gap-2 text-xs font-semibold tracking-wide text-slate-400 sm:w-auto">
          Status
          <select
            value={status}
            onChange={(event) => onStatusChange(event.target.value)}
            disabled={readOnly}
            className="h-10 w-full rounded-lg border border-slate-800 bg-slate-900/70 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 sm:w-32"
          >
            {statusOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-3 text-xs font-semibold tracking-wide text-slate-400 mt-6">
          <input
            type="checkbox"
            checked={Boolean(isPublic)}
            onChange={(event) => onPublicChange?.(event.target.checked)}
            disabled={readOnly}
            className="h-4 w-4 rounded border-slate-600 bg-slate-900 text-indigo-500 focus:ring-indigo-500/40"
          />
          Public
        </label>
        <div className="ml-auto flex items-center gap-3 text-xs font-semibold text-slate-400 mt-6">
          {autosaveLabel ? (
            <span>Autosave: {autosaveLabel}</span>
          ) : null}
        </div>
        {saveError ? (
          <span className="text-xs font-semibold text-rose-400">
            {saveError}
          </span>
        ) : null}
      </div>
    </div>
  );
}
