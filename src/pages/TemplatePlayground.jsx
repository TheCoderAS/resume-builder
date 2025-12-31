import { useEffect, useMemo, useRef, useState } from "react";
import {
  FiChevronDown,
  FiChevronUp,
  FiEdit2,
  FiTrash2,
  FiArrowUp,
  FiArrowDown,
} from "react-icons/fi";
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
import SectionModal from "../components/SectionModal.jsx";
import SubsectionModal from "../components/SubsectionModal.jsx";
import { useAuth } from "../contexts/AuthContext.jsx";
import { db } from "../firebase.js";
import {
  DEFAULT_TEMPLATE_SETTINGS,
  DEFAULT_TEMPLATE_STYLES,
  FONT_OPTIONS,
  PAGE_SIZE_OPTIONS,
  resolvePageSetup,
  resolveTemplateSettings,
  resolveTemplateStyles,
} from "../utils/resumePreview.js";

const DEFAULT_BLOCK_IDS = ["header", "section", "list", "columns"];

const PLACEHOLDER_PROFILE = {
  fullName: "Full Name",
  title: "Role or Title",
  email: "email@domain.com",
  phone: "(000) 000-0000",
  location: "City, Country",
  summary: "Short profile summary goes here.",
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
  const [templateSettings, setTemplateSettings] = useState(
    DEFAULT_TEMPLATE_SETTINGS
  );
  const [sections, setSections] = useState([]);
  const [activeSection, setActiveSection] = useState(null);
  const [activeSectionId, setActiveSectionId] = useState(null);
  const [activeSubsection, setActiveSubsection] = useState(null);
  const [isSectionModalOpen, setIsSectionModalOpen] = useState(false);
  const [isSubsectionModalOpen, setIsSubsectionModalOpen] = useState(false);
  const [templateId, setTemplateId] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [toast, setToast] = useState(null);
  const [isInspectorOpen, setIsInspectorOpen] = useState(true);
  const [isSectionOrderOpen, setIsSectionOrderOpen] = useState(true);

  const {
    fontFamily,
    fontSize,
    spacing,
    colors,
    tokens,
  } = templateSettings;
  const {
    sectionLayout,
    headerAlignment,
    showHeaderDivider,
    showSectionDividers,
    page,
  } = templateStyles;
  const resolvedPage = resolvePageSetup(page);
  const sectionTitleSize = Math.round(fontSize * tokens.sectionTitleScale);

  const sectionOrder = useMemo(
    () => sections.map((section) => section.id),
    [sections]
  );
  const previewSections = useMemo(
    () =>
      sections.map((section) => {
        const sectionHasSubsections = (section.subsections ?? []).length > 0;
        const sectionPlaceholder = (section.placeholderValue ?? "").trim();
        const canShowSectionPlaceholder =
          section.showPlaceholder !== false && sectionPlaceholder;
        const fallbackSubsections =
          !sectionHasSubsections && canShowSectionPlaceholder
            ? [
                {
                  id: `${section.id}-placeholder`,
                  type: "text",
                  columns: 1,
                  columnOrder: "left-to-right",
                  text: sectionPlaceholder,
                  previewPlaceholder: true,
                  placeholderFontSizeKey: section.placeholderFontSizeKey ?? "body",
                },
              ]
            : [];
        const mappedSubsections = (section.subsections ?? []).map((subsection) => {
          const items =
            subsection.items ?? subsection.entries ?? subsection.values ?? [];
          const text =
            subsection.text ?? subsection.content ?? subsection.summary ?? "";
          const hasItems = Array.isArray(items) && items.length > 0;
          const hasText = typeof text === "string" && text.trim().length > 0;
          if (hasItems || hasText || subsection.showPlaceholder === false) {
            return subsection;
          }
          const placeholder = (subsection.placeholderValue ?? "").trim();
          if (!placeholder) {
            return subsection;
          }
          if (subsection.type === "text") {
            return {
              ...subsection,
              text: placeholder,
              previewPlaceholder: true,
              placeholderFontSizeKey: subsection.placeholderFontSizeKey ?? "body",
            };
          }
          if (subsection.type === "date" || subsection.type === "number") {
            return {
              ...subsection,
              items: [
                {
                  label: placeholder,
                  value: "Value",
                  note: "Optional note",
                },
              ],
              previewPlaceholder: true,
              placeholderFontSizeKey: subsection.placeholderFontSizeKey ?? "body",
            };
          }
          return {
            ...subsection,
            items: [
              {
                title: placeholder,
                subtitle: "Subtitle",
                meta: "Meta",
                summary: "Summary",
              },
            ],
            previewPlaceholder: true,
            placeholderFontSizeKey: subsection.placeholderFontSizeKey ?? "body",
          };
        });
        return {
          ...section,
          subsections: sectionHasSubsections ? mappedSubsections : fallbackSubsections,
        };
      }),
    [sections]
  );

  const buildSectionDefaults = (label = "", overrides = {}) => ({
    id: "",
    label,
    showTitleDivider: true,
    showSectionDivider: true,
    alignment: "left",
    titleFontWeight: "600",
    titleFontStyle: "normal",
    titleFontSizeKey: "sectionTitle",
    placeholderValue: "",
    placeholderFontSizeKey: "body",
    showTitle: true,
    showPlaceholder: true,
    subsections: [],
    ...overrides,
  });

  const normalizeSubsection = (subsection, index = 0) => ({
    id: subsection?.id ?? `subsection-${index + 1}`,
    type: subsection?.type ?? "list",
    columns: subsection?.columns ?? 1,
    columnOrder: subsection?.columnOrder ?? "left-to-right",
    showTimeline: subsection?.showTimeline ?? false,
    timelineStyle: subsection?.timelineStyle ?? "line",
    timelinePosition: subsection?.timelinePosition ?? "left",
    placeholderValue: subsection?.placeholderValue ?? "",
    placeholderFontSizeKey: subsection?.placeholderFontSizeKey ?? "body",
    showPlaceholder: subsection?.showPlaceholder ?? true,
  });

  const getFallbackSectionLabel = (section = {}, index = 0) =>
    section?.label ??
    formatSectionLabel(section?.id ?? `section-${index + 1}`);

  const normalizeSection = (section = {}, fallbackLabel = "", index = 0) => {
    const resolvedLabel = section?.label ?? fallbackLabel;
    const resolvedId =
      section?.id ??
      createSectionId(resolvedLabel || `section-${index + 1}`);
    return buildSectionDefaults(resolvedLabel, {
      id: resolvedId,
      label: resolvedLabel,
      showTitleDivider: section?.showTitleDivider ?? true,
      showSectionDivider: section?.showSectionDivider ?? true,
      alignment: section?.alignment ?? "left",
      titleFontWeight: section?.titleFontWeight ?? "600",
      titleFontStyle: section?.titleFontStyle ?? "normal",
      titleFontSizeKey: section?.titleFontSizeKey ?? "sectionTitle",
      placeholderValue: section?.placeholderValue ?? "",
      placeholderFontSizeKey: section?.placeholderFontSizeKey ?? "body",
      showTitle: section?.showTitle ?? true,
      showPlaceholder: section?.showPlaceholder ?? true,
      subsections: Array.isArray(section?.subsections)
        ? section.subsections.map(normalizeSubsection)
        : [],
    });
  };

  const hydrateTemplateStyles = (template = {}) =>
    resolveTemplateStyles(template.styles ?? {}, template.layout ?? {});

  const hydrateTemplateSettings = (template = {}) =>
    resolveTemplateSettings(template.settings ?? {}, template.styles ?? {});

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
        setTemplateSettings(hydrateTemplateSettings(data));
        const savedSections = data.layout?.sections;
        if (Array.isArray(savedSections) && savedSections.length > 0) {
          setSections(
            savedSections
              .filter((section) => section?.id)
              .map((section, index) =>
                normalizeSection(
                  section,
                  getFallbackSectionLabel(section, index),
                  index
                )
              )
          );
        } else {
          const savedOrder = data.layout?.sectionOrder ?? [];
          setSections(
            Array.from(new Set(savedOrder)).map((sectionId, index) =>
              normalizeSection(
                { id: sectionId },
                formatSectionLabel(sectionId),
                index
              )
            )
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
      ctx.strokeStyle = colors.divider ?? "#e2e8f0";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(paddingX, cursorY);
      ctx.lineTo(paddingX + contentWidth, cursorY);
      ctx.stroke();
      cursorY += spacing;
    };

    {
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

    {
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

    {
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

    {
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
    }));
  };

  const updateTemplateSettings = (updates) => {
    setTemplateSettings((prev) => ({
      ...prev,
      ...updates,
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

  const validateTemplate = () => {
    if (sections.length === 0) {
      return "";
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
    setActiveSection(buildSectionDefaults());
    setIsSectionModalOpen(true);
  };

  const handleRemoveSection = (sectionId) => {
    setSections((prev) => prev.filter((section) => section.id !== sectionId));
  };

  const handleEditSection = (section) => {
    setActiveSection(section);
    setIsSectionModalOpen(true);
  };

  const handleSaveSection = (sectionData) => {
    const trimmedLabel = sectionData.label.trim();
    if (!trimmedLabel) {
      return;
    }
    if (sectionData.id) {
      setSections((prev) =>
        prev.map((section) =>
          section.id === sectionData.id
            ? {
              ...section,
              ...sectionData,
              label: trimmedLabel,
            }
            : section
        )
      );
    } else {
      const baseId = createSectionId(trimmedLabel);
      if (!baseId) return;
      setSections((prev) => {
        let uniqueId = baseId;
        let counter = 2;
        while (prev.some((section) => section.id === uniqueId)) {
          uniqueId = `${baseId}-${counter}`;
          counter += 1;
        }
        return [
          ...prev,
          {
            ...buildSectionDefaults(trimmedLabel, sectionData),
            id: uniqueId,
            label: trimmedLabel,
          },
        ];
      });
    }
    setIsSectionModalOpen(false);
    setActiveSection(null);
  };

  const handleAddSubsection = (sectionId) => {
    setActiveSectionId(sectionId);
    setActiveSubsection({
      type: "list",
      columns: 1,
      columnOrder: "left-to-right",
      showTimeline: false,
      timelineStyle: "line",
      timelinePosition: "left",
    });
    setIsSubsectionModalOpen(true);
  };

  const handleEditSubsection = (sectionId, subsection) => {
    setActiveSectionId(sectionId);
    setActiveSubsection(subsection);
    setIsSubsectionModalOpen(true);
  };

  const handleRemoveSubsection = (sectionId, subsectionId) => {
    setSections((prev) =>
      prev.map((section) =>
        section.id === sectionId
          ? {
            ...section,
            subsections: section.subsections.filter(
              (subsection) => subsection.id !== subsectionId
            ),
          }
          : section
      )
    );
  };

  const handleSaveSubsection = (subsectionData) => {
    if (!activeSectionId) return;
    setSections((prev) =>
      prev.map((section) => {
        if (section.id !== activeSectionId) return section;
        const subsections = section.subsections ?? [];
        if (subsectionData.id) {
          return {
            ...section,
            subsections: subsections.map((subsection) =>
              subsection.id === subsectionData.id
                ? { ...subsection, ...subsectionData }
                : subsection
            ),
          };
        }
        const newSubsectionId = `subsection-${subsections.length + 1}`;
        return {
          ...section,
          subsections: [
            ...subsections,
            {
              ...subsectionData,
              id: newSubsectionId,
            },
          ],
        };
      })
    );
    setIsSubsectionModalOpen(false);
    setActiveSectionId(null);
    setActiveSubsection(null);
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
      const normalizedSections = sections.map((section, index) =>
        normalizeSection(
          section,
          getFallbackSectionLabel(section, index),
          index
        )
      );
      const nextSectionOrder = normalizedSections.map((section) => section.id);
      const payload = {
        ownerId: user.uid,
        type: "user",
        name: templateName.trim() || "Untitled template",
        layout: {
          blocks: DEFAULT_BLOCK_IDS,
          sectionLayout,
          sectionOrder: nextSectionOrder,
          sections: normalizedSections,
        },
        styles: {
          sectionLayout,
          headerAlignment,
          showHeaderDivider,
          showSectionDividers,
          page: resolvedPage,
        },
        settings: {
          fontFamily,
          fontSize,
          spacing,
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
            <p className="text-xs font-semibold uppercase tracking-[0.1em] text-emerald-200">
              Template playground
            </p>
            <h1 className="app-title">
              {templateId ? "Edit resume template" : "Build a new resume template"}
            </h1>
          </div>
        </header>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs text-slate-400">Preview</span>
              <span className="text-xs text-slate-400">
                {resolvedPage.width} × {resolvedPage.height}px
              </span>
            </div>
            <div className="mt-2 overflow-auto rounded-[24px] border border-slate-800 bg-white">
              <PagePreviewFrame styles={templateStyles}>
                {sections.length ? (
                  <ResumePreview
                    profile={{}}
                    resumeData={{}}
                  sectionOrder={sectionOrder}
                  sections={previewSections}
                  styles={templateStyles}
                  settings={templateSettings}
                  useLegacyFallback={false}
                  showHeaderFallback={false}
                />
                ) : null}
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
              <div className="flex items-center justify-between gap-3 backdrop-blur">
                <h3 className="text-sm font-semibold uppercase tracking-[0.1em] text-slate-300">
                  Inspector
                </h3>
                <button
                  type="button"
                  onClick={() => setIsInspectorOpen((prev) => !prev)}
                  className="rounded-full border border-slate-700 p-2 text-slate-300 hover:text-slate-100"
                  aria-expanded={isInspectorOpen}
                  aria-label={
                    isInspectorOpen ? "Collapse inspector" : "Expand inspector"
                  }
                >
                  {isInspectorOpen ? (
                    <FiChevronUp className="h-4 w-4" />
                  ) : (
                    <FiChevronDown className="h-4 w-4" />
                  )}
                </button>
              </div>
              <div
                className={`overflow-hidden transition-[max-height,opacity] duration-300 ease-out ${
                  isInspectorOpen ? "opacity-100" : "opacity-0"
                }`}
                style={{ maxHeight: isInspectorOpen ? "2000px" : "0px" }}
              >
                <div className="mt-4 flex flex-col gap-4 ui-scrollbar md:max-h-[60vh] md:overflow-auto lg:max-h-[55vh] lg:overflow-auto">
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
                        updateTemplateSettings({ fontFamily: event.target.value })
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
                        updateTemplateSettings({
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
                        updateTemplateSettings({
                          spacing: Number(event.target.value),
                        })
                      }
                      className="w-full"
                    />
                  </label>


                  <div className="grid gap-3">
                    <label className="flex items-center justify-between gap-4 text-sm font-medium text-slate-200">
                      <span>Background color</span>
                      <input
                        type="color"
                        value={colors.background}
                        onChange={(event) =>
                          updateTemplateSettings({
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
                          updateTemplateSettings({
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
                          updateTemplateSettings({
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
                        updateTemplateSettings({
                          colors: { muted: event.target.value },
                        })
                      }
                      className="h-8 w-12 rounded border border-slate-800 bg-slate-950"
                    />
                  </label>
                  <label className="flex items-center justify-between gap-4 text-sm font-medium text-slate-200">
                    <span>Divider color</span>
                    <input
                      type="color"
                      value={colors.divider ?? "#e2e8f0"}
                      onChange={(event) =>
                        updateTemplateSettings({
                          colors: { divider: event.target.value },
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
                          updateTemplateSettings({
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
                          updateTemplateSettings({
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
                          updateTemplateSettings({
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
                          updateTemplateSettings({
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
                          updateTemplateSettings({
                            tokens: { lineHeight: Number(event.target.value) },
                          })
                        }
                        className="w-full"
                      />
                    </label>
                  </div>
                </div>
              </div>
            </div>

            <div className="app-card">
              <div className="flex items-center justify-between gap-3 backdrop-blur">
                <h3 className="text-sm font-semibold uppercase tracking-[0.1em] text-slate-300">
                  Section order
                </h3>
                <button
                  type="button"
                  onClick={() => setIsSectionOrderOpen((prev) => !prev)}
                  className="rounded-full border border-slate-700 p-2 text-slate-300 hover:text-slate-100"
                  aria-expanded={isSectionOrderOpen}
                  aria-label={
                    isSectionOrderOpen
                      ? "Collapse section order"
                      : "Expand section order"
                  }
                >
                  {isSectionOrderOpen ? (
                    <FiChevronUp className="h-4 w-4" />
                  ) : (
                    <FiChevronDown className="h-4 w-4" />
                  )}
                </button>
              </div>
              <div
                className={`overflow-hidden transition-[max-height,opacity] duration-300 ease-out ${
                  isSectionOrderOpen ? "opacity-100" : "opacity-0"
                }`}
                style={{ maxHeight: isSectionOrderOpen ? "2000px" : "0px" }}
              >
                <div>
                  <p className="mt-2 text-xs text-slate-400">
                    Adjust the order used in the preview and when applying the template.
                  </p>
                  <div className="mt-4 grid gap-3">
                    <button
                      type="button"
                      onClick={handleAddSection}
                      className="rounded-full border border-slate-700 px-4 py-2 text-xs text-slate-200"
                    >
                      Add section
                    </button>

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
                          <div>
                            <span className="font-medium">{section.label}</span>
                            <p className="mt-1 text-xs text-slate-400">
                              Alignment: {section.alignment} · Title {sectionTitleSize}px ·{" "}
                              {section.subsections?.length ?? 0} subsections
                            </p>
                          </div>
                          <div className="flex flex-col gap-2">
                            <div>
                              <button
                                type="button"
                                onClick={() => handleAddSubsection(section.id)}
                                className="rounded-full border border-slate-700 px-3 py-1 text-xs text-slate-200"
                              >
                                Add subsection
                              </button>
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                              <button
                                type="button"
                                onClick={() => handleEditSection(section)}
                                className="rounded-full border border-slate-700 p-2 text-slate-200"
                                aria-label="Edit section"
                              >
                                <FiEdit2 className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => moveSection(section.id, "up")}
                                disabled={index === 0}
                                className="rounded-full border border-slate-700 p-2 text-slate-200 disabled:opacity-40"
                                aria-label="Move section up"
                              >
                                <FiArrowUp className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => moveSection(section.id, "down")}
                                disabled={index === sections.length - 1}
                                className="rounded-full border border-slate-700 p-2 text-slate-200 disabled:opacity-40"
                                aria-label="Move section down"
                              >
                                <FiArrowDown className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleRemoveSection(section.id)}
                                className="rounded-full border border-slate-700 p-2 text-slate-200"
                                aria-label="Remove section"
                              >
                                <FiTrash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                          {section.subsections?.length ? (
                            <div className="mt-3 w-full border-t border-slate-800 pt-3 text-xs text-slate-300">
                              <ul className="grid gap-2">
                                {section.subsections.map((subsection) => (
                                  <li
                                    key={subsection.id}
                                    className="flex flex-wrap items-center justify-between gap-2"
                                  >
                                    <span>
                                      {subsection.type} · {subsection.columns} col ·{" "}
                                      {subsection.columnOrder}
                                      {subsection.showTimeline
                                        ? ` · ${subsection.timelineStyle} timeline`
                                        : ""}
                                    </span>
                                <div className="flex items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleEditSubsection(section.id, subsection)
                                    }
                                    className="rounded-full border border-slate-700 p-2 text-slate-200"
                                    aria-label="Edit subsection"
                                  >
                                    <FiEdit2 className="h-4 w-4" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleRemoveSubsection(
                                        section.id,
                                        subsection.id
                                      )
                                    }
                                    className="rounded-full border border-slate-700 p-2 text-slate-200"
                                    aria-label="Remove subsection"
                                  >
                                    <FiTrash2 className="h-4 w-4" />
                                  </button>
                                </div>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          ) : null}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="app-card">
              <h3 className="text-sm font-semibold uppercase tracking-[0.1em] text-slate-300">
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
      <SectionModal
        open={isSectionModalOpen}
        initialValues={activeSection}
        onCancel={() => {
          setIsSectionModalOpen(false);
          setActiveSection(null);
        }}
        onSave={handleSaveSection}
      />
      <SubsectionModal
        open={isSubsectionModalOpen}
        initialValues={activeSubsection}
        onCancel={() => {
          setIsSubsectionModalOpen(false);
          setActiveSubsection(null);
          setActiveSectionId(null);
        }}
        onSave={handleSaveSubsection}
      />
    </AppShell>
  );
}
