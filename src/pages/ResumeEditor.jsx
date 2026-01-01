import { useEffect, useMemo, useRef, useState } from "react";
import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  where,
} from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import AppShell from "../components/AppShell.jsx";
import Button from "../components/Button.jsx";
import ResumeForm from "../components/ResumeForm.jsx";
import SectionHeader from "../components/SectionHeader.jsx";
import Snackbar from "../components/Snackbar.jsx";
import VisibilityToggle from "../components/VisibilityToggle.jsx";
import { useAuth } from "../contexts/AuthContext.jsx";
import { db } from "../firebase.js";
import { TemplatePreview } from "../components/TemplatePreview.jsx";
import { createEmptyTemplate } from "../templateModel.js";
import { buildResumeJson } from "../utils/resumeData.js";

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
  const navigate = useNavigate();
  const [stepIndex, setStepIndex] = useState(0);
  const [resumeId, setResumeId] = useState(null);
  const [autosaveStatus, setAutosaveStatus] = useState("idle");
  const initialSave = useRef(true);
  const [templateId, setTemplateId] = useState(null);
  const [templateName, setTemplateName] = useState("");
  const [template, setTemplate] = useState(createEmptyTemplate());
  const [formValues, setFormValues] = useState({});
  const [visibility, setVisibility] = useState({ isPublic: false });
  const [templates, setTemplates] = useState([]);
  const [templatesLoading, setTemplatesLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const lastAutosaveStatus = useRef("idle");
  const resumeJson = useMemo(
    () => buildResumeJson(template, formValues),
    [template, formValues]
  );
  const fieldGroups = useMemo(
    () => buildFieldGroups(template),
    [template]
  );

  const currentStep = useMemo(() => STEPS[stepIndex], [stepIndex]);

  useEffect(() => {
    if (!user) return;
    let isMounted = true;

    const ensureResume = async () => {
      const storedOwner = window.localStorage.getItem("activeResumeOwner");
      if (storedOwner && storedOwner !== user.uid) {
        window.localStorage.removeItem("activeResumeId");
        window.localStorage.removeItem("activeResumeOwner");
      }
      const storedId =
        storedOwner === user.uid
          ? window.localStorage.getItem("activeResumeId")
          : null;
      const payload = {
        userId: user.uid,
        values: formValues,
        visibility,
        templateId,
        templateName,
        templateSchemaVersion: template?.schemaVersion ?? BUILDER_SCHEMA_VERSION,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      try {
        let activeId = storedId;
        if (activeId) {
          try {
            const snapshot = await getDoc(doc(db, "resumes", activeId));
            if (snapshot.exists()) {
              const data = snapshot.data();
              if (isMounted) {
                setFormValues(data.values ?? data.formValues ?? {});
                setVisibility((prev) => ({ ...prev, ...(data.visibility ?? {}) }));
                setTemplateId(data.templateId ?? null);
                setTemplateName(data.templateName ?? "");
                setResumeId(activeId);
                initialSave.current = false;
              }
              return;
            }
            await setDoc(doc(db, "resumes", activeId), payload, { merge: true });
            if (isMounted) {
              setResumeId(activeId);
              window.localStorage.setItem("activeResumeOwner", user.uid);
              initialSave.current = false;
            }
            return;
          } catch (error) {
            if (error?.code === "permission-denied") {
              window.localStorage.removeItem("activeResumeId");
              window.localStorage.removeItem("activeResumeOwner");
              activeId = null;
            } else {
              throw error;
            }
          }
        }

        const docRef = await addDoc(collection(db, "resumes"), {
          ...payload,
          createdAt: serverTimestamp(),
        });
        if (isMounted) {
          setResumeId(docRef.id);
          window.localStorage.setItem("activeResumeId", docRef.id);
          window.localStorage.setItem("activeResumeOwner", user.uid);
          initialSave.current = false;
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
  }, [user]);

  useEffect(() => {
    if (!templateId) {
      setTemplateName("");
      setTemplate(createEmptyTemplate());
      return;
    }
    let isMounted = true;

    const loadTemplate = async () => {
      try {
        const snapshot = await getDoc(doc(db, "templates", templateId));
        if (!snapshot.exists()) {
          if (isMounted) {
            setTemplate(createEmptyTemplate());
          }
          return;
        }
        const data = snapshot.data();
        if (isMounted) {
          const layout = data.layout;
          const isBuilderLayout =
            layout?.schemaVersion === BUILDER_SCHEMA_VERSION;
          setTemplateName(data.name ?? "Untitled template");
          setTemplate(isBuilderLayout ? hydrateTemplate(layout) : createEmptyTemplate());
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
        }
      }
    };

    loadTemplate();

    return () => {
      isMounted = false;
    };
  }, [templateId]);

  useEffect(() => {
    let isMounted = true;
    const loadTemplates = async () => {
      setTemplatesLoading(true);
      try {
        const templatesRef = collection(db, "templates");
        const publicQuery = query(
          templatesRef,
          where("type", "==", "admin"),
          where("status", "==", "active"),
          where("layout.schemaVersion", "==", BUILDER_SCHEMA_VERSION)
        );
        const [publicSnapshot, userSnapshot] = await Promise.all([
          getDocs(publicQuery),
          user
            ? getDocs(
                query(
                  templatesRef,
                  where("ownerId", "==", user.uid),
                  where("layout.schemaVersion", "==", BUILDER_SCHEMA_VERSION)
                )
              )
            : Promise.resolve(null),
        ]);
        const publicTemplates = publicSnapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...docSnap.data(),
        }));
        const userTemplates = userSnapshot
          ? userSnapshot.docs.map((docSnap) => ({
              id: docSnap.id,
              ...docSnap.data(),
            }))
          : [];
        if (isMounted) {
          setTemplates([...publicTemplates, ...userTemplates]);
        }
      } catch (error) {
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
    setAutosaveStatus("saving");
    const timeout = setTimeout(async () => {
      try {
        await setDoc(
          doc(db, "resumes", resumeId),
          {
            userId: user.uid,
            values: formValues,
            visibility,
            templateId,
            templateName,
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
    templateId,
    templateName,
    visibility,
    resumeId,
    user,
    template?.schemaVersion,
  ]);


  const handleNextStep = () => {
    if (stepIndex < STEPS.length - 1) {
      if (stepIndex === 0 && !templateId) {
        setToast({
          message: "Select a template to continue.",
          variant: "error",
        });
        return;
      }
      setStepIndex((current) => current + 1);
    } else {
      navigate("/app/export");
    }
  };

  const autosaveLabel = useMemo(() => {
    if (autosaveStatus === "saving") return "Saving...";
    if (autosaveStatus === "saved") return "All changes saved";
    if (autosaveStatus === "error") return "Autosave failed";
    return "Draft ready";
  }, [autosaveStatus]);

  const canSelectStep = (index) => index === 0 || Boolean(templateId);

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
                setStepIndex(index);
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

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
          <div className="flex flex-col gap-6">
            {stepIndex === 0 ? (
              <section className="app-card">
                <SectionHeader
                  title="Select a template"
                  description="Templates define the sections, styling, and layout for your resume."
                />
                <div className="mt-6 grid gap-4 rounded-2xl border border-slate-800 bg-slate-950/70 px-5 py-4 text-sm text-slate-200">
                  <label className="flex flex-col gap-2 text-xs font-semibold uppercase tracking-[0.1em] text-slate-400">
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
                      <p className="text-xs uppercase tracking-[0.1em] text-slate-400">
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
                    <div className="flex flex-col gap-6">
                      {fieldGroups.map((group) => {
                        const groupFields = Object.fromEntries(
                          group.fieldIds
                            .map((fieldId) => [
                              fieldId,
                              template?.fields?.[fieldId],
                            ])
                            .filter(([, field]) => Boolean(field))
                        );
                        const groupTemplate = {
                          ...template,
                          fields: groupFields,
                        };

                        return (
                          <div
                            key={group.id}
                            className="rounded-2xl border border-slate-800/80 bg-slate-950/70 p-4"
                          >
                            <h4 className="text-sm font-semibold text-slate-200">
                              {group.title}
                            </h4>
                            <div className="mt-4">
                              <ResumeForm
                                template={groupTemplate}
                                values={formValues}
                                onChange={setFormValues}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
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
                <div className="mt-6 grid gap-4">
                  <VisibilityToggle
                    enabled={visibility.isPublic}
                    onChange={(nextValue) =>
                      setVisibility((prev) => ({ ...prev, isPublic: nextValue }))
                    }
                  />
                  <div className="rounded-2xl border border-slate-800 bg-slate-950/70 px-4 py-3 text-xs text-slate-300">
                    {visibility.isPublic
                      ? "Public resumes are visible on your shareable link."
                      : "Your resume stays private until you publish it."}
                  </div>
                </div>
              </section>
            ) : null}

            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="text-xs text-slate-400">
                Autosave: {autosaveLabel}
              </div>
              <div className="flex gap-3">
                {stepIndex > 0 ? (
                  <Button
                    variant="ghost"
                    onClick={() => setStepIndex((current) => current - 1)}
                  >
                    Back
                  </Button>
                ) : null}
                <Button onClick={handleNextStep}>
                  {stepIndex === STEPS.length - 1
                    ? "Export & publish"
                    : "Next"}
                </Button>
              </div>
            </div>
          </div>

          <aside className="flex flex-col gap-6">
            <div className="app-card">
              <h3 className="text-sm font-semibold uppercase tracking-[0.1em] text-slate-300">
                Live preview
              </h3>
              <div className="mt-4">
                <TemplatePreview
                  template={template}
                  resumeJson={resumeJson}
                  className="h-[520px] w-full rounded-xl border border-slate-800 bg-white shadow-md"
                />
              </div>
            </div>
          </aside>
        </div>
      </div>
      <Snackbar
        message={toast?.message}
        variant={toast?.variant}
        onDismiss={() => setToast(null)}
      />
    </AppShell>
  );
}
