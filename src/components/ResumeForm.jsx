const INPUT_TYPES = ["text", "textarea", "email", "url", "date"];

export default function ResumeForm({ template, values, onChange }) {
  const fields = template?.fields || {};
  const entries = Object.entries(fields);

  const handleFieldChange = (fieldId, value) => {
    onChange?.({ ...(values || {}), [fieldId]: value });
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {entries.length === 0 ? (
        <p style={{ fontSize: 12, color: "#64748b" }}>
          No fields yet. Add a field to start capturing values.
        </p>
      ) : null}
      {entries.map(([fieldId, field]) => {
        const inputType = field?.inputType || "text";
        const value = values?.[fieldId] ?? "";
        const label = field?.label || fieldId;

        return (
          <label
            key={fieldId}
            style={{ display: "flex", flexDirection: "column", gap: 4 }}
          >
            <span style={{ fontSize: 12, fontWeight: 600 }}>{label}</span>
            {field?.description ? (
              <span style={{ fontSize: 11, color: "#64748b" }}>
                {field.description}
              </span>
            ) : null}
            {inputType === "textarea" ? (
              <textarea
                value={value}
                placeholder={field?.placeholder || ""}
                required={Boolean(field?.required)}
                maxLength={field?.maxLength || undefined}
                rows={3}
                style={{ padding: 6, border: "1px solid #cbd5f5" }}
                onChange={(event) =>
                  handleFieldChange(fieldId, event.target.value)
                }
              />
            ) : (
              <input
                type={INPUT_TYPES.includes(inputType) ? inputType : "text"}
                value={value}
                placeholder={field?.placeholder || ""}
                required={Boolean(field?.required)}
                maxLength={field?.maxLength || undefined}
                style={{ padding: 6, border: "1px solid #cbd5f5" }}
                onChange={(event) =>
                  handleFieldChange(fieldId, event.target.value)
                }
              />
            )}
          </label>
        );
      })}
    </div>
  );
}
