import { useMemo, useState } from "react";
import { TemplatePreview } from "../TemplatePreview.jsx";
import { createEmptyTemplate } from "../templateModel.js";

const NODE_TYPES = ["row", "column", "section", "text", "repeat"];

export default function TemplateBuilder() {
  const [template, setTemplate] = useState(createEmptyTemplate());
  const [selectedNodeId, setSelectedNodeId] = useState("root");

  const selectedNode = useMemo(() => {
    function find(node) {
      if (node.id === selectedNodeId) return node;
      if (!node.children) return null;
      for (const child of node.children) {
        const found = find(child);
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
        .map((child) => updateNode(child, id, updater))
        .filter(Boolean),
    };
  }

  function addNode(type) {
    const newNode = {
      id: `${type}-${Date.now()}`,
      type,
      children: type === "text" ? undefined : [],
    };

    setTemplate((prev) => ({
      ...prev,
      layout: {
        ...prev.layout,
        root: updateNode(prev.layout.root, selectedNodeId, (node) => ({
          ...node,
          children: [...(node.children || []), newNode],
        })),
      },
    }));
  }

  const json = JSON.stringify(template, null, 2);

  return (
    <div style={{ display: "flex", height: "100vh" }}>
      <div style={{ width: 250, borderRight: "1px solid #ccc", padding: 8 }}>
        <h4>Add Node</h4>
        {NODE_TYPES.map((type) => (
          <button
            key={type}
            onClick={() => addNode(type)}
            style={{ margin: 4 }}
            type="button"
          >
            {type}
          </button>
        ))}
        <h4>Tree</h4>
        <Tree
          node={template.layout.root}
          selected={selectedNodeId}
          onSelect={setSelectedNodeId}
        />
        {selectedNode && (
          <div style={{ marginTop: 12, fontSize: 12, color: "#475569" }}>
            Selected: {selectedNode.type} ({selectedNode.id})
          </div>
        )}
      </div>

      <div style={{ flex: 1, padding: 16, background: "#f6f6f6" }}>
        <TemplatePreview template={template} />
      </div>

      <div style={{ width: 300, borderLeft: "1px solid #ccc", padding: 8 }}>
        <h4>JSON</h4>
        <textarea
          value={json}
          readOnly
          style={{ width: "100%", height: "90%" }}
        />
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
          background: selected === node.id ? "#dbeafe" : "transparent",
        }}
        onClick={() => onSelect(node.id)}
      >
        {node.type} ({node.id})
      </div>

      {node.children?.map((child) => (
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
