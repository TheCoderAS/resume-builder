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
import AppShell from "../components/AppShell.jsx";
import FieldManager from "../components/FieldManager.jsx";
import NodeInspector from "../components/NodeInspector.jsx";
import { TemplatePreview } from "../components/TemplatePreview.jsx";
import Snackbar from "../components/Snackbar.jsx";
import { useAuth } from "../contexts/AuthContext.jsx";
import { FiTrash2 } from "react-icons/fi";
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
const STATUS_OPTIONS = [
  { label: "Draft", value: "draft" },
  { label: "Active", value: "active" },
  { label: "Archived", value: "archived" },
];
const CATEGORY_OPTIONS = [
  { label: "Professional", value: "Professional" },
  { label: "Creative", value: "Creative" },
  { label: "Modern", value: "Modern" },
  { label: "Minimal", value: "Minimal" },
  { label: "Executive", value: "Executive" },
  { label: "Academic", value: "Academic" },
  { label: "Technical", value: "Technical" },
  { label: "Student", value: "Student" },
];
const PAGE_OPTIONS = [
  { label: "A4", value: "A4" },
  { label: "US Letter", value: "Letter" },
  { label: "US Legal", value: "Legal" },
];
const FONT_OPTIONS = [
  { label: "Inter", value: "Inter" },
  { label: "Poppins", value: "Poppins" },
  { label: "Merriweather", value: "Merriweather" },
  { label: "Georgia", value: "Georgia" },
  { label: "Arial", value: "Arial" },
  { label: "Times New Roman", value: "Times New Roman" },
];
const BASE_FONT_SIZE_OPTIONS = Array.from({ length: 13 }, (_, index) => {
  const size = 8 + index;
  return { label: String(size), value: size };
});
const FONT_SIZE_TOKENS = [
  { label: "Display", value: "display" },
  { label: "Heading", value: "heading" },
  { label: "Body", value: "body" },
  { label: "Meta", value: "meta" },
];
const COLOR_TOKENS = [
  { label: "Primary", value: "primary" },
  { label: "Secondary", value: "secondary" },
  { label: "Accent", value: "accent" },
  { label: "Meta", value: "meta" },
];
const BUILDER_SCHEMA_VERSION = "builder-v1";

