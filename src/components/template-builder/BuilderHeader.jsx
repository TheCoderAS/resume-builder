import Button from "../Button.jsx";

export default function BuilderHeader({
  name,
  onNameChange,
  category,
  onCategoryChange,
  status,
  onStatusChange,
  categoryOptions,
  statusOptions,
  saving,
  saveError,
  onSave,
  templateId,
}) {
  return (
    <div className="rounded-2xl border border-slate-800/80 bg-slate-950/90 px-4 py-4 sm:px-6">
      <div className="flex flex-wrap items-end gap-4">
        <label className="flex w-full flex-col gap-2 text-xs font-semibold tracking-wide text-slate-400 sm:w-auto">
          Name
          <input
            value={name}
            onChange={(event) => onNameChange(event.target.value)}
            className="h-10 w-full rounded-lg border border-slate-800 bg-slate-900/70 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 sm:w-52"
          />
        </label>
        <label className="flex w-full flex-col gap-2 text-xs font-semibold tracking-wide text-slate-400 sm:w-auto">
          Category
          <select
            value={category}
            onChange={(event) => onCategoryChange(event.target.value)}
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
            className="h-10 w-full rounded-lg border border-slate-800 bg-slate-900/70 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 sm:w-32"
          >
            {statusOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <Button
          type="button"
          onClick={onSave}
          disabled={saving}
          className="h-10 w-full px-5 py-2 sm:w-auto"
        >
          {saving
            ? "Saving..."
            : templateId
              ? "Save changes"
              : "Create template"}
        </Button>
        {saveError ? (
          <span className="text-xs font-semibold text-rose-400">
            {saveError}
          </span>
        ) : null}
      </div>
    </div>
  );
}
