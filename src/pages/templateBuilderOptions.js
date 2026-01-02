export const NODE_TYPES = [
  "row",
  "column",
  "section",
  "text",
  "repeat",
];

export const STATUS_OPTIONS = [
  { label: "Draft", value: "draft" },
  { label: "Active", value: "active" },
  { label: "Archived", value: "archived" },
];

export const CATEGORY_OPTIONS = [
  { label: "Professional", value: "Professional" },
  { label: "Creative", value: "Creative" },
  { label: "Modern", value: "Modern" },
  { label: "Minimal", value: "Minimal" },
  { label: "Executive", value: "Executive" },
  { label: "Academic", value: "Academic" },
  { label: "Technical", value: "Technical" },
  { label: "Student", value: "Student" },
];

export const PAGE_OPTIONS = [
  { label: "A4", value: "A4" },
  { label: "US Letter", value: "Letter" },
  { label: "US Legal", value: "Legal" },
];

export const FONT_OPTIONS = [
  { label: "Inter", value: "Inter" },
  { label: "Poppins", value: "Poppins" },
  { label: "Merriweather", value: "Merriweather" },
  { label: "Georgia", value: "Georgia" },
  { label: "Arial", value: "Arial" },
  { label: "Times New Roman", value: "Times New Roman" },
];

export const BASE_FONT_SIZE_OPTIONS = Array.from({ length: 13 }, (_, index) => {
  const size = 8 + index;
  return { label: String(size), value: size };
});

export const FONT_SIZE_TOKENS = [
  { label: "Display", value: "display" },
  { label: "Heading", value: "heading" },
  { label: "Body", value: "body" },
  { label: "Meta", value: "meta" },
];

export const COLOR_TOKENS = [
  { label: "Primary", value: "primary" },
  { label: "Secondary", value: "secondary" },
  { label: "Accent", value: "accent" },
  { label: "Meta", value: "meta" },
];
