export const FONT_OPTIONS = [
  "Inter",
  "Poppins",
  "Merriweather",
  "Georgia",
  "Arial",
  "Times New Roman",
];

export const PAGE_SIZE_OPTIONS = [
  { id: "A4", label: "A4", width: 794, height: 1123 },
  { id: "Letter", label: "US Letter", width: 816, height: 1056 },
  { id: "Legal", label: "US Legal", width: 816, height: 1344 },
];

export const DEFAULT_TEMPLATE_SETTINGS = {
  fontFamily: "Inter",
  fontSize: 15,
  spacing: 18,
  colors: {
    background: "#ffffff",
    text: "#0f172a",
    accent: "#10b981",
    muted: "#475569",
  },
  tokens: {
    headerScale: 1.8,
    sectionTitleScale: 1.2,
    bodyScale: 0.95,
    metaScale: 0.85,
    lineHeight: 1.5,
  },
};

export const DEFAULT_TEMPLATE_STYLES = {
  sectionLayout: "single",
  headerAlignment: "left",
  showHeaderDivider: true,
  showSectionDividers: false,
  page: {
    size: "A4",
    width: 794,
    height: 1123,
    paddingX: 48,
    paddingY: 44,
  },
};

export const resolvePageSetup = (page = {}) => {
  const base =
    PAGE_SIZE_OPTIONS.find((option) => option.id === page.size) ??
    PAGE_SIZE_OPTIONS[0];
  return {
    size: base.id,
    width: base.width,
    height: base.height,
    paddingX: page.paddingX ?? DEFAULT_TEMPLATE_STYLES.page.paddingX,
    paddingY: page.paddingY ?? DEFAULT_TEMPLATE_STYLES.page.paddingY,
  };
};

const pickLegacySettings = (styles = {}) => ({
  ...(styles.fontFamily ? { fontFamily: styles.fontFamily } : {}),
  ...(typeof styles.fontSize === "number" ? { fontSize: styles.fontSize } : {}),
  ...(typeof styles.spacing === "number" ? { spacing: styles.spacing } : {}),
});

export const resolveTemplateSettings = (settings = {}, legacyStyles = {}) => {
  const legacy = pickLegacySettings(legacyStyles ?? {});
  return {
    ...DEFAULT_TEMPLATE_SETTINGS,
    ...legacy,
    ...settings,
    colors: {
      ...DEFAULT_TEMPLATE_SETTINGS.colors,
      ...(legacyStyles?.colors ?? {}),
      ...(settings?.colors ?? {}),
    },
    tokens: {
      ...DEFAULT_TEMPLATE_SETTINGS.tokens,
      ...(legacyStyles?.tokens ?? {}),
      ...(settings?.tokens ?? {}),
    },
  };
};

export const resolveTemplateStyles = (styles = {}, layout = {}) => ({
  ...DEFAULT_TEMPLATE_STYLES,
  ...styles,
  page: resolvePageSetup(styles?.page),
  sectionLayout:
    layout?.sectionLayout ??
    styles?.sectionLayout ??
    DEFAULT_TEMPLATE_STYLES.sectionLayout,
});
