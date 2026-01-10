import { useEffect, useMemo, useRef, useState } from "react";
import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  increment,
  query,
  serverTimestamp,
  updateDoc,
  setDoc,
  where,
} from "firebase/firestore";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import AppShell from "../components/AppShell.jsx";
import Button from "../components/Button.jsx";
import Input from "../components/Input.jsx";
import ResumeForm from "../components/ResumeForm.jsx";
import SectionHeader from "../components/SectionHeader.jsx";
import PromptModal from "../components/PromptModal.jsx";
import Snackbar from "../components/Snackbar.jsx";
import VisibilityToggle from "../components/VisibilityToggle.jsx";
import { useAuth } from "../contexts/AuthContext.jsx";
import { db } from "../firebase.js";
import { TemplatePreview } from "../components/TemplatePreview.jsx";
import { createEmptyTemplate } from "../templateModel.js";
import { buildResumeJson } from "../utils/resumeData.js";
import { buildHTML } from "../utils/TemplateToHTML.js";

const STEPS = ["Select template", "Fill fields", "Export & publish"];
const BUILDER_SCHEMA_VERSION = "builder-v1";

const hydrateTemplate = (layout) => {
  const baseTemplate = createEmptyTemplate();
  return {
    ...baseTemplate,
    ...layout,
    page: { ...baseTemplate.page, ...(layout?.page ?? {}) },
    theme: { ...baseTemplate.theme, ...(layout?.theme ?? {}) },
    fields: { ...baseTemplate.fields, ...(layout?.fields ?? {}) },
    layout: layout?.layout?.root ? layout.layout : baseTemplate.layout,
  };
};

const buildFieldGroups = (template) => {
  const sections = [];
  const ungrouped = new Set();

  const walk = (node, currentSection) => {
    if (!node) return;
    if (node.type === "section") {
      const section = {
        id: node.id,
        title: (node.title || "Section").trim() || "Section",
        showTitle: node.showTitle !== false,
        fieldIds: new Set(),
      };
      sections.push(section);
      node.children?.forEach((child) => walk(child, section));
      return;
    }

    if (node.bindField) {
      if (currentSection) {
        currentSection.fieldIds.add(node.bindField);
      } else {
        ungrouped.add(node.bindField);
      }
    }
    node.children?.forEach((child) => walk(child, currentSection));
  };

  walk(template?.layout?.root, null);

  const groups = sections
    .map((section) => ({
      id: section.id,
      title: section.title,
      showTitle: section.showTitle,
      fieldIds: Array.from(section.fieldIds),
    }))
    .filter((group) => group.fieldIds.length > 0);

  if (ungrouped.size > 0) {
    groups.push({
      id: "ungrouped",
      title: "Additional fields",
      showTitle: true,
      fieldIds: Array.from(ungrouped),
    });
  }

  return groups;
};

