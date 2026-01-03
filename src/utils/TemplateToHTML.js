export function buildHTML(template, resumeJson = {}, options = {}) {
  const highlightId = options?.highlightId ?? null;
  const embedLinks = options?.embedLinks ?? false;
  const origin =
    options?.origin && options.origin !== "null" ? options.origin : "*";
  const page = template?.page ?? {};
  const marginX = page.marginX ?? page.margins?.left ?? 32;
  const marginY = page.marginY ?? page.margins?.top ?? 32;
  const paddingX = page.paddingX ?? 0;
  const paddingY = page.paddingY ?? 0;
  return `
<html>
<head>
<style>
@page {
  margin: 0;
}
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
  border-bottom: 1px solid ${template.theme.sectionDividerColor ?? "#e2e8f0"};
  margin: ${template.theme.sectionGap ?? 12}px 0;
}
.row { display:flex; gap:${template.theme.gap ?? 12}px; }
.column { display:flex; flex-direction:column; gap:${template.theme.gap ?? 12}px; }
.box {
  border: none;
  border-radius: 0;
  color: inherit;
  background: transparent;
  margin-bottom: ${template.theme.gap ?? 12}px;
}
.rich-text {
  --rich-text-gap: ${template.theme.gap ?? 12}px;
  --chip-padding-y: ${Math.max(3, Math.round((template.theme.gap ?? 12) / 4))}px;
  --chip-padding-x: ${Math.max(8, Math.round((template.theme.gap ?? 12) / 2))}px;
}
.rich-text :where(p, ul, ol, li) {
  margin: 0;
  padding: 0;
}
.rich-text :where(ul, ol) {
  padding-left: 1.25em;
}
.rich-text :where(ul.chip-list) {
  list-style: none;
  padding-left: 0;
  display: flex;
  flex-wrap: wrap;
  gap: var(--rich-text-gap);
}
.rich-text :where(ul.chip-list > li) {
  padding: var(--chip-padding-y) var(--chip-padding-x);
  border-radius: 999px;
  border: 1px solid currentColor;
  line-height: 1.2;
}
.rich-text :where(p + p, p + ul, p + ol, ul + p, ol + p, ul + ul, ol + ol, ul + ol, ol + ul) {
  margin-top: var(--rich-text-gap);
}
.node-highlight {
  outline: 2px solid #ef4444;
  outline-offset: 4px;
  border-radius: 6px;
}
.node-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1em;
  height: 1em;
  margin-right: 0.25em;
  vertical-align: -0.125em;
}
.node-icon svg {
  width: 1em;
  height: 1em;
  stroke: currentColor;
  fill: none;
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
}
</style>
</head>
<body>
  ${renderNode(
    template.layout.root,
    template,
    resumeJson,
    highlightId,
    embedLinks,
    {}
  )}
  <script>
    (function () {
      function findNodeId(target) {
        while (target && target !== document.body) {
          if (target.dataset && target.dataset.nodeId) {
            return target.dataset.nodeId;
          }
          target = target.parentElement;
        }
        return null;
      }
      document.addEventListener("click", function (event) {
        var nodeId = findNodeId(event.target);
        if (!nodeId) return;
        if (window.parent && window.parent !== window) {
          window.parent.postMessage(
            { type: "templateNodeSelect", nodeId: nodeId },
            "${origin}"
          );
        }
      });
    })();
  </script>
</body>
</html>`;
}

