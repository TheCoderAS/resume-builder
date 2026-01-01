import { useEffect, useMemo, useState } from "react";
import {
  addDoc,
  collection,
  doc,
  getDoc,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import { useLocation, useNavigate } from "react-router-dom";
import FieldManager from "../components/FieldManager.jsx";
import NodeInspector from "../components/NodeInspector.jsx";
import ResumeForm from "../components/ResumeForm.jsx";
import { TemplatePreview } from "../components/TemplatePreview.jsx";
import { useAuth } from "../contexts/AuthContext.jsx";
import { db } from "../firebase.js";
import { createEmptyTemplate } from "../templateModel.js";
import { buildResumeJson } from "../utils/resumeData.js";

const NODE_TYPES = [
  "row",
  "column",
  "section",
  "text",
  "bullet-list",
  "chip-list",
  "repeat",
];
const STATUS_OPTIONS = ["draft", "active", "archived"];
const BUILDER_SCHEMA_VERSION = "builder-v1";

export default function TemplateBuilder() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const location = useLocation();
  const [template, setTemplate] = useState(createEmptyTemplate());
  const [selectedNodeId, setSelectedNodeId] = useState("root");
  const [loadError, setLoadError] = useState("");
  const [loadNotice, setLoadNotice] = useState("");
  const [name, setName] = useState("Untitled template");
  const [category, setCategory] = useState("Professional");
  const [status, setStatus] = useState("draft");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [isLegacy, setIsLegacy] = useState(false);
  const [legacyJson, setLegacyJson] = useState("");
  const [formValues, setFormValues] = useState({});

  const templateId = location.state?.templateId;

  useEffect(() => {
    let isMounted = true;
    const baseTemplate = createEmptyTemplate();

    const hydrateTemplate = (layout) => ({
      ...baseTemplate,
      ...layout,
      page: { ...baseTemplate.page, ...(layout?.page ?? {}) },
      theme: { ...baseTemplate.theme, ...(layout?.theme ?? {}) },
      dataSources: { ...baseTemplate.dataSources, ...(layout?.dataSources ?? {}) },
      fields: { ...baseTemplate.fields, ...(layout?.fields ?? {}) },
      layout: layout?.layout?.root ? layout.layout : baseTemplate.layout,
    });

    const resetState = () => {
      setTemplate(baseTemplate);
      setSelectedNodeId("root");
      setLoadError("");
      setLoadNotice("");
      setIsLegacy(false);
      setLegacyJson("");
      setName("Untitled template");
      setCategory("Professional");
      setStatus("draft");
      setSaveError("");
      setFormValues({});
    };

    const loadTemplate = async () => {
      if (!templateId) {
        resetState();
        return;
      }

      try {
        const snapshot = await getDoc(doc(db, "templates", templateId));
        if (!snapshot.exists()) {
          if (isMounted) {
            setLoadError("Template not found.");
          }
          return;
        }
        const data = snapshot.data();
        const layout = data.layout;
        const isBuilderLayout =
          layout?.schemaVersion === BUILDER_SCHEMA_VERSION;

        if (!isMounted) return;

        setName(data.name ?? "Untitled template");
        setCategory(data.category ?? "Professional");
        setStatus(data.status ?? "draft");

        if (isBuilderLayout) {
          setTemplate(hydrateTemplate(layout));
          setSelectedNodeId("root");
          setLoadError("");
          setLoadNotice("");
          setIsLegacy(false);
          setLegacyJson("");
        } else {
          setTemplate(baseTemplate);
          setSelectedNodeId("root");
          setLoadError("");
          setLoadNotice(
            "Legacy template detected. This template is view-only in the new builder."
          );
          setIsLegacy(true);
          setLegacyJson(
            JSON.stringify(layout ?? data, null, 2)
          );
        }
      } catch (error) {
        if (isMounted) {
          setLoadError("Unable to load the template.");
        }
      }
    };

    loadTemplate();

    return () => {
      isMounted = false;
    };
  }, [templateId]);

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

  const resumeJson = useMemo(
    () => buildResumeJson(template, formValues),
    [template, formValues]
  );

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
    if (isLegacy) return;
    const newNode = {
      id: `${type}-${Date.now()}`,
      type,
      children:
        type === "text" || type === "bullet-list" || type === "chip-list"
          ? undefined
          : [],
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

  const handleSave = async () => {
    if (isLegacy) return;
    if (!user) {
      setSaveError("Sign in to save templates.");
      return;
    }
    setSaving(true);
    setSaveError("");
    try {
      const payload = {
        name: name.trim() || "Untitled template",
        category: category.trim() || "Professional",
        status,
        layout: {
          ...template,
          schemaVersion: BUILDER_SCHEMA_VERSION,
        },
        ownerId: user.uid,
        creatorName: user.displayName ?? user.email ?? "Resume Studio",
        type: "builder",
        updatedAt: serverTimestamp(),
      };

      if (templateId) {
        await updateDoc(doc(db, "templates", templateId), payload);
      } else {
        const docRef = await addDoc(collection(db, "templates"), {
          ...payload,
          createdAt: serverTimestamp(),
        });
        navigate("/app/template-builder", {
          replace: true,
          state: { templateId: docRef.id },
        });
      }
    } catch (error) {
      setSaveError("Unable to save this template.");
    } finally {
      setSaving(false);
    }
  };

  const updateSelectedNode = (updater) => {
    setTemplate((prev) => ({
      ...prev,
      layout: {
        ...prev.layout,
        root: updateNode(prev.layout.root, selectedNodeId, updater),
      },
    }));
  };

  const handleCreateField = (fieldId, fieldData) => {
    setTemplate((prev) => ({
      ...prev,
      fields: {
        ...(prev.fields || {}),
        [fieldId]: {
          label: fieldData.label || "",
          description: fieldData.description || "",
          placeholder: fieldData.placeholder || "",
          inputType: fieldData.inputType || "text",
          required: Boolean(fieldData.required),
          maxLength: fieldData.maxLength,
          source: fieldData.source || "",
          path: fieldData.path || "",
        },
      },
    }));
  };

  const json = isLegacy
    ? legacyJson
    : JSON.stringify(template, null, 2);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100vh",
      }}
    >
      <div
        style={{
          borderBottom: "1px solid #ccc",
          padding: 12,
          display: "flex",
          flexWrap: "wrap",
          gap: 12,
          alignItems: "center",
        }}
      >
        <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span style={{ fontSize: 12 }}>Name</span>
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            disabled={isLegacy}
            style={{ padding: 6, minWidth: 180 }}
          />
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span style={{ fontSize: 12 }}>Category</span>
          <input
            value={category}
            onChange={(event) => setCategory(event.target.value)}
            disabled={isLegacy}
            style={{ padding: 6, minWidth: 160 }}
          />
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span style={{ fontSize: 12 }}>Status</span>
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            disabled={isLegacy}
            style={{ padding: 6, minWidth: 120 }}
          >
            {STATUS_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving || isLegacy}
          style={{ padding: "8px 16px", marginTop: 16 }}
        >
          {saving ? "Saving..." : templateId ? "Save changes" : "Create template"}
        </button>
        {saveError ? (
          <span style={{ color: "#b91c1c", fontSize: 12 }}>{saveError}</span>
        ) : null}
      </div>

      <div style={{ display: "flex", flex: 1 }}>
        <div style={{ width: 250, borderRight: "1px solid #ccc", padding: 8 }}>
          <h4>Add Node</h4>
          {loadError ? (
            <p style={{ color: "#b91c1c", fontSize: 12 }}>{loadError}</p>
          ) : null}
          {loadNotice ? (
            <p style={{ color: "#1d4ed8", fontSize: 12 }}>{loadNotice}</p>
          ) : null}
          {NODE_TYPES.map((type) => (
            <button
              key={type}
              onClick={() => addNode(type)}
              style={{ margin: 4 }}
              type="button"
              disabled={isLegacy}
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
          {isLegacy ? (
            <div
              style={{
                border: "1px dashed #94a3b8",
                padding: 16,
                background: "#ffffff",
                color: "#475569",
              }}
            >
              Legacy templates are view-only in the new builder.
            </div>
          ) : (
            <TemplatePreview template={template} resumeJson={resumeJson} />
          )}
        </div>

        <div
          style={{
            width: 340,
            borderLeft: "1px solid #ccc",
            padding: 8,
            display: "flex",
            flexDirection: "column",
            gap: 16,
            overflow: "auto",
          }}
        >
          <NodeInspector
            node={selectedNode}
            template={template}
            onUpdateNode={updateSelectedNode}
            onCreateField={handleCreateField}
          />
          <FieldManager template={template} onUpdateTemplate={setTemplate} />
          <div>
            <h4 style={{ margin: "0 0 8px" }}>Sample Data</h4>
            <ResumeForm
              template={template}
              values={formValues}
              onChange={setFormValues}
            />
          </div>
          <div style={{ flex: 1, minHeight: 200 }}>
            <h4 style={{ margin: "0 0 8px" }}>JSON</h4>
            <textarea
              value={json}
              readOnly
              style={{ width: "100%", height: 240 }}
            />
          </div>
        </div>
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
