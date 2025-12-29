import { useEffect, useMemo, useRef, useState } from "react";
import html2pdf from "html2pdf.js";
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import Button from "../components/Button.jsx";
import Input from "../components/Input.jsx";
import ResumePreview from "../components/ResumePreview.jsx";
import SectionHeader from "../components/SectionHeader.jsx";
import VisibilityToggle from "../components/VisibilityToggle.jsx";
import { useAuth } from "../contexts/AuthContext.jsx";
import { db } from "../firebase.js";
import { DEFAULT_TEMPLATE_STYLES } from "../utils/resumePreview.js";

const EMPTY_RESUME = {
  profile: {
    fullName: "",
    title: "",
    email: "",
    phone: "",
    location: "",
    summary: "",
  },
  resumeData: {
    experience: [],
    education: [],
    skills: [],
  },
  sectionOrder: [],
  templateStyles: DEFAULT_TEMPLATE_STYLES,
  visibility: { isPublic: false },
  publicSlug: "",
};

export default function ExportPublish() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const previewRef = useRef(null);
  const [resume, setResume] = useState(EMPTY_RESUME);
  const [loading, setLoading] = useState(true);
  const [statusMessage, setStatusMessage] = useState("");
  const [copyMessage, setCopyMessage] = useState("Copy link");
  const [downloadMessage, setDownloadMessage] = useState("");
  const [saving, setSaving] = useState(false);

  const resumeId = useMemo(
    () => window.localStorage.getItem("activeResumeId"),
    []
  );

  useEffect(() => {
    let isMounted = true;
    const loadResume = async () => {
      if (!resumeId) {
        setLoading(false);
        return;
      }
      setLoading(true);
      setStatusMessage("");
      try {
        const snapshot = await getDoc(doc(db, "resumes", resumeId));
        if (snapshot.exists() && isMounted) {
          setResume((prev) => ({
            ...prev,
            ...snapshot.data(),
            visibility: {
              ...prev.visibility,
              ...(snapshot.data().visibility ?? {}),
            },
            templateStyles:
              snapshot.data().templateStyles ?? DEFAULT_TEMPLATE_STYLES,
          }));
        }
      } catch (error) {
        if (isMounted) {
          setStatusMessage("We couldn't load this resume right now.");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadResume();
    return () => {
      isMounted = false;
    };
  }, [resumeId]);

  const publicLink =
    resume.publicSlug || resumeId
      ? `${window.location.origin}/r/${resume.publicSlug || resumeId}`
      : "";

  const handleTogglePublic = async () => {
    if (!resumeId || !user) return;
    const nextPublic = !resume.visibility?.isPublic;
    const nextSlug = resume.publicSlug || resumeId;
    setSaving(true);
    setStatusMessage("");
    try {
      await setDoc(
        doc(db, "resumes", resumeId),
        {
          userId: user.uid,
          visibility: {
            ...(resume.visibility ?? {}),
            isPublic: nextPublic,
          },
          publicSlug: nextSlug,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
      setResume((prev) => ({
        ...prev,
        visibility: {
          ...(prev.visibility ?? {}),
          isPublic: nextPublic,
        },
        publicSlug: nextSlug,
      }));
    } catch (error) {
      setStatusMessage("We couldn't update your public link.");
    } finally {
      setSaving(false);
    }
  };

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

  const handleDownload = async () => {
    if (!previewRef.current) return;
    setDownloadMessage("Generating PDF...");
    try {
      const filename = `${resume.profile?.fullName || "resume"}.pdf`;
      await html2pdf()
        .set({
          margin: 16,
          filename,
          image: { type: "jpeg", quality: 0.98 },
          html2canvas: { scale: 2, useCORS: true },
          jsPDF: { unit: "pt", format: "a4", orientation: "portrait" },
        })
        .from(previewRef.current)
        .save();
      setDownloadMessage("");
    } catch (error) {
      setDownloadMessage("Unable to generate PDF.");
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 px-6 py-12 text-slate-100">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-slate-100">
              Export & publish
            </h1>
            <p className="mt-1 text-sm text-slate-300">
              Download your PDF or enable a shareable public link.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button variant="ghost" onClick={() => navigate("/app/resume")}>
              Back to editor
            </Button>
            <Button variant="ghost" onClick={() => navigate("/app")}>
              Dashboard
            </Button>
          </div>
        </header>

        {!resumeId ? (
          <div className="rounded-[24px] border border-amber-500/40 bg-amber-500/10 p-5 text-sm text-amber-100">
            Start a resume draft before exporting.
          </div>
        ) : null}

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
          <section className="rounded-[28px] border border-slate-800 bg-slate-900/60 p-6">
            <SectionHeader
              title="PDF preview"
              description="Review the layout that will be exported."
            />
            <div className="mt-6 flex justify-center">
              <div
                ref={previewRef}
                className="w-full max-w-[720px] overflow-hidden rounded-[22px] bg-white p-4 shadow-[0_20px_40px_rgba(15,23,42,0.3)]"
              >
                <ResumePreview
                  profile={resume.profile}
                  resumeData={resume.resumeData}
                  sectionOrder={resume.sectionOrder}
                  styles={resume.templateStyles}
                />
              </div>
            </div>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <Button onClick={handleDownload} disabled={!resumeId}>
                Download PDF
              </Button>
              <span className="text-xs text-slate-400">
                {downloadMessage || "Print-ready A4 export."}
              </span>
            </div>
          </section>

          <aside className="flex flex-col gap-6">
            <section className="rounded-[28px] border border-slate-800 bg-slate-900/60 p-6">
              <SectionHeader
                title="Public link"
                description="Share a read-only version of your resume."
              />
              <div className="mt-6 grid gap-4">
                <VisibilityToggle
                  enabled={resume.visibility?.isPublic}
                  onChange={handleTogglePublic}
                />
                <Input
                  label="Shareable link"
                  value={publicLink}
                  readOnly
                  className="text-xs"
                />
                <Button
                  variant="ghost"
                  onClick={handleCopyLink}
                  disabled={!resume.visibility?.isPublic || !publicLink}
                >
                  {copyMessage}
                </Button>
                <p className="text-xs text-slate-400">
                  {resume.visibility?.isPublic
                    ? "Anyone with the link can view your resume."
                    : "Enable the toggle to create a public link."}
                </p>
              </div>
            </section>

            <section className="rounded-[28px] border border-slate-800 bg-slate-900/60 p-6 text-xs text-slate-300">
              {loading
                ? "Loading resume data..."
                : statusMessage || "Your PDF export uses the latest saved draft."}
              {saving ? (
                <div className="mt-2 text-emerald-200">
                  Saving visibility settings...
                </div>
              ) : null}
            </section>
          </aside>
        </div>
      </div>
    </div>
  );
}