export function renderNode(
  node,
  template,
  resumeJson,
  highlightId = null,
  embedLinks = false,
  scope = {}
) {
  if (!node) return "";
  const highlightClass = node.id === highlightId ? " node-highlight" : "";
  const dataAttr = `data-node-id="${node.id}"`;

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

  const iconSvg = (name) => {
    const icons = {
      user: `<svg viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`,
      briefcase: `<svg viewBox="0 0 24 24"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/><path d="M2 12h20"/></svg>`,
      book: `<svg viewBox="0 0 24 24"><path d="M2 3h6a4 4 0 0 1 4 4v14H6a4 4 0 0 0-4 4V3z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14h6a4 4 0 0 1 4 4V3z"/></svg>`,
      award: `<svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="6"/><path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11"/></svg>`,
      mail: `<svg viewBox="0 0 24 24"><path d="M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2"/><polyline points="22,6 12,13 2,6"/></svg>`,
      phone: `<svg viewBox="0 0 24 24"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.79 19.79 0 0 1 2.12 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.12.81.31 1.6.57 2.35a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.73-1.13a2 2 0 0 1 2.11-.45c.75.26 1.54.45 2.35.57A2 2 0 0 1 22 16.92z"/></svg>`,
      mapPin: `<svg viewBox="0 0 24 24"><path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>`,
      globe: `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>`,
      linkedin: `<svg viewBox="0 0 24 24"><rect x="2" y="2" width="20" height="20" rx="2"/><line x1="7" y1="9" x2="7" y2="17"/><line x1="7" y1="7" x2="7" y2="7"/><path d="M11 17v-4a2 2 0 0 1 4 0v4"/><line x1="11" y1="9" x2="11" y2="17"/></svg>`,
      github: `<svg viewBox="0 0 24 24"><path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"/></svg>`,
      link: `<svg viewBox="0 0 24 24"><path d="M10 13a5 5 0 0 1 0-7l2-2a5 5 0 0 1 7 7l-1 1"/><path d="M14 11a5 5 0 0 1 0 7l-2 2a5 5 0 0 1-7-7l1-1"/></svg>`,
    };
    return icons[name] || "";
  };

  const renderIcon = (node) => {
    if (!node.iconName) return "";
    const svg = iconSvg(node.iconName);
    if (!svg) return "";
    const separator = node.iconSeparator ?? " ";
    const safeSeparator = separator === "" ? "" : separator;
    return `<span class="node-icon">${svg}</span>${safeSeparator}`;
  };

  const formatLinkValue = (fieldId, value) => {
    if (!embedLinks || !fieldId || value == null) return null;
    const def = template?.fields?.[fieldId];
    if (!def) return null;
    const inputType = def.inputType;
    const raw = String(value).trim();
    if (!raw) return null;
    if (inputType === "email") {
      return { href: `mailto:${raw}`, label: raw };
    }
    if (inputType === "phone") {
      const digits = raw.replace(/[^\d+]/g, "");
      return { href: `tel:${digits || raw}`, label: raw };
    }
    if (inputType === "url") {
      const href = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
      return { href, label: raw };
    }
    return null;
  };

  const renderValue = (node) => {
    const value = resolveNodeValue(node, template, resumeJson, scope);
    const link = formatLinkValue(node?.bindField, value);
    const content = `${renderIcon(node)}${value || ""}`;
    if (!link) return content;
    return `<a href="${link.href}" style="color:inherit;text-decoration:none;">${content}</a>`;
  };

  switch (node.type) {
    case "section": {
      const title = (node.title || "Section").trim();
      const showTitle = node.showTitle !== false;
      const titleStyle = sectionTitleStyle();
      const dividerStyle =
        node.showDivider === false ? "border-bottom:none;" : "";
      const sectionAlign = node.align ?? "left";
      const titleAlign = node.titleAlign ?? sectionAlign;
      const titleDivider = node.titleDivider ?? {};
      const showTitleDivider = titleDivider.enabled === true;
      const titleDividerColor =
        titleDivider.color ??
        template.theme.sectionDividerColor ??
        "#e2e8f0";
      const titleDividerWidth = titleDivider.width ?? 1;
      const titleDividerStyle = titleDivider.style ?? "solid";
      const titleDividerSpacing = titleDivider.spacing ?? 6;
      return `<div ${dataAttr} class="section${highlightClass}" style="${dividerStyle}width:100%;${textAlignStyle(
        sectionAlign
      )}">
        ${
          showTitle
            ? `<strong style="${titleStyle}${textAlignStyle(
                titleAlign
              )};display:block;">${renderIcon(node)}${title || "Section"}</strong>`
            : ""
        }
        ${
          showTitle && showTitleDivider
            ? `<div style="border-bottom:${titleDividerWidth}px ${titleDividerStyle} ${titleDividerColor};margin-top:${titleDividerSpacing}px;margin-bottom:${titleDividerSpacing}px;width:100%;"></div>`
            : ""
        }
        ${renderChildren(
          node,
          template,
          resumeJson,
          highlightId,
          embedLinks,
          scope
        )}
      </div>`;
    }

    case "row":
      return `<div ${dataAttr} class="row${highlightClass}" style="${flexStyle(
        node
      )}">${renderChildren(
        node,
        template,
        resumeJson,
        highlightId,
        embedLinks,
        scope
      )}</div>`;

    case "column":
      return `<div ${dataAttr} class="column${highlightClass}" style="${flexStyle(
        node
      )}">${renderChildren(
        node,
        template,
        resumeJson,
        highlightId,
        embedLinks,
        scope
      )}</div>`;

    case "text":
      return `<div ${dataAttr} class="box rich-text${highlightClass}" style="${leafStyle(
        node
      )}${textAlignStyle(node.textAlign ?? "left")}">${
        renderValue(node) || "Sample text"
      }</div>`;

    case "bullet-list":
      return `<div ${dataAttr} class="box rich-text${highlightClass}" style="${leafStyle(
        node
      )}${textAlignStyle(node.textAlign ?? "left")}">${
        renderValue(node) || "Sample bullet list"
      }</div>`;

    case "chip-list":
      return `<div ${dataAttr} class="box rich-text${highlightClass}" style="${leafStyle(
        node
      )}${textAlignStyle(node.textAlign ?? "left")}">${
        renderValue(node) || "Sample chip list"
      }</div>`;

    case "repeat": {
      const items = Array.isArray(scope?.[node.id])
        ? scope[node.id]
        : Array.isArray(resumeJson?.[node.id])
          ? resumeJson[node.id]
          : [];
      if (!node.children?.length) {
        return `<div ${dataAttr} class="box${highlightClass}">Repeat Block</div>`;
      }
      if (items.length === 0) {
        return "";
      }
      return items
        .map((item) =>
          renderChildren(
            node,
            template,
            resumeJson,
            highlightId,
            embedLinks,
            item && typeof item === "object" ? item : {}
          )
        )
        .join("");
    }

    default:
      return `<div class="box">${node.type}</div>`;
  }
}

function renderChildren(
  node,
  template,
  resumeJson,
  highlightId,
  embedLinks,
  scope
) {
  return (node.children || [])
    .map((child) =>
      renderNode(child, template, resumeJson, highlightId, embedLinks, scope)
    )
    .join("");
}

function resolveNodeValue(node, template, resumeJson, scope) {
  const fieldId = node?.bindField;
  if (!fieldId) return "";

  if (scope && scope[fieldId] != null && scope[fieldId] !== "") {
    return String(scope[fieldId]);
  }

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
