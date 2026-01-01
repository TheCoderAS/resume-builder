export function buildHTML(template) {
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
  ${renderNode(template.layout.root)}
</body>
</html>`;
}

export function renderNode(node) {
  if (!node) return "";

  switch (node.type) {
    case "section":
      return `<div class="section">
        <strong>SECTION</strong>
        ${renderChildren(node)}
      </div>`;

    case "row":
      return `<div class="row">${renderChildren(node)}</div>`;

    case "column":
      return `<div class="column">${renderChildren(node)}</div>`;

    case "text":
      return `<div class="box">Text</div>`;

    case "repeat":
      return `<div class="box">Repeat Block</div>`;

    default:
      return `<div class="box">${node.type}</div>`;
  }
}

function renderChildren(node) {
  return (node.children || []).map((child) => renderNode(child)).join("");
}
