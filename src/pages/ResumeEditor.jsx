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
import EntryEditor from "../components/EntryEditor.jsx";
import EntryList from "../components/EntryList.jsx";
import Input from "../components/Input.jsx";
import PagePreviewFrame from "../components/PagePreviewFrame.jsx";
import ResumePreview from "../components/ResumePreview.jsx";
import SectionHeader from "../components/SectionHeader.jsx";
import Snackbar from "../components/Snackbar.jsx";
import VisibilityToggle from "../components/VisibilityToggle.jsx";
import { useAuth } from "../contexts/AuthContext.jsx";
import { db } from "../firebase.js";
import { DEFAULT_TEMPLATE_STYLES, resolvePageSetup } from "../utils/resumePreview.js";

const STEPS = ["Select template", "Fill sections", "Export & publish"];

const SECTION_CONFIGS = [
  {
    key: "experience",
    title: "Experience",
    description: "Highlight impactful roles and projects.",
    addLabel: "Add experience",
    fields: [
      { key: "role", label: "Role", placeholder: "Senior Product Manager" },
      { key: "company", label: "Company", placeholder: "Company name" },
      { key: "location", label: "Location", placeholder: "City, State" },
      { key: "startDate", label: "Start date", placeholder: "Jan 2021" },
      { key: "endDate", label: "End date", placeholder: "Present" },
      {
        key: "summary",
        label: "Highlights",
        placeholder: "Describe key outcomes and scope.",
        multiline: true,
      },
    ],
    getTitle: (entry) => `${entry.role || "Role"} · ${entry.company || ""}`,
    getMeta: (entry) =>
      [entry.location, [entry.startDate, entry.endDate].filter(Boolean).join(" - ")]
        .filter(Boolean)
        .join(" · "),
  },
  {
    key: "education",
    title: "Education",
    description: "Add degrees, certificates, and credentials.",
    addLabel: "Add education",
    fields: [
      { key: "school", label: "School", placeholder: "University name" },
      { key: "degree", label: "Degree", placeholder: "B.A. in Design" },
      { key: "location", label: "Location", placeholder: "City, State" },
      { key: "startDate", label: "Start date", placeholder: "2016" },
      { key: "endDate", label: "End date", placeholder: "2020" },
      {
        key: "summary",
        label: "Details",
        placeholder: "Honors, coursework, or achievements.",
        multiline: true,
      },
    ],
    getTitle: (entry) => `${entry.degree || "Degree"} · ${entry.school || ""}`,
    getMeta: (entry) =>
      [entry.location, [entry.startDate, entry.endDate].filter(Boolean).join(" - ")]
        .filter(Boolean)
        .join(" · "),
  },
  {
    key: "skills",
    title: "Skills",
    description: "Capture technical, creative, and leadership skills.",
    addLabel: "Add skill",
    fields: [
      { key: "name", label: "Skill", placeholder: "Product strategy" },
      { key: "level", label: "Level", placeholder: "Expert, Advanced, etc." },
      {
        key: "summary",
        label: "Usage notes",
        placeholder: "Where you applied this skill.",
        multiline: true,
      },
    ],
    getTitle: (entry) => entry.name,
    getMeta: (entry) => entry.level,
  },
];

const DEFAULT_BLOCKS = {
  header: true,
  section: true,
  list: true,
  columns: true,
};

const resolveTemplateStyles = (template) => {
  const styles = template?.styles ?? {};
  return {
    ...DEFAULT_TEMPLATE_STYLES,
    ...styles,
    page: resolvePageSetup(styles.page),
    colors: {
      ...DEFAULT_TEMPLATE_STYLES.colors,
      ...(styles.colors ?? {}),
    },
    tokens: {
      ...DEFAULT_TEMPLATE_STYLES.tokens,
      ...(styles.tokens ?? {}),
    },
    sectionLayout:
      template?.layout?.sectionLayout ??
      styles.sectionLayout ??
      DEFAULT_TEMPLATE_STYLES.sectionLayout,
  };
};

const resolveTemplateBlocks = (layout = {}) => {
  if (!Array.isArray(layout.blocks)) {
    return DEFAULT_BLOCKS;
  }
  return {
    header: layout.blocks.includes("header"),
    section: layout.blocks.includes("section"),
    list: layout.blocks.includes("list"),
    columns: layout.blocks.includes("columns"),
  };
};

