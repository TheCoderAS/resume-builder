import Button from "./Button.jsx";

export default function EntryList({
  items,
  onAdd,
  onEdit,
  onRemove,
  emptyMessage = "No entries yet.",
  addLabel = "Add entry",
  getTitle,
  getMeta,
}) {
  return (
    <div className="mt-4 grid gap-3">
      {items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-950/40 px-4 py-5 text-sm text-slate-400">
          {emptyMessage}
        </div>
      ) : (
        items.map((item, index) => (
          <div
            key={`${getTitle(item) ?? "entry"}-${index}`}
            className="flex flex-wrap items-start justify-between gap-3 rounded-2xl border border-slate-800 bg-slate-950/70 px-4 py-4"
          >
            <div>
              <p className="text-sm font-semibold text-slate-100">
                {getTitle(item) || "Untitled"}
              </p>
              {getMeta ? (
                <p className="mt-1 text-xs text-slate-400">{getMeta(item)}</p>
              ) : null}
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="ghost"
                className="px-4 py-2 text-xs"
                onClick={() => onEdit(index)}
              >
                Edit
              </Button>
              <Button
                variant="ghost"
                className="px-4 py-2 text-xs text-rose-200 hover:text-rose-100"
                onClick={() => onRemove(index)}
              >
                Remove
              </Button>
            </div>
          </div>
        ))
      )}
      <Button
        variant="ghost"
        className="w-fit px-4 py-2 text-xs"
        onClick={onAdd}
      >
        {addLabel}
      </Button>
    </div>
  );
}