export default function ResumeEditor() {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { resumeId: resumeIdParam } = useParams();
  const [stepIndex, setStepIndex] = useState(0);
  const [resumeId, setResumeId] = useState(null);
  const [autosaveStatus, setAutosaveStatus] = useState("idle");
  const initialSave = useRef(true);
  const [templateId, setTemplateId] = useState(null);
  const [templateName, setTemplateName] = useState("");
  const [resumeTitle, setResumeTitle] = useState("Untitled resume");
  const [template, setTemplate] = useState(createEmptyTemplate());
  const [formValues, setFormValues] = useState({});
  const [fieldGroupStep, setFieldGroupStep] = useState(0);
  const [visibility, setVisibility] = useState({ isPublic: false });
  const [templates, setTemplates] = useState([]);
  const [templatesLoading, setTemplatesLoading] = useState(true);
  const [templateWarning, setTemplateWarning] = useState("");
  const [templateWarningId, setTemplateWarningId] = useState(null);
  const [toast, setToast] = useState(null);
  const [copyMessage, setCopyMessage] = useState("Copy link");
  const [downloadMessage, setDownloadMessage] = useState("");
  const [exporting, setExporting] = useState(false);
  const lastAutosaveStatus = useRef("idle");
  const lastUsageTemplateId = useRef(null);
  const [blockedTemplate, setBlockedTemplate] = useState(null);
  const creatingResumeRef = useRef(false);
  const createdNewResumeRef = useRef(false);
  const resumeJson = useMemo(
    () => buildResumeJson(template, formValues),
    [template, formValues]
  );
  const fieldGroups = useMemo(
    () => buildFieldGroups(template),
    [template]
  );

  useEffect(() => {
    if (!templateId || fieldGroups.length === 0) {
      setFieldGroupStep(0);
      return;
    }
    setFieldGroupStep((prev) =>
      Math.min(prev, Math.max(0, fieldGroups.length - 1))
    );
  }, [templateId, fieldGroups]);

  const currentStep = useMemo(() => STEPS[stepIndex], [stepIndex]);
  const isNewResume = resumeIdParam === "new";
  const isNewDraftStep = isNewResume && !resumeId && stepIndex === 0;

  useEffect(() => {
    const originalTitle = document.title;
    const nextTitle = resumeTitle ? `${resumeTitle} | Resumiate` : originalTitle;
    document.title = nextTitle;
    return () => {
      document.title = originalTitle;
    };
  }, [resumeTitle]);

  useEffect(() => {
    if (resumeIdParam === "new") {
      setResumeId(null);
      setFormValues({});
      setVisibility({ isPublic: false });
      setResumeTitle("Untitled resume");
      setTemplateId(null);
      setTemplateName("");
      setTemplate(createEmptyTemplate());
      setTemplateWarning("");
      setTemplateWarningId(null);
      setBlockedTemplate(null);
      lastUsageTemplateId.current = null;
      initialSave.current = true;
      createdNewResumeRef.current = false;
      creatingResumeRef.current = false;
      return;
    }
    if (resumeIdParam) {
      createdNewResumeRef.current = false;
      creatingResumeRef.current = false;
    }
  }, [resumeIdParam]);

  useEffect(() => {
    if (!user) return;
    let isMounted = true;

    const ensureResume = async () => {
      const activeId =
        resumeIdParam && resumeIdParam !== "new" ? resumeIdParam : null;

      try {
        if (!activeId) {
          return;
        }
        if (activeId) {
          try {
            const snapshot = await getDoc(doc(db, "resumes", activeId));
            if (snapshot.exists()) {
              const data = snapshot.data();
              if (isMounted) {
                setFormValues(data.values ?? data.formValues ?? {});
                setVisibility((prev) => ({ ...prev, ...(data.visibility ?? {}) }));
                setResumeTitle(data.resumeTitle ?? "Untitled resume");
                setTemplateId(data.templateId ?? null);
                setTemplateName(data.templateName ?? "");
                lastUsageTemplateId.current = data.templateId ?? null;
                setResumeId(activeId);
                initialSave.current = false;
              }
              return;
            }
          } catch (error) {
            if (error?.code !== "permission-denied") {
              throw error;
            }
            if (isMounted) {
              setToast({
                message: "You don't have access to that resume.",
                variant: "error",
              });
            }
          }
        }

      } catch (error) {
        console.error(error);
        if (isMounted) {
          setAutosaveStatus("error");
        }
      }
    };

    ensureResume();

    return () => {
      isMounted = false;
    };
  }, [user, resumeIdParam, navigate]);

  const createNewResume = async () => {
    if (!user) return null;
    if (createdNewResumeRef.current || creatingResumeRef.current) {
      return resumeId;
    }
    creatingResumeRef.current = true;
    createdNewResumeRef.current = true;
    const newResumePayload = {
      userId: user.uid,
      values: formValues,
      visibility,
      resumeTitle,
      templateId,
      templateName,
      templateSnapshot: template,
      templateSchemaVersion: template?.schemaVersion ?? BUILDER_SCHEMA_VERSION,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    try {
      const docRef = await addDoc(collection(db, "resumes"), newResumePayload);
      setResumeId(docRef.id);
      navigate(`/app/resume/${docRef.id}`, { replace: true });
      initialSave.current = false;
      return docRef.id;
    } catch (error) {
      console.error(error);
      creatingResumeRef.current = false;
      createdNewResumeRef.current = false;
      setAutosaveStatus("error");
      return null;
    }
  };

  useEffect(() => {
    if (!templateId) {
      setTemplateName("");
      setTemplate(createEmptyTemplate());
      setTemplateWarning("");
      setBlockedTemplate(null);
      return;
    }
    let isMounted = true;

    const loadTemplate = async () => {
      try {
        const snapshot = await getDoc(doc(db, "templates", templateId));
        if (!snapshot.exists()) {
          if (isMounted) {
            setTemplate(createEmptyTemplate());
            setBlockedTemplate(null);
          }
          return;
        }
        const data = snapshot.data();
        const status = data.status ?? "active";
        if (status !== "active") {
          if (isMounted) {
            setTemplateName(data.name ?? "Untitled template");
            setTemplate(createEmptyTemplate());
            setBlockedTemplate({
              id: templateId,
              name: data.name ?? "Untitled template",
              status,
              canActivate: data.ownerId === user?.uid,
            });
          }
          return;
        }
        const isPublicTemplate = data.isPublic === true;
        const isOwner = data.ownerId === user?.uid;
        if (isPublicTemplate && !isOwner) {
          setTemplateWarning(
            "This is a public template owned by another user. Copy it before using if you need to customize it."
          );
          setTemplateWarningId(snapshot.id);
        } else {
          setTemplateWarning("");
          setTemplateWarningId(null);
        }
        if (isMounted) {
          const layout = data.layout;
          const isBuilderLayout =
            layout?.schemaVersion === BUILDER_SCHEMA_VERSION;
          setTemplateName(data.name ?? "Untitled template");
          setTemplate(isBuilderLayout ? hydrateTemplate(layout) : createEmptyTemplate());
          setBlockedTemplate(null);
          if (!isBuilderLayout) {
            setToast({
              message: "This template isn't compatible with the builder format.",
              variant: "error",
            });
          }
        }
      } catch (error) {
        console.error(error);
        if (isMounted) {
          setTemplate(createEmptyTemplate());
          setToast({
            message: "Unable to load template details.",
            variant: "error",
          });
          setTemplateWarning("");
          setTemplateWarningId(null);
        }
      }
    };

    loadTemplate();

    return () => {
      isMounted = false;
    };
  }, [templateId, user]);

  useEffect(() => {
    let isMounted = true;
    const loadTemplates = async () => {
      setTemplatesLoading(true);
      try {
        const safeGetDocs = async (queryRef) => {
          try {
            return await getDocs(queryRef);
          } catch (queryError) {
            if (queryError?.code === "permission-denied") {
              return null;
            }
            throw queryError;
          }
        };
        const templatesRef = collection(db, "templates");
        const publicSharedQuery = query(
          templatesRef,
          where("isPublic", "==", true),
          where("status", "==", "active")
        );
        const [publicSnapshot, userSnapshot] = await Promise.all([
          safeGetDocs(publicSharedQuery),
          user
            ? safeGetDocs(
                query(
                  templatesRef,
                  where("ownerId", "==", user.uid),
                  where("status", "==", "active"),
                  where("layout.schemaVersion", "==", BUILDER_SCHEMA_VERSION)
                )
              )
            : Promise.resolve(null),
        ]);
        const sharedTemplates = publicSnapshot
          ? publicSnapshot.docs.map((docSnap) => ({
              id: docSnap.id,
              ...docSnap.data(),
            }))
          : [];
        const userTemplates = userSnapshot
          ? userSnapshot.docs.map((docSnap) => ({
              id: docSnap.id,
              ...docSnap.data(),
            }))
          : [];
        if (isMounted) {
          const combined = [...sharedTemplates, ...userTemplates];
          const templateMap = new Map(
            combined.map((template) => [template.id, template])
          );
          const filtered = Array.from(templateMap.values()).filter(
            (template) =>
              template.layout?.schemaVersion === BUILDER_SCHEMA_VERSION
          );
          setTemplates(filtered);
        }
      } catch (error) {
        console.error(error)
        if (isMounted) {
          setTemplates([]);
        }
      } finally {
        if (isMounted) {
          setTemplatesLoading(false);
        }
      }
    };

    loadTemplates();
    return () => {
      isMounted = false;
    };
  }, [user]);

  useEffect(() => {
    if (!user || !resumeId || initialSave.current) return;
    if (isNewDraftStep) return;
    setAutosaveStatus("saving");
    const timeout = setTimeout(async () => {
      try {
        await setDoc(
          doc(db, "resumes", resumeId),
          {
            userId: user.uid,
            values: formValues,
            visibility,
            resumeTitle,
            templateId,
            templateName,
            templateSnapshot: template,
            templateSchemaVersion: template?.schemaVersion ?? BUILDER_SCHEMA_VERSION,
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        );
        setAutosaveStatus("saved");
      } catch (error) {
        console.error(error);
        setAutosaveStatus("error");
      }
    }, 800);

    return () => clearTimeout(timeout);
  }, [
    formValues,
    resumeTitle,
    templateId,
    templateName,
    visibility,
    resumeId,
    user,
    template?.schemaVersion,
    template,
    isNewDraftStep,
  ]);

  useEffect(() => {
    if (!user || !resumeId) return;
    const prevTemplateId = lastUsageTemplateId.current;
    if (!templateId) {
      if (!prevTemplateId) return;
      lastUsageTemplateId.current = null;
      setDoc(
        doc(db, "templateUsage", prevTemplateId),
        {
          count: increment(-1),
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      ).catch(() => {});
      return;
    }
    if (prevTemplateId === templateId) return;
    lastUsageTemplateId.current = templateId;
    const updates = [];
    updates.push(
      setDoc(
        doc(db, "templateUsage", templateId),
        {
          count: increment(1),
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      )
    );
    if (prevTemplateId) {
      updates.push(
        setDoc(
          doc(db, "templateUsage", prevTemplateId),
          {
            count: increment(-1),
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        )
      );
    }
    Promise.all(updates).catch(() => {});
  }, [resumeId, templateId, user]);


  const handleNextStep = () => {
    if (stepIndex < STEPS.length - 1) {
      if (stepIndex === 0 && !templateId) {
        setToast({
          message: "Select a template to continue.",
          variant: "error",
        });
        return;
      }
      moveToStep(stepIndex + 1);
    } else {
      navigate("/app");
    }
  };

  const publicLink =
    resumeId && visibility.isPublic
      ? `${window.location.origin}/r/${resumeId}`
      : "";

  const handleCopyLink = async () => {
    if (!publicLink) return;
    try {
      await navigator.clipboard.writeText(publicLink);
      setCopyMessage("Copied!");
      setTimeout(() => setCopyMessage("Copy link"), 2000);
    } catch (error) {
      setCopyMessage("Copy failed");
      setTimeout(() => setCopyMessage("Copy link"), 2000);
    }
  };

  const isIOSDevice = () => {
    const ua = navigator.userAgent;
    return (
      /iP(ad|hone|od)/.test(ua) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
    );
  };

  const handleDownload = async () => {
    setDownloadMessage("Opening print dialog...");
    setExporting(true);
    const originalTitle = document.title;
    try {
      document.title = resumeTitle || originalTitle;
      const printHtml = buildHTML(template, resumeJson, {
        embedLinks: true,
        showPlaceholders: false,
      });

      if (isIOSDevice()) {
        const printWindow = window.open("", "_blank", "noopener,noreferrer");
        if (!printWindow) {
          throw new Error("Print window unavailable");
        }
        printWindow.document.open();
        printWindow.document.write(printHtml);
        printWindow.document.close();
        printWindow.document.title = document.title;
        setTimeout(() => {
          printWindow.focus();
          printWindow.print();
          setTimeout(() => {
            printWindow.close();
            document.title = originalTitle;
          }, 1000);
        }, 300);
      } else {
        const iframe = document.createElement("iframe");
        iframe.style.position = "fixed";
        iframe.style.right = "0";
        iframe.style.bottom = "0";
        iframe.style.width = "0";
        iframe.style.height = "0";
        iframe.style.border = "0";
        iframe.setAttribute("aria-hidden", "true");
        document.body.appendChild(iframe);

        const doc = iframe.contentWindow?.document;
        if (!doc) {
          throw new Error("Print frame unavailable");
        }
        doc.open();
        doc.write(printHtml);
        doc.close();

        setTimeout(() => {
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();
          setTimeout(() => {
            iframe.remove();
            document.title = originalTitle;
          }, 1000);
        }, 300);
      }
      setToast({
        message: "Print dialog opened. Save as PDF to download.",
        variant: "success",
      });
    } catch (error) {
      console.error(error);
      setDownloadMessage("Unable to open print dialog.");
      setToast({ message: "PDF export failed.", variant: "error" });
      document.title = originalTitle;
    } finally {
      setExporting(false);
    }
  };

  const autosaveLabel = useMemo(() => {
    if (isNewDraftStep) return "Autosave disabled";
    if (autosaveStatus === "saving") return "Saving...";
    if (autosaveStatus === "saved") return "All changes saved";
    if (autosaveStatus === "error") return "Autosave failed";
    return "Draft ready";
  }, [autosaveStatus, isNewDraftStep]);

  const canSelectStep = (index) => index === 0 || Boolean(templateId);

  const moveToStep = (targetIndex) => {
    if (targetIndex === stepIndex) return;
    if (targetIndex > stepIndex && stepIndex === 0 && isNewResume && !resumeId) {
      console.error("here")
      createNewResume().then((nextId) => {
        if (nextId) {
          setStepIndex(targetIndex);
        }
      }).catch(err=>console.error(err));
      return;
    }
    setStepIndex(targetIndex);
  };

  useEffect(() => {
    const nextStep = location.state?.stepIndex;
    if (typeof nextStep === "number" && nextStep >= 0) {
      moveToStep(Math.min(nextStep, STEPS.length - 1));
    }
  }, [location.state, moveToStep]);

  useEffect(() => {
    if (autosaveStatus === lastAutosaveStatus.current) return;
    if (autosaveStatus === "error") {
      setToast({ message: "Autosave failed. Try again soon.", variant: "error" });
    }
    lastAutosaveStatus.current = autosaveStatus;
  }, [autosaveStatus]);

  return (
    <AppShell>
      <div className="flex w-full flex-col gap-6">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="app-title">Resume Builder</h1>
            <p className="app-subtitle">
              {currentStep} · {autosaveLabel}
            </p>
          </div>
        </header>

        <div className="flex flex-wrap gap-3">
          {STEPS.map((step, index) => {
            const isDisabled = !canSelectStep(index);
            return (
            <button
              key={step}
              type="button"
              onClick={() => {
                if (isDisabled) {
                  setToast({
                    message: "Select a template before moving forward.",
                    variant: "error",
                  });
                  return;
                }
                moveToStep(index);
              }}
              disabled={isDisabled}
              className={`flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition ${
                index === stepIndex
                  ? "border-emerald-400/60 bg-emerald-400/10 text-emerald-200"
                  : isDisabled
                    ? "cursor-not-allowed border-slate-900 bg-slate-950/40 text-slate-500"
                    : "border-slate-800 bg-slate-950/70 text-slate-300 hover:border-slate-600"
              }`}
            >
              <span className="flex h-6 w-6 items-center justify-center rounded-full border border-current text-xs">
                {index + 1}
              </span>
              {step}
            </button>
            );
          })}
        </div>

        <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
          <div className="flex flex-col gap-6 lg:max-h-[calc(100vh-220px)] lg:overflow-y-auto lg:pr-2">
            {stepIndex === 0 ? (
              <section className="app-card">
                <SectionHeader
                  title="Select a template"
                  description="Templates define the sections, styling, and layout for your resume."
                />
                <div className="mt-6 grid gap-4 rounded-2xl border border-slate-800 bg-slate-950/70 px-5 py-4 text-sm text-slate-200">
                  {templateWarning ? (
                    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-xs text-amber-100">
                      <span>{templateWarning}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={async () => {
                          if (!templateWarningId || !user) return;
                          try {
                            const snapshot = await getDoc(
                              doc(db, "templates", templateWarningId)
                            );
                            if (!snapshot.exists()) {
                              setToast({
                                message: "Template no longer available.",
                                variant: "error",
                              });
                              return;
                            }
                            const data = snapshot.data();
                            const payload = {
                              ...data,
                              name: `Copy - ${data.name ?? "Untitled template"}`,
                              status: "active",
                              isPublic: false,
                              ownerId: user.uid,
                              type: "builder",
                              updatedAt: serverTimestamp(),
                              createdAt: serverTimestamp(),
                            };
                            delete payload.id;
                            const docRef = await addDoc(
                              collection(db, "templates"),
                              payload
                            );
                            setToast({
                              message: "Template copied to your account.",
                              variant: "success",
                            });
                            setTemplateId(docRef.id);
                          } catch (error) {
                            setToast({
                              message: "Unable to copy this template.",
                              variant: "error",
                            });
                          }
                        }}
                      >
                        Copy template
                      </Button>
                    </div>
                  ) : null}
                  <Input
                    label="Resume title"
                    value={resumeTitle}
                    onChange={(event) => setResumeTitle(event.target.value)}
                    placeholder="e.g. Senior Product Designer Resume"
                  />
                  <label className="flex flex-col gap-2 text-xs font-semibold text-slate-400">
                    Template
                    <select
                      value={templateId ?? ""}
                      onChange={(event) =>
                        setTemplateId(event.target.value || null)
                      }
                      disabled={templatesLoading || templates.length === 0}
                      className="rounded-2xl border border-slate-800 bg-slate-950/70 px-4 py-3 text-sm font-medium text-slate-100"
                    >
                      {templatesLoading ? (
                        <option value="">Loading templates...</option>
                      ) : templates.length === 0 ? (
                        <option value="">No templates available</option>
                      ) : (
                        <>
                          <option value="" disabled>
                            Select a template
                          </option>
                          {templates.map((template) => (
                            <option key={template.id} value={template.id}>
                              {template.name ?? "Untitled template"}
                            </option>
                          ))}
                        </>
                      )}
                    </select>
                  </label>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-xs text-slate-400">
                        Selected template
                      </p>
                      <p className="text-base font-semibold text-slate-100">
                        {templateName || "No template selected"}
                      </p>
                      {templateName ? (
                        <p className="mt-1 text-xs text-slate-400">
                          {template?.page?.size ?? "A4"} ·{" "}
                          {template?.theme?.fonts?.body ?? "Default font"}
                        </p>
                      ) : (
                        <p className="mt-1 text-xs text-slate-400">
                          Choose a template to unlock section editing.
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </section>
            ) : null}

            {stepIndex === 1 ? (
              <section className="app-card">
                <SectionHeader
                  title="Resume fields"
                  description="Fill in the fields defined by the selected template."
                />
                <div className="mt-6">
                  {!templateId ? (
                    <p className="text-sm text-slate-400">
                      Choose a template to start filling resume fields.
                    </p>
                  ) : Object.keys(template?.fields ?? {}).length === 0 ? (
                    <p className="text-sm text-slate-400">
                      This template doesn’t define any fields yet.
                    </p>
                  ) : fieldGroups.length === 0 ? (
                    <ResumeForm
                      template={template}
                      values={formValues}
                      onChange={setFormValues}
                    />
                  ) : (
                    (() => {
                      const group = fieldGroups[fieldGroupStep];
                      if (!group) return null;
                      const groupFields = Object.fromEntries(
                        group.fieldIds
                          .map((fieldId) => [fieldId, template?.fields?.[fieldId]])
                          .filter(([, field]) => Boolean(field))
                      );
                      const groupTemplate = {
                        ...template,
                        fields: groupFields,
                      };
                      const canGoBack = fieldGroupStep > 0;
                      const canGoNext = fieldGroupStep < fieldGroups.length - 1;

                      return (
                        <div className="flex flex-col gap-4">
                          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-800/80 bg-slate-950/70 px-4 py-3">
                            <div>
                              <p className="text-xs text-slate-400">
                                Section {fieldGroupStep + 1} of{" "}
                                {fieldGroups.length}
                              </p>
                              <h4 className="text-sm font-semibold text-slate-200">
                                {group.title}
                              </h4>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="ghost"
                                type="button"
                                onClick={() => {
                                  if (canGoBack) {
                                    setFieldGroupStep((prev) =>
                                      Math.max(prev - 1, 0)
                                    );
                                  } else {
                                    moveToStep(0);
                                  }
                                }}
                              >
                                Previous
                              </Button>
                              <Button
                                type="button"
                                onClick={() => {
                                  if (canGoNext) {
                                    setFieldGroupStep((prev) =>
                                      Math.min(prev + 1, fieldGroups.length - 1)
                                    );
                                  } else {
                                    moveToStep(2);
                                  }
                                }}
                              >
                                Next
                              </Button>
                            </div>
                          </div>
                          <div className="rounded-2xl border border-slate-800/80 bg-slate-950/70 p-4">
                            <ResumeForm
                              template={groupTemplate}
                              values={formValues}
                              onChange={setFormValues}
                            />
                          </div>
                        </div>
                      );
                    })()
                  )}
                </div>
              </section>
            ) : null}

            {stepIndex === 2 ? (
              <section className="app-card">
                <SectionHeader
                  title="Export & publish"
                  description="Review privacy, then export or share your resume."
                />
                <div className="mt-6 grid gap-5">
                  <div className="flex flex-wrap items-center gap-3">
                    <Button
                      onClick={handleDownload}
                      disabled={!resumeId || exporting}
                    >
                      Print PDF
                    </Button>
                    <span className="text-xs text-slate-400">
                      {downloadMessage || "Print-ready export."}
                    </span>
                  </div>
                  <div className="rounded-2xl border border-slate-800 bg-slate-950/70 px-4 py-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="text-sm font-semibold text-slate-100">
                        Public link
                      </div>
                      <VisibilityToggle
                        enabled={visibility.isPublic}
                        onChange={(nextValue) =>
                          setVisibility((prev) => ({
                            ...prev,
                            isPublic: nextValue,
                          }))
                        }
                      />
                    </div>
                    <div className="mt-4 grid gap-3">
                      <Input
                        label="Shareable link"
                        value={publicLink}
                        readOnly
                        className="text-xs"
                      />
                      <Button
                        variant="ghost"
                        onClick={handleCopyLink}
                        disabled={!visibility.isPublic || !publicLink}
                      >
                        {copyMessage}
                      </Button>
                      <p className="text-xs text-slate-400">
                        {visibility.isPublic
                          ? "Anyone with the link can view your resume."
                          : "Enable the toggle to create a public link."}
                      </p>
                    </div>
                  </div>
                </div>
              </section>
            ) : null}

            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="text-xs text-slate-400">
                Autosave: {autosaveLabel}
              </div>
              {stepIndex === 1 ? null : (
                <div className="flex gap-3">
                  {stepIndex > 0 ? (
                    <Button
                      variant="ghost"
                      onClick={() => moveToStep(stepIndex - 1)}
                    >
                      Back
                    </Button>
                  ) : null}
                  <Button onClick={handleNextStep}>
                    {stepIndex === STEPS.length - 1
                      ? "Back to dashboard"
                      : "Next"}
                  </Button>
                </div>
              )}
            </div>
          </div>

          <aside className="flex flex-col gap-6 lg:sticky lg:top-24">
            <div className="flex-1 bg-slate-100 p-2">
              <TemplatePreview
                template={template}
                resumeJson={resumeJson}
                embedLinks
                showPlaceholders={false}
                className="border border-slate-200 bg-white shadow-md"
              />
            </div>
          </aside>
        </div>
      </div>
      <Snackbar
        message={toast?.message}
        variant={toast?.variant}
        onDismiss={() => setToast(null)}
      />
      <PromptModal
        open={Boolean(blockedTemplate)}
        title="Template unavailable"
        description={
          blockedTemplate
            ? `The template "${blockedTemplate.name}" is ${blockedTemplate.status}. Resumes using it cannot be viewed or edited.`
            : ""
        }
        confirmLabel={
          blockedTemplate?.canActivate ? "Set template active" : "Choose another"
        }
        cancelLabel={blockedTemplate?.canActivate ? "Choose another" : "Close"}
        onConfirm={async () => {
          if (!blockedTemplate) return;
          if (!blockedTemplate.canActivate) {
            setTemplateId(null);
            setTemplateName("");
            setTemplate(createEmptyTemplate());
            setBlockedTemplate(null);
            return;
          }
          try {
            await updateDoc(doc(db, "templates", blockedTemplate.id), {
              status: "active",
              updatedAt: serverTimestamp(),
            });
            setToast({
              message: "Template set to active.",
              variant: "success",
            });
            setBlockedTemplate(null);
          } catch (error) {
            setToast({
              message: "Unable to activate this template.",
              variant: "error",
            });
          }
        }}
        onCancel={() => {
          setTemplateId(null);
          setTemplateName("");
          setTemplate(createEmptyTemplate());
          setBlockedTemplate(null);
        }}
      />
    </AppShell>
  );
}
