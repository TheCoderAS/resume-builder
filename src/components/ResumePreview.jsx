import { forwardRef } from "react";
import {
  resolveTemplateSettings,
  resolveTemplateStyles,
} from "../utils/resumePreview.js";

const DEFAULT_SECTION_LAYOUT = {
  id: "",
  label: "",
  showTitleDivider: true,
  showSectionDivider: true,
  alignment: "left",
  titleFontWeight: "600",
  titleFontStyle: "normal",
  subsections: [],
};

// Section content schema:
// sections: [{ id, label, subsections: [{ id, type, items, text, columns, ... }] }]
// list items: { title, subtitle, meta, summary }
// date/number items: { label, value, note }
// text content: { text }
const DEFAULT_SUBSECTION_LAYOUT = {
  id: "",
  type: "list",
  columns: 1,
  columnOrder: "left-to-right",
  showTimeline: false,
  timelineStyle: "line",
  timelinePosition: "left",
};

const buildContactLine = (profile) =>
  [profile?.email, profile?.phone, profile?.location]
    .filter(Boolean)
    .join(" · ");

const splitHighlights = (text) =>
  (text ?? "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

const formatRange = (start, end) =>
  [start, end].filter(Boolean).join(" - ");

const formatSectionLabel = (sectionId = "") =>
  sectionId
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());

const getSubsectionItems = (subsection = {}) => {
  if (Array.isArray(subsection.items)) return subsection.items;
  if (Array.isArray(subsection.entries)) return subsection.entries;
  if (Array.isArray(subsection.values)) return subsection.values;
  return [];
};

const getSubsectionText = (subsection = {}) => {
  if (typeof subsection.text === "string") return subsection.text;
  if (typeof subsection.content === "string") return subsection.content;
  if (typeof subsection.summary === "string") return subsection.summary;
  return "";
};

const normalizeSubsectionLayout = (subsection = {}, index = 0) => ({
  ...DEFAULT_SUBSECTION_LAYOUT,
  ...subsection,
  id: subsection?.id ?? `subsection-${index + 1}`,
  type: subsection?.type ?? DEFAULT_SUBSECTION_LAYOUT.type,
});

const normalizeSectionLayout = (section = {}, index = 0) => ({
  ...DEFAULT_SECTION_LAYOUT,
  ...section,
  id: section?.id ?? `section-${index + 1}`,
  label:
    section?.label ??
    (section?.id ? formatSectionLabel(section.id) : DEFAULT_SECTION_LAYOUT.label),
  subsections: Array.isArray(section?.subsections)
    ? section.subsections.map(normalizeSubsectionLayout)
    : [],
});

const buildLegacySections = ({ resumeData, sectionOrder, sectionLayout }) => {
  const sectionLabels = {
    experience: "Experience",
    education: "Education",
    skills: "Skills",
  };
  const experienceItems = (resumeData.experience ?? []).map((item) => ({
    title: item.role || "Role",
    subtitle: item.company || "Company",
    meta: [item.location, formatRange(item.startDate, item.endDate)]
      .filter(Boolean)
      .join(" · "),
    summary: item.summary,
  }));
  const educationItems = (resumeData.education ?? []).map((item) => ({
    title: item.degree || "Degree",
    subtitle: item.school || "School",
    meta: [item.location, formatRange(item.startDate, item.endDate)]
      .filter(Boolean)
      .join(" · "),
    summary: item.summary,
  }));
  const skillsItems = (resumeData.skills ?? []).map((item) => ({
    title: item.name || "Skill",
    subtitle: item.level,
    summary: item.summary,
  }));

  const legacySections = [
    {
      id: "experience",
      label: sectionLabels.experience,
      subsections: [
        {
          id: "experience-list",
          type: "list",
          columns: 1,
          items: experienceItems,
        },
      ],
    },
    {
      id: "education",
      label: sectionLabels.education,
      subsections: [
        {
          id: "education-list",
          type: "list",
          columns: sectionLayout === "columns" ? 2 : 1,
          items: educationItems,
        },
      ],
    },
    {
      id: "skills",
      label: sectionLabels.skills,
      subsections: [
        {
          id: "skills-list",
          type: "list",
          columns: sectionLayout === "columns" ? 2 : 1,
          items: skillsItems,
        },
      ],
    },
  ];

  const order = sectionOrder.length
    ? sectionOrder
    : legacySections.map((section) => section.id);
  const sectionsById = new Map(
    legacySections.map((section) => [section.id, section])
  );
  return order.map((sectionId) => sectionsById.get(sectionId)).filter(Boolean);
};

