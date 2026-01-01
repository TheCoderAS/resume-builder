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
      <div style={{ fontSize: 12, color: "#64748b" }}>
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
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <h4 style={{ margin: 0 }}>Node Inspector</h4>
      <div style={{ fontSize: 12, color: "#475569" }}>
        Selected: {node.type} ({node.id})
      </div>

      {isBindable ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span style={{ fontSize: 12 }}>Bind to Field</span>
            <select
              value={node.bindField || ""}
              onChange={(event) => handleBindChange(event.target.value)}
              style={{ padding: 6 }}
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
          >
            + New Field
          </button>
          {showNewField ? (
            <div
              style={{
                border: "1px solid #e2e8f0",
                padding: 8,
                borderRadius: 6,
                display: "flex",
                flexDirection: "column",
                gap: 6,
              }}
            >
              <input
                placeholder="Field ID"
                value={newFieldDraft.id}
                onChange={(event) =>
                  setNewFieldDraft((prev) => ({
                    ...prev,
                    id: event.target.value,
                  }))
                }
                style={{ padding: 6 }}
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
                style={{ padding: 6 }}
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
                style={{ padding: 6 }}
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
                style={{ padding: 6 }}
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
                style={{ padding: 6 }}
              />
              <button type="button" onClick={handleCreateField}>
                Create & Bind
              </button>
            </div>
          ) : null}
        </div>
      ) : (
        <p style={{ fontSize: 12, color: "#64748b" }}>
          Binding is available for text, bullet-list, and chip-list nodes.
        </p>
      )}
    </div>
  );
}