const normalizeSectionOrder = (order = []) => {
  const validSections = SECTION_CONFIGS.map((section) => section.key);
  const filtered = order.filter((section) => validSections.includes(section));
  const merged = [...new Set([...filtered, ...validSections])];
  return merged;
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
  const [templateBlocks, setTemplateBlocks] = useState(DEFAULT_BLOCKS);

  const [profile, setProfile] = useState({
    fullName: "",
    title: "",
    email: "",
    phone: "",
    location: "",
    summary: "",
  });
  const [resumeData, setResumeData] = useState({
    experience: [],
    education: [],
    skills: [],
  });
  const [visibility, setVisibility] = useState({ isPublic: false });
  const [activeEditor, setActiveEditor] = useState(null);
  const [sectionOrder, setSectionOrder] = useState(
    SECTION_CONFIGS.map((section) => section.key)
  );
  const [templateStyles, setTemplateStyles] = useState(DEFAULT_TEMPLATE_STYLES);
  const [templates, setTemplates] = useState([]);
  const [templatesLoading, setTemplatesLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const lastAutosaveStatus = useRef("idle");
  const resolvedPage = resolvePageSetup(templateStyles.page);

  const currentStep = useMemo(() => STEPS[stepIndex], [stepIndex]);
  const orderedSections = useMemo(
    () =>
      sectionOrder
        .map((key) => SECTION_CONFIGS.find((section) => section.key === key))
        .filter(Boolean),
    [sectionOrder]
  );

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
        profile,
        resumeData,
        visibility,
        sectionOrder,
        templateStyles,
        templateId,
        templateName,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      try {
        if (storedId) {
          const snapshot = await getDoc(doc(db, "resumes", storedId));
          if (snapshot.exists()) {
            const data = snapshot.data();
            if (isMounted) {
              setProfile((prev) => ({ ...prev, ...(data.profile ?? {}) }));
              setResumeData((prev) => ({ ...prev, ...(data.resumeData ?? {}) }));
              setVisibility((prev) => ({ ...prev, ...(data.visibility ?? {}) }));
              setSectionOrder(normalizeSectionOrder(data.sectionOrder ?? []));
              setTemplateStyles(data.templateStyles ?? DEFAULT_TEMPLATE_STYLES);
              setTemplateId(data.templateId ?? null);
              setTemplateName(data.templateName ?? "");
              setResumeId(storedId);
              initialSave.current = false;
            }
            return;
          }
          await setDoc(doc(db, "resumes", storedId), payload, { merge: true });
          if (isMounted) {
            setResumeId(storedId);
            window.localStorage.setItem("activeResumeOwner", user.uid);
            initialSave.current = false;
          }
          return;
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
      setTemplateBlocks(DEFAULT_BLOCKS);
      setTemplateName("");
      setTemplateStyles(DEFAULT_TEMPLATE_STYLES);
      setSectionOrder(SECTION_CONFIGS.map((section) => section.key));
      return;
    }
    let isMounted = true;

    const loadTemplate = async () => {
      try {
        const snapshot = await getDoc(doc(db, "templates", templateId));
        if (!snapshot.exists()) {
          if (isMounted) {
            setTemplateBlocks(DEFAULT_BLOCKS);
          }
          return;
        }
        const data = snapshot.data();
        if (isMounted) {
          setTemplateName(data.name ?? "Untitled template");
          setTemplateStyles(resolveTemplateStyles(data));
          const nextOrder = normalizeSectionOrder(data.layout?.sectionOrder ?? []);
          setSectionOrder(nextOrder);
          setTemplateBlocks(resolveTemplateBlocks(data.layout ?? {}));
        }
      } catch (error) {
        console.error(error);
        if (isMounted) {
          setTemplateBlocks(DEFAULT_BLOCKS);
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
          where("status", "==", "active")
        );
        const [publicSnapshot, userSnapshot] = await Promise.all([
          getDocs(publicQuery),
          user
            ? getDocs(query(templatesRef, where("ownerId", "==", user.uid)))
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
            profile,
            resumeData,
            visibility,
            sectionOrder,
            templateStyles,
            templateId,
            templateName,
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
    profile,
    resumeData,
    sectionOrder,
    templateStyles,
    templateId,
    templateName,
    visibility,
    resumeId,
    user,
  ]);

  const handleStartEntry = (sectionKey, index = null) => {
    const section = SECTION_CONFIGS.find((item) => item.key === sectionKey);
    if (!section) return;
    const value =
      index === null ? {} : resumeData[sectionKey][index] ?? {};
    setActiveEditor({ sectionKey, index, value, fields: section.fields });
  };

  const handleSaveEntry = () => {
    if (!activeEditor) return;
    setResumeData((prev) => {
      const next = { ...prev };
      const list = [...(prev[activeEditor.sectionKey] ?? [])];
      if (activeEditor.index === null) {
        list.push(activeEditor.value);
      } else {
        list[activeEditor.index] = activeEditor.value;
      }
      next[activeEditor.sectionKey] = list;
      return next;
    });
    setActiveEditor(null);
  };

  const handleRemoveEntry = (sectionKey, index) => {
    setResumeData((prev) => {
      const next = { ...prev };
      next[sectionKey] = prev[sectionKey].filter((_, itemIndex) => itemIndex !== index);
      return next;
    });
  };

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
                  <label className="flex flex-col gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
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
                      <p className="text-xs uppercase tracking-[0.3em] text-slate-400">
                        Selected template
                      </p>
                      <p className="text-base font-semibold text-slate-100">
                        {templateName || "No template selected"}
                      </p>
                      {templateName ? (
                        <p className="mt-1 text-xs text-slate-400">
                          {resolvedPage.width} × {resolvedPage.height}px ·{" "}
                          {templateStyles.fontFamily}
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
              <section className="grid gap-6">
                <div className="app-card">
                  <SectionHeader
                    title="Profile"
                    description="Set the headline details that show on your resume."
                  />
                  <div className="mt-6 grid gap-4 md:grid-cols-2">
                    <Input
                      label="Full name"
                      placeholder="Jordan Taylor"
                      value={profile.fullName}
                      onChange={(event) =>
                        setProfile((prev) => ({
                          ...prev,
                          fullName: event.target.value,
                        }))
                      }
                    />
                    <Input
                      label="Professional title"
                      placeholder="Senior Product Designer"
                      value={profile.title}
                      onChange={(event) =>
                        setProfile((prev) => ({
                          ...prev,
                          title: event.target.value,
                        }))
                      }
                    />
                    <Input
                      label="Email"
                      placeholder="you@email.com"
                      value={profile.email}
                      onChange={(event) =>
                        setProfile((prev) => ({ ...prev, email: event.target.value }))
                      }
                    />
                    <Input
                      label="Phone"
                      placeholder="(555) 123-4567"
                      value={profile.phone}
                      onChange={(event) =>
                        setProfile((prev) => ({ ...prev, phone: event.target.value }))
                      }
                    />
                    <Input
                      label="Location"
                      placeholder="Austin, TX"
                      value={profile.location}
                      onChange={(event) =>
                        setProfile((prev) => ({
                          ...prev,
                          location: event.target.value,
                        }))
                      }
                    />
                    <label className="md:col-span-2 flex flex-col gap-2 text-sm font-medium text-slate-200">
                      <span>Professional summary</span>
                      <textarea
                        rows={4}
                        className="rounded-2xl border border-slate-800 bg-slate-950/70 px-4 py-3 text-slate-100 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/40"
                        placeholder="Write a 2-3 sentence summary."
                        value={profile.summary}
                        onChange={(event) =>
                          setProfile((prev) => ({
                            ...prev,
                            summary: event.target.value,
                          }))
                        }
                      />
                    </label>
                  </div>
                </div>
                {orderedSections.map((section) => (
                  <div key={section.key} className="app-card">
                    <SectionHeader
                      title={section.title}
                      description={section.description}
                      action={
                        <Button
                          variant="ghost"
                          className="px-4 py-2 text-xs"
                          onClick={() => handleStartEntry(section.key)}
                        >
                          {section.addLabel}
                        </Button>
                      }
                    />
                    <EntryList
                      items={resumeData[section.key]}
                      onAdd={() => handleStartEntry(section.key)}
                      onEdit={(index) => handleStartEntry(section.key, index)}
                      onRemove={(index) => handleRemoveEntry(section.key, index)}
                      addLabel={section.addLabel}
                      emptyMessage={`No ${section.title.toLowerCase()} entries yet.`}
                      getTitle={section.getTitle}
                      getMeta={section.getMeta}
                    />
                    {activeEditor?.sectionKey === section.key ? (
                      <EntryEditor
                        title={`Edit ${section.title}`}
                        fields={section.fields}
                        value={activeEditor.value}
                        onChange={(value) =>
                          setActiveEditor((prev) => ({ ...prev, value }))
                        }
                        onSave={handleSaveEntry}
                        onCancel={() => setActiveEditor(null)}
                      />
                    ) : null}
                  </div>
                ))}
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
              <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-300">
                Live preview
              </h3>
              <div className="mt-4">
                <PagePreviewFrame styles={templateStyles} className="w-full">
                  <ResumePreview
                    profile={profile}
                    resumeData={resumeData}
                    sectionOrder={sectionOrder}
                    styles={templateStyles}
                    visibleBlocks={templateBlocks}
                  />
                </PagePreviewFrame>
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
