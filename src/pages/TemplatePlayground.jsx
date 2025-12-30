import { useEffect, useMemo, useRef, useState } from "react";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import AppShell from "../components/AppShell.jsx";
import Button from "../components/Button.jsx";
import ErrorBanner from "../components/ErrorBanner.jsx";
import Input from "../components/Input.jsx";
import PagePreviewFrame from "../components/PagePreviewFrame.jsx";
import Snackbar from "../components/Snackbar.jsx";
import ResumePreview from "../components/ResumePreview.jsx";
import { useAuth } from "../contexts/AuthContext.jsx";
import { db } from "../firebase.js";
import {
  DEFAULT_TEMPLATE_STYLES,
  FONT_OPTIONS,
  PAGE_SIZE_OPTIONS,
  resolvePageSetup,
} from "../utils/resumePreview.js";

const BLOCK_OPTIONS = [
  { id: "header", label: "Header" },
  { id: "section", label: "Section" },
  { id: "list", label: "List" },
  { id: "columns", label: "Columns" },
];

const SAMPLE_PROFILE = {
  fullName: "Alex Morgan",
  title: "Product Designer",
  email: "alex.morgan@email.com",
  phone: "(555) 234-9988",
  location: "San Francisco, CA",
  summary:
    "Product designer with 7+ years of experience building accessible platforms and data-rich workflows.",
};

const SAMPLE_RESUME_DATA = {
  experience: [
    {
      role: "Lead Designer",
      company: "Studio Axis",
      location: "Remote",
      startDate: "2021",
      endDate: "Present",
      summary:
        "Built intuitive dashboards and optimized flows for 200k+ users.\nPartnered with engineering to scale a component library.",
    },
  ],
  education: [
    {
      school: "Parsons School of Design",
      degree: "MFA, Interaction Design",
      location: "New York, NY",
      startDate: "2017",
      endDate: "2019",
      summary: "Focus on human-centered product systems.",
    },
    {
      school: "School of the Arts",
      degree: "BFA, Visual Communication",
      location: "Boston, MA",
      startDate: "2013",
      endDate: "2017",
    },
  ],
  skills: [
    {
      name: "Product strategy",
      level: "Expert",
      summary: "Roadmapping, discovery, and OKR alignment.",
    },
    {
      name: "Design systems",
      level: "Advanced",
      summary: "Tokens, components, and documentation.",
    },
    {
      name: "Research",
      level: "Advanced",
      summary: "Usability testing and insight synthesis.",
    },
    {
      name: "Figma",
      level: "Expert",
      summary: "Prototyping and collaboration workflows.",
    },
  ],
};

const SAMPLE_SECTION_ORDER = ["experience", "skills", "education"];

