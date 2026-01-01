import { useMemo, useState } from "react";

const DEFAULT_FIELD = {
  label: "",
  description: "",
  placeholder: "",
  inputType: "text",
  required: false,
  maxLength: "",
  source: "",
  path: "",
};

export default function FieldManager({ template, onUpdateTemplate }) {
  const fields = template?.fields || {};
  const [editingFieldId, setEditingFieldId] = useState(null);
  const [draftId, setDraftId] = useState("");
  const [formState, setFormState] = useState(DEFAULT_FIELD);
  const [error, setError] = useState("");

  const fieldEntries = useMemo(
    () => Object.entries(fields).sort((a, b) => a[0].localeCompare(b[0])),
    [fields]
  );

  const boundFieldIds = useMemo(() => {
    const collected = new Set();

    const walk = (node) => {
      if (!node) return;
      if (node.bindField) collected.add(node.bindField);
      node.children?.forEach(walk);
    };

    walk(template?.layout?.root);
    return collected;
  }, [template]);

  const startCreate = () => {
    setEditingFieldId(null);
    setDraftId("");
    setFormState(DEFAULT_FIELD);
    setError("");
  };

  const startEdit = (fieldId) => {
    const field = fields[fieldId];
    setEditingFieldId(fieldId);
    setDraftId(fieldId);
    setFormState({
      label: field?.label || "",
      description: field?.description || "",
      placeholder: field?.placeholder || "",
      inputType: field?.inputType || "text",
      required: Boolean(field?.required),
      maxLength: field?.maxLength ?? "",
      source: field?.source || "",
      path: field?.path || "",
    });
    setError("");
  };

  const handleChange = (key, value) => {
    setFormState((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = () => {
    const trimmedId = draftId.trim();
    if (!trimmedId) {
      setError("Field ID is required.");
      return;
    }

    if (editingFieldId !== trimmedId && fields[trimmedId]) {
      setError("Field ID must be unique.");
      return;
    }

    onUpdateTemplate?.((prev) => {
      const nextFields = { ...(prev.fields || {}) };
      const previousId = editingFieldId;
      if (previousId && previousId !== trimmedId) {
        delete nextFields[previousId];
      }
      nextFields[trimmedId] = {
        label: formState.label.trim(),
        description: formState.description.trim(),
        placeholder: formState.placeholder.trim(),
        inputType: formState.inputType || "text",
        required: Boolean(formState.required),
        maxLength:
          formState.maxLength === "" ? undefined : Number(formState.maxLength),
        source: formState.source.trim(),
        path: formState.path.trim(),
      };

      let root = prev.layout.root;
      if (previousId && previousId !== trimmedId) {
        root = updateBindings(root, previousId, trimmedId);
      }

      return {
        ...prev,
        fields: nextFields,
        layout: { ...prev.layout, root },
      };
    });

    setEditingFieldId(trimmedId);
    setError("");
  };

  const handleDelete = (fieldId) => {
    const inUse = boundFieldIds.has(fieldId);
    const confirmed = window.confirm(
      inUse
        ? "This field is used by one or more nodes. Delete anyway?"
        : "Delete this field?"
    );
    if (!confirmed) return;

    onUpdateTemplate?.((prev) => {
      const nextFields = { ...(prev.fields || {}) };
      delete nextFields[fieldId];
      const root = updateBindings(prev.layout.root, fieldId, null);

      return {
        ...prev,
        fields: nextFields,
        layout: { ...prev.layout, root },
      };
    });

    if (editingFieldId === fieldId) {
      startCreate();
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-slate-200">Field Manager</h4>
        <button
          type="button"
          onClick={startCreate}
          className="rounded-full border border-slate-700 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-200 transition hover:border-indigo-400 hover:text-white"
        >
          Add Field
        </button>
      </div>
      {fieldEntries.length === 0 ? (
        <p className="text-xs text-slate-400">
          No fields yet. Create one to start binding nodes.
        </p>
      ) : (
        <ul className="space-y-2">
          {fieldEntries.map(([fieldId, field]) => (
            <li
              key={fieldId}
              className="flex items-center justify-between rounded-lg border border-slate-800/80 bg-slate-900/70 px-3 py-2"
            >
              <div>
                <div className="text-xs font-semibold text-slate-100">
                  {field?.label || "Untitled"}
                </div>
                <div className="text-[11px] text-slate-400">
                  {fieldId} · {(field?.source || "-") + "." + (field?.path || "-")} ·{" "}
                  {field?.inputType || "text"}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => startEdit(fieldId)}
                  className="rounded-md p-1 text-slate-300 transition hover:bg-slate-800/80 hover:text-indigo-200"
                  aria-label={`Edit ${fieldId}`}
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-4 w-4"
                  >
                    <path d="M12 20h9" />
                    <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(fieldId)}
                  className="rounded-md p-1 text-slate-300 transition hover:bg-slate-800/80 hover:text-rose-300"
                  aria-label={`Delete ${fieldId}`}
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-4 w-4"
                  >
                    <path d="M3 6h18" />
                    <path d="M8 6V4h8v2" />
                    <path d="M19 6l-1 14H6L5 6" />
                    <path d="M10 11v6" />
                    <path d="M14 11v6" />
                  </svg>
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="rounded-lg border border-slate-800/80 bg-slate-900/60 p-4">
        <h5 className="text-xs font-semibold uppercase tracking-wide text-slate-300">
          {editingFieldId ? "Edit Field" : "Add Field"}
        </h5>
        <div className="mt-3 grid gap-3">
          <label className="flex flex-col gap-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
            Field ID
            <input
              value={draftId}
              onChange={(event) => setDraftId(event.target.value)}
              className="rounded-lg border border-slate-800 bg-slate-950/70 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
              placeholder="e.g. full_name"
            />
          </label>
          <label className="flex flex-col gap-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
            Label
            <input
              value={formState.label}
              onChange={(event) => handleChange("label", event.target.value)}
              className="rounded-lg border border-slate-800 bg-slate-950/70 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
              placeholder="Full Name"
            />
          </label>
          <label className="flex flex-col gap-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
            Description
            <input
              value={formState.description}
              onChange={(event) =>
                handleChange("description", event.target.value)
              }
              className="rounded-lg border border-slate-800 bg-slate-950/70 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
              placeholder="Shown as main header at the top."
            />
          </label>
          <label className="flex flex-col gap-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
            Placeholder
            <input
              value={formState.placeholder}
              onChange={(event) =>
                handleChange("placeholder", event.target.value)
              }
              className="rounded-lg border border-slate-800 bg-slate-950/70 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
              placeholder="e.g. Jane Doe"
            />
          </label>
          <label className="flex flex-col gap-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
            Input Type
            <input
              value={formState.inputType}
              onChange={(event) =>
                handleChange("inputType", event.target.value)
              }
              className="rounded-lg border border-slate-800 bg-slate-950/70 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
              placeholder="text, textarea, email"
            />
          </label>
          <label className="flex flex-col gap-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
            Source
            <input
              value={formState.source}
              onChange={(event) => handleChange("source", event.target.value)}
              className="rounded-lg border border-slate-800 bg-slate-950/70 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
              placeholder="basics"
            />
          </label>
          <label className="flex flex-col gap-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
            Path
            <input
              value={formState.path}
              onChange={(event) => handleChange("path", event.target.value)}
              className="rounded-lg border border-slate-800 bg-slate-950/70 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
              placeholder="name"
            />
          </label>
          <label className="flex flex-col gap-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
            Max Length
            <input
              value={formState.maxLength}
              onChange={(event) =>
                handleChange(
                  "maxLength",
                  event.target.value.replace(/[^\d]/g, "")
                )
              }
              className="rounded-lg border border-slate-800 bg-slate-950/70 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
              placeholder="80"
            />
          </label>
          <label className="flex items-center gap-3 text-xs font-semibold uppercase tracking-wide text-slate-300">
            <input
              type="checkbox"
              checked={formState.required}
              onChange={(event) =>
                handleChange("required", event.target.checked)
              }
              className="h-4 w-4 rounded border-slate-600 bg-slate-900 text-indigo-500 focus:ring-indigo-500/40"
            />
            Required
          </label>
          {error ? (
            <span className="text-xs text-rose-400">{error}</span>
          ) : null}
          <button
            type="button"
            onClick={handleSave}
            className="mt-1 w-fit rounded-full bg-indigo-500 px-4 py-1.5 text-xs font-semibold text-white transition hover:bg-indigo-400"
          >
            {editingFieldId ? "Save field" : "Create field"}
          </button>
        </div>
      </div>
    </div>
  );
}

function updateBindings(node, oldFieldId, newFieldId) {
  if (!node) return node;

  const nextNode = { ...node };
  if (oldFieldId && node.bindField === oldFieldId) {
    if (newFieldId) {
      nextNode.bindField = newFieldId;
    } else {
      delete nextNode.bindField;
    }
  }

  if (node.children) {
    nextNode.children = node.children.map((child) =>
      updateBindings(child, oldFieldId, newFieldId)
    );
  }

  return nextNode;
}
