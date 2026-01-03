import { useMemo, useState } from "react";
import PromptModal from "./PromptModal.jsx";

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
  const [isSectionStyleOpen, setIsSectionStyleOpen] = useState(false);
  if (!node) {
    return (
      <div className="text-xs text-slate-400">
        Select a node to edit its properties.
      </div>
    );
  }

  const isBindable = BINDABLE_TYPES.has(node.type);
  const isSection = node.type === "section";
  const isRow = node.type === "row";
  const isColumn = node.type === "column";
  const isTextLike = BINDABLE_TYPES.has(node.type);
  const sectionTitleStyle = node.titleStyle || {};

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

  const handleSectionTitleChange = (value) => {
    onUpdateNode?.((current) => ({
      ...current,
      title: value,
    }));
  };

  const handleSectionTitleToggle = (checked) => {
    onUpdateNode?.((current) => ({
      ...current,
      showTitle: checked,
    }));
  };

  const handleSectionDividerToggle = (checked) => {
    onUpdateNode?.((current) => ({
      ...current,
      showDivider: checked,
    }));
  };

  const COLOR_OPTIONS = [
    { label: "Primary", value: "primary" },
    { label: "Secondary", value: "secondary" },
    { label: "Accent", value: "accent" },
    { label: "Meta", value: "meta" },
  ];
  const FONT_SIZE_TOKENS = [
    { label: "Display", value: "display" },
    { label: "Heading", value: "heading" },
    { label: "Body", value: "body" },
    { label: "Meta", value: "meta" },
  ];
  const ICON_OPTIONS = [
    { label: "None", value: "" },
    { label: "User", value: "user" },
    { label: "Briefcase", value: "briefcase" },
    { label: "Education", value: "book" },
    { label: "Award", value: "award" },
    { label: "Email", value: "mail" },
    { label: "Phone", value: "phone" },
    { label: "Location", value: "mapPin" },
    { label: "Website", value: "globe" },
    { label: "LinkedIn", value: "linkedin" },
    { label: "GitHub", value: "github" },
    { label: "Link", value: "link" },
  ];
  const ICON_SEPARATORS = [
    { label: "Space", value: " " },
    { label: "Bullet", value: " • " },
    { label: "Pipe", value: " | " },
    { label: "Dash", value: " — " },
    { label: "Colon", value: ": " },
    { label: "None", value: "" },
  ];

  const handleNodeAlignChange = (key, value) => {
    onUpdateNode?.((current) => ({
      ...current,
      [key]: value,
    }));
  };

  const handleNodeIconChange = (key, value) => {
    onUpdateNode?.((current) => ({
      ...current,
      [key]: value || undefined,
    }));
  };

  const handleLeafStyleChange = (key, value) => {
    onUpdateNode?.((current) => ({
      ...current,
      textStyle: {
        ...(current.textStyle || {}),
        [key]: value,
      },
    }));
  };

  const handleSectionTitleStyleChange = (key, value) => {
    onUpdateNode?.((current) => ({
      ...current,
      titleStyle: {
        ...(current.titleStyle || {}),
        [key]: value,
      },
    }));
  };

  const handleSectionTitleDividerChange = (key, value) => {
    onUpdateNode?.((current) => ({
      ...current,
      titleDivider: {
        ...(current.titleDivider || {}),
        [key]: value,
      },
    }));
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

      {isSection ? (
        <div className="flex flex-col gap-3">
          <label className="flex flex-col gap-2 text-xs font-semibold tracking-wide text-slate-400">
            Section Title
            <input
              value={node.title || ""}
              onChange={(event) => handleSectionTitleChange(event.target.value)}
              className="rounded-lg border border-slate-800 bg-slate-900/70 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
              placeholder="Section title"
            />
          </label>
          <label className="flex items-center gap-3 text-xs font-semibold tracking-wide text-slate-400">
            <input
              type="checkbox"
              checked={node.showTitle !== false}
              onChange={(event) => handleSectionTitleToggle(event.target.checked)}
              className="h-4 w-4 rounded border-slate-600 bg-slate-900 text-indigo-500 focus:ring-indigo-500/40"
            />
            Show section title
          </label>
          <label className="flex items-center gap-3 text-xs font-semibold tracking-wide text-slate-400">
            <input
              type="checkbox"
              checked={node.showDivider !== false}
              onChange={(event) =>
                handleSectionDividerToggle(event.target.checked)
              }
              className="h-4 w-4 rounded border-slate-600 bg-slate-900 text-indigo-500 focus:ring-indigo-500/40"
            />
            Show section divider
          </label>
          <label className="flex flex-col gap-2 text-xs font-semibold tracking-wide text-slate-400">
            Section icon
            <select
              value={node.iconName ?? ""}
              onChange={(event) =>
                handleNodeIconChange("iconName", event.target.value)
              }
              className="rounded-lg border border-slate-800 bg-slate-900/70 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
            >
              {ICON_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-2 text-xs font-semibold tracking-wide text-slate-400">
            Icon separator
            <select
              value={node.iconSeparator ?? " "}
              onChange={(event) =>
                handleNodeIconChange("iconSeparator", event.target.value)
              }
              className="rounded-lg border border-slate-800 bg-slate-900/70 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
            >
              {ICON_SEPARATORS.map((option) => (
                <option key={option.label} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-2 text-xs font-semibold tracking-wide text-slate-400">
            Section Alignment
            <select
              value={node.align ?? "left"}
              onChange={(event) =>
                handleNodeAlignChange("align", event.target.value)
              }
              className="rounded-lg border border-slate-800 bg-slate-900/70 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
            >
              <option value="left">Left</option>
              <option value="center">Center</option>
              <option value="right">Right</option>
            </select>
          </label>
          <label className="flex flex-col gap-2 text-xs font-semibold tracking-wide text-slate-400">
            Title Alignment
            <select
              value={node.titleAlign ?? "left"}
              onChange={(event) =>
                handleNodeAlignChange("titleAlign", event.target.value)
              }
              className="rounded-lg border border-slate-800 bg-slate-900/70 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
            >
              <option value="left">Left</option>
              <option value="center">Center</option>
              <option value="right">Right</option>
            </select>
          </label>
          <button
            type="button"
            onClick={() => setIsSectionStyleOpen(true)}
            className="w-fit rounded-full bg-slate-800 px-4 py-1.5 text-xs font-semibold text-slate-100 transition hover:bg-slate-700"
          >
            Section styling
          </button>
        </div>
      ) : null}

      {isRow || isColumn ? (
        <div className="flex flex-col gap-3">
          <label className="flex flex-col gap-2 text-xs font-semibold tracking-wide text-slate-400">
            Align Items
            <select
              value={node.alignItems ?? "flex-start"}
              onChange={(event) =>
                handleNodeAlignChange("alignItems", event.target.value)
              }
              className="rounded-lg border border-slate-800 bg-slate-900/70 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
            >
              <option value="flex-start">Start</option>
              <option value="center">Center</option>
              <option value="flex-end">End</option>
              <option value="stretch">Stretch</option>
            </select>
          </label>
          <label className="flex flex-col gap-2 text-xs font-semibold tracking-wide text-slate-400">
            Justify Content
            <select
              value={node.justifyContent ?? "flex-start"}
              onChange={(event) =>
                handleNodeAlignChange("justifyContent", event.target.value)
              }
              className="rounded-lg border border-slate-800 bg-slate-900/70 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
            >
              <option value="flex-start">Start</option>
              <option value="center">Center</option>
              <option value="flex-end">End</option>
              <option value="space-between">Space Between</option>
              <option value="space-around">Space Around</option>
              <option value="space-evenly">Space Evenly</option>
            </select>
          </label>
        </div>
      ) : null}

      {isTextLike ? (
        <div className="flex flex-col gap-3">
          <label className="flex flex-col gap-2 text-xs font-semibold tracking-wide text-slate-400">
            Text Alignment
            <select
              value={node.textAlign ?? "left"}
              onChange={(event) =>
                handleNodeAlignChange("textAlign", event.target.value)
              }
              className="rounded-lg border border-slate-800 bg-slate-900/70 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
            >
              <option value="left">Left</option>
              <option value="center">Center</option>
              <option value="right">Right</option>
              <option value="justify">Justify</option>
            </select>
          </label>
          <label className="flex flex-col gap-2 text-xs font-semibold tracking-wide text-slate-400">
            Icon
            <select
              value={node.iconName ?? ""}
              onChange={(event) =>
                handleNodeIconChange("iconName", event.target.value)
              }
              className="rounded-lg border border-slate-800 bg-slate-900/70 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
            >
              {ICON_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-2 text-xs font-semibold tracking-wide text-slate-400">
            Icon separator
            <select
              value={node.iconSeparator ?? " "}
              onChange={(event) =>
                handleNodeIconChange("iconSeparator", event.target.value)
              }
              className="rounded-lg border border-slate-800 bg-slate-900/70 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
            >
              {ICON_SEPARATORS.map((option) => (
                <option key={option.label} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-2 text-xs font-semibold tracking-wide text-slate-400">
            Font Size
            <select
              value={node.textStyle?.fontSizeToken ?? "body"}
              onChange={(event) =>
                handleLeafStyleChange("fontSizeToken", event.target.value)
              }
              className="rounded-lg border border-slate-800 bg-slate-900/70 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
            >
              {FONT_SIZE_TOKENS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-2 text-xs font-semibold tracking-wide text-slate-400">
            Text Color
            <select
              value={node.textStyle?.colorToken ?? "primary"}
              onChange={(event) =>
                handleLeafStyleChange("colorToken", event.target.value)
              }
              className="rounded-lg border border-slate-800 bg-slate-900/70 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
            >
              {COLOR_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-2 text-xs font-semibold tracking-wide text-slate-400">
            Font Weight
            <select
              value={node.textStyle?.fontWeight ?? "400"}
              onChange={(event) =>
                handleLeafStyleChange("fontWeight", event.target.value)
              }
              className="rounded-lg border border-slate-800 bg-slate-900/70 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
            >
              <option value="400">Regular</option>
              <option value="600">Semi Bold</option>
              <option value="700">Bold</option>
            </select>
          </label>
          <label className="flex flex-col gap-2 text-xs font-semibold tracking-wide text-slate-400">
            Font Style
            <select
              value={node.textStyle?.fontStyle ?? "normal"}
              onChange={(event) =>
                handleLeafStyleChange("fontStyle", event.target.value)
              }
              className="rounded-lg border border-slate-800 bg-slate-900/70 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
            >
              <option value="normal">Normal</option>
              <option value="italic">Italic</option>
            </select>
          </label>
        </div>
      ) : null}

      <PromptModal
        open={isSectionStyleOpen}
        title="Section styling"
        description="Control how section titles are styled."
        confirmLabel="Done"
        cancelLabel="Cancel"
        onConfirm={() => setIsSectionStyleOpen(false)}
        onCancel={() => setIsSectionStyleOpen(false)}
      >
        <div className="grid gap-3">
          <label className="flex flex-col gap-2 text-xs font-semibold tracking-wide text-slate-400">
            Title Size
            <select
              value={sectionTitleStyle.fontSizeToken ?? "heading"}
              onChange={(event) =>
                handleSectionTitleStyleChange("fontSizeToken", event.target.value)
              }
              className="rounded-lg border border-slate-800 bg-slate-900/70 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
            >
              {FONT_SIZE_TOKENS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-2 text-xs font-semibold tracking-wide text-slate-400">
            Title Color
            <select
              value={sectionTitleStyle.colorToken ?? "primary"}
              onChange={(event) =>
                handleSectionTitleStyleChange("colorToken", event.target.value)
              }
              className="rounded-lg border border-slate-800 bg-slate-900/70 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
            >
              {COLOR_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-2 text-xs font-semibold tracking-wide text-slate-400">
            Title Weight
            <select
              value={sectionTitleStyle.fontWeight ?? "600"}
              onChange={(event) =>
                handleSectionTitleStyleChange("fontWeight", event.target.value)
              }
              className="rounded-lg border border-slate-800 bg-slate-900/70 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
            >
              <option value="400">Regular</option>
              <option value="600">Semi Bold</option>
              <option value="700">Bold</option>
            </select>
          </label>
          <label className="flex flex-col gap-2 text-xs font-semibold tracking-wide text-slate-400">
            Title Style
            <select
              value={sectionTitleStyle.fontStyle ?? "normal"}
              onChange={(event) =>
                handleSectionTitleStyleChange("fontStyle", event.target.value)
              }
              className="rounded-lg border border-slate-800 bg-slate-900/70 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
            >
              <option value="normal">Normal</option>
              <option value="italic">Italic</option>
            </select>
          </label>
          <div className="rounded-lg border border-slate-800/80 bg-slate-950/60 p-3">
            <h6 className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              Title Divider
            </h6>
            <div className="mt-3 grid gap-3">
              <label className="flex items-center justify-between gap-3 text-xs font-semibold tracking-wide text-slate-400">
                Enabled
                <input
                  type="checkbox"
                  checked={node.titleDivider?.enabled ?? false}
                  onChange={(event) =>
                    handleSectionTitleDividerChange("enabled", event.target.checked)
                  }
                  className="h-4 w-4 rounded border-slate-600 bg-slate-900 text-indigo-500 focus:ring-indigo-500/40"
                />
              </label>
              <label className="flex items-center justify-between gap-3 text-xs font-semibold tracking-wide text-slate-400">
                Color
                <input
                  type="color"
                  value={node.titleDivider?.color ?? "#e2e8f0"}
                  onChange={(event) =>
                    handleSectionTitleDividerChange("color", event.target.value)
                  }
                  className="h-8 w-16 cursor-pointer rounded-lg border border-slate-800 bg-slate-900/70 px-2 py-1"
                />
              </label>
              <label className="flex items-center justify-between gap-3 text-xs font-semibold tracking-wide text-slate-400">
                Width
                <input
                  type="number"
                  min="1"
                  max="8"
                  step="1"
                  value={node.titleDivider?.width ?? 1}
                  onChange={(event) =>
                    handleSectionTitleDividerChange(
                      "width",
                      Number(event.target.value)
                    )
                  }
                  className="h-8 w-16 rounded-lg border border-slate-800 bg-slate-900/70 px-2 py-1 text-xs text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                />
              </label>
              <label className="flex items-center justify-between gap-3 text-xs font-semibold tracking-wide text-slate-400">
                Style
                <select
                  value={node.titleDivider?.style ?? "solid"}
                  onChange={(event) =>
                    handleSectionTitleDividerChange("style", event.target.value)
                  }
                  className="h-8 rounded-lg border border-slate-800 bg-slate-900/70 px-2 py-1 text-xs text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                >
                  <option value="solid">Solid</option>
                  <option value="dashed">Dashed</option>
                  <option value="dotted">Dotted</option>
                </select>
              </label>
              <label className="flex items-center justify-between gap-3 text-xs font-semibold tracking-wide text-slate-400">
                Spacing
                <input
                  type="number"
                  min="0"
                  max="24"
                  step="1"
                  value={node.titleDivider?.spacing ?? 6}
                  onChange={(event) =>
                    handleSectionTitleDividerChange(
                      "spacing",
                      Number(event.target.value)
                    )
                  }
                  className="h-8 w-16 rounded-lg border border-slate-800 bg-slate-900/70 px-2 py-1 text-xs text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                />
              </label>
            </div>
          </div>
        </div>
      </PromptModal>

      {isBindable ? (
        <div className="flex flex-col gap-3">
          <label className="flex flex-col gap-2 text-xs font-semibold tracking-wide text-slate-400">
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
