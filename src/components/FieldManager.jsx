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
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <h4 style={{ margin: 0 }}>Field Manager</h4>
        <button type="button" onClick={startCreate}>
          Add Field
        </button>
      </div>
      {fieldEntries.length === 0 ? (
        <p style={{ fontSize: 12, color: "#64748b" }}>
          No fields yet. Create one to start binding nodes.
        </p>
      ) : (
        <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
          {fieldEntries.map(([fieldId, field]) => (
            <li
              key={fieldId}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "6px 0",
                borderBottom: "1px solid #e2e8f0",
              }}
            >
              <div>
                <div style={{ fontSize: 12, fontWeight: 600 }}>
                  {fieldId} · {field?.label || "Untitled"}
                </div>
                <div style={{ fontSize: 11, color: "#64748b" }}>
                  {(field?.source || "-") + "." + (field?.path || "-")} ·{" "}
                  {field?.inputType || "text"}
                </div>
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                <button type="button" onClick={() => startEdit(fieldId)}>
                  Edit
                </button>
                <button type="button" onClick={() => handleDelete(fieldId)}>
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <div style={{ borderTop: "1px solid #e2e8f0", paddingTop: 12 }}>
        <h5 style={{ margin: "0 0 8px" }}>
          {editingFieldId ? "Edit Field" : "Add Field"}
        </h5>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span style={{ fontSize: 12 }}>Field ID</span>
            <input
              value={draftId}
              onChange={(event) => setDraftId(event.target.value)}
              style={{ padding: 6 }}
              placeholder="e.g. full_name"
            />
          </label>
          <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span style={{ fontSize: 12 }}>Label</span>
            <input
              value={formState.label}
              onChange={(event) => handleChange("label", event.target.value)}
              style={{ padding: 6 }}
              placeholder="Full Name"
            />
          </label>
          <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span style={{ fontSize: 12 }}>Description</span>
            <input
              value={formState.description}
              onChange={(event) =>
                handleChange("description", event.target.value)
              }
              style={{ padding: 6 }}
              placeholder="Shown as main header at the top."
            />
          </label>
          <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span style={{ fontSize: 12 }}>Placeholder</span>
            <input
              value={formState.placeholder}
              onChange={(event) =>
                handleChange("placeholder", event.target.value)
              }
              style={{ padding: 6 }}
              placeholder="e.g. Jane Doe"
            />
          </label>
          <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span style={{ fontSize: 12 }}>Input Type</span>
            <input
              value={formState.inputType}
              onChange={(event) =>
                handleChange("inputType", event.target.value)
              }
              style={{ padding: 6 }}
              placeholder="text, textarea, email"
            />
          </label>
          <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span style={{ fontSize: 12 }}>Source</span>
            <input
              value={formState.source}
              onChange={(event) => handleChange("source", event.target.value)}
              style={{ padding: 6 }}
              placeholder="basics"
            />
          </label>
          <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span style={{ fontSize: 12 }}>Path</span>
            <input
              value={formState.path}
              onChange={(event) => handleChange("path", event.target.value)}
              style={{ padding: 6 }}
              placeholder="name"
            />
          </label>
          <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span style={{ fontSize: 12 }}>Max Length</span>
            <input
              value={formState.maxLength}
              onChange={(event) =>
                handleChange(
                  "maxLength",
                  event.target.value.replace(/[^\d]/g, "")
                )
              }
              style={{ padding: 6 }}
              placeholder="80"
            />
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <input
              type="checkbox"
              checked={formState.required}
              onChange={(event) =>
                handleChange("required", event.target.checked)
              }
            />
            <span style={{ fontSize: 12 }}>Required</span>
          </label>
          {error ? (
            <span style={{ fontSize: 12, color: "#b91c1c" }}>{error}</span>
          ) : null}
          <button type="button" onClick={handleSave}>
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
