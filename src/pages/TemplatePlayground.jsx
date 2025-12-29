import { useEffect, useMemo, useRef, useState } from "react";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import Button from "../components/Button.jsx";
import Input from "../components/Input.jsx";
import { useAuth } from "../contexts/AuthContext.jsx";
import { db } from "../firebase.js";

const CANVAS_WIDTH = 860;
const CANVAS_HEIGHT = 1180;

const FONT_OPTIONS = [
  "Inter",
  "Poppins",
  "Merriweather",
  "Georgia",
  "Arial",
  "Times New Roman",
];

const BLOCK_OPTIONS = [
  { id: "header", label: "Header" },
  { id: "section", label: "Section" },
  { id: "list", label: "List" },
  { id: "columns", label: "Columns" },
];

const DEFAULT_COLORS = {
  background: "#ffffff",
  text: "#0f172a",
  accent: "#10b981",
};

export default function TemplatePlayground() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const canvasRef = useRef(null);
  const [templateName, setTemplateName] = useState("Modern Executive");
  const [fontFamily, setFontFamily] = useState("Inter");
  const [fontSize, setFontSize] = useState(15);
  const [spacing, setSpacing] = useState(18);
  const [sectionLayout, setSectionLayout] = useState("single");
  const [colors, setColors] = useState(DEFAULT_COLORS);
  const [blocks, setBlocks] = useState({
    header: true,
    section: true,
    list: true,
    columns: true,
  });
  const [statusMessage, setStatusMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const enabledBlocks = useMemo(
    () => BLOCK_OPTIONS.filter((block) => blocks[block.id]).map((block) => block.id),
    [blocks]
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = CANVAS_WIDTH;
    canvas.height = CANVAS_HEIGHT;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    ctx.fillStyle = colors.background;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    const padding = 56;
    const contentWidth = CANVAS_WIDTH - padding * 2;
    let cursorY = padding;

    const drawDivider = () => {
      ctx.strokeStyle = "#e2e8f0";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(padding, cursorY);
      ctx.lineTo(padding + contentWidth, cursorY);
      ctx.stroke();
      cursorY += spacing;
    };

    if (blocks.header) {
      ctx.fillStyle = colors.text;
      ctx.font = `700 ${fontSize + 12}px ${fontFamily}`;
      ctx.fillText("Alex Morgan", padding, cursorY + fontSize + 12);
      cursorY += fontSize + 24;

      ctx.fillStyle = "#475569";
      ctx.font = `500 ${fontSize + 2}px ${fontFamily}`;
      ctx.fillText("Product Designer · San Francisco, CA", padding, cursorY);
      cursorY += spacing + 6;
      drawDivider();
    }

    if (blocks.section) {
      ctx.fillStyle = colors.accent;
      ctx.font = `600 ${fontSize + 4}px ${fontFamily}`;
      ctx.fillText("Experience", padding, cursorY + fontSize + 4);
      cursorY += spacing + 6;

      ctx.fillStyle = colors.text;
      ctx.font = `600 ${fontSize}px ${fontFamily}`;
      ctx.fillText("Lead Designer · Studio Axis", padding, cursorY);
      cursorY += spacing;

      ctx.fillStyle = "#475569";
      ctx.font = `400 ${fontSize - 1}px ${fontFamily}`;
      ctx.fillText(
        "Built intuitive dashboards and optimized flows for 200k+ users.",
        padding,
        cursorY
      );
      cursorY += spacing + 4;

      if (sectionLayout === "columns") {
        const columnGap = 24;
        const columnWidth = (contentWidth - columnGap) / 2;
        ctx.fillStyle = "#475569";
        ctx.font = `400 ${fontSize - 1}px ${fontFamily}`;
        ctx.fillText("• Product strategy", padding, cursorY);
        ctx.fillText(
          "• Design systems",
          padding + columnWidth + columnGap,
          cursorY
        );
        cursorY += spacing;
        ctx.fillText("• Team leadership", padding, cursorY);
        ctx.fillText(
          "• Customer research",
          padding + columnWidth + columnGap,
          cursorY
        );
        cursorY += spacing + 6;
      } else {
        ctx.fillStyle = "#475569";
        ctx.font = `400 ${fontSize - 1}px ${fontFamily}`;
        ctx.fillText("• Product strategy and roadmapping", padding, cursorY);
        cursorY += spacing;
        ctx.fillText("• Design systems for multi-platform teams", padding, cursorY);
        cursorY += spacing + 6;
      }

      drawDivider();
    }

    if (blocks.list) {
      ctx.fillStyle = colors.accent;
      ctx.font = `600 ${fontSize + 4}px ${fontFamily}`;
      ctx.fillText("Skills", padding, cursorY + fontSize + 4);
      cursorY += spacing + 4;

      ctx.fillStyle = colors.text;
      ctx.font = `400 ${fontSize - 1}px ${fontFamily}`;
      const skillText =
        "Figma · Prototyping · User testing · Design systems · Accessibility";
      ctx.fillText(skillText, padding, cursorY);
      cursorY += spacing + 10;
      drawDivider();
    }

    if (blocks.columns) {
      ctx.fillStyle = colors.accent;
      ctx.font = `600 ${fontSize + 4}px ${fontFamily}`;
      ctx.fillText("Education", padding, cursorY + fontSize + 4);
      cursorY += spacing + 4;

      const columnGap = 24;
      const columnWidth = (contentWidth - columnGap) / 2;

      ctx.fillStyle = colors.text;
      ctx.font = `600 ${fontSize}px ${fontFamily}`;
      ctx.fillText("MFA, Interaction Design", padding, cursorY);
      ctx.fillText(
        "BFA, Visual Communication",
        padding + columnWidth + columnGap,
        cursorY
      );

      cursorY += spacing;
      ctx.fillStyle = "#475569";
      ctx.font = `400 ${fontSize - 1}px ${fontFamily}`;
      ctx.fillText("Parsons School of Design", padding, cursorY);
      ctx.fillText(
        "School of the Arts",
        padding + columnWidth + columnGap,
        cursorY
      );
    }
  }, [blocks, colors, fontFamily, fontSize, sectionLayout, spacing]);

  const handleColorChange = (key, value) => {
    setColors((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleBlockToggle = (blockId) => {
    setBlocks((prev) => ({
      ...prev,
      [blockId]: !prev[blockId],
    }));
  };

  const validateTemplate = () => {
    if (!blocks.header) {
      return "Templates must include a header block.";
    }
    if (!blocks.section) {
      return "Templates must include at least one section block.";
    }
    return "";
  };

  const handleSave = async () => {
    setErrorMessage("");
    setStatusMessage("");
    const validationError = validateTemplate();
    if (validationError) {
      setErrorMessage(validationError);
      return;
    }
    if (!user) {
      setErrorMessage("Sign in to save templates to Firestore.");
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) {
      setErrorMessage("Canvas is not ready yet.");
      return;
    }

    setIsSaving(true);
    try {
      const thumbnailUrl = canvas.toDataURL("image/png");
      await addDoc(collection(db, "templates"), {
        ownerId: user.uid,
        type: "user",
        name: templateName.trim() || "Untitled template",
        layout: {
          blocks: enabledBlocks,
          sectionLayout,
        },
        styles: {
          fontFamily,
          fontSize,
          spacing,
          colors,
        },
        thumbnailUrl,
        status: "draft",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      setStatusMessage("Template saved to Firestore.");
    } catch (error) {
      setErrorMessage("Unable to save template right now.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 px-6 py-10 text-slate-100">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-emerald-200">
              Template playground
            </p>
            <h1 className="text-2xl font-semibold text-slate-100">
              Build a new resume template
            </h1>
            <p className="mt-1 text-sm text-slate-300">
              Configure blocks, typography, and layout before saving.
            </p>
          </div>
          <Button variant="ghost" onClick={() => navigate("/app")}>
            Back to dashboard
          </Button>
        </header>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="rounded-[28px] border border-slate-800 bg-slate-900/60 p-6">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-lg font-semibold text-slate-100">Canvas</h2>
              <span className="text-xs text-slate-400">
                {CANVAS_WIDTH} × {CANVAS_HEIGHT}px
              </span>
            </div>
            <div className="mt-4 overflow-hidden rounded-[24px] border border-slate-800 bg-white">
              <canvas
                ref={canvasRef}
                className="h-auto w-full"
                aria-label="Template canvas preview"
              />
            </div>
          </div>

          <aside className="flex flex-col gap-4">
            <div className="rounded-[28px] border border-slate-800 bg-slate-900/60 p-5">
              <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-300">
                Inspector
              </h3>
              <div className="mt-4 flex flex-col gap-4">
                <Input
                  label="Template name"
                  value={templateName}
                  onChange={(event) => setTemplateName(event.target.value)}
                />

                <label className="flex flex-col gap-2 text-sm font-medium text-slate-200">
                  <span>Font family</span>
                  <select
                    value={fontFamily}
                    onChange={(event) => setFontFamily(event.target.value)}
                    className="rounded-2xl border border-slate-800 bg-slate-950/70 px-4 py-3 text-slate-100"
                  >
                    {FONT_OPTIONS.map((font) => (
                      <option key={font} value={font}>
                        {font}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="flex flex-col gap-2 text-sm font-medium text-slate-200">
                  <span>Font size ({fontSize}px)</span>
                  <input
                    type="range"
                    min="12"
                    max="20"
                    value={fontSize}
                    onChange={(event) =>
                      setFontSize(Number(event.target.value))
                    }
                    className="w-full"
                  />
                </label>

                <label className="flex flex-col gap-2 text-sm font-medium text-slate-200">
                  <span>Section spacing ({spacing}px)</span>
                  <input
                    type="range"
                    min="12"
                    max="32"
                    value={spacing}
                    onChange={(event) => setSpacing(Number(event.target.value))}
                    className="w-full"
                  />
                </label>

                <label className="flex flex-col gap-2 text-sm font-medium text-slate-200">
                  <span>Section layout</span>
                  <select
                    value={sectionLayout}
                    onChange={(event) => setSectionLayout(event.target.value)}
                    className="rounded-2xl border border-slate-800 bg-slate-950/70 px-4 py-3 text-slate-100"
                  >
                    <option value="single">Single column</option>
                    <option value="columns">Two column</option>
                  </select>
                </label>

                <div className="grid gap-3">
                  <label className="flex items-center justify-between gap-4 text-sm font-medium text-slate-200">
                    <span>Background color</span>
                    <input
                      type="color"
                      value={colors.background}
                      onChange={(event) =>
                        handleColorChange("background", event.target.value)
                      }
                      className="h-8 w-12 rounded border border-slate-800 bg-slate-950"
                    />
                  </label>
                  <label className="flex items-center justify-between gap-4 text-sm font-medium text-slate-200">
                    <span>Text color</span>
                    <input
                      type="color"
                      value={colors.text}
                      onChange={(event) =>
                        handleColorChange("text", event.target.value)
                      }
                      className="h-8 w-12 rounded border border-slate-800 bg-slate-950"
                    />
                  </label>
                  <label className="flex items-center justify-between gap-4 text-sm font-medium text-slate-200">
                    <span>Accent color</span>
                    <input
                      type="color"
                      value={colors.accent}
                      onChange={(event) =>
                        handleColorChange("accent", event.target.value)
                      }
                      className="h-8 w-12 rounded border border-slate-800 bg-slate-950"
                    />
                  </label>
                </div>
              </div>
            </div>

            <div className="rounded-[28px] border border-slate-800 bg-slate-900/60 p-5">
              <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-300">
                Canvas blocks
              </h3>
              <div className="mt-4 grid gap-3">
                {BLOCK_OPTIONS.map((block) => (
                  <label
                    key={block.id}
                    className="flex items-center justify-between gap-3 text-sm text-slate-200"
                  >
                    <span>{block.label}</span>
                    <input
                      type="checkbox"
                      checked={blocks[block.id]}
                      onChange={() => handleBlockToggle(block.id)}
                      className="h-4 w-4 accent-emerald-400"
                    />
                  </label>
                ))}
              </div>
            </div>

            <div className="rounded-[28px] border border-slate-800 bg-slate-900/60 p-5">
              <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-300">
                Save template
              </h3>
              <p className="mt-2 text-xs text-slate-400">
                Templates must include a header and at least one section.
              </p>
              {errorMessage ? (
                <div className="mt-3 rounded-2xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-xs text-rose-200">
                  {errorMessage}
                </div>
              ) : null}
              {statusMessage ? (
                <div className="mt-3 rounded-2xl border border-emerald-400/40 bg-emerald-400/10 px-4 py-3 text-xs text-emerald-100">
                  {statusMessage}
                </div>
              ) : null}
              <Button
                className="mt-4 w-full"
                onClick={handleSave}
                disabled={isSaving}
              >
                {isSaving ? "Saving..." : "Save to Firestore"}
              </Button>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