const sanitizeForFirestore = (value) => {
  if (Array.isArray(value)) {
    return value
      .map((item) => sanitizeForFirestore(item))
      .filter((item) => item !== undefined);
  }
  if (value && typeof value === "object") {
    return Object.entries(value).reduce((acc, [key, val]) => {
      const cleaned = sanitizeForFirestore(val);
      if (cleaned !== undefined) {
        acc[key] = cleaned;
      }
      return acc;
    }, {});
  }
  return value === undefined ? undefined : value;
};

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
  const [toast, setToast] = useState(null);
  const [isLegacy, setIsLegacy] = useState(false);
  const [legacyJson, setLegacyJson] = useState("");
  const [expandedNodes, setExpandedNodes] = useState(new Set(["root"]));
  const [fieldCreateSignal, setFieldCreateSignal] = useState(0);
  const [isFieldManagerOpen, setIsFieldManagerOpen] = useState(false);
  const [isJsonOpen, setIsJsonOpen] = useState(false);
  const [isGlobalSettingsOpen, setIsGlobalSettingsOpen] = useState(false);
  const [isGlobalColorsOpen, setIsGlobalColorsOpen] = useState(false);
  const [isGlobalTypographyOpen, setIsGlobalTypographyOpen] = useState(false);
  const [isGlobalFontSizesOpen, setIsGlobalFontSizesOpen] = useState(false);
  const [isNodeInspectorOpen, setIsNodeInspectorOpen] = useState(false);
  const [pendingBindNodeId, setPendingBindNodeId] = useState(null);

  const templateId = location.state?.templateId;

  useEffect(() => {
    let isMounted = true;
    const baseTemplate = createEmptyTemplate();

    const hydrateTemplate = (layout) => ({
      ...baseTemplate,
      ...layout,
      page: { ...baseTemplate.page, ...(layout?.page ?? {}) },
      theme: { ...baseTemplate.theme, ...(layout?.theme ?? {}) },
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
      setExpandedNodes(new Set(["root"]));
      setIsFieldManagerOpen(false);
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
          setIsFieldManagerOpen(false);
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
          setIsFieldManagerOpen(false);
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
    () => buildResumeJson(template, {}),
    [template]
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
      const payload = sanitizeForFirestore({
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
      });

      if (templateId) {
        await updateDoc(doc(db, "templates", templateId), payload);
        setToast({ message: "Template saved.", variant: "success" });
      } else {
        const docRef = await addDoc(collection(db, "templates"), {
          ...payload,
          createdAt: serverTimestamp(),
        });
        setToast({ message: "Template created.", variant: "success" });
        navigate("/app/template-builder", {
          replace: true,
          state: { templateId: docRef.id },
        });
      }
    } catch (error) {
      console.error(error)
      setSaveError("Unable to save this template.");
      setToast({ message: "Unable to save this template.", variant: "error" });
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

  const handleRequestNewField = () => {
    setFieldCreateSignal((prev) => prev + 1);
    setPendingBindNodeId(selectedNodeId);
    if (!isFieldManagerOpen) {
      setIsFieldManagerOpen(true);
    }
  };

  const handleFieldCreated = (fieldId) => {
    if (!pendingBindNodeId) return;
    setTemplate((prev) => ({
      ...prev,
      layout: {
        ...prev.layout,
        root: updateNode(prev.layout.root, pendingBindNodeId, (node) => ({
          ...node,
          bindField: fieldId,
        })),
      },
    }));
    setPendingBindNodeId(null);
  };

  const handleFieldCreateCancelled = () => {
    setPendingBindNodeId(null);
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

  const parseNumberInput = (value) => {
    if (value === "") return undefined;
    const next = Number(value);
    return Number.isFinite(next) ? next : undefined;
  };

  return (
    <>
    <AppShell>
      <div className="flex flex-col gap-4">
        <div className="rounded-2xl border border-slate-800/80 bg-slate-950/90 px-4 py-4 sm:px-6">
          <div className="flex flex-wrap items-end gap-4">
            <label className="flex w-full flex-col gap-2 text-xs font-semibold tracking-wide text-slate-400 sm:w-auto">
              Name
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                disabled={isLegacy}
                className="h-10 w-full rounded-lg border border-slate-800 bg-slate-900/70 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 sm:w-52"
              />
            </label>
            <label className="flex w-full flex-col gap-2 text-xs font-semibold tracking-wide text-slate-400 sm:w-auto">
              Category
              <select
                value={category}
                onChange={(event) => setCategory(event.target.value)}
                disabled={isLegacy}
                className="h-10 w-full rounded-lg border border-slate-800 bg-slate-900/70 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 sm:w-44"
              >
                {CATEGORY_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex w-full flex-col gap-2 text-xs font-semibold tracking-wide text-slate-400 sm:w-auto">
              Status
              <select
                value={status}
                onChange={(event) => setStatus(event.target.value)}
                disabled={isLegacy}
                className="h-10 w-full rounded-lg border border-slate-800 bg-slate-900/70 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 sm:w-32"
              >
                {STATUS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || isLegacy}
              className="h-10 w-full rounded-full bg-indigo-500 px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-400 disabled:cursor-not-allowed disabled:bg-slate-700 sm:w-auto"
            >
              {saving
                ? "Saving..."
                : templateId
                  ? "Save changes"
                  : "Create template"}
            </button>
            {saveError ? (
              <span className="text-xs font-semibold text-rose-400">
                {saveError}
              </span>
            ) : null}
          </div>
        </div>

        <div className="flex flex-1 flex-col gap-4 lg:flex-row lg:gap-0">
          <aside className="w-full shrink-0 rounded-2xl border border-slate-800 bg-slate-900/60 p-4 lg:w-72 lg:border-r lg:rounded-r-none">
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
                  className="rounded-full border border-slate-700 px-3 py-1 text-xs font-semibold tracking-wide text-slate-200 transition hover:border-indigo-400 hover:text-white disabled:cursor-not-allowed disabled:border-slate-700 disabled:text-slate-500"
                >
                  {type}
                </button>
              ))}
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold text-slate-200">Tree</h4>
              <div className="flex items-center gap-2 text-[11px] font-semibold tracking-wide text-slate-400">
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

          <main className="min-h-[520px] flex-1 bg-slate-100 p-2 lg:mx-4">
              <TemplatePreview
                template={template}
                resumeJson={resumeJson}
                className="border border-slate-200 bg-white shadow-md"
              />
          </main>

          <aside className="w-full shrink-0 rounded-2xl border border-slate-800 bg-slate-900/60 p-4 lg:w-80 lg:border-l lg:rounded-l-none">
          <div className="flex h-full flex-col gap-4 overflow-auto pr-1">
            <div className="rounded-xl border border-slate-800/80 bg-slate-950/70">
              <button
                type="button"
                onClick={() => setIsNodeInspectorOpen((prev) => !prev)}
                className="flex w-full items-center justify-between px-4 py-3 text-left"
                aria-expanded={isNodeInspectorOpen}
              >
                <h4 className="text-sm font-semibold text-slate-200">
                  Node Inspector
                </h4>
                <span
                  className={`text-sm text-slate-400 transition-transform duration-200 ${
                    isNodeInspectorOpen ? "rotate-180" : ""
                  }`}
                  aria-hidden="true"
                >
                  ▾
                </span>
              </button>
              <div
                className={`overflow-hidden border-t border-slate-800/80 transition-[max-height,opacity] duration-300 ease-in-out ${
                  isNodeInspectorOpen
                    ? "max-h-[900px] opacity-100"
                    : "max-h-0 opacity-0"
                }`}
              >
                <div
                  className={`p-4 ${
                    isNodeInspectorOpen ? "" : "pointer-events-none"
                  }`}
                >
                  <NodeInspector
                    node={selectedNode}
                    template={template}
                    onUpdateNode={updateSelectedNode}
                    onRequestNewField={handleRequestNewField}
                  />
                </div>
              </div>
            </div>
            <div className="rounded-xl border border-slate-800/80 bg-slate-950/70">
              <button
                type="button"
                onClick={() => setIsFieldManagerOpen((prev) => !prev)}
                className="flex w-full items-center justify-between px-4 py-3 text-left"
                aria-expanded={isFieldManagerOpen}
              >
                <div>
                  <h4 className="text-sm font-semibold text-slate-200">
                    Field Manager
                  </h4>
                
                </div>
                <span
                  className={`text-sm text-slate-400 transition-transform duration-200 ${
                    isFieldManagerOpen ? "rotate-180" : ""
                  }`}
                  aria-hidden="true"
                >
                  ▾
                </span>
              </button>
              <div
                className={`overflow-hidden border-t border-slate-800/80 transition-[max-height,opacity] duration-300 ease-in-out ${
                  isFieldManagerOpen
                    ? "max-h-[900px] opacity-100"
                    : "max-h-0 opacity-0"
                }`}
              >
                <div
                  className={`p-4 ${
                    isFieldManagerOpen ? "" : "pointer-events-none"
                  }`}
                >
                  <FieldManager
                    template={template}
                    onUpdateTemplate={setTemplate}
                    createSignal={fieldCreateSignal}
                    onFieldCreated={handleFieldCreated}
                    onCreateCancelled={handleFieldCreateCancelled}
                  />
                </div>
              </div>
            </div>
            <div className="rounded-xl border border-slate-800/80 bg-slate-950/70">
              <button
                type="button"
                onClick={() => setIsGlobalSettingsOpen((prev) => !prev)}
                className="flex w-full items-center justify-between px-4 py-3 text-left"
                aria-expanded={isGlobalSettingsOpen}
              >
                <h4 className="text-sm font-semibold text-slate-200">
                  Global Settings
                </h4>
                <span
                  className={`text-sm text-slate-400 transition-transform duration-200 ${
                    isGlobalSettingsOpen ? "rotate-180" : ""
                  }`}
                  aria-hidden="true"
                >
                  ▾
                </span>
              </button>
              <div
                className={`overflow-hidden border-t border-slate-800/80 transition-[max-height,opacity] duration-300 ease-in-out ${
                  isGlobalSettingsOpen
                    ? "max-h-[900px] opacity-100"
                    : "max-h-0 opacity-0"
                }`}
              >
                <div
                  className={`p-4 ${
                    isGlobalSettingsOpen ? "" : "pointer-events-none"
                  }`}
                >
                  <div className="rounded-xl border border-slate-800/80 bg-slate-950/70">
                    <button
                      type="button"
                      onClick={() => setIsGlobalTypographyOpen((prev) => !prev)}
                      className="flex w-full items-center justify-between px-3 py-2 text-left"
                      aria-expanded={isGlobalTypographyOpen}
                    >
                      <h5 className="text-xs font-semibold tracking-wide text-slate-300">
                        Layout & Type
                      </h5>
                      <span
                        className={`text-sm text-slate-400 transition-transform duration-200 ${
                          isGlobalTypographyOpen ? "rotate-180" : ""
                        }`}
                        aria-hidden="true"
                      >
                        ▾
                      </span>
                    </button>
                    <div
                      className={`overflow-hidden border-t border-slate-800/80 transition-[max-height,opacity] duration-300 ease-in-out ${
                        isGlobalTypographyOpen
                          ? "max-h-[900px] opacity-100"
                          : "max-h-0 opacity-0"
                      }`}
                    >
                      <div
                        className={`p-3 ${
                          isGlobalTypographyOpen ? "" : "pointer-events-none"
                        }`}
                      >
                        <div className="grid gap-3">
                          <label className="flex items-center justify-between gap-3 text-xs font-semibold tracking-wide text-slate-400">
                            Page Size
                            <select
                              value={template.page?.size ?? "A4"}
                              onChange={(event) =>
                                setTemplate((prev) => ({
                                  ...prev,
                                  page: { ...prev.page, size: event.target.value },
                                }))
                              }
                              disabled={isLegacy}
                              className="h-9 rounded-lg border border-slate-800 bg-slate-900/70 px-3 py-1 text-xs text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                            >
                              {PAGE_OPTIONS.map((option) => (
                                <option key={option.value} value={option.value}>
                                  {option.label}
                                </option>
                              ))}
                            </select>
                          </label>
                          <div className="grid gap-3 rounded-lg border border-slate-800/80 bg-slate-950/60 p-3">
                            <h6 className="text-[11px] font-semibold tracking-wide text-slate-400">
                              Page Margin
                            </h6>
                            <label className="flex items-center justify-between gap-3 text-xs font-semibold tracking-wide text-slate-400">
                              Horizontal
                              <input
                                type="text"
                                inputMode="numeric"
                                value={
                                  template.page?.marginX === undefined
                                    ? ""
                                    : String(template.page.marginX)
                                }
                                onChange={(event) =>
                                  setTemplate((prev) => ({
                                    ...prev,
                                    page: {
                                      ...prev.page,
                                      marginX: parseNumberInput(event.target.value),
                                    },
                                  }))
                                }
                                disabled={isLegacy}
                                className="h-8 w-20 rounded-lg border border-slate-800 bg-slate-900/70 px-2 py-1 text-xs text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                              />
                            </label>
                            <label className="flex items-center justify-between gap-3 text-xs font-semibold tracking-wide text-slate-400">
                              Vertical
                              <input
                                type="text"
                                inputMode="numeric"
                                value={
                                  template.page?.marginY === undefined
                                    ? ""
                                    : String(template.page.marginY)
                                }
                                onChange={(event) =>
                                  setTemplate((prev) => ({
                                    ...prev,
                                    page: {
                                      ...prev.page,
                                      marginY: parseNumberInput(event.target.value),
                                    },
                                  }))
                                }
                                disabled={isLegacy}
                                className="h-8 w-20 rounded-lg border border-slate-800 bg-slate-900/70 px-2 py-1 text-xs text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                              />
                            </label>
                          </div>
                          <div className="grid gap-3 rounded-lg border border-slate-800/80 bg-slate-950/60 p-3">
                            <h6 className="text-[11px] font-semibold tracking-wide text-slate-400">
                              Page Padding
                            </h6>
                            <label className="flex items-center justify-between gap-3 text-xs font-semibold tracking-wide text-slate-400">
                              Horizontal
                              <input
                                type="text"
                                inputMode="numeric"
                                value={
                                  template.page?.paddingX === undefined
                                    ? ""
                                    : String(template.page.paddingX)
                                }
                                onChange={(event) =>
                                  setTemplate((prev) => ({
                                    ...prev,
                                    page: {
                                      ...prev.page,
                                      paddingX: parseNumberInput(event.target.value),
                                    },
                                  }))
                                }
                                disabled={isLegacy}
                                className="h-8 w-20 rounded-lg border border-slate-800 bg-slate-900/70 px-2 py-1 text-xs text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                              />
                            </label>
                            <label className="flex items-center justify-between gap-3 text-xs font-semibold tracking-wide text-slate-400">
                              Vertical
                              <input
                                type="text"
                                inputMode="numeric"
                                value={
                                  template.page?.paddingY === undefined
                                    ? ""
                                    : String(template.page.paddingY)
                                }
                                onChange={(event) =>
                                  setTemplate((prev) => ({
                                    ...prev,
                                    page: {
                                      ...prev.page,
                                      paddingY: parseNumberInput(event.target.value),
                                    },
                                  }))
                                }
                                disabled={isLegacy}
                                className="h-8 w-20 rounded-lg border border-slate-800 bg-slate-900/70 px-2 py-1 text-xs text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                              />
                            </label>
                          </div>
                          <div className="grid gap-3 rounded-lg border border-slate-800/80 bg-slate-950/60 p-3">
                            <h6 className="text-[11px] font-semibold tracking-wide text-slate-400">
                              Page Border
                            </h6>
                            <label className="flex items-center justify-between gap-3 text-xs font-semibold tracking-wide text-slate-400">
                              Enabled
                              <input
                                type="checkbox"
                                checked={template.page?.border?.enabled ?? false}
                                onChange={(event) =>
                                  setTemplate((prev) => ({
                                    ...prev,
                                    page: {
                                      ...prev.page,
                                      border: {
                                        ...(prev.page?.border ?? {}),
                                        enabled: event.target.checked,
                                      },
                                    },
                                  }))
                                }
                                disabled={isLegacy}
                                className="h-4 w-4 rounded border-slate-600 bg-slate-900 text-indigo-500 focus:ring-indigo-500/40"
                              />
                            </label>
                            <label className="flex items-center justify-between gap-3 text-xs font-semibold tracking-wide text-slate-400">
                              Width
                              <input
                                type="text"
                                inputMode="numeric"
                                value={
                                  template.page?.border?.width === undefined
                                    ? ""
                                    : String(template.page.border.width)
                                }
                                onChange={(event) =>
                                  setTemplate((prev) => ({
                                    ...prev,
                                    page: {
                                      ...prev.page,
                                      border: {
                                        ...(prev.page?.border ?? {}),
                                        width: parseNumberInput(event.target.value),
                                      },
                                    },
                                  }))
                                }
                                disabled={isLegacy || !template.page?.border?.enabled}
                                className="h-8 w-20 rounded-lg border border-slate-800 bg-slate-900/70 px-2 py-1 text-xs text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                              />
                            </label>
                            <label className="flex items-center justify-between gap-3 text-xs font-semibold tracking-wide text-slate-400">
                              Style
                              <select
                                value={template.page?.border?.style ?? "solid"}
                                onChange={(event) =>
                                  setTemplate((prev) => ({
                                    ...prev,
                                    page: {
                                      ...prev.page,
                                      border: {
                                        ...(prev.page?.border ?? {}),
                                        style: event.target.value,
                                      },
                                    },
                                  }))
                                }
                                disabled={isLegacy || !template.page?.border?.enabled}
                                className="h-8 rounded-lg border border-slate-800 bg-slate-900/70 px-2 py-1 text-xs text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                              >
                                <option value="solid">Solid</option>
                                <option value="dashed">Dashed</option>
                                <option value="dotted">Dotted</option>
                              </select>
                            </label>
                            <label className="flex items-center justify-between gap-3 text-xs font-semibold tracking-wide text-slate-400">
                              Color
                              <input
                                type="color"
                                value={template.page?.border?.color ?? "#e5e7eb"}
                                onChange={(event) =>
                                  setTemplate((prev) => ({
                                    ...prev,
                                    page: {
                                      ...prev.page,
                                      border: {
                                        ...(prev.page?.border ?? {}),
                                        color: event.target.value,
                                      },
                                    },
                                  }))
                                }
                                disabled={isLegacy || !template.page?.border?.enabled}
                                className="h-8 w-16 cursor-pointer rounded-lg border border-slate-800 bg-slate-900/70 px-2 py-1"
                              />
                            </label>
                          </div>
                          <label className="flex items-center justify-between gap-3 text-xs font-semibold tracking-wide text-slate-400">
                            Font
                            <select
                              value={template.theme?.fonts?.body ?? "Arial"}
                              onChange={(event) =>
                                setTemplate((prev) => ({
                                  ...prev,
                                  theme: {
                                    ...prev.theme,
                                    fonts: {
                                      ...prev.theme.fonts,
                                      body: event.target.value,
                                      heading: event.target.value,
                                    },
                                  },
                                }))
                              }
                              disabled={isLegacy}
                              className="h-9 rounded-lg border border-slate-800 bg-slate-900/70 px-3 py-1 text-xs text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                            >
                              {FONT_OPTIONS.map((option) => (
                                <option key={option.value} value={option.value}>
                                  {option.label}
                                </option>
                              ))}
                            </select>
                          </label>
                          <label className="flex items-center justify-between gap-3 text-xs font-semibold tracking-wide text-slate-400">
                            Line Height
                            <input
                              type="range"
                              min="1"
                              max="2"
                              step="0.05"
                              value={template.theme?.lineHeight ?? 1.5}
                              onChange={(event) =>
                                setTemplate((prev) => ({
                                  ...prev,
                                  theme: {
                                    ...prev.theme,
                                    lineHeight: Number(event.target.value),
                                  },
                                }))
                              }
                              disabled={isLegacy}
                              className="h-2 w-32 accent-indigo-400"
                            />
                          </label>
                          <label className="flex items-center justify-between gap-3 text-xs font-semibold tracking-wide text-slate-400">
                            Layout Gap
                            <input
                              type="range"
                              min="0"
                              max="32"
                              step="1"
                              value={template.theme?.gap ?? 12}
                              onChange={(event) =>
                                setTemplate((prev) => ({
                                  ...prev,
                                  theme: {
                                    ...prev.theme,
                                    gap: Number(event.target.value),
                                  },
                                }))
                              }
                              disabled={isLegacy}
                              className="h-2 w-32 accent-indigo-400"
                            />
                          </label>
                          <label className="flex items-center justify-between gap-3 text-xs font-semibold tracking-wide text-slate-400">
                            Section Gap
                            <input
                              type="range"
                              min="0"
                              max="32"
                              step="1"
                              value={template.theme?.sectionGap ?? 12}
                              onChange={(event) =>
                                setTemplate((prev) => ({
                                  ...prev,
                                  theme: {
                                    ...prev.theme,
                                    sectionGap: Number(event.target.value),
                                  },
                                }))
                              }
                              disabled={isLegacy}
                              className="h-2 w-32 accent-indigo-400"
                            />
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 rounded-xl border border-slate-800/80 bg-slate-950/70">
                    <button
                      type="button"
                      onClick={() => setIsGlobalColorsOpen((prev) => !prev)}
                      className="flex w-full items-center justify-between px-3 py-2 text-left"
                      aria-expanded={isGlobalColorsOpen}
                    >
                      <h5 className="text-xs font-semibold tracking-wide text-slate-300">
                        Colors
                      </h5>
                      <span
                        className={`text-sm text-slate-400 transition-transform duration-200 ${
                          isGlobalColorsOpen ? "rotate-180" : ""
                        }`}
                        aria-hidden="true"
                      >
                        ▾
                      </span>
                    </button>
                    <div
                      className={`overflow-hidden border-t border-slate-800/80 transition-[max-height,opacity] duration-300 ease-in-out ${
                        isGlobalColorsOpen
                          ? "max-h-[900px] opacity-100"
                          : "max-h-0 opacity-0"
                      }`}
                    >
                      <div
                        className={`p-3 ${
                          isGlobalColorsOpen ? "" : "pointer-events-none"
                        }`}
                      >
                        <div className="grid gap-3">
                          {COLOR_TOKENS.map((token) => (
                            <label
                              key={token.value}
                              className="flex items-center justify-between gap-3 text-xs font-semibold tracking-wide text-slate-400"
                            >
                              {token.label}
                              <input
                                type="color"
                                value={
                                  template.theme?.colors?.[token.value] ??
                                  "#000000"
                                }
                                onChange={(event) =>
                                  setTemplate((prev) => ({
                                    ...prev,
                                    theme: {
                                      ...prev.theme,
                                      colors: {
                                        ...prev.theme.colors,
                                        [token.value]: event.target.value,
                                      },
                                    },
                                  }))
                                }
                                disabled={isLegacy}
                                className="h-9 w-16 cursor-pointer rounded-lg border border-slate-800 bg-slate-900/70 px-2 py-1"
                              />
                            </label>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 rounded-xl border border-slate-800/80 bg-slate-950/70">
                    <button
                      type="button"
                      onClick={() => setIsGlobalFontSizesOpen((prev) => !prev)}
                      className="flex w-full items-center justify-between px-3 py-2 text-left"
                      aria-expanded={isGlobalFontSizesOpen}
                    >
                      <h5 className="text-xs font-semibold tracking-wide text-slate-300">
                        Font Sizes
                      </h5>
                      <span
                        className={`text-sm text-slate-400 transition-transform duration-200 ${
                          isGlobalFontSizesOpen ? "rotate-180" : ""
                        }`}
                        aria-hidden="true"
                      >
                        ▾
                      </span>
                    </button>
                    <div
                      className={`overflow-hidden border-t border-slate-800/80 transition-[max-height,opacity] duration-300 ease-in-out ${
                        isGlobalFontSizesOpen
                          ? "max-h-[900px] opacity-100"
                          : "max-h-0 opacity-0"
                      }`}
                    >
                      <div
                        className={`p-3 ${
                          isGlobalFontSizesOpen ? "" : "pointer-events-none"
                        }`}
                      >
                        <div className="grid gap-3">
                          <label className="flex items-center justify-between gap-3 text-xs font-semibold tracking-wide text-slate-400">
                            Base
                            <select
                              value={template.theme?.baseFontSize ?? 14}
                              onChange={(event) =>
                                setTemplate((prev) => ({
                                  ...prev,
                                  theme: {
                                    ...prev.theme,
                                    baseFontSize: Number(event.target.value),
                                  },
                                }))
                              }
                              disabled={isLegacy}
                              className="h-9 rounded-lg border border-slate-800 bg-slate-900/70 px-3 py-1 text-xs text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                            >
                              {BASE_FONT_SIZE_OPTIONS.map((option) => (
                                <option key={option.value} value={option.value}>
                                  {option.label}
                                </option>
                              ))}
                            </select>
                          </label>
                          {FONT_SIZE_TOKENS.map((token) => (
                            <label
                              key={token.value}
                              className="flex items-center justify-between gap-3 text-xs font-semibold tracking-wide text-slate-400"
                            >
                              {token.label}
                              <input
                                type="number"
                                step="0.05"
                                min="0.6"
                                max="2"
                                value={
                                  template.theme?.fontScales?.[token.value] ?? 1
                                }
                                onChange={(event) =>
                                  setTemplate((prev) => ({
                                    ...prev,
                                    theme: {
                                      ...prev.theme,
                                      fontScales: {
                                        ...(prev.theme?.fontScales ?? {}),
                                        [token.value]: Number(event.target.value),
                                      },
                                    },
                                  }))
                                }
                                disabled={isLegacy}
                                className="h-9 w-20 rounded-lg border border-slate-800 bg-slate-900/70 px-2 py-1 text-xs text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                              />
                            </label>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex-1 rounded-xl border border-slate-800/80 bg-slate-950/70">
              <button
                type="button"
                onClick={() => setIsJsonOpen((prev) => !prev)}
                className="flex w-full items-center justify-between px-4 py-3 text-left"
                aria-expanded={isJsonOpen}
              >
                <h4 className="text-sm font-semibold text-slate-200">JSON</h4>
                <span
                  className={`text-sm text-slate-400 transition-transform duration-200 ${
                    isJsonOpen ? "rotate-180" : ""
                  }`}
                  aria-hidden="true"
                >
                  ▾
                </span>
              </button>
              <div
                className={`overflow-hidden border-t border-slate-800/80 transition-[max-height,opacity] duration-300 ease-in-out ${
                  isJsonOpen ? "max-h-[900px] opacity-100" : "max-h-0 opacity-0"
                }`}
              >
                <div className={`p-4 ${isJsonOpen ? "" : "pointer-events-none"}`}>
                  <textarea
                    value={json}
                    readOnly
                    className="ui-scrollbar h-60 w-full rounded-lg border border-slate-800 bg-slate-900/70 px-3 py-2 text-xs text-slate-200"
                  />
                </div>
              </div>
            </div>
          </div>
          </aside>
        </div>
      </div>
    </AppShell>
      <Snackbar
        message={toast?.message}
        variant={toast?.variant}
        onDismiss={() => setToast(null)}
      />
    </>
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
            <FiTrash2 className="h-4 w-4" />
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
