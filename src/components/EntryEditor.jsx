import Button from "./Button.jsx";
import Input from "./Input.jsx";

export default function EntryEditor({
  title,
  fields,
  value,
  onChange,
  onSave,
  onCancel,
}) {
  const handleFieldChange = (key, nextValue) => {
    onChange({ ...value, [key]: nextValue });
  };

  return (
    <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h4 className="text-sm font-semibold text-slate-100">{title}</h4>
          <p className="text-xs text-slate-400">
            Fill in the details for this entry.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="ghost"
            className="px-4 py-2 text-xs"
            onClick={onCancel}
          >
            Cancel
          </Button>
          <Button className="px-4 py-2 text-xs" onClick={onSave}>
            Save entry
          </Button>
        </div>
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {fields.map((field) =>
          field.multiline ? (
            <label
              key={field.key}
              className="md:col-span-2 flex flex-col gap-2 text-sm font-medium text-slate-200"
            >
              <span>{field.label}</span>
              <textarea
                rows={4}
                className="rounded-2xl border border-slate-800 bg-slate-950/70 px-4 py-3 text-slate-100 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/40"
                placeholder={field.placeholder}
                value={value[field.key] ?? ""}
                onChange={(event) =>
                  handleFieldChange(field.key, event.target.value)
                }
              />
            </label>
          ) : (
            <Input
              key={field.key}
              label={field.label}
              placeholder={field.placeholder}
              value={value[field.key] ?? ""}
              onChange={(event) =>
                handleFieldChange(field.key, event.target.value)
              }
            />
          )
        )}
      </div>
    </div>
  );
}
