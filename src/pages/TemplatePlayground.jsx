import { useEffect, useMemo, useRef, useState } from "react";
import {
  addDoc,
  collection,
  doc,
  getDoc,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import { useLocation, useNavigate } from "react-router-dom";
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

const formatSectionLabel = (sectionId) =>
  sectionId
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());

const createSectionId = (label) =>
  label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");

export default function TemplatePlayground() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const canvasRef = useRef(null);
  const [templateName, setTemplateName] = useState("Modern Executive");
  const [templateStyles, setTemplateStyles] = useState(DEFAULT_TEMPLATE_STYLES);
  const [blocks, setBlocks] = useState({
    header: true,
    section: true,
    list: true,
    columns: true,
  });
  const [sections, setSections] = useState([]);
  const [newSectionLabel, setNewSectionLabel] = useState("");
  const [templateId, setTemplateId] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [toast, setToast] = useState(null);

  const {
    fontFamily,
    fontSize,
    spacing,
    sectionLayout,
    headerAlignment,
    showHeaderDivider,
    showSectionDividers,
    colors,
    tokens,
    page,
  } = templateStyles;
  const resolvedPage = resolvePageSetup(page);

  const enabledBlocks = useMemo(
    () => BLOCK_OPTIONS.filter((block) => blocks[block.id]).map((block) => block.id),
    [blocks]
  );
  const sectionOrder = useMemo(
    () => sections.map((section) => section.id),
    [sections]
  );

  const hydrateTemplateStyles = (template = {}) => {
    const styles = template.styles ?? {};
    return {
      ...DEFAULT_TEMPLATE_STYLES,
      ...styles,
      page: resolvePageSetup(styles.page),
      colors: {
        ...DEFAULT_TEMPLATE_STYLES.colors,
        ...(styles.colors ?? {}),
      },
      tokens: {
        ...DEFAULT_TEMPLATE_STYLES.tokens,
        ...(styles.tokens ?? {}),
      },
      sectionLayout:
        template.layout?.sectionLayout ??
        styles.sectionLayout ??
        DEFAULT_TEMPLATE_STYLES.sectionLayout,
      headerAlignment:
        styles.headerAlignment ?? DEFAULT_TEMPLATE_STYLES.headerAlignment,
      showHeaderDivider:
        styles.showHeaderDivider ?? DEFAULT_TEMPLATE_STYLES.showHeaderDivider,
      showSectionDividers:
        styles.showSectionDividers ?? DEFAULT_TEMPLATE_STYLES.showSectionDividers,
    };
  };

  useEffect(() => {
    const templateIdFromState = location.state?.templateId;
    if (!templateIdFromState) return;
    setIsLoading(true);
    setTemplateId(templateIdFromState);
    setErrorMessage("");

    const loadTemplate = async () => {
      try {
        const snapshot = await getDoc(doc(db, "templates", templateIdFromState));
        if (!snapshot.exists()) {
          setErrorMessage("We couldn't find that template.");
          return;
        }
        const data = snapshot.data();
        setTemplateName(data.name ?? "Untitled template");
        setTemplateStyles(hydrateTemplateStyles(data));
        const nextBlocks = BLOCK_OPTIONS.reduce(
          (acc, block) => ({
            ...acc,
            [block.id]: data.layout?.blocks?.includes(block.id) ?? true,
          }),
          {}
        );
        setBlocks(nextBlocks);
        const savedSections = data.layout?.sections;
        if (Array.isArray(savedSections) && savedSections.length > 0) {
          setSections(
            savedSections
              .filter((section) => section?.id)
              .map((section) => ({
                id: section.id,
                label: section.label ?? formatSectionLabel(section.id),
              }))
          );
        } else {
          const savedOrder = data.layout?.sectionOrder ?? [];
          setSections(
            Array.from(new Set(savedOrder)).map((sectionId) => ({
              id: sectionId,
              label: formatSectionLabel(sectionId),
            }))
          );
        }
      } catch (error) {
        setErrorMessage("Unable to load that template.");
      } finally {
        setIsLoading(false);
      }
    };

    loadTemplate();
  }, [location.state?.templateId]);

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
      ctx.textAlign = headerAlignment ?? "left";
      const headerX =
        headerAlignment === "center"
          ? paddingX + contentWidth / 2
          : headerAlignment === "right"
            ? paddingX + contentWidth
            : paddingX;
      ctx.fillStyle = colors.text;
      ctx.font = `700 ${headerSize}px ${fontFamily}`;
      ctx.fillText("Alex Morgan", headerX, cursorY + headerSize);
      cursorY += headerSize + 12;

      ctx.fillStyle = colors.muted;
      ctx.font = `500 ${bodySize}px ${fontFamily}`;
      ctx.fillText("Product Designer · San Francisco, CA", headerX, cursorY);
      cursorY += spacing + 6;
      if (showHeaderDivider) {
        ctx.textAlign = "left";
        drawDivider();
      }
      ctx.textAlign = "left";
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

      if (showSectionDividers) {
        drawDivider();
      }
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
      if (showSectionDividers) {
        drawDivider();
      }
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
    if (sections.length === 0) {
      return "";
    }
    if (!blocks.header) {
      return "Templates must include a header block.";
    }
    if (!blocks.section) {
      return "Templates must include at least one section block.";
    }
    return "";
  };

  const moveSection = (sectionId, direction) => {
    setSections((prev) => {
      const index = prev.findIndex((section) => section.id === sectionId);
      if (index === -1) return prev;
      const nextIndex = direction === "up" ? index - 1 : index + 1;
      if (nextIndex < 0 || nextIndex >= prev.length) return prev;
      const next = [...prev];
      [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
      return next;
    });
  };

  const handleAddSection = () => {
    const trimmedLabel = newSectionLabel.trim();
    if (!trimmedLabel) return;
    const baseId = createSectionId(trimmedLabel);
    if (!baseId) return;
    setSections((prev) => {
      let uniqueId = baseId;
      let counter = 2;
      while (prev.some((section) => section.id === uniqueId)) {
        uniqueId = `${baseId}-${counter}`;
        counter += 1;
      }
      return [...prev, { id: uniqueId, label: trimmedLabel }];
    });
    setNewSectionLabel("");
  };

  const handleRemoveSection = (sectionId) => {
    setSections((prev) => prev.filter((section) => section.id !== sectionId));
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
      const payload = {
        ownerId: user.uid,
        type: "user",
        name: templateName.trim() || "Untitled template",
        layout: {
          blocks: enabledBlocks,
          sectionLayout,
          sectionOrder,
          sections,
        },
        styles: {
          fontFamily,
          fontSize,
          spacing,
          sectionLayout,
          headerAlignment,
          showHeaderDivider,
          showSectionDividers,
          page: resolvedPage,
          colors,
          tokens,
        },
        thumbnailUrl,
        status: "draft",
        updatedAt: serverTimestamp(),
      };

      if (templateId) {
        await updateDoc(doc(db, "templates", templateId), payload);
      } else {
        await addDoc(collection(db, "templates"), {
          ...payload,
          createdAt: serverTimestamp(),
        });
      }
      navigate("/app/templates", {
        state: {
          toast: {
            message: templateId
              ? "Template updated."
              : "Template saved and ready to use.",
            variant: "success",
          },
        },
      });
    } catch (error) {
      setErrorMessage("Unable to save template right now.");
      setToast({
        message: "We couldn't save that template. Please try again.",
        variant: "error",
      });
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
            <h1 className="app-title">
              {templateId ? "Edit resume template" : "Build a new resume template"}
            </h1>
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
            <div className="mt-4 overflow-auto rounded-[24px] border border-slate-800 bg-white">
              <PagePreviewFrame styles={templateStyles} className="w-full">
                <ResumePreview
                  profile={SAMPLE_PROFILE}
                  resumeData={SAMPLE_RESUME_DATA}
                  sectionOrder={sectionOrder}
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

                <label className="flex flex-col gap-2 text-sm font-medium text-slate-200">
                  <span>Header alignment</span>
                  <select
                    value={headerAlignment}
                    onChange={(event) =>
                      updateTemplateStyles({
                        headerAlignment: event.target.value,
                      })
                    }
                    className="rounded-2xl border border-slate-800 bg-slate-950/70 px-4 py-3 text-slate-100"
                  >
                    <option value="left">Left aligned</option>
                    <option value="center">Centered</option>
                    <option value="right">Right aligned</option>
                  </select>
                </label>

                <div className="grid gap-3">
                  <label className="flex items-center justify-between gap-4 text-sm font-medium text-slate-200">
                    <span>Header divider</span>
                    <input
                      type="checkbox"
                      checked={showHeaderDivider}
                      onChange={(event) =>
                        updateTemplateStyles({
                          showHeaderDivider: event.target.checked,
                        })
                      }
                      className="h-4 w-4 accent-emerald-400"
                    />
                  </label>
                  <label className="flex items-center justify-between gap-4 text-sm font-medium text-slate-200">
                    <span>Section dividers</span>
                    <input
                      type="checkbox"
                      checked={showSectionDividers}
                      onChange={(event) =>
                        updateTemplateStyles({
                          showSectionDividers: event.target.checked,
                        })
                      }
                      className="h-4 w-4 accent-emerald-400"
                    />
                  </label>
                </div>

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
                Section order
              </h3>
              <p className="mt-2 text-xs text-slate-400">
                Adjust the order used in the preview and when applying the template.
              </p>
              <div className="mt-4 grid gap-3">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={newSectionLabel}
                    onChange={(event) => setNewSectionLabel(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        handleAddSection();
                      }
                    }}
                    placeholder="Add a section label"
                    className="flex-1 rounded-2xl border border-slate-800 bg-slate-950/70 px-4 py-3 text-sm text-slate-100"
                  />
                  <button
                    type="button"
                    onClick={handleAddSection}
                    className="rounded-full border border-slate-700 px-4 py-2 text-xs text-slate-200"
                  >
                    Add
                  </button>
                </div>

                {sections.length === 0 ? (
                  <p className="text-xs text-slate-400">
                    No sections yet. Add one when you are ready.
                  </p>
                ) : (
                  sections.map((section, index) => (
                    <div
                      key={section.id}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-800 bg-slate-950/40 px-4 py-3 text-sm text-slate-200"
                    >
                      <span>{section.label}</span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => moveSection(section.id, "up")}
                          disabled={index === 0}
                          className="rounded-full border border-slate-700 px-3 py-1 text-xs text-slate-200 disabled:opacity-40"
                        >
                          Up
                        </button>
                        <button
                          type="button"
                          onClick={() => moveSection(section.id, "down")}
                          disabled={index === sections.length - 1}
                          className="rounded-full border border-slate-700 px-3 py-1 text-xs text-slate-200 disabled:opacity-40"
                        >
                          Down
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveSection(section.id)}
                          className="rounded-full border border-slate-700 px-3 py-1 text-xs text-slate-200"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="app-card">
              <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-300">
                Save template
              </h3>
              <p className="mt-2 text-xs text-slate-400">
                Templates can start empty and be updated later.
              </p>
              {errorMessage ? (
                <div className="mt-3">
                  <ErrorBanner message={errorMessage} />
                </div>
              ) : null}
              <Button
                className="mt-4 w-full normal-case"
                onClick={handleSave}
                disabled={isSaving || isLoading}
              >
                {isSaving
                  ? "Saving..."
                  : templateId
                    ? "Save changes"
                    : "Save template"}
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
