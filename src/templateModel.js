export const createEmptyTemplate = () => ({
  templateId: "template-1",
  schemaVersion: "builder-v1",
  version: "1.0",
  page: {
    size: "A4",
    orientation: "portrait",
    backgroundColor: "#ffffff",
    margins: { top: 32, right: 32, bottom: 32, left: 32 },
  },
  theme: {
    fonts: {
      heading: "Arial Black",
      body: "Arial",
    },
    colors: {
      primary: "#000000",
      accent: "#2563EB",
      muted: "#666",
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
