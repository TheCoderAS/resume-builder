import { useMemo } from "react";

const BINDABLE_TYPES = new Set(["text", "bullet-list", "chip-list"]);

export default function NodeInspector({
  node,
  template,
  onUpdateNode,
  onRequestNewField,
}) {
  const fields = template?.fields || {};
  const fieldOptions = useMemo(
    () =>
      Object.entries(fields).map(([fieldId, field]) => ({
        id: fieldId,
        label: field?.label || fieldId,
      })),
    [fields]
  );
  if (!node) {
    return (
      <div className="text-xs text-slate-400">
        Select a node to edit its properties.
      </div>
    );
  }

  const isBindable = BINDABLE_TYPES.has(node.type);

  const handleBindChange = (value) => {
    onUpdateNode?.((current) => {
      if (value) {
        return { ...current, bindField: value };
      }
      const next = { ...current };
      delete next.bindField;
      return next;
    });
  };

  return (
    <div className="flex flex-col gap-3">
      <div>
        <h4 className="text-sm font-semibold text-slate-200">Node Inspector</h4>
        <div className="mt-1 text-xs text-slate-400">
          Selected:{" "}
          <span className="font-semibold text-slate-200">{node.type}</span>{" "}
          <span className="text-slate-500">({node.id})</span>
        </div>
      </div>

      {isBindable ? (
        <div className="flex flex-col gap-3">
          <label className="flex flex-col gap-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
            Bind to Field
            <select
              value={node.bindField || ""}
              onChange={(event) => handleBindChange(event.target.value)}
              className="rounded-lg border border-slate-800 bg-slate-900/70 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
            >
              <option value="">(None)</option>
              {fieldOptions.map((field) => (
                <option key={field.id} value={field.id}>
                  {field.label} ({field.id})
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            onClick={onRequestNewField}
            className="w-fit rounded-full bg-indigo-500 px-4 py-1.5 text-xs font-semibold text-white transition hover:bg-indigo-400"
          >
            + New Field
          </button>
        </div>
      ) : (
        <p className="text-xs text-slate-400">
          Binding is available for text, bullet-list, and chip-list nodes.
        </p>
      )}
    </div>
  );
}
