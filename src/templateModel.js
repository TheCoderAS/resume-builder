export const createEmptyTemplate = () => ({
  templateId: "template-1",
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
      children: [],
    },
  },
});
