import { useMemo, useState } from "react";

const BINDABLE_TYPES = new Set(["text", "bullet-list", "chip-list"]);

export default function NodeInspector({
  node,
  template,
  onUpdateNode,
  onCreateField,
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
  const [newFieldDraft, setNewFieldDraft] = useState({
    id: "",
    label: "",
    inputType: "text",
    source: "",
    path: "",
  });
  const [showNewField, setShowNewField] = useState(false);

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

  const handleCreateField = () => {
    const trimmedId = newFieldDraft.id.trim();
    if (!trimmedId || fields[trimmedId]) return;

    onCreateField?.(trimmedId, {
      label: newFieldDraft.label.trim(),
      inputType: newFieldDraft.inputType.trim() || "text",
      source: newFieldDraft.source.trim(),
      path: newFieldDraft.path.trim(),
    });

    onUpdateNode?.((current) => ({ ...current, bindField: trimmedId }));
    setNewFieldDraft({
      id: "",
      label: "",
      inputType: "text",
      source: "",
      path: "",
    });
    setShowNewField(false);
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
            onClick={() => setShowNewField((prev) => !prev)}
            className="w-fit rounded-full bg-indigo-500 px-4 py-1.5 text-xs font-semibold text-white transition hover:bg-indigo-400"
          >
            + New Field
          </button>
          {showNewField ? (
            <div
              className="rounded-lg border border-slate-800 bg-slate-900/70 p-3"
            >
              <div className="grid gap-2">
                <input
                  placeholder="Field ID"
                  value={newFieldDraft.id}
                  onChange={(event) =>
                    setNewFieldDraft((prev) => ({
                      ...prev,
                      id: event.target.value,
                    }))
                  }
                  className="rounded-md border border-slate-800 bg-slate-950/80 px-3 py-2 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                />
                <input
                  placeholder="Label"
                  value={newFieldDraft.label}
                  onChange={(event) =>
                    setNewFieldDraft((prev) => ({
                      ...prev,
                      label: event.target.value,
                    }))
                  }
                  className="rounded-md border border-slate-800 bg-slate-950/80 px-3 py-2 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                />
                <input
                  placeholder="Input type"
                  value={newFieldDraft.inputType}
                  onChange={(event) =>
                    setNewFieldDraft((prev) => ({
                      ...prev,
                      inputType: event.target.value,
                    }))
                  }
                  className="rounded-md border border-slate-800 bg-slate-950/80 px-3 py-2 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                />
                <input
                  placeholder="Source"
                  value={newFieldDraft.source}
                  onChange={(event) =>
                    setNewFieldDraft((prev) => ({
                      ...prev,
                      source: event.target.value,
                    }))
                  }
                  className="rounded-md border border-slate-800 bg-slate-950/80 px-3 py-2 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                />
                <input
                  placeholder="Path"
                  value={newFieldDraft.path}
                  onChange={(event) =>
                    setNewFieldDraft((prev) => ({
                      ...prev,
                      path: event.target.value,
                    }))
                  }
                  className="rounded-md border border-slate-800 bg-slate-950/80 px-3 py-2 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                />
              </div>
              <button
                type="button"
                onClick={handleCreateField}
                className="mt-3 w-fit rounded-full bg-emerald-500 px-4 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-400"
              >
                Create & Bind
              </button>
            </div>
          ) : null}
        </div>
      ) : (
        <p className="text-xs text-slate-400">
          Binding is available for text, bullet-list, and chip-list nodes.
        </p>
      )}
    </div>
  );
}
