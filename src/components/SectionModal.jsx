import { useEffect, useState } from "react";
import { FiX } from "react-icons/fi";
import Button from "./Button.jsx";
import Input from "./Input.jsx";

const DEFAULT_SECTION_VALUES = {
  id: "",
  label: "",
  showTitleDivider: true,
  showSectionDivider: true,
  alignment: "left",
  titleFontWeight: "600",
  titleFontStyle: "normal",
};

export default function SectionModal({
  open,
  initialValues,
  onCancel,
  onSave,
}) {
  const [formState, setFormState] = useState(DEFAULT_SECTION_VALUES);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    const { titleFontSize: _unusedTitleFontSize, ...rest } = initialValues ?? {};
    setFormState({
      ...DEFAULT_SECTION_VALUES,
      ...rest,
    });
    setError("");
  }, [open, initialValues]);

  if (!open) {
    return null;
  }

  const updateField = (field, value) => {
    setFormState((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    const trimmedLabel = formState.label.trim();
    if (!trimmedLabel) {
      setError("Add a section title to continue.");
      return;
    }
    setError("");
    onSave({ ...formState, label: trimmedLabel });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 px-4 py-6 backdrop-blur">
      <div className="w-full max-w-xl rounded-[28px] border border-slate-800 bg-slate-900/90 p-6 text-slate-100 shadow-[0_24px_70px_rgba(15,23,42,0.7)]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-50">
              {initialValues?.id ? "Edit section" : "Add section"}
            </h2>
            <p className="mt-2 text-sm text-slate-300">
              Capture the section title, dividers, alignment, and typography.
            </p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="rounded-full p-2 text-slate-400 transition hover:bg-slate-800 hover:text-slate-100"
            aria-label="Close dialog"
          >
            <FiX className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-6 grid gap-4">
          <Input
            label="Section title"
            value={formState.label}
            onChange={(event) => updateField("label", event.target.value)}
            error={error}
          />

          <label className="flex flex-col gap-2 text-sm font-medium text-slate-200">
            <span>Alignment</span>
            <select
              value={formState.alignment}
              onChange={(event) => updateField("alignment", event.target.value)}
              className="rounded-2xl border border-slate-800 bg-slate-950/70 px-4 py-3 text-slate-100"
            >
              <option value="left">Left aligned</option>
              <option value="center">Centered</option>
              <option value="right">Right aligned</option>
            </select>
          </label>

          <label className="flex flex-col gap-2 text-sm font-medium text-slate-200">
            <span>Title weight</span>
            <select
              value={formState.titleFontWeight}
              onChange={(event) =>
                updateField("titleFontWeight", event.target.value)
              }
              className="rounded-2xl border border-slate-800 bg-slate-950/70 px-4 py-3 text-slate-100"
            >
              <option value="400">Regular</option>
              <option value="500">Medium</option>
              <option value="600">Semi-bold</option>
              <option value="700">Bold</option>
            </select>
          </label>

          <label className="flex flex-col gap-2 text-sm font-medium text-slate-200">
            <span>Title style</span>
            <select
              value={formState.titleFontStyle}
              onChange={(event) =>
                updateField("titleFontStyle", event.target.value)
              }
              className="rounded-2xl border border-slate-800 bg-slate-950/70 px-4 py-3 text-slate-100"
            >
              <option value="normal">Normal</option>
              <option value="italic">Italic</option>
            </select>
          </label>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex items-center justify-between gap-4 text-sm font-medium text-slate-200">
              <span>Title divider</span>
              <input
                type="checkbox"
                checked={formState.showTitleDivider}
                onChange={(event) =>
                  updateField("showTitleDivider", event.target.checked)
                }
                className="h-4 w-4 accent-emerald-400"
              />
            </label>
            <label className="flex items-center justify-between gap-4 text-sm font-medium text-slate-200">
              <span>Section divider</span>
              <input
                type="checkbox"
                checked={formState.showSectionDivider}
                onChange={(event) =>
                  updateField("showSectionDivider", event.target.checked)
                }
                className="h-4 w-4 accent-emerald-400"
              />
            </label>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap justify-end gap-3">
          <Button type="button" variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="button" onClick={handleSave}>
            {initialValues?.id ? "Save section" : "Add section"}
          </Button>
        </div>
      </div>
    </div>
  );
}
