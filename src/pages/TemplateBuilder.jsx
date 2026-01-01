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
  const [expandedNodes, setExpandedNodes] = useState(new Set(["root"]));
  const [fieldCreateSignal, setFieldCreateSignal] = useState(0);

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
      setExpandedNodes(new Set(["root"]));
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
          setExpandedNodes(new Set(["root"]));
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
          setExpandedNodes(new Set(["root"]));
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

  const allNodeIds = useMemo(() => {
    const ids = [];
    const walk = (node) => {
      if (!node) return;
      ids.push(node.id);
      node.children?.forEach(walk);
    };
    walk(template.layout.root);
    return ids;
  }, [template]);

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

  function removeNode(node, id) {
    if (!node) return null;
    if (node.id === id) return null;
    if (!node.children) return node;

    const nextChildren = node.children
      .map((child) => removeNode(child, id))
      .filter(Boolean);

    return { ...node, children: nextChildren };
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
    setExpandedNodes((prev) => {
      const next = new Set(prev);
      next.add(selectedNodeId);
      next.add(newNode.id);
      return next;
    });
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

  const handleDeleteNode = (nodeId) => {
    if (nodeId === "root") return;

    const findNode = (node, id) => {
      if (!node) return null;
      if (node.id === id) return node;
      for (const child of node.children || []) {
        const found = findNode(child, id);
        if (found) return found;
      }
      return null;
    };

    const collectIds = (node, ids) => {
      if (!node) return;
      ids.push(node.id);
      node.children?.forEach((child) => collectIds(child, ids));
    };

    const removedNode = findNode(template.layout.root, nodeId);
    const removedIds = [];
    collectIds(removedNode, removedIds);

    setTemplate((prev) => {
      const nextRoot = removeNode(prev.layout.root, nodeId) || prev.layout.root;
      return {
        ...prev,
        layout: {
          ...prev.layout,
          root: nextRoot,
        },
      };
    });

    if (removedIds.length) {
      setExpandedNodes((prev) => {
        const next = new Set(prev);
        removedIds.forEach((id) => next.delete(id));
        return next;
      });
    }

    setSelectedNodeId((current) => (current === nodeId ? "root" : current));
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

  const handleToggleNode = (nodeId) => {
    setExpandedNodes((prev) => {
      const next = new Set(prev);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }
      return next;
    });
  };

  const handleExpandAll = () => {
    setExpandedNodes(new Set(allNodeIds));
  };

  const handleCollapseAll = () => {
    setExpandedNodes(new Set());
  };

  const json = isLegacy
    ? legacyJson
    : JSON.stringify(template, null, 2);

  return (
    <div className="flex min-h-screen flex-col bg-slate-950 text-slate-100">
      <div className="border-b border-slate-800/80 bg-slate-950/90 px-6 py-4">
        <div className="flex flex-wrap items-end gap-4">
          <label className="flex flex-col gap-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
            Name
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              disabled={isLegacy}
              className="h-10 w-52 rounded-lg border border-slate-800 bg-slate-900/70 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
            />
          </label>
          <label className="flex flex-col gap-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
            Category
            <input
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              disabled={isLegacy}
              className="h-10 w-44 rounded-lg border border-slate-800 bg-slate-900/70 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
            />
          </label>
          <label className="flex flex-col gap-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
            Status
            <select
              value={status}
              onChange={(event) => setStatus(event.target.value)}
              disabled={isLegacy}
              className="h-10 w-32 rounded-lg border border-slate-800 bg-slate-900/70 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
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
            className="h-10 rounded-full bg-indigo-500 px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-400 disabled:cursor-not-allowed disabled:bg-slate-700"
          >
            {saving ? "Saving..." : templateId ? "Save changes" : "Create template"}
          </button>
          {saveError ? (
            <span className="text-xs font-semibold text-rose-400">
              {saveError}
            </span>
          ) : null}
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-4 px-4 py-4 md:flex-row md:gap-0 md:px-6">
        <aside className="w-full shrink-0 rounded-2xl border border-slate-800 bg-slate-900/60 p-4 md:w-72 md:border-r md:rounded-r-none">
          <div className="mb-4 border-b border-slate-800/70 pb-4">
            <h4 className="text-sm font-semibold text-slate-200">Add Node</h4>
            <p className="mt-1 text-xs text-slate-400">
              Build layouts with reusable blocks.
            </p>
            {loadError ? (
              <p className="mt-2 text-xs text-rose-400">{loadError}</p>
            ) : null}
            {loadNotice ? (
              <p className="mt-2 text-xs text-indigo-300">{loadNotice}</p>
            ) : null}
            <div className="mt-3 flex flex-wrap gap-2">
              {NODE_TYPES.map((type) => (
                <button
                  key={type}
                  onClick={() => addNode(type)}
                  type="button"
                  disabled={isLegacy}
                  className="rounded-full border border-slate-700 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-200 transition hover:border-indigo-400 hover:text-white disabled:cursor-not-allowed disabled:border-slate-700 disabled:text-slate-500"
                >
                  {type}
                </button>
              ))}
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold text-slate-200">Tree</h4>
              <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                <button
                  type="button"
                  onClick={handleExpandAll}
                  className="rounded-full border border-slate-700 px-2 py-0.5 transition hover:border-indigo-400 hover:text-slate-100"
                >
                  Expand all
                </button>
                <button
                  type="button"
                  onClick={handleCollapseAll}
                  className="rounded-full border border-slate-700 px-2 py-0.5 transition hover:border-indigo-400 hover:text-slate-100"
                >
                  Collapse all
                </button>
              </div>
            </div>
            <div className="mt-3 space-y-1">
              <Tree
                node={template.layout.root}
                selected={selectedNodeId}
                onSelect={setSelectedNodeId}
                onDelete={handleDeleteNode}
                isOpen={expandedNodes.has(template.layout.root.id)}
                onToggle={handleToggleNode}
                expandedNodes={expandedNodes}
              />
            </div>
            {selectedNode && (
              <div className="mt-3 text-xs text-slate-400">
                Selected:{" "}
                <span className="font-semibold text-slate-200">
                  {selectedNode.type}
                </span>{" "}
                <span className="text-slate-500">({selectedNode.id})</span>
              </div>
            )}
          </div>
        </aside>

        <main className="flex-1 rounded-2xl bg-slate-100 p-6 md:mx-4 md:rounded-3xl min-h-[520px]">
          <div className="h-full w-full rounded-2xl bg-white p-4 shadow-[0_16px_40px_rgba(15,23,42,0.2)]">
            {isLegacy ? (
              <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-6 py-4 text-sm text-slate-500">
                Legacy templates are view-only in the new builder.
              </div>
            ) : (
              <TemplatePreview
                template={template}
                resumeJson={resumeJson}
                className="h-full w-full rounded-xl border border-slate-200 bg-white shadow-md"
              />
            )}
          </div>
        </main>

        <aside className="w-full shrink-0 rounded-2xl border border-slate-800 bg-slate-900/60 p-4 md:w-80 md:border-l md:rounded-l-none">
          <div className="flex h-full flex-col gap-4 overflow-auto pr-1">
            <div className="flex items-center justify-between rounded-xl border border-slate-800/80 bg-slate-950/70 px-4 py-3">
              <div>
                <h4 className="text-sm font-semibold text-slate-200">Fields</h4>
                <p className="text-xs text-slate-400">
                  Create fields to bind to template nodes.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setFieldCreateSignal((prev) => prev + 1)}
                className="rounded-full border border-slate-700 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-200 transition hover:border-indigo-400 hover:text-white"
              >
                Add field
              </button>
            </div>
            <div className="rounded-xl border border-slate-800/80 bg-slate-950/70 p-4">
              <NodeInspector
                node={selectedNode}
                template={template}
                onUpdateNode={updateSelectedNode}
                onCreateField={handleCreateField}
              />
            </div>
            <div className="rounded-xl border border-slate-800/80 bg-slate-950/70 p-4">
              <FieldManager
                template={template}
                onUpdateTemplate={setTemplate}
                createSignal={fieldCreateSignal}
              />
            </div>
            <div className="rounded-xl border border-slate-800/80 bg-slate-950/70 p-4">
              <h4 className="text-sm font-semibold text-slate-200">
                Sample Data
              </h4>
              <div className="mt-3">
                <ResumeForm
                  template={template}
                  values={formValues}
                  onChange={setFormValues}
                />
              </div>
            </div>
            <div className="flex-1 rounded-xl border border-slate-800/80 bg-slate-950/70 p-4">
              <h4 className="text-sm font-semibold text-slate-200">JSON</h4>
              <textarea
                value={json}
                readOnly
                className="mt-3 h-60 w-full rounded-lg border border-slate-800 bg-slate-900/70 px-3 py-2 text-xs text-slate-200"
              />
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

function Tree({
  node,
  selected,
  onSelect,
  onDelete,
  depth = 0,
  isOpen,
  onToggle,
  expandedNodes,
}) {
  const isSelected = selected === node.id;
  const canDelete = node.id !== "root";
  const hasChildren = Boolean(node.children?.length);

  return (
    <div className="space-y-1">
      <div
        className={`group flex items-center justify-between rounded-lg px-2 py-1 text-xs transition ${
          isSelected
            ? "bg-indigo-500/20 text-indigo-100"
            : "text-slate-300 hover:bg-slate-800/70"
        }`}
        style={{ marginLeft: depth * 12 }}
        onClick={() => onSelect(node.id)}
      >
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              if (hasChildren) onToggle?.(node.id);
            }}
            className={`flex h-5 w-5 items-center justify-center rounded-md border border-transparent text-[10px] text-slate-400 transition hover:border-slate-600 hover:text-slate-200 ${
              hasChildren ? "" : "opacity-0"
            }`}
            disabled={!hasChildren}
            aria-label={isOpen ? "Collapse node" : "Expand node"}
          >
            {isOpen ? "▾" : "▸"}
          </button>
          <span className="font-semibold text-slate-100">{node.type}</span>
          <span className="text-[11px] text-slate-500">({node.id})</span>
        </div>
        {canDelete ? (
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onDelete?.(node.id);
            }}
            className={`rounded-md p-1 text-slate-400 transition hover:bg-slate-800/80 hover:text-rose-300 ${
              isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100"
            }`}
            aria-label={`Delete ${node.type}`}
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-4 w-4"
            >
              <path d="M3 6h18" />
              <path d="M8 6V4h8v2" />
              <path d="M19 6l-1 14H6L5 6" />
              <path d="M10 11v6" />
              <path d="M14 11v6" />
            </svg>
          </button>
        ) : null}
      </div>

      {isOpen
        ? node.children?.map((child) => (
            <Tree
              key={child.id}
              node={child}
              selected={selected}
              onSelect={onSelect}
              onDelete={onDelete}
              depth={depth + 1}
              isOpen={expandedNodes?.has(child.id)}
              onToggle={onToggle}
              expandedNodes={expandedNodes}
            />
          ))
        : null}
    </div>
  );
}
