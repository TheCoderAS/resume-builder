import { useEffect, useMemo, useRef, useState } from "react";
import { FiEdit2, FiPlus, FiTrash2 } from "react-icons/fi";
import RichTextEditor from "./RichTextEditor.jsx";
import PromptModal from "./PromptModal.jsx";

const INPUT_TYPES = [
  "text",
  "textarea",
  "email",
  "phone",
  "url",
  "date",
  "inline-bullets",
  "inline-chips",
];

const DEFAULT_FIELD = {
  label: "",
  description: "",
  placeholder: "",
  inputType: "text",
  required: false,
  maxLength: "",
};

const formatInputTypeLabel = (type) =>
  type.replace(/-/g, " ").toUpperCase();


export default function FieldManager({
  template,
  onUpdateTemplate,
  createSignal,
  onFieldCreated,
  onCreateCancelled,
}) {
  const fields = template?.fields || {};
  const [editingFieldId, setEditingFieldId] = useState(null);
  const [draftId, setDraftId] = useState("");
  const [formState, setFormState] = useState(DEFAULT_FIELD);
  const [error, setError] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const lastCreateSignal = useRef(createSignal);

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
    setIsModalOpen(true);
  };

  useEffect(() => {
    if (createSignal === undefined) return;
    if (lastCreateSignal.current === createSignal) return;
    lastCreateSignal.current = createSignal;
    startCreate();
  }, [createSignal]);

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
    });
    setError("");
    setIsModalOpen(true);
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

    const isNewField = !editingFieldId;
    setEditingFieldId(trimmedId);
    setError("");
    setIsModalOpen(false);
    if (isNewField) {
      onFieldCreated?.(trimmedId);
    }
  };

  const executeDelete = (fieldId) => {
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
      setEditingFieldId(null);
      setDraftId("");
      setFormState(DEFAULT_FIELD);
      setError("");
    }
  };

  const handleDelete = (fieldId) => {
    setDeleteConfirm({ fieldId, inUse: boundFieldIds.has(fieldId) });
  };

  const handleConfirmDelete = () => {
    if (!deleteConfirm?.fieldId) return;
    executeDelete(deleteConfirm.fieldId);
    setDeleteConfirm(null);
  };

  const handleCancelDelete = () => {
    setDeleteConfirm(null);
  };

  const handleCloseModal = () => {
    if (!editingFieldId) {
      onCreateCancelled?.();
    }
    setIsModalOpen(false);
    setError("");
  };

  return (
    <div className="field-manager flex flex-col gap-4">
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
                  {fieldId} · {field?.inputType || "text"}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => startEdit(fieldId)}
                  className="rounded-md p-1 text-slate-300 transition hover:bg-slate-800/80 hover:text-indigo-200"
                  aria-label={`Edit ${fieldId}`}
                >
                  <FiEdit2 className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(fieldId)}
                  className="rounded-md p-1 text-slate-300 transition hover:bg-slate-800/80 hover:text-rose-300"
                  aria-label={`Delete ${fieldId}`}
                >
                  <FiTrash2 className="h-4 w-4" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
      <PromptModal
        open={isModalOpen}
        title={editingFieldId ? "Edit Field" : "Add Field"}
        description="Define labels and input type for this field."
        confirmLabel={editingFieldId ? "Save field" : "Create field"}
        cancelLabel="Cancel"
        onConfirm={handleSave}
        onCancel={handleCloseModal}
      >
        <div className="grid gap-3">
          <label className="flex flex-col gap-2 text-xs font-semibold tracking-wide text-slate-400">
            Field ID
            <input
              value={draftId}
              onChange={(event) => setDraftId(event.target.value)}
              className="rounded-lg border border-slate-800 bg-slate-950/70 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
              placeholder="e.g. full_name"
            />
          </label>
          <label className="flex flex-col gap-2 text-xs font-semibold tracking-wide text-slate-400">
            Label
            <input
              value={formState.label}
              onChange={(event) => handleChange("label", event.target.value)}
              className="rounded-lg border border-slate-800 bg-slate-950/70 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
              placeholder="Full Name"
            />
          </label>
          <label className="flex flex-col gap-2 text-xs font-semibold tracking-wide text-slate-400">
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
          <label className="flex flex-col gap-2 text-xs font-semibold tracking-wide text-slate-400">
            Placeholder
            {formState.inputType === "textarea" ? (
              <RichTextEditor
                value={formState.placeholder}
                placeholder="Enter placeholder text"
                onChange={(nextValue) => handleChange("placeholder", nextValue)}
              />
            ) : (
              <input
                value={formState.placeholder}
                onChange={(event) =>
                  handleChange("placeholder", event.target.value)
                }
                className="rounded-lg border border-slate-800 bg-slate-950/70 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                placeholder="e.g. Jane Doe"
              />
            )}
          </label>
          <label className="flex flex-col gap-2 text-xs font-semibold tracking-wide text-slate-400">
            Input Type
            <select
              value={formState.inputType}
              onChange={(event) =>
                handleChange("inputType", event.target.value)
              }
              className="rounded-lg border border-slate-800 bg-slate-950/70 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
            >
              {INPUT_TYPES.map((type) => (
                <option key={type} value={type}>
                  {formatInputTypeLabel(type)}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-2 text-xs font-semibold tracking-wide text-slate-400">
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
          <label className="flex items-center gap-3 text-xs font-semibold tracking-wide text-slate-300">
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
        </div>
      </PromptModal>
      <PromptModal
        open={Boolean(deleteConfirm)}
        title="Delete field?"
        description={
          deleteConfirm?.inUse
            ? "This field is used by one or more nodes. Deleting it will remove those bindings."
            : "This field will be removed from the template."
        }
        confirmLabel="Delete field"
        cancelLabel="Cancel"
        onConfirm={handleConfirmDelete}
        onCancel={handleCancelDelete}
      />
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