export default function TemplatePlayground() {
  const { user } = useAuth();
  const canvasRef = useRef(null);
  const [templateName, setTemplateName] = useState("Modern Executive");
  const [templateStyles, setTemplateStyles] = useState(DEFAULT_TEMPLATE_STYLES);
  const [blocks, setBlocks] = useState({
    header: true,
    section: true,
    list: true,
    columns: true,
  });
  const [errorMessage, setErrorMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [toast, setToast] = useState(null);

  const { fontFamily, fontSize, spacing, sectionLayout, colors, tokens, page } =
    templateStyles;
  const resolvedPage = resolvePageSetup(page);

  const enabledBlocks = useMemo(
    () => BLOCK_OPTIONS.filter((block) => blocks[block.id]).map((block) => block.id),
    [blocks]
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = resolvedPage.width;
    canvas.height = resolvedPage.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, resolvedPage.width, resolvedPage.height);
    ctx.fillStyle = colors.background;
    ctx.fillRect(0, 0, resolvedPage.width, resolvedPage.height);

    const paddingX = resolvedPage.paddingX;
    const paddingY = resolvedPage.paddingY;
    const contentWidth = resolvedPage.width - paddingX * 2;
    let cursorY = paddingY;

    const headerSize = Math.round(fontSize * tokens.headerScale);
    const sectionTitleSize = Math.round(fontSize * tokens.sectionTitleScale);
    const bodySize = Math.round(fontSize * tokens.bodyScale);
    const metaSize = Math.round(fontSize * tokens.metaScale);

    const drawDivider = () => {
      ctx.strokeStyle = "#e2e8f0";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(paddingX, cursorY);
      ctx.lineTo(paddingX + contentWidth, cursorY);
      ctx.stroke();
      cursorY += spacing;
    };

    if (blocks.header) {
      ctx.fillStyle = colors.text;
      ctx.font = `700 ${headerSize}px ${fontFamily}`;
      ctx.fillText("Alex Morgan", paddingX, cursorY + headerSize);
      cursorY += headerSize + 12;

      ctx.fillStyle = colors.muted;
      ctx.font = `500 ${bodySize}px ${fontFamily}`;
      ctx.fillText(
        "Product Designer · San Francisco, CA",
        paddingX,
        cursorY
      );
      cursorY += spacing + 6;
      drawDivider();
    }

    if (blocks.section) {
      ctx.fillStyle = colors.accent;
      ctx.font = `600 ${sectionTitleSize}px ${fontFamily}`;
      ctx.fillText("Experience", paddingX, cursorY + sectionTitleSize);
      cursorY += spacing + 6;

      ctx.fillStyle = colors.text;
      ctx.font = `600 ${bodySize}px ${fontFamily}`;
      ctx.fillText("Lead Designer · Studio Axis", paddingX, cursorY);
      cursorY += spacing;

      ctx.fillStyle = colors.muted;
      ctx.font = `400 ${metaSize}px ${fontFamily}`;
      ctx.fillText(
        "Built intuitive dashboards and optimized flows for 200k+ users.",
        paddingX,
        cursorY
      );
      cursorY += spacing + 4;

      if (sectionLayout === "columns") {
        const columnGap = 24;
        const columnWidth = (contentWidth - columnGap) / 2;
        ctx.fillStyle = colors.muted;
        ctx.font = `400 ${metaSize}px ${fontFamily}`;
        ctx.fillText("• Product strategy", paddingX, cursorY);
        ctx.fillText(
          "• Design systems",
          paddingX + columnWidth + columnGap,
          cursorY
        );
        cursorY += spacing;
        ctx.fillText("• Team leadership", paddingX, cursorY);
        ctx.fillText(
          "• Customer research",
          paddingX + columnWidth + columnGap,
          cursorY
        );
        cursorY += spacing + 6;
      } else {
        ctx.fillStyle = colors.muted;
        ctx.font = `400 ${metaSize}px ${fontFamily}`;
        ctx.fillText("• Product strategy and roadmapping", paddingX, cursorY);
        cursorY += spacing;
        ctx.fillText(
          "• Design systems for multi-platform teams",
          paddingX,
          cursorY
        );
        cursorY += spacing + 6;
      }

      drawDivider();
    }

    if (blocks.list) {
      ctx.fillStyle = colors.accent;
      ctx.font = `600 ${sectionTitleSize}px ${fontFamily}`;
      ctx.fillText("Skills", paddingX, cursorY + sectionTitleSize);
      cursorY += spacing + 4;

      ctx.fillStyle = colors.text;
      ctx.font = `400 ${metaSize}px ${fontFamily}`;
      const skillText =
        "Figma · Prototyping · User testing · Design systems · Accessibility";
      ctx.fillText(skillText, paddingX, cursorY);
      cursorY += spacing + 10;
      drawDivider();
    }

    if (blocks.columns) {
      ctx.fillStyle = colors.accent;
      ctx.font = `600 ${sectionTitleSize}px ${fontFamily}`;
      ctx.fillText("Education", paddingX, cursorY + sectionTitleSize);
      cursorY += spacing + 4;

      const columnGap = 24;
      const columnWidth = (contentWidth - columnGap) / 2;

      ctx.fillStyle = colors.text;
      ctx.font = `600 ${bodySize}px ${fontFamily}`;
      ctx.fillText("MFA, Interaction Design", paddingX, cursorY);
      ctx.fillText(
        "BFA, Visual Communication",
        paddingX + columnWidth + columnGap,
        cursorY
      );

      cursorY += spacing;
      ctx.fillStyle = colors.muted;
      ctx.font = `400 ${metaSize}px ${fontFamily}`;
      ctx.fillText("Parsons School of Design", paddingX, cursorY);
      ctx.fillText(
        "School of the Arts",
        paddingX + columnWidth + columnGap,
        cursorY
      );
    }
  }, [
    blocks,
    colors,
    fontFamily,
    fontSize,
    resolvedPage.height,
    resolvedPage.paddingX,
    resolvedPage.paddingY,
    resolvedPage.width,
    sectionLayout,
    spacing,
    tokens,
  ]);

  const updateTemplateStyles = (updates) => {
    setTemplateStyles((prev) => ({
      ...prev,
      ...updates,
      page: {
        ...prev.page,
        ...(updates.page ?? {}),
      },
      colors: {
        ...prev.colors,
        ...(updates.colors ?? {}),
      },
      tokens: {
        ...prev.tokens,
        ...(updates.tokens ?? {}),
      },
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
          tokens,
        },
        thumbnailUrl,
        status: "draft",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      setToast({ message: "Template saved to Firestore.", variant: "success" });
    } catch (error) {
      setErrorMessage("Unable to save template right now.");
      setToast({ message: "Template save failed.", variant: "error" });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <AppShell>
      <div className="flex w-full flex-col gap-6">
        <header>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-emerald-200">
              Template playground
            </p>
            <h1 className="app-title">Build a new resume template</h1>
            <p className="app-subtitle">
              Configure blocks, typography, and layout before saving.
            </p>
          </div>
        </header>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="app-card">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-lg font-semibold text-slate-100">Canvas</h2>
              <span className="text-xs text-slate-400">
                {resolvedPage.width} × {resolvedPage.height}px
              </span>
            </div>
            <div className="mt-4 overflow-hidden rounded-[24px] border border-slate-800 bg-white">
              <PagePreviewFrame styles={templateStyles} className="w-full">
                <ResumePreview
                  profile={SAMPLE_PROFILE}
                  resumeData={SAMPLE_RESUME_DATA}
                  sectionOrder={SAMPLE_SECTION_ORDER}
                  styles={templateStyles}
                  visibleBlocks={blocks}
                />
              </PagePreviewFrame>
            </div>
            <canvas
              ref={canvasRef}
              className="hidden"
              aria-hidden="true"
              aria-label="Template canvas preview"
            />
          </div>

          <aside className="flex flex-col gap-4">
            <div className="app-card">
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
                  <span>Page size</span>
                  <select
                    value={resolvedPage.size}
                    onChange={(event) =>
                      updateTemplateStyles({
                        page: { size: event.target.value },
                      })
                    }
                    className="rounded-2xl border border-slate-800 bg-slate-950/70 px-4 py-3 text-slate-100"
                  >
                    {PAGE_SIZE_OPTIONS.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.label} ({option.width} × {option.height})
                      </option>
                    ))}
                  </select>
                </label>

                <label className="flex flex-col gap-2 text-sm font-medium text-slate-200">
                  <span>Page padding X ({resolvedPage.paddingX}px)</span>
                  <input
                    type="range"
                    min="24"
                    max="88"
                    value={resolvedPage.paddingX}
                    onChange={(event) =>
                      updateTemplateStyles({
                        page: { paddingX: Number(event.target.value) },
                      })
                    }
                    className="w-full"
                  />
                </label>

                <label className="flex flex-col gap-2 text-sm font-medium text-slate-200">
                  <span>Page padding Y ({resolvedPage.paddingY}px)</span>
                  <input
                    type="range"
                    min="24"
                    max="96"
                    value={resolvedPage.paddingY}
                    onChange={(event) =>
                      updateTemplateStyles({
                        page: { paddingY: Number(event.target.value) },
                      })
                    }
                    className="w-full"
                  />
                </label>

                <label className="flex flex-col gap-2 text-sm font-medium text-slate-200">
                  <span>Font family</span>
                  <select
                    value={fontFamily}
                    onChange={(event) =>
                      updateTemplateStyles({ fontFamily: event.target.value })
                    }
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
                    min="9"
                    max="20"
                    value={fontSize}
                    onChange={(event) =>
                      updateTemplateStyles({
                        fontSize: Number(event.target.value),
                      })
                    }
                    className="w-full"
                  />
                </label>

                <label className="flex flex-col gap-2 text-sm font-medium text-slate-200">
                  <span>Section spacing ({spacing}px)</span>
                  <input
                    type="range"
                    min="8"
                    max="28"
                    value={spacing}
                    onChange={(event) =>
                      updateTemplateStyles({
                        spacing: Number(event.target.value),
                      })
                    }
                    className="w-full"
                  />
                </label>

                <label className="flex flex-col gap-2 text-sm font-medium text-slate-200">
                  <span>Section layout</span>
                  <select
                    value={sectionLayout}
                    onChange={(event) =>
                      updateTemplateStyles({ sectionLayout: event.target.value })
                    }
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
                        updateTemplateStyles({
                          colors: { background: event.target.value },
                        })
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
                        updateTemplateStyles({
                          colors: { text: event.target.value },
                        })
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
                        updateTemplateStyles({
                          colors: { accent: event.target.value },
                        })
                      }
                      className="h-8 w-12 rounded border border-slate-800 bg-slate-950"
                    />
                  </label>
                  <label className="flex items-center justify-between gap-4 text-sm font-medium text-slate-200">
                    <span>Muted color</span>
                    <input
                      type="color"
                      value={colors.muted}
                      onChange={(event) =>
                        updateTemplateStyles({
                          colors: { muted: event.target.value },
                        })
                      }
                      className="h-8 w-12 rounded border border-slate-800 bg-slate-950"
                    />
                  </label>
                </div>

                <div className="mt-2 grid gap-3 border-t border-slate-800 pt-4">
                  <label className="flex flex-col gap-2 text-sm font-medium text-slate-200">
                    <span>Header scale ({tokens.headerScale}x)</span>
                    <input
                      type="range"
                      min="1.4"
                      max="2.4"
                      step="0.05"
                      value={tokens.headerScale}
                      onChange={(event) =>
                        updateTemplateStyles({
                          tokens: { headerScale: Number(event.target.value) },
                        })
                      }
                      className="w-full"
                    />
                  </label>
                  <label className="flex flex-col gap-2 text-sm font-medium text-slate-200">
                    <span>Section title scale ({tokens.sectionTitleScale}x)</span>
                    <input
                      type="range"
                      min="1"
                      max="1.6"
                      step="0.05"
                      value={tokens.sectionTitleScale}
                      onChange={(event) =>
                        updateTemplateStyles({
                          tokens: {
                            sectionTitleScale: Number(event.target.value),
                          },
                        })
                      }
                      className="w-full"
                    />
                  </label>
                  <label className="flex flex-col gap-2 text-sm font-medium text-slate-200">
                    <span>Body scale ({tokens.bodyScale}x)</span>
                    <input
                      type="range"
                      min="0.8"
                      max="1.2"
                      step="0.05"
                      value={tokens.bodyScale}
                      onChange={(event) =>
                        updateTemplateStyles({
                          tokens: { bodyScale: Number(event.target.value) },
                        })
                      }
                      className="w-full"
                    />
                  </label>
                  <label className="flex flex-col gap-2 text-sm font-medium text-slate-200">
                    <span>Meta scale ({tokens.metaScale}x)</span>
                    <input
                      type="range"
                      min="0.7"
                      max="1"
                      step="0.05"
                      value={tokens.metaScale}
                      onChange={(event) =>
                        updateTemplateStyles({
                          tokens: { metaScale: Number(event.target.value) },
                        })
                      }
                      className="w-full"
                    />
                  </label>
                  <label className="flex flex-col gap-2 text-sm font-medium text-slate-200">
                    <span>Line height ({tokens.lineHeight})</span>
                    <input
                      type="range"
                      min="1.2"
                      max="1.8"
                      step="0.05"
                      value={tokens.lineHeight}
                      onChange={(event) =>
                        updateTemplateStyles({
                          tokens: { lineHeight: Number(event.target.value) },
                        })
                      }
                      className="w-full"
                    />
                  </label>
                </div>
              </div>
            </div>

            <div className="app-card">
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

            <div className="app-card">
              <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-300">
                Save template
              </h3>
              <p className="mt-2 text-xs text-slate-400">
                Templates must include a header and at least one section.
              </p>
              {errorMessage ? (
                <div className="mt-3">
                  <ErrorBanner message={errorMessage} />
                </div>
              ) : null}
              <Button
                className="mt-4 w-full"
                onClick={handleSave}
                disabled={isSaving}
              >
                {isSaving ? "Saving..." : "Save template"}
              </Button>
            </div>
          </aside>
        </div>
      </div>
      <Snackbar
        message={toast?.message}
        variant={toast?.variant}
        onDismiss={() => setToast(null)}
      />
    </AppShell>
  );
}
