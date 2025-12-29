import { DEFAULT_TEMPLATE_STYLES } from "../utils/resumePreview.js";

const SECTION_LABELS = {
  experience: "Experience",
  education: "Education",
  skills: "Skills",
};

const resolveStyles = (styles) => ({
  ...DEFAULT_TEMPLATE_STYLES,
  ...styles,
  colors: {
    ...DEFAULT_TEMPLATE_STYLES.colors,
    ...(styles?.colors ?? {}),
  },
  tokens: {
    ...DEFAULT_TEMPLATE_STYLES.tokens,
    ...(styles?.tokens ?? {}),
  },
});

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

export default function ResumePreview({
  profile = {},
  resumeData = {},
  sectionOrder = [],
  styles = {},
  visibleBlocks = {},
}) {
  const resolvedStyles = resolveStyles(styles);
  const { colors, fontFamily, fontSize, spacing, sectionLayout, tokens } =
    resolvedStyles;

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

  const sectionVisibility = {
    experience: blockVisibility.section,
    skills: blockVisibility.list,
    education: blockVisibility.columns,
  };

  const orderedSections = (sectionOrder.length
    ? sectionOrder
    : Object.keys(SECTION_LABELS)
  ).filter((sectionKey) => sectionVisibility[sectionKey] !== false);

  const experience = resumeData.experience ?? [];
  const education = resumeData.education ?? [];
  const skills = resumeData.skills ?? [];

  const hasContent =
    (blockVisibility.header &&
      (profile?.fullName || profile?.title || profile?.summary)) ||
    experience.length > 0 ||
    education.length > 0 ||
    skills.length > 0;

  return (
    <div
      className="h-full w-full rounded-[22px] border border-slate-200 bg-white"
      style={{
        fontFamily,
        fontSize: `${fontSize}px`,
        lineHeight: tokens.lineHeight,
        color: colors.text,
        backgroundColor: colors.background,
      }}
    >
      <div
        className="flex h-full flex-col px-8 py-7"
        style={{ gap: `${spacing}px` }}
      >
        {blockVisibility.header ? (
          <header
            className="flex flex-col border-b border-slate-200"
            style={{
              gap: `${Math.round(spacing / 2)}px`,
              paddingBottom: `${Math.round(spacing / 1.25)}px`,
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
          {orderedSections.map((sectionKey) => {
            if (sectionKey === "experience" && experience.length === 0) {
              return null;
            }
            if (sectionKey === "education" && education.length === 0) {
              return null;
            }
            if (sectionKey === "skills" && skills.length === 0) {
              return null;
            }

            return (
              <section
                key={sectionKey}
                className="flex flex-col"
                style={{ gap: `${Math.round(spacing / 2)}px` }}
              >
                <h3
                  style={{
                    fontSize: `${sectionTitleSize}px`,
                    fontWeight: 600,
                    color: colors.accent,
                  }}
                >
                  {SECTION_LABELS[sectionKey]}
                </h3>
                {sectionKey === "experience" ? (
                  <div
                    className="flex flex-col"
                    style={{ gap: `${Math.round(spacing / 1.4)}px` }}
                  >
                    {experience.map((item, index) => {
                      const highlights = splitHighlights(item.summary);
                      return (
                        <div key={`${item.role}-${index}`}>
                          <div className="flex flex-wrap items-baseline gap-x-2">
                            <p
                              style={{
                                fontSize: `${bodySize}px`,
                                fontWeight: 600,
                              }}
                            >
                              {item.role || "Role"}
                            </p>
                            <p
                              style={{
                                fontSize: `${bodySize}px`,
                                fontWeight: 500,
                              }}
                            >
                              {item.company || "Company"}
                            </p>
                          </div>
                          <p
                            style={{
                              fontSize: `${metaSize}px`,
                              color: colors.muted,
                            }}
                          >
                            {[item.location, formatRange(item.startDate, item.endDate)]
                              .filter(Boolean)
                              .join(" · ")}
                          </p>
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
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                ) : null}

                {sectionKey === "education" ? (
                  <div
                    className={`grid ${sectionLayout === "columns" ? "md:grid-cols-2" : ""}`}
                    style={{ gap: `${Math.round(spacing / 1.4)}px` }}
                  >
                    {education.map((item, index) => (
                      <div key={`${item.school}-${index}`}>
                        <p
                          style={{
                            fontSize: `${bodySize}px`,
                            fontWeight: 600,
                          }}
                        >
                          {item.degree || "Degree"}
                        </p>
                        <p
                          style={{
                            fontSize: `${bodySize}px`,
                            fontWeight: 500,
                          }}
                        >
                          {item.school || "School"}
                        </p>
                        <p
                          style={{
                            fontSize: `${metaSize}px`,
                            color: colors.muted,
                          }}
                        >
                          {[item.location, formatRange(item.startDate, item.endDate)]
                            .filter(Boolean)
                            .join(" · ")}
                        </p>
                        {item.summary ? (
                          <p
                            className="mt-2"
                            style={{ fontSize: `${bodySize}px` }}
                          >
                            {item.summary}
                          </p>
                        ) : null}
                      </div>
                    ))}
                  </div>
                ) : null}

                {sectionKey === "skills" ? (
                  <div
                    className={`grid ${sectionLayout === "columns" ? "md:grid-cols-2" : ""}`}
                    style={{ gap: `${Math.round(spacing / 1.4)}px` }}
                  >
                    {skills.map((item, index) => (
                      <div key={`${item.name}-${index}`}>
                        <p
                          style={{
                            fontSize: `${bodySize}px`,
                            fontWeight: 600,
                          }}
                        >
                          {item.name || "Skill"}
                        </p>
                        {item.level ? (
                          <p
                            style={{
                              fontSize: `${metaSize}px`,
                              color: colors.muted,
                            }}
                          >
                            {item.level}
                          </p>
                        ) : null}
                        {item.summary ? (
                          <p
                            className="mt-1"
                            style={{ fontSize: `${bodySize}px` }}
                          >
                            {item.summary}
                          </p>
                        ) : null}
                      </div>
                    ))}
                  </div>
                ) : null}
              </section>
            );
          })}
        </div>
      </div>
    </div>
  );
}
