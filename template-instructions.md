

✅ Final Architecture

✔️ Step 1 — Builder UI

User designs template → generates JSON

✔️ Step 2 — Live Preview

Take JSON → build HTML → inject into iframe

✔️ Step 3 — “Download PDF” (Later)

Open iframe HTML → browser print → “Save as PDF”

No external library required.


---

✅ Implementation Plan

You need three core modules:

Module	Responsibility

TemplateBuilder	UI to create JSON
TemplateToHTML	Convert JSON → HTML DOM string
PreviewFrame	Render HTML via iframe



---

✅ 1️⃣ Vite React Setup (JS)

npm create vite@latest resume-builder --template react
cd resume-builder
npm install
npm run dev


---

✅ 2️⃣ Template JSON State (JS Version)

Create /src/templateModel.js

export const createEmptyTemplate = () => ({
  templateId: "template-1",
  version: "1.0",
  page: {
    size: "A4",
    orientation: "portrait",
    backgroundColor: "#ffffff",
    margins: { top: 32, right: 32, bottom: 32, left: 32 }
  },
  theme: {
    fonts: {
      heading: "Arial Black",
      body: "Arial"
    },
    colors: {
      primary: "#000000",
      accent: "#2563EB",
      muted: "#666"
    }
  },
  dataSources: {
    basics: "$.basics",
    work: "$.work[]",
    skills: "$.skills[]"
  },
  layout: {
    root: {
      id: "root",
      type: "column",
      style: { spacing: 12 },
      children: []
    }
  }
});


---

✅ 3️⃣ Template Builder Page (JavaScript React)

Create /src/TemplateBuilder.jsx

This is the simplified JS version of the builder we discussed earlier.

import React, { useState, useMemo } from "react";
import { createEmptyTemplate } from "./templateModel";
import { TemplatePreview } from "./TemplatePreview";

export default function TemplateBuilder() {
  const [template, setTemplate] = useState(createEmptyTemplate());
  const [selectedNodeId, setSelectedNodeId] = useState("root");

  const selectedNode = useMemo(() => {
    function find(node) {
      if (node.id === selectedNodeId) return node;
      if (!node.children) return null;
      for (let c of node.children) {
        const found = find(c);
        if (found) return found;
      }
      return null;
    }
    return find(template.layout.root);
  }, [template, selectedNodeId]);

  function updateNode(node, id, updater) {
    if (node.id === id) return updater(node);
    if (!node.children) return node;
    return {
      ...node,
      children: node.children
        .map(c => updateNode(c, id, updater))
        .filter(Boolean)
    };
  }

  function addNode(type) {
    const newNode = {
      id: `${type}-${Date.now()}`,
      type,
      children: type === "text" ? undefined : []
    };

    setTemplate(prev => ({
      ...prev,
      layout: {
        ...prev.layout,
        root: updateNode(prev.layout.root, selectedNodeId, node => ({
          ...node,
          children: [...(node.children || []), newNode]
        }))
      }
    }));
  }

  const json = JSON.stringify(template, null, 2);

  return (
    <div style={{ display: "flex", height: "100vh" }}>

      {/* LEFT PANEL */}
      <div style={{ width: 250, borderRight: "1px solid #ccc", padding: 8 }}>
        <h4>Add Node</h4>
        {["row","column","section","text","repeat"].map(t => (
          <button key={t} onClick={() => addNode(t)} style={{ margin: 4 }}>
            {t}
          </button>
        ))}
        <h4>Tree</h4>
        <Tree node={template.layout.root} selected={selectedNodeId} onSelect={setSelectedNodeId}/>
      </div>

      {/* CENTER PREVIEW */}
      <div style={{ flex: 1, padding: 16, background:"#f6f6f6" }}>
        <TemplatePreview template={template}/>
      </div>

      {/* RIGHT PANEL */}
      <div style={{ width: 300, borderLeft: "1px solid #ccc", padding: 8 }}>
        <h4>JSON</h4>
        <textarea value={json} readOnly style={{width:"100%",height:"90%"}}/>
      </div>

    </div>
  );
}

function Tree({ node, selected, onSelect, depth = 0 }) {
  return (
    <div>
      <div
        style={{
          cursor: "pointer",
          padding: 4,
          marginLeft: depth * 10,
          background: selected === node.id ? "#dbeafe" : "transparent"
        }}
        onClick={() => onSelect(node.id)}
      >
        {node.type} ({node.id})
      </div>

      {node.children && node.children.map(child => (
        <Tree
          key={child.id}
          node={child}
          selected={selected}
          onSelect={onSelect}
          depth={depth + 1}
        />
      ))}
    </div>
  );
}


---

✅ 4️⃣ Live Preview (Iframe Renderer)

Create /src/TemplatePreview.jsx

This does not build PDF
It builds HTML → injects into iframe → browser renders → later user prints to PDF.

import React, { useEffect, useRef } from "react";

export function TemplatePreview({ template }) {
  const iframeRef = useRef(null);

  useEffect(() => {
    const doc = iframeRef.current.contentDocument;
    doc.open();
    doc.write(buildHTML(template));
    doc.close();
  }, [template]);

  return (
    <iframe
      ref={iframeRef}
      style={{
        width: "100%",
        height: "100%",
        border: "1px solid #ddd",
        background: "white"
      }}
    />
  );
}


---

✅ 5️⃣ Convert JSON Layout → HTML

We’ll recursively walk the layout tree.

Create /src/TemplateToHTML.js

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

function renderNode(node) {
  if (!node) return "";

  switch(node.type){
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

function renderChildren(node){
  return (node.children || [])
    .map(child => renderNode(child))
    .join("");
}


---

🎉 Result

Users drag-build layout

JSON is always current

Iframe renders preview

Later:

Add real binding

Add styling

Add export PDF (browser print)




---

🚀 Next Enhancements (When above is ready for production)

1️⃣ Add real resume data binding → show actual name, jobs
2️⃣ Add drag+drop ordering
3️⃣ Add style editor
4️⃣ Add export template feature
5️⃣ Add Download PDF button → iframe.contentWindow.print()


