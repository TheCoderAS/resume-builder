import RichTextEditor from "./RichTextEditor.jsx";

const INPUT_TYPES = ["text", "textarea", "email", "phone", "url", "date"];

export default function ResumeForm({ template, values, onChange }) {
  const fields = template?.fields || {};
  const entries = Object.entries(fields);

  const handleFieldChange = (fieldId, value) => {
    onChange?.({ ...(values || {}), [fieldId]: value });
  };

  return (
    <div className="flex flex-col gap-3">
      {entries.length === 0 ? (
        <p className="text-xs text-slate-400">
          No fields yet. Add a field to start capturing values.
        </p>
      ) : null}
      {entries.map(([fieldId, field]) => {
        const inputType = field?.inputType || "text";
        const value = values?.[fieldId] ?? "";
        const label = field?.label || fieldId;
        const inputId = `resume-field-${fieldId}`;

        return (
          <div key={fieldId} className="flex flex-col gap-1.5">
            <label htmlFor={inputId} className="text-xs font-semibold text-slate-200">
              {label}
            </label>
            {field?.description ? (
              <span className="text-[11px] text-slate-400">
                {field.description}
              </span>
            ) : null}
            {inputType === "textarea" ? (
              <RichTextEditor
                value={value}
                placeholder={field?.placeholder || ""}
                required={Boolean(field?.required)}
                maxLength={field?.maxLength || undefined}
                onChange={(nextValue) => handleFieldChange(fieldId, nextValue)}
              />
            ) : (
              <input
                id={inputId}
                type={INPUT_TYPES.includes(inputType) ? inputType : "text"}
                value={value}
                placeholder={field?.placeholder || ""}
                required={Boolean(field?.required)}
                maxLength={field?.maxLength || undefined}
                className="rounded-lg border border-slate-800 bg-slate-900/70 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                onChange={(event) =>
                  handleFieldChange(fieldId, event.target.value)
                }
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
