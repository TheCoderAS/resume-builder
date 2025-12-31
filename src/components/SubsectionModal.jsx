import { useEffect, useState } from "react";
import { FiX } from "react-icons/fi";
import Button from "./Button.jsx";
import { FONT_SIZE_OPTIONS } from "../utils/resumePreview.js";

const DEFAULT_SUBSECTION_VALUES = {
  id: "",
  type: "list",
  columns: 1,
  columnOrder: "left-to-right",
  showTimeline: false,
  timelineStyle: "line",
  timelinePosition: "left",
  placeholderValue: "",
  placeholderFontSizeKey: "body",
  showPlaceholder: true,
};

export default function SubsectionModal({
  open,
  initialValues,
  onCancel,
  onSave,
}) {
  const [formState, setFormState] = useState(DEFAULT_SUBSECTION_VALUES);

  useEffect(() => {
    if (!open) return;
    setFormState({
      ...DEFAULT_SUBSECTION_VALUES,
      ...(initialValues ?? {}),
    });
  }, [open, initialValues]);

  if (!open) {
    return null;
  }

  const updateField = (field, value) => {
    setFormState((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    onSave(formState);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 px-4 py-6 backdrop-blur">
      <div className="w-full max-w-xl rounded-[28px] border border-slate-800 bg-slate-900/90 p-6 text-slate-100 shadow-[0_24px_70px_rgba(15,23,42,0.7)]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-50">
              {initialValues?.id ? "Edit subsection" : "Add subsection"}
            </h2>
            <p className="mt-2 text-sm text-slate-300">
              Configure subsection type, layout, ordering, and timeline options.
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
          <label className="flex flex-col gap-2 text-sm font-medium text-slate-200">
            <span>Subsection type</span>
            <select
              value={formState.type}
              onChange={(event) => updateField("type", event.target.value)}
              className="rounded-2xl border border-slate-800 bg-slate-950/70 px-4 py-3 text-slate-100"
            >
              <option value="list">List</option>
              <option value="text">Text</option>
              <option value="date">Date</option>
              <option value="number">Number</option>
            </select>
          </label>
          <div className="flex items-end gap-3">
            <label className="flex flex-1 flex-col gap-2 text-sm font-medium text-slate-200">
              <span>Placeholder value</span>
              <input
                type="text"
                value={formState.placeholderValue}
                onChange={(event) =>
                  updateField("placeholderValue", event.target.value)
                }
                className="rounded-2xl border border-slate-800 bg-slate-950/70 px-4 py-3 text-slate-100"
                placeholder="e.g., Senior Designer"
              />
            </label>
            <label className="mb-2 flex items-center gap-2 text-xs font-semibold text-slate-200">
              <input
                type="checkbox"
                checked={formState.showPlaceholder}
                onChange={(event) =>
                  updateField("showPlaceholder", event.target.checked)
                }
                className="h-4 w-4 accent-emerald-400"
              />
              <span>Show</span>
            </label>
          </div>
          <label className="flex flex-col gap-2 text-sm font-medium text-slate-200">
            <span>Placeholder font size</span>
            <select
              value={formState.placeholderFontSizeKey}
              onChange={(event) =>
                updateField("placeholderFontSizeKey", event.target.value)
              }
              className="rounded-2xl border border-slate-800 bg-slate-950/70 px-4 py-3 text-slate-100"
            >
              {FONT_SIZE_OPTIONS.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-2 text-sm font-medium text-slate-200">
              <span>Column layout</span>
              <select
                value={formState.columns}
                onChange={(event) =>
                  updateField("columns", Number(event.target.value))
                }
                className="rounded-2xl border border-slate-800 bg-slate-950/70 px-4 py-3 text-slate-100"
              >
                <option value={1}>Single column</option>
                <option value={2}>Two column</option>
                <option value={3}>Three column</option>
              </select>
            </label>
            <label className="flex flex-col gap-2 text-sm font-medium text-slate-200">
              <span>Column ordering</span>
              <select
                value={formState.columnOrder}
                onChange={(event) =>
                  updateField("columnOrder", event.target.value)
                }
                className="rounded-2xl border border-slate-800 bg-slate-950/70 px-4 py-3 text-slate-100"
              >
                <option value="left-to-right">Left to right</option>
                <option value="right-to-left">Right to left</option>
                <option value="stacked">Stacked</option>
              </select>
            </label>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-4">
            <h3 className="text-sm font-semibold text-slate-100">
              Timeline options
            </h3>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <label className="flex items-center justify-between gap-4 text-sm font-medium text-slate-200">
                <span>Enable timeline</span>
                <input
                  type="checkbox"
                  checked={formState.showTimeline}
                  onChange={(event) =>
                    updateField("showTimeline", event.target.checked)
                  }
                  className="h-4 w-4 accent-emerald-400"
                />
              </label>
              <label className="flex flex-col gap-2 text-sm font-medium text-slate-200">
                <span>Timeline style</span>
                <select
                  value={formState.timelineStyle}
                  onChange={(event) =>
                    updateField("timelineStyle", event.target.value)
                  }
                  className="rounded-2xl border border-slate-800 bg-slate-950/70 px-4 py-3 text-slate-100"
                >
                  <option value="line">Line</option>
                  <option value="dots">Dots</option>
                  <option value="bars">Bars</option>
                </select>
              </label>
              <label className="flex flex-col gap-2 text-sm font-medium text-slate-200">
                <span>Timeline position</span>
                <select
                  value={formState.timelinePosition}
                  onChange={(event) =>
                    updateField("timelinePosition", event.target.value)
                  }
                  className="rounded-2xl border border-slate-800 bg-slate-950/70 px-4 py-3 text-slate-100"
                >
                  <option value="left">Left</option>
                  <option value="right">Right</option>
                </select>
              </label>
            </div>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap justify-end gap-3">
          <Button type="button" variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="button" onClick={handleSave}>
            {initialValues?.id ? "Save subsection" : "Add subsection"}
          </Button>
        </div>
      </div>
    </div>
  );
}
