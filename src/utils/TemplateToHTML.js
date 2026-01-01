export function buildHTML(template, resumeJson = {}) {
  return `
<html>
<head>
<style>
body {
  font-family: ${template.theme.fonts.body};
  padding: 20px;
}
.section { border-bottom:1px solid #ddd; margin:10px 0; padding-bottom:4px; }
.row { display:flex; gap:8px; }
.column { display:flex; flex-direction:column; gap:8px; }
.box { border:1px dashed #ccc; padding:6px; }
</style>
</head>
<body>
  ${renderNode(template.layout.root, template, resumeJson)}
</body>
</html>`;
}

export function renderNode(node, template, resumeJson) {
  if (!node) return "";

  switch (node.type) {
    case "section":
      return `<div class="section">
        <strong>SECTION</strong>
        ${renderChildren(node, template, resumeJson)}
      </div>`;

    case "row":
      return `<div class="row">${renderChildren(node, template, resumeJson)}</div>`;

    case "column":
      return `<div class="column">${renderChildren(node, template, resumeJson)}</div>`;

    case "text":
      return `<div class="box">${
        resolveNodeValue(node, template, resumeJson) || "Sample text"
      }</div>`;

    case "bullet-list":
      return `<div class="box">${
        resolveNodeValue(node, template, resumeJson) || "Sample bullet list"
      }</div>`;

    case "chip-list":
      return `<div class="box">${
        resolveNodeValue(node, template, resumeJson) || "Sample chip list"
      }</div>`;

    case "repeat":
      return `<div class="box">Repeat Block</div>`;

    default:
      return `<div class="box">${node.type}</div>`;
  }
}

function renderChildren(node, template, resumeJson) {
  return (node.children || [])
    .map((child) => renderNode(child, template, resumeJson))
    .join("");
}

function resolveNodeValue(node, template, resumeJson) {
  const fieldId = node?.bindField;
  if (!fieldId) return "";

  const fields = template?.fields || {};
  const def = fields[fieldId];
  if (!def) return "";

  const source = def.source;
  const path = def.path;
  if (!source || !path) return "";

  const bucket = resumeJson?.[source] || {};
  const value = bucket[path];

  return value != null ? String(value) : "";
}
