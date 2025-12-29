import { useEffect, useMemo, useRef, useState } from "react";
import { collection, doc, serverTimestamp, setDoc } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import Button from "../components/Button.jsx";
import EntryEditor from "../components/EntryEditor.jsx";
import EntryList from "../components/EntryList.jsx";
import Input from "../components/Input.jsx";
import SectionHeader from "../components/SectionHeader.jsx";
import VisibilityToggle from "../components/VisibilityToggle.jsx";
import { useAuth } from "../contexts/AuthContext.jsx";
import { db } from "../firebase.js";

const STEPS = ["Profile", "Resume Data", "Visibility"];

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

export default function ResumeEditor() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stepIndex, setStepIndex] = useState(0);
  const [resumeId, setResumeId] = useState(null);
  const [autosaveStatus, setAutosaveStatus] = useState("idle");
  const initialSave = useRef(true);

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

  const currentStep = useMemo(() => STEPS[stepIndex], [stepIndex]);

  useEffect(() => {
    if (!user) return;
    const docRef = doc(collection(db, "resumes"));
    setResumeId(docRef.id);
    window.localStorage.setItem("activeResumeId", docRef.id);
    setDoc(
      docRef,
      {
        userId: user.uid,
        profile,
        resumeData,
        visibility,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
    initialSave.current = false;
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
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        );
        setAutosaveStatus("saved");
      } catch (error) {
        setAutosaveStatus("error");
      }
    }, 800);

    return () => clearTimeout(timeout);
  }, [profile, resumeData, visibility, resumeId, user]);

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
      setStepIndex((current) => current + 1);
    } else {
      navigate("/app/templates");
    }
  };

  const autosaveLabel = useMemo(() => {
    if (autosaveStatus === "saving") return "Saving...";
    if (autosaveStatus === "saved") return "All changes saved";
    if (autosaveStatus === "error") return "Autosave failed";
    return "Draft ready";
  }, [autosaveStatus]);

  return (
    <div className="min-h-screen bg-slate-950 px-6 py-10 text-slate-100">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-slate-100">
              Resume Builder
            </h1>
            <p className="mt-1 text-sm text-slate-300">
              {currentStep} · {autosaveLabel}
            </p>
          </div>
          <Button variant="ghost" onClick={() => navigate("/app")}>
            Back to dashboard
          </Button>
        </header>

        <div className="flex flex-wrap gap-3">
          {STEPS.map((step, index) => (
            <button
              key={step}
              type="button"
              onClick={() => setStepIndex(index)}
              className={`flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition ${
                index === stepIndex
                  ? "border-emerald-400/60 bg-emerald-400/10 text-emerald-200"
                  : "border-slate-800 bg-slate-950/70 text-slate-300 hover:border-slate-600"
              }`}
            >
              <span className="flex h-6 w-6 items-center justify-center rounded-full border border-current text-xs">
                {index + 1}
              </span>
              {step}
            </button>
          ))}
        </div>

        {stepIndex === 0 ? (
          <section className="rounded-[28px] border border-slate-800 bg-slate-900/60 p-6">
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
                  setProfile((prev) => ({ ...prev, fullName: event.target.value }))
                }
              />
              <Input
                label="Professional title"
                placeholder="Senior Product Designer"
                value={profile.title}
                onChange={(event) =>
                  setProfile((prev) => ({ ...prev, title: event.target.value }))
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
                  setProfile((prev) => ({ ...prev, location: event.target.value }))
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
                    setProfile((prev) => ({ ...prev, summary: event.target.value }))
                  }
                />
              </label>
            </div>
          </section>
        ) : null}

        {stepIndex === 1 ? (
          <section className="grid gap-6">
            {SECTION_CONFIGS.map((section) => (
              <div
                key={section.key}
                className="rounded-[28px] border border-slate-800 bg-slate-900/60 p-6"
              >
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
          <section className="rounded-[28px] border border-slate-800 bg-slate-900/60 p-6">
            <SectionHeader
              title="Visibility"
              description="Control who can view your resume link."
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
                ? "Choose template"
                : "Next"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
