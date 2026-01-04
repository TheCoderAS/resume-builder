import { useEffect, useMemo, useRef, useState } from "react";
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
import PromptModal from "../components/PromptModal.jsx";
import { TemplatePreview } from "../components/TemplatePreview.jsx";
import Snackbar from "../components/Snackbar.jsx";
import BuilderHeader from "../components/template-builder/BuilderHeader.jsx";
import BuilderNodePanel from "../components/template-builder/BuilderNodePanel.jsx";
import { useAuth } from "../contexts/AuthContext.jsx";
import { db } from "../firebase.js";
import { createEmptyTemplate } from "../templateModel.js";
import { buildPreviewResumeJson } from "../utils/resumeData.js";
import {
  BASE_FONT_SIZE_OPTIONS,
  CATEGORY_OPTIONS,
  COLOR_TOKENS,
  FONT_OPTIONS,
  FONT_SIZE_TOKENS,
  NODE_TYPES,
  PAGE_OPTIONS,
  STATUS_OPTIONS,
} from "./templateBuilderOptions.js";

const BUILDER_SCHEMA_VERSION = "builder-v1";
const LEAF_NODE_TYPES = new Set(["text", "bullet-list", "chip-list"]);

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
  const [name, setName] = useState("Untitled template");
  const [category, setCategory] = useState("Professional");
  const [status, setStatus] = useState("draft");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [toast, setToast] = useState(null);
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
  const [deleteNodeId, setDeleteNodeId] = useState(null);
  const [autosaveStatus, setAutosaveStatus] = useState("idle");
  const initialAutosave = useRef(true);
  const lastAutosaveStatus = useRef("idle");

  const templateId = location.state?.templateId;

  useEffect(() => {
    let isMounted = true;
    const baseTemplate = createEmptyTemplate();
    initialAutosave.current = true;
    setAutosaveStatus("idle");

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
        setTimeout(() => {
          initialAutosave.current = false;
        }, 0);
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

        if (!isMounted) return;

        setName(data.name ?? "Untitled template");
        setCategory(data.category ?? "Professional");
        setStatus(data.status ?? "draft");

        setTemplate(hydrateTemplate(layout));
        setSelectedNodeId("root");
        setLoadError("");
        setExpandedNodes(new Set(["root"]));
        setIsFieldManagerOpen(false);
        setTimeout(() => {
          initialAutosave.current = false;
        }, 0);
      } catch (error) {
        if (isMounted) {
          setLoadError("Unable to load the template.");
          setTimeout(() => {
            initialAutosave.current = false;
          }, 0);
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

  const canAddChild = useMemo(() => {
    if (!selectedNode) return false;
    if (LEAF_NODE_TYPES.has(selectedNode.type)) return false;
    if (selectedNode.type === "repeat") {
      return (selectedNode.children || []).length < 1;
    }
    return true;
  }, [selectedNode]);

  const resumeJson = useMemo(
    () => buildPreviewResumeJson(template, {}),
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

  const findNodePath = (node, targetId, path = []) => {
    if (!node) return null;
    const nextPath = [...path, node.id];
    if (node.id === targetId) return nextPath;
    for (const child of node.children || []) {
      const found = findNodePath(child, targetId, nextPath);
      if (found) return found;
    }
    return null;
  };

  const handleSelectNode = (nodeId) => {
    setSelectedNodeId(nodeId);
    const path = findNodePath(template.layout.root, nodeId);
    if (!path) return;
    setExpandedNodes((prev) => {
      const next = new Set(prev);
      path.forEach((id) => next.add(id));
      return next;
    });
  };

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

  function addNode(type) {
    if (!canAddChild) return;
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

  const moveNodeWithinParent = (node, nodeId, direction) => {
    if (!node?.children) return node;
    const nodeIndex = node.children.findIndex((child) => child.id === nodeId);
    if (nodeIndex !== -1) {
      const nextIndex = direction === "up" ? nodeIndex - 1 : nodeIndex + 1;
      if (nextIndex < 0 || nextIndex >= node.children.length) {
        return node;
      }
      const nextChildren = [...node.children];
      const [moved] = nextChildren.splice(nodeIndex, 1);
      nextChildren.splice(nextIndex, 0, moved);
      return { ...node, children: nextChildren };
    }
    return {
      ...node,
      children: node.children.map((child) =>
        moveNodeWithinParent(child, nodeId, direction)
      ),
    };
  };

  const handleMoveNode = (nodeId, direction) => {
    setTemplate((prev) => ({
      ...prev,
      layout: {
        ...prev.layout,
        root: moveNodeWithinParent(prev.layout.root, nodeId, direction),
      },
    }));
  };

  const handleSave = async () => {
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
        setAutosaveStatus("saved");
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
        setAutosaveStatus("saved");
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

  const handleRequestDeleteNode = (nodeId) => {
    if (nodeId === "root") return;
    setDeleteNodeId(nodeId);
  };

  const handleCancelDeleteNode = () => {
    setDeleteNodeId(null);
  };

  const handleConfirmDeleteNode = () => {
    if (!deleteNodeId) return;
    handleDeleteNode(deleteNodeId);
    setDeleteNodeId(null);
  };

  const createNodeId = (type) =>
    `${type}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

  const cloneNodeWithNewIds = (node) => {
    const cloned = {
      ...node,
      id: createNodeId(node.type),
    };
    if (node.children) {
      cloned.children = node.children.map((child) => cloneNodeWithNewIds(child));
    }
    return cloned;
  };

  const handleDuplicateNode = (nodeId) => {
    if (nodeId === "root") return;
    let duplicatedNode = null;
    const duplicateInTree = (node) => {
      if (!node?.children) return node;
      const index = node.children.findIndex((child) => child.id === nodeId);
      if (index !== -1) {
        const clone = cloneNodeWithNewIds(node.children[index]);
        duplicatedNode = clone;
        const nextChildren = [...node.children];
        nextChildren.splice(index + 1, 0, clone);
        return { ...node, children: nextChildren };
      }
      return {
        ...node,
        children: node.children.map((child) => duplicateInTree(child)),
      };
    };

    const nextRoot = duplicateInTree(template.layout.root);
    if (!duplicatedNode) return;

    setTemplate((prev) => ({
      ...prev,
      layout: {
        ...prev.layout,
        root: nextRoot,
      },
    }));
    setSelectedNodeId(duplicatedNode.id);
    setExpandedNodes((prev) => {
      const next = new Set(prev);
      const path = findNodePath(nextRoot, duplicatedNode.id) || [];
      path.forEach((id) => next.add(id));
      const duplicatedIds = [];
      collectIds(duplicatedNode, duplicatedIds);
      duplicatedIds.forEach((id) => next.add(id));
      return next;
    });
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

  useEffect(() => {
    if (!user || !templateId || initialAutosave.current) return;
    setAutosaveStatus("saving");
    const timeout = setTimeout(async () => {
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
        await updateDoc(doc(db, "templates", templateId), payload);
        setAutosaveStatus("saved");
      } catch (error) {
        console.error(error);
        setAutosaveStatus("error");
      }
    }, 900);

    return () => clearTimeout(timeout);
  }, [template, name, category, status, templateId, user]);

  const autosaveLabel = useMemo(() => {
    if (autosaveStatus === "saving") return "Saving...";
    if (autosaveStatus === "saved") return "All changes saved";
    if (autosaveStatus === "error") return "Autosave failed";
    return "Draft ready";
  }, [autosaveStatus]);

  useEffect(() => {
    if (autosaveStatus === lastAutosaveStatus.current) return;
    if (autosaveStatus === "error") {
      setToast({ message: "Autosave failed. Try again soon.", variant: "error" });
    }
    lastAutosaveStatus.current = autosaveStatus;
  }, [autosaveStatus]);

  const json = JSON.stringify(template, null, 2);

  const parseNumberInput = (value) => {
    if (value === "") return undefined;
    const next = Number(value);
    return Number.isFinite(next) ? next : undefined;
  };

  return (
    <>
    <AppShell>
      <div className="flex flex-col gap-4">
        <BuilderHeader
          name={name}
          onNameChange={setName}
          category={category}
          onCategoryChange={setCategory}
          status={status}
          onStatusChange={setStatus}
          categoryOptions={CATEGORY_OPTIONS}
          statusOptions={STATUS_OPTIONS}
          saveError={saveError}
          autosaveLabel={autosaveLabel}
        />

        <div className="flex flex-1 flex-col gap-4 lg:flex-row lg:gap-0">
          <BuilderNodePanel
            nodeTypes={NODE_TYPES}
            loadError={loadError}
            onAddNode={addNode}
            onExpandAll={handleExpandAll}
            onCollapseAll={handleCollapseAll}
            treeRoot={template.layout.root}
            selectedNodeId={selectedNodeId}
            onSelectNode={handleSelectNode}
            onDeleteNode={handleRequestDeleteNode}
            expandedNodes={expandedNodes}
            onToggleNode={handleToggleNode}
            selectedNode={selectedNode}
            canAddChild={canAddChild}
            onMoveNode={handleMoveNode}
            onDuplicateNode={handleDuplicateNode}
          />

          <main className="min-h-[520px] flex-1 bg-slate-100 p-2 lg:mx-4 md:max-h-[65vh] md:overflow-auto lg:max-h-[65vh] lg:overflow-auto">
              <TemplatePreview
                template={template}
                resumeJson={resumeJson}
                selectedNodeId={selectedNodeId}
                onSelectNode={handleSelectNode}
                className="border border-slate-200 bg-white shadow-md"
              />
          </main>

          <aside className="w-full shrink-0 rounded-2xl border border-slate-800 bg-slate-900/60 p-4 lg:w-80 lg:border-l lg:rounded-l-none">
          <div className="flex h-full flex-col gap-4 overflow-auto pr-1 md:max-h-[61.5vh] lg:max-h-[61.5vh]">
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
                  className={`max-h-[520px] overflow-auto p-4 ${
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
                          ? "max-h-[700px] opacity-100"
                          : "max-h-0 opacity-0"
                      }`}
                    >
                      <div
                        className={`max-h-[360px] overflow-auto p-3 ${
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
                                disabled={!template.page?.border?.enabled}
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
                                disabled={!template.page?.border?.enabled}
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
                                disabled={!template.page?.border?.enabled}
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
                              
                              className="h-2 w-32 accent-indigo-400"
                            />
                          </label>
                          <div className="rounded-lg border border-slate-800/80 bg-slate-950/60 p-3">
                            <h6 className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                              Section Title
                            </h6>
                            <div className="mt-3 grid gap-3">
                              <label className="flex items-center justify-between gap-3 text-xs font-semibold tracking-wide text-slate-400">
                                Size
                                <select
                                  value={
                                    template.theme?.sectionTitleStyle
                                      ?.fontSizeToken ?? "heading"
                                  }
                                  onChange={(event) =>
                                    setTemplate((prev) => ({
                                      ...prev,
                                      theme: {
                                        ...prev.theme,
                                        sectionTitleStyle: {
                                          ...(prev.theme?.sectionTitleStyle ?? {}),
                                          fontSizeToken: event.target.value,
                                        },
                                      },
                                    }))
                                  }
                                  className="h-8 rounded-lg border border-slate-800 bg-slate-900/70 px-2 py-1 text-xs text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                                >
                                  {FONT_SIZE_TOKENS.map((option) => (
                                    <option key={option.value} value={option.value}>
                                      {option.label}
                                    </option>
                                  ))}
                                </select>
                              </label>
                              <label className="flex items-center justify-between gap-3 text-xs font-semibold tracking-wide text-slate-400">
                                Color
                                <select
                                  value={
                                    template.theme?.sectionTitleStyle?.colorToken ??
                                    "primary"
                                  }
                                  onChange={(event) =>
                                    setTemplate((prev) => ({
                                      ...prev,
                                      theme: {
                                        ...prev.theme,
                                        sectionTitleStyle: {
                                          ...(prev.theme?.sectionTitleStyle ?? {}),
                                          colorToken: event.target.value,
                                        },
                                      },
                                    }))
                                  }
                                  className="h-8 rounded-lg border border-slate-800 bg-slate-900/70 px-2 py-1 text-xs text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                                >
                                  {COLOR_TOKENS.map((option) => (
                                    <option key={option.value} value={option.value}>
                                      {option.label}
                                    </option>
                                  ))}
                                </select>
                              </label>
                              <label className="flex items-center justify-between gap-3 text-xs font-semibold tracking-wide text-slate-400">
                                Weight
                                <select
                                  value={
                                    template.theme?.sectionTitleStyle?.fontWeight ??
                                    "600"
                                  }
                                  onChange={(event) =>
                                    setTemplate((prev) => ({
                                      ...prev,
                                      theme: {
                                        ...prev.theme,
                                        sectionTitleStyle: {
                                          ...(prev.theme?.sectionTitleStyle ?? {}),
                                          fontWeight: event.target.value,
                                        },
                                      },
                                    }))
                                  }
                                  className="h-8 rounded-lg border border-slate-800 bg-slate-900/70 px-2 py-1 text-xs text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                                >
                                  <option value="400">Regular</option>
                                  <option value="600">Semi Bold</option>
                                  <option value="700">Bold</option>
                                </select>
                              </label>
                              <label className="flex items-center justify-between gap-3 text-xs font-semibold tracking-wide text-slate-400">
                                Style
                                <select
                                  value={
                                    template.theme?.sectionTitleStyle?.fontStyle ??
                                    "normal"
                                  }
                                  onChange={(event) =>
                                    setTemplate((prev) => ({
                                      ...prev,
                                      theme: {
                                        ...prev.theme,
                                        sectionTitleStyle: {
                                          ...(prev.theme?.sectionTitleStyle ?? {}),
                                          fontStyle: event.target.value,
                                        },
                                      },
                                    }))
                                  }
                                  className="h-8 rounded-lg border border-slate-800 bg-slate-900/70 px-2 py-1 text-xs text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                                >
                                  <option value="normal">Normal</option>
                                  <option value="italic">Italic</option>
                                </select>
                              </label>
                              <label className="flex items-center justify-between gap-3 text-xs font-semibold tracking-wide text-slate-400">
                                Transform
                                <select
                                  value={
                                    template.theme?.sectionTitleStyle
                                      ?.textTransform ?? "none"
                                  }
                                  onChange={(event) =>
                                    setTemplate((prev) => ({
                                      ...prev,
                                      theme: {
                                        ...prev.theme,
                                        sectionTitleStyle: {
                                          ...(prev.theme?.sectionTitleStyle ?? {}),
                                          textTransform: event.target.value,
                                        },
                                      },
                                    }))
                                  }
                                  className="h-8 rounded-lg border border-slate-800 bg-slate-900/70 px-2 py-1 text-xs text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                                >
                                  <option value="none">None</option>
                                  <option value="capitalize">Capitalize</option>
                                  <option value="uppercase">Uppercase</option>
                                </select>
                              </label>
                            </div>
                          </div>
                          <div className="rounded-lg border border-slate-800/80 bg-slate-950/60 p-3">
                            <h6 className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                              Section Divider
                            </h6>
                            <div className="mt-3 grid gap-3">
                              <label className="flex items-center justify-between gap-3 text-xs font-semibold tracking-wide text-slate-400">
                                Enabled
                                <input
                                  type="checkbox"
                                  checked={
                                    template.theme?.sectionDivider?.enabled !==
                                    false
                                  }
                                  onChange={(event) =>
                                    setTemplate((prev) => ({
                                      ...prev,
                                      theme: {
                                        ...prev.theme,
                                        sectionDivider: {
                                          ...(prev.theme?.sectionDivider ?? {}),
                                          enabled: event.target.checked,
                                        },
                                      },
                                    }))
                                  }
                                  className="h-4 w-4 rounded border-slate-600 bg-slate-900 text-indigo-500 focus:ring-indigo-500/40"
                                />
                              </label>
                              <label className="flex items-center justify-between gap-3 text-xs font-semibold tracking-wide text-slate-400">
                                Color
                                <input
                                  type="color"
                                  value={
                                    template.theme?.sectionDivider?.color ??
                                    template.theme?.sectionDividerColor ??
                                    "#e2e8f0"
                                  }
                                  onChange={(event) =>
                                    setTemplate((prev) => ({
                                      ...prev,
                                      theme: {
                                        ...prev.theme,
                                        sectionDividerColor: event.target.value,
                                        sectionDivider: {
                                          ...(prev.theme?.sectionDivider ?? {}),
                                          color: event.target.value,
                                        },
                                      },
                                    }))
                                  }
                                  className="h-8 w-16 cursor-pointer rounded-lg border border-slate-800 bg-slate-900/70 px-2 py-1"
                                />
                              </label>
                              <label className="flex items-center justify-between gap-3 text-xs font-semibold tracking-wide text-slate-400">
                                Width
                                <input
                                  type="number"
                                  min="1"
                                  max="8"
                                  step="1"
                                  value={template.theme?.sectionDivider?.width ?? ""}
                                  onChange={(event) =>
                                    setTemplate((prev) => ({
                                      ...prev,
                                      theme: {
                                        ...prev.theme,
                                        sectionDivider: {
                                          ...(prev.theme?.sectionDivider ?? {}),
                                          width: parseNumberInput(event.target.value),
                                        },
                                      },
                                    }))
                                  }
                                  className="h-8 w-16 rounded-lg border border-slate-800 bg-slate-900/70 px-2 py-1 text-xs text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                                />
                              </label>
                              <label className="flex items-center justify-between gap-3 text-xs font-semibold tracking-wide text-slate-400">
                                Style
                                <select
                                  value={
                                    template.theme?.sectionDivider?.style ?? "solid"
                                  }
                                  onChange={(event) =>
                                    setTemplate((prev) => ({
                                      ...prev,
                                      theme: {
                                        ...prev.theme,
                                        sectionDivider: {
                                          ...(prev.theme?.sectionDivider ?? {}),
                                          style: event.target.value,
                                        },
                                      },
                                    }))
                                  }
                                  className="h-8 rounded-lg border border-slate-800 bg-slate-900/70 px-2 py-1 text-xs text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                                >
                                  <option value="solid">Solid</option>
                                  <option value="dashed">Dashed</option>
                                  <option value="dotted">Dotted</option>
                                </select>
                              </label>
                            </div>
                          </div>
                          <div className="rounded-lg border border-slate-800/80 bg-slate-950/60 p-3">
                            <h6 className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                              Title Divider
                            </h6>
                            <div className="mt-3 grid gap-3">
                              <label className="flex items-center justify-between gap-3 text-xs font-semibold tracking-wide text-slate-400">
                                Enabled
                                <input
                                  type="checkbox"
                                  checked={
                                    template.theme?.sectionTitleDivider?.enabled ??
                                    false
                                  }
                                  onChange={(event) =>
                                    setTemplate((prev) => ({
                                      ...prev,
                                      theme: {
                                        ...prev.theme,
                                        sectionTitleDivider: {
                                          ...(prev.theme?.sectionTitleDivider ?? {}),
                                          enabled: event.target.checked,
                                        },
                                      },
                                    }))
                                  }
                                  className="h-4 w-4 rounded border-slate-600 bg-slate-900 text-indigo-500 focus:ring-indigo-500/40"
                                />
                              </label>
                              <label className="flex items-center justify-between gap-3 text-xs font-semibold tracking-wide text-slate-400">
                                Color
                                <input
                                  type="color"
                                  value={
                                    template.theme?.sectionTitleDivider?.color ??
                                    template.theme?.sectionDivider?.color ??
                                    template.theme?.sectionDividerColor ??
                                    "#e2e8f0"
                                  }
                                  onChange={(event) =>
                                    setTemplate((prev) => ({
                                      ...prev,
                                      theme: {
                                        ...prev.theme,
                                        sectionTitleDivider: {
                                          ...(prev.theme?.sectionTitleDivider ?? {}),
                                          color: event.target.value,
                                        },
                                      },
                                    }))
                                  }
                                  className="h-8 w-16 cursor-pointer rounded-lg border border-slate-800 bg-slate-900/70 px-2 py-1"
                                />
                              </label>
                              <label className="flex items-center justify-between gap-3 text-xs font-semibold tracking-wide text-slate-400">
                                Width
                                <input
                                  type="number"
                                  min="1"
                                  max="8"
                                  step="1"
                                  value={
                                    template.theme?.sectionTitleDivider?.width ?? ""
                                  }
                                  onChange={(event) =>
                                    setTemplate((prev) => ({
                                      ...prev,
                                      theme: {
                                        ...prev.theme,
                                        sectionTitleDivider: {
                                          ...(prev.theme?.sectionTitleDivider ?? {}),
                                          width: parseNumberInput(event.target.value),
                                        },
                                      },
                                    }))
                                  }
                                  className="h-8 w-16 rounded-lg border border-slate-800 bg-slate-900/70 px-2 py-1 text-xs text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                                />
                              </label>
                              <label className="flex items-center justify-between gap-3 text-xs font-semibold tracking-wide text-slate-400">
                                Style
                                <select
                                  value={
                                    template.theme?.sectionTitleDivider?.style ??
                                    "solid"
                                  }
                                  onChange={(event) =>
                                    setTemplate((prev) => ({
                                      ...prev,
                                      theme: {
                                        ...prev.theme,
                                        sectionTitleDivider: {
                                          ...(prev.theme?.sectionTitleDivider ?? {}),
                                          style: event.target.value,
                                        },
                                      },
                                    }))
                                  }
                                  className="h-8 rounded-lg border border-slate-800 bg-slate-900/70 px-2 py-1 text-xs text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                                >
                                  <option value="solid">Solid</option>
                                  <option value="dashed">Dashed</option>
                                  <option value="dotted">Dotted</option>
                                </select>
                              </label>
                              <label className="flex items-center justify-between gap-3 text-xs font-semibold tracking-wide text-slate-400">
                                Spacing
                                <input
                                  type="number"
                                  min="0"
                                  max="24"
                                  step="1"
                                  value={
                                    template.theme?.sectionTitleDivider?.spacing ??
                                    ""
                                  }
                                  onChange={(event) =>
                                    setTemplate((prev) => ({
                                      ...prev,
                                      theme: {
                                        ...prev.theme,
                                        sectionTitleDivider: {
                                          ...(prev.theme?.sectionTitleDivider ?? {}),
                                          spacing: parseNumberInput(event.target.value),
                                        },
                                      },
                                    }))
                                  }
                                  className="h-8 w-16 rounded-lg border border-slate-800 bg-slate-900/70 px-2 py-1 text-xs text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                                />
                              </label>
                            </div>
                          </div>
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
                          ? "max-h-[420px] opacity-100"
                          : "max-h-0 opacity-0"
                      }`}
                    >
                      <div
                        className={`max-h-[280px] overflow-auto p-3 ${
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
                          ? "max-h-[420px] opacity-100"
                          : "max-h-0 opacity-0"
                      }`}
                    >
                      <div
                        className={`max-h-[280px] overflow-auto p-3 ${
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
                                  template.theme?.fontScales?.[token.value] ?? ""
                                }
                                onChange={(event) =>
                                  setTemplate((prev) => ({
                                    ...prev,
                                    theme: {
                                      ...prev.theme,
                                      fontScales: {
                                        ...(prev.theme?.fontScales ?? {}),
                                        [token.value]: parseNumberInput(
                                          event.target.value
                                        ),
                                      },
                                    },
                                  }))
                                }
                                
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
            <div className="rounded-xl border border-slate-800/80 bg-slate-950/70">
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
                <div className={`${isJsonOpen ? "" : "pointer-events-none"}`}>
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
      <PromptModal
        open={Boolean(deleteNodeId)}
        title="Delete node?"
        description="This will remove the node and any nested children."
        confirmLabel="Delete node"
        cancelLabel="Cancel"
        onConfirm={handleConfirmDeleteNode}
        onCancel={handleCancelDeleteNode}
      />
      <Snackbar
        message={toast?.message}
        variant={toast?.variant}
        onDismiss={() => setToast(null)}
      />
    </>
  );
}
