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

export const DEFAULT_TEMPLATE_STYLES = {
  fontFamily: "Inter",
  fontSize: 15,
  spacing: 18,
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
