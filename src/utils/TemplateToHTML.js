export function buildHTML(template, resumeJson = {}) {
  const page = template?.page ?? {};
  const marginX = page.marginX ?? page.margins?.left ?? 32;
  const marginY = page.marginY ?? page.margins?.top ?? 32;
  const paddingX = page.paddingX ?? 0;
  const paddingY = page.paddingY ?? 0;
  return `
<html>
<head>
<style>
body {
  font-family: ${template.theme.fonts.body};
  font-size: ${template.theme.baseFontSize ?? 14}px;
  margin: ${marginY}px ${marginX}px;
  padding: ${paddingY}px ${paddingX}px;
  color: ${template.theme.colors?.primary ?? "#1f2937"};
  background: ${template.page?.backgroundColor ?? "#ffffff"};
  line-height: ${template.theme.lineHeight ?? 1.5};
  box-sizing: border-box;
  border: ${
    template.page?.border?.enabled
      ? `${template.page.border.width ?? 1}px ${template.page.border.style ?? "solid"} ${template.page.border.color ?? "#e5e7eb"}`
      : "none"
  };
}
.section {
  border-bottom: 1px solid #e2e8f0;
  margin: ${template.theme.sectionGap ?? 12}px 0;
  padding-bottom: 8px;
}
.row { display:flex; gap:${template.theme.gap ?? 12}px; }
.column { display:flex; flex-direction:column; gap:${template.theme.gap ?? 12}px; }
.box {
  border: 1px dashed #cbd5f5;
  padding: 8px 10px;
  border-radius: 8px;
  color: #475569;
  background: #f8fafc;
  margin-bottom: ${template.theme.gap ?? 12}px;
}
</style>
</head>
<body>
  ${renderNode(template.layout.root, template, resumeJson)}
</body>
</html>`;
}

export function renderNode(node, template, resumeJson) {
  if (!node) return "";

  const resolveFontSize = (token) => {
    const base = template?.theme?.baseFontSize ?? 14;
    const scale = template?.theme?.fontScales?.[token] ?? 1;
    return Math.round(base * scale);
  };

  const leafStyle = (node) => {
    const style = node.textStyle || {};
    const token = style.fontSizeToken ?? "body";
    const fontSize = `font-size:${resolveFontSize(token)}px;`;
    const colorToken = style.colorToken ?? "primary";
    const colorValue = template?.theme?.colors?.[colorToken];
    const color = colorValue ? `color:${colorValue};` : "";
    const fontWeight = style.fontWeight ? `font-weight:${style.fontWeight};` : "";
    const fontStyle = style.fontStyle ? `font-style:${style.fontStyle};` : "";
    return `${fontSize}${color}${fontWeight}${fontStyle}`;
  };

  const sectionTitleStyle = () => {
    const style = node.titleStyle || {};
    const token = style.fontSizeToken ?? "heading";
    const fontSize = `font-size:${resolveFontSize(token)}px;`;
    const colorToken = style.colorToken ?? "primary";
    const colorValue = template?.theme?.colors?.[colorToken];
    const color = colorValue ? `color:${colorValue};` : "";
    const fontWeight = style.fontWeight ? `font-weight:${style.fontWeight};` : "";
    const fontStyle = style.fontStyle ? `font-style:${style.fontStyle};` : "";
    return `${fontSize}${color}${fontWeight}${fontStyle}`;
  };

  const flexStyle = (node) => {
    const alignItems = node.alignItems ?? "flex-start";
    const justifyContent = node.justifyContent ?? "flex-start";
    return `align-items:${alignItems};justify-content:${justifyContent};`;
  };

  const textAlignStyle = (value) =>
    value ? `text-align:${value};` : "";

  switch (node.type) {
    case "section": {
      const title = (node.title || "Section").trim();
      const showTitle = node.showTitle !== false;
      const titleStyle = sectionTitleStyle();
      const dividerStyle =
        node.showDivider === false ? "border-bottom:none;" : "";
      const sectionAlign = node.align ?? "left";
      const titleAlign = node.titleAlign ?? sectionAlign;
      return `<div class="section" style="${dividerStyle}width:100%;${textAlignStyle(
        sectionAlign
      )}">
        ${
          showTitle
            ? `<strong style="${titleStyle}${textAlignStyle(
                titleAlign
              )};display:block;">${title || "Section"}</strong>`
            : ""
        }
        ${renderChildren(node, template, resumeJson)}
      </div>`;
    }

    case "row":
      return `<div class="row" style="${flexStyle(node)}">${renderChildren(
        node,
        template,
        resumeJson
      )}</div>`;

    case "column":
      return `<div class="column" style="${flexStyle(node)}">${renderChildren(
        node,
        template,
        resumeJson
      )}</div>`;

    case "text":
      return `<div class="box" style="${leafStyle(
        node
      )}${textAlignStyle(node.textAlign ?? "left")}">${
        resolveNodeValue(node, template, resumeJson) || "Sample text"
      }</div>`;

    case "bullet-list":
      return `<div class="box" style="${leafStyle(
        node
      )}${textAlignStyle(node.textAlign ?? "left")}">${
        resolveNodeValue(node, template, resumeJson) || "Sample bullet list"
      }</div>`;

    case "chip-list":
      return `<div class="box" style="${leafStyle(
        node
      )}${textAlignStyle(node.textAlign ?? "left")}">${
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

  const value = resumeJson?.[fieldId];
  if (value != null && value !== "") {
    return String(value);
  }

  const placeholder = def.placeholder || def.label;
  return placeholder ? String(placeholder) : "";
}