const ResumePreview = forwardRef(function ResumePreview(
  {
    profile = {},
    resumeData = {},
    sectionOrder = [],
    sections = [],
    styles = {},
    settings = {},
    visibleBlocks = {},
    ...rest
  },
  ref
) {
  const resolvedStyles = resolveTemplateStyles(styles);
  const resolvedSettings = resolveTemplateSettings(settings, styles);
  const {
    fontFamily,
    fontSize,
    spacing,
    colors,
    tokens,
  } = resolvedSettings;
  const {
    sectionLayout,
    headerAlignment,
    showHeaderDivider,
    showSectionDividers,
    page,
  } = resolvedStyles;

  const headerAlign = headerAlignment ?? "left";
  const headerAlignmentStyles = {
    left: "flex-start",
    center: "center",
    right: "flex-end",
  };

  const headerSize = Math.round(fontSize * tokens.headerScale);
  const sectionTitleSize = Math.round(fontSize * tokens.sectionTitleScale);
  const bodySize = Math.round(fontSize * tokens.bodyScale);
  const metaSize = Math.round(fontSize * tokens.metaScale);

  const blockVisibility = {
    header: true,
    section: true,
    list: true,
    columns: true,
    ...visibleBlocks,
  };

  const getEffectiveColumns = (subsection) =>
    subsection.columns > 1
      ? subsection.columns
      : sectionLayout === "columns"
        ? 2
        : 1;

  const canRenderSubsection = (subsection) => {
    const isListLike = ["list", "date", "number"].includes(subsection.type);
    if (isListLike && !blockVisibility.list) {
      return false;
    }
    const effectiveColumns = getEffectiveColumns(subsection);
    if (effectiveColumns > 1 && !blockVisibility.columns) {
      return false;
    }
    return true;
  };

  const sectionsFromData = Array.isArray(sections) && sections.length > 0
    ? sections
    : resumeData.sections ?? [];
  const normalizedSections = Array.isArray(sectionsFromData)
    ? sectionsFromData.map(normalizeSectionLayout)
    : [];
  const hasDynamicContent = normalizedSections.some((section) =>
    (section.subsections ?? []).some((subsection) => {
      if (!canRenderSubsection(subsection)) {
        return false;
      }
      const items = getSubsectionItems(subsection);
      const text = getSubsectionText(subsection);
      return items.length > 0 || text;
    })
  );
  const legacySections =
    normalizedSections.length === 0 || !hasDynamicContent
      ? buildLegacySections({ resumeData, sectionOrder, sectionLayout })
      : [];
  const resolvedSections =
    normalizedSections.length > 0 && hasDynamicContent
      ? normalizedSections
      : legacySections;

  const hasContent =
    (blockVisibility.header &&
      (profile?.fullName || profile?.title || profile?.summary)) ||
    resolvedSections.some((section) =>
      (section.subsections ?? []).some((subsection) => {
        if (!canRenderSubsection(subsection)) {
          return false;
        }
        const items = getSubsectionItems(subsection);
        const text = getSubsectionText(subsection);
        return items.length > 0 || text;
      })
    );

  return (
    <div
      ref={ref}
      {...rest}
      className="rounded-[22px] border border-slate-200 bg-white"
      style={{
        width: `${page.width}px`,
        height: `${page.height}px`,
        fontFamily,
        fontSize: `${fontSize}px`,
        lineHeight: tokens.lineHeight,
        color: colors.text,
        backgroundColor: colors.background,
      }}
    >
      <div
        className="flex h-full flex-col"
        style={{
          gap: `${spacing}px`,
          padding: `${page.paddingY}px ${page.paddingX}px`,
        }}
      >
        {blockVisibility.header ? (
          <header
            className={`flex flex-col ${
              showHeaderDivider ? "border-b border-slate-200" : ""
            }`}
            style={{
              gap: `${Math.round(spacing / 2)}px`,
              paddingBottom: showHeaderDivider
                ? `${Math.round(spacing / 1.25)}px`
                : "0px",
              textAlign: headerAlign,
              alignItems: headerAlignmentStyles[headerAlign] ?? "flex-start",
            }}
          >
            <div>
              <h2
                style={{
                  fontSize: `${headerSize}px`,
                  fontWeight: 700,
                }}
              >
                {profile.fullName || "Your name"}
              </h2>
              <p
                style={{
                  fontSize: `${bodySize}px`,
                  color: colors.muted,
                  fontWeight: 500,
                }}
              >
                {profile.title || "Professional title"}
              </p>
            </div>
            {buildContactLine(profile) ? (
              <p
                style={{
                  fontSize: `${metaSize}px`,
                  color: colors.muted,
                }}
              >
                {buildContactLine(profile)}
              </p>
            ) : null}
            {profile.summary ? (
              <p style={{ fontSize: `${bodySize}px` }}>{profile.summary}</p>
            ) : null}
          </header>
        ) : null}

        {!hasContent ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm text-slate-400">
            Add resume details to see a live preview.
          </div>
        ) : null}

        <div className="flex flex-col" style={{ gap: `${spacing}px` }}>
          {resolvedSections.map((section, index) => {
            const normalizedSection = normalizeSectionLayout(section, index);
            const isLastSection = index === resolvedSections.length - 1;
            const subsections = normalizedSection.subsections ?? [];
            const hasSubsectionContent = subsections.some((subsection) => {
              if (!canRenderSubsection(subsection)) {
                return false;
              }
              const items = getSubsectionItems(subsection);
              const text = getSubsectionText(subsection);
              return items.length > 0 || text;
            });

            if (!hasSubsectionContent) {
              return null;
            }

            const sectionDividerEnabled =
              showSectionDividers && normalizedSection.showSectionDivider;

            return (
              <section
                key={normalizedSection.id || `${normalizedSection.label}-${index}`}
                className={`flex flex-col ${
                  sectionDividerEnabled && !isLastSection
                    ? "border-b border-slate-200"
                    : ""
                }`}
                style={{
                  gap: `${Math.round(spacing / 2)}px`,
                  paddingBottom:
                    sectionDividerEnabled && !isLastSection
                      ? `${Math.round(spacing / 1.25)}px`
                      : "0px",
                }}
              >
                {blockVisibility.section ? (
                  <h3
                    style={{
                      fontSize: `${sectionTitleSize}px`,
                      fontWeight: normalizedSection.titleFontWeight,
                      fontStyle: normalizedSection.titleFontStyle,
                      color: colors.accent,
                      textAlign: normalizedSection.alignment,
                    }}
                  >
                    {normalizedSection.label}
                  </h3>
                ) : null}
                <div
                  className="flex flex-col"
                  style={{ gap: `${Math.round(spacing / 1.4)}px` }}
                >
                  {subsections.map((subsection, subsectionIndex) => {
                    const normalizedSubsection = normalizeSubsectionLayout(
                      subsection,
                      subsectionIndex
                    );
                    const items = getSubsectionItems(normalizedSubsection);
                    const text = getSubsectionText(normalizedSubsection);
                    if (!canRenderSubsection(normalizedSubsection)) {
                      return null;
                    }
                    const effectiveColumns =
                      getEffectiveColumns(normalizedSubsection);
                    const gridColumnsClass =
                      effectiveColumns === 1
                        ? ""
                        : effectiveColumns === 2
                          ? "md:grid-cols-2"
                          : "md:grid-cols-3";
                    const baseSubsectionLayout =
                      normalizedSubsection.columnOrder === "stacked"
                        ? "flex flex-col"
                        : `grid ${gridColumnsClass}`;
                    const subsectionAlignment =
                      normalizedSubsection.columnOrder === "right-to-left"
                        ? "rtl"
                        : "ltr";

                    if (normalizedSubsection.type === "text") {
                      if (!text) return null;
                      return (
                        <p
                          key={normalizedSubsection.id}
                          style={{ fontSize: `${bodySize}px` }}
                        >
                          {text}
                        </p>
                      );
                    }

                    if (
                      normalizedSubsection.type === "date" ||
                      normalizedSubsection.type === "number"
                    ) {
                      if (items.length === 0) return null;
                      return (
                        <div
                          key={normalizedSubsection.id}
                          className={`gap-3 ${baseSubsectionLayout}`}
                          style={{
                            direction: subsectionAlignment,
                            gap: `${Math.round(spacing / 1.4)}px`,
                          }}
                        >
                          {items.map((item, itemIndex) => (
                            <div key={`${normalizedSubsection.id}-${itemIndex}`}>
                              {item.label ? (
                                <p
                                  style={{
                                    fontSize: `${bodySize}px`,
                                    fontWeight: 600,
                                  }}
                                >
                                  {item.label}
                                </p>
                              ) : null}
                              {item.value ? (
                                <p
                                  style={{
                                    fontSize: `${metaSize}px`,
                                    color: colors.muted,
                                    fontWeight:
                                      normalizedSubsection.type === "number"
                                        ? 600
                                        : 500,
                                  }}
                                >
                                  {item.value}
                                </p>
                              ) : null}
                              {item.note ? (
                                <p
                                  className="mt-1"
                                  style={{ fontSize: `${bodySize}px` }}
                                >
                                  {item.note}
                                </p>
                              ) : null}
                            </div>
                          ))}
                        </div>
                      );
                    }

                    if (items.length === 0) return null;

                    return (
                      <div
                        key={normalizedSubsection.id}
                        className={`gap-3 ${baseSubsectionLayout}`}
                        style={{
                          direction: subsectionAlignment,
                          gap: `${Math.round(spacing / 1.4)}px`,
                        }}
                      >
                        {items.map((item, itemIndex) => {
                          const highlights = splitHighlights(item.summary);
                          const hasTimeline = normalizedSubsection.showTimeline;
                          const isTimelineRight =
                            normalizedSubsection.timelinePosition === "right";
                          const timelineBorderClasses = {
                            left: {
                              line: "border-l-2 border-solid border-emerald-200",
                              dots: "border-l-2 border-dotted border-emerald-200",
                              bars: "border-l-4 border-solid border-emerald-200",
                            },
                            right: {
                              line: "border-r-2 border-solid border-emerald-200",
                              dots: "border-r-2 border-dotted border-emerald-200",
                              bars: "border-r-4 border-solid border-emerald-200",
                            },
                          };
                          const timelineBorderClass =
                            timelineBorderClasses[isTimelineRight ? "right" : "left"][
                              normalizedSubsection.timelineStyle
                            ] ?? timelineBorderClasses.left.line;
                          const timelinePadding = isTimelineRight
                            ? "pr-4"
                            : "pl-4";
                          const timelineClass = hasTimeline
                            ? `${timelineBorderClass} ${timelinePadding}`
                            : "";
                          return (
                            <div
                              key={`${normalizedSubsection.id}-${itemIndex}`}
                              className={timelineClass}
                            >
                              <div className="flex flex-wrap items-baseline gap-x-2">
                                {item.title ? (
                                  <p
                                    style={{
                                      fontSize: `${bodySize}px`,
                                      fontWeight: 600,
                                    }}
                                  >
                                    {item.title}
                                  </p>
                                ) : null}
                                {item.subtitle ? (
                                  <p
                                    style={{
                                      fontSize: `${bodySize}px`,
                                      fontWeight: 500,
                                    }}
                                  >
                                    {item.subtitle}
                                  </p>
                                ) : null}
                              </div>
                              {item.meta ? (
                                <p
                                  style={{
                                    fontSize: `${metaSize}px`,
                                    color: colors.muted,
                                  }}
                                >
                                  {item.meta}
                                </p>
                              ) : null}
                              {highlights.length > 1 ? (
                                <ul
                                  className="mt-2 list-disc pl-5"
                                  style={{ fontSize: `${bodySize}px` }}
                                >
                                  {highlights.map((line) => (
                                    <li key={line}>{line}</li>
                                  ))}
                                </ul>
                              ) : highlights.length === 1 ? (
                                <p
                                  className="mt-2"
                                  style={{ fontSize: `${bodySize}px` }}
                                >
                                  {highlights[0]}
                                </p>
                              ) : item.summary ? (
                                <p
                                  className="mt-2"
                                  style={{ fontSize: `${bodySize}px` }}
                                >
                                  {item.summary}
                                </p>
                              ) : null}
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      </div>
    </div>
  );
});

export default ResumePreview;
