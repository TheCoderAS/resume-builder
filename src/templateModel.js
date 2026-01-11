export const DEFAULT_COLUMN_WIDTH = {
  span: null,
  widthPct: null,
};

export const DEFAULT_ROW_DIVIDER = {
  enabled: false,
  width: null,
  style: null,
  color: null,
  inset: null,
};

const createTemplateId = () =>
  `TMP_${Date.now()}`;

export const createEmptyTemplate = () => ({
  id: createTemplateId(),
  schemaVersion: "builder-v1",
  version: "1.0",
  page: {
    size: "A4",
    orientation: "portrait",
    backgroundColor: "#ffffff",
    marginX: 32,
    marginY: 32,
    paddingX: 0,
    paddingY: 0,
    border: {
      enabled: false,
      width: 1,
      color: "#e5e7eb",
      style: "solid",
    },
  },
  theme: {
    fonts: {
      heading: "Arial Black",
      body: "Arial",
    },
    baseFontSize: 14,
    lineHeight: 1.5,
    gap: 12,
    sectionGap: 12,
    sectionDividerColor: "#e2e8f0",
    sectionDivider: {
      enabled: true,
      width: 1,
      style: "solid",
      color: "#e2e8f0",
    },
    sectionTitleStyle: {
      fontSizeToken: "heading",
      colorToken: "primary",
      fontWeight: "600",
      fontStyle: "normal",
      textTransform: "none",
    },
    sectionTitleDivider: {
      enabled: false,
      color: "#e2e8f0",
      width: 1,
      style: "solid",
      spacing: 6,
    },
    rowDivider: {
      width: 1,
      style: "solid",
      color: "#e2e8f0",
      inset: 0,
    },
    rowDividerSpacing: 6,
    repeatItemGap: 12,
    fontScales: {
      display: 1.6,
      heading: 1.25,
      body: 1,
      meta: 0.85,
    },
    colors: {
      primary: "#000000",
      secondary: "#1f2937",
      accent: "#2563EB",
      muted: "#666",
      meta: "#475569",
    },
  },
  fields: {},
  layout: {
    root: {
      id: "root",
      type: "column",
      style: { spacing: 12 },
      ...DEFAULT_COLUMN_WIDTH,
      children: [],
    },
  },
});

export const hydrateTemplate = (layout) => {
  const baseTemplate = createEmptyTemplate();
  return {
    ...baseTemplate,
    ...layout,
    page: { ...baseTemplate.page, ...(layout?.page ?? {}) },
    theme: { ...baseTemplate.theme, ...(layout?.theme ?? {}) },
    fields: { ...baseTemplate.fields, ...(layout?.fields ?? {}) },
    layout: layout?.layout?.root ? layout.layout : baseTemplate.layout,
  };
};

export const applyTemplateOverrides = (template, overrides) => {
  if (!overrides) return template;
  const nextPage = overrides.page
    ? { ...template.page, ...overrides.page }
    : template.page;
  const nextTheme = overrides.theme
    ? {
        ...template.theme,
        ...overrides.theme,
        fonts: overrides.theme.fonts
          ? { ...template.theme?.fonts, ...overrides.theme.fonts }
          : template.theme?.fonts,
        colors: overrides.theme.colors
          ? { ...template.theme?.colors, ...overrides.theme.colors }
          : template.theme?.colors,
      }
    : template.theme;
  return {
    ...template,
    page: nextPage,
    theme: nextTheme,
  };
};
