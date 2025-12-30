import { useEffect, useMemo, useRef, useState } from "react";
import {
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
import EmptyState from "../components/EmptyState.jsx";
import ErrorBanner from "../components/ErrorBanner.jsx";
import Input from "../components/Input.jsx";
import LoadingSkeleton from "../components/LoadingSkeleton.jsx";
import LoaderOverlay from "../components/LoaderOverlay.jsx";
import PagePreviewFrame from "../components/PagePreviewFrame.jsx";
import ResumePreview from "../components/ResumePreview.jsx";
import SectionHeader from "../components/SectionHeader.jsx";
import Snackbar from "../components/Snackbar.jsx";
import VisibilityToggle from "../components/VisibilityToggle.jsx";
import { useAuth } from "../contexts/AuthContext.jsx";
import { db } from "../firebase.js";
import {
  DEFAULT_TEMPLATE_STYLES,
  resolvePageSetup,
} from "../utils/resumePreview.js";

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
  const iframeRef = useRef(null);
  const [resume, setResume] = useState(EMPTY_RESUME);
  const [loading, setLoading] = useState(true);
  const [statusMessage, setStatusMessage] = useState("");
  const [copyMessage, setCopyMessage] = useState("Copy link");
  const [downloadMessage, setDownloadMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [templates, setTemplates] = useState([]);
  const [templatesLoading, setTemplatesLoading] = useState(true);
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [toast, setToast] = useState(null);

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
      if (!user) {
        setStatusMessage("Sign in to access this resume.");
        setLoading(false);
        return;
      }
      setLoading(true);
      setStatusMessage("");
      try {
        const snapshot = await getDoc(doc(db, "resumes", resumeId));
        if (snapshot.exists() && isMounted) {
          const data = snapshot.data();
          setResume((prev) => ({
            ...prev,
            ...data,
            visibility: {
              ...prev.visibility,
              ...(data.visibility ?? {}),
            },
            templateStyles:
              data.templateStyles ?? DEFAULT_TEMPLATE_STYLES,
          }));
          setSelectedTemplateId(
            data.templateId ??
              window.localStorage.getItem("defaultTemplateId") ??
              ""
          );
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
  }, [resumeId, user]);

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
        const nextTemplates = [...publicTemplates, ...userTemplates];
        if (isMounted) {
          setTemplates(nextTemplates);
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
    if (selectedTemplateId || templates.length === 0) return;
    setSelectedTemplateId(
      resume.templateId ??
        window.localStorage.getItem("defaultTemplateId") ??
        templates[0].id
    );
  }, [resume.templateId, selectedTemplateId, templates]);

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
      setToast({
        message: nextPublic
          ? "Public link enabled."
          : "Public link disabled.",
        variant: "success",
      });
    } catch (error) {
      setStatusMessage("We couldn't update your public link.");
      setToast({
        message: "Unable to update your public link.",
        variant: "error",
      });
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
    setDownloadMessage("Opening print dialog...");
    setExporting(true);
    try {
      const sourceNode = previewRef.current;
      const cloned = sourceNode.cloneNode(true);
      const sourceNodes = sourceNode.querySelectorAll("*");
      const clonedNodes = cloned.querySelectorAll("*");
      const props = [
        "color",
        "backgroundColor",
        "borderTopColor",
        "borderRightColor",
        "borderBottomColor",
        "borderLeftColor",
        "outlineColor",
        "textDecorationColor",
        "fontFamily",
        "fontSize",
        "fontWeight",
        "lineHeight",
      ];
      clonedNodes.forEach((node, index) => {
        const source = sourceNodes[index];
        if (!source) return;
        const computed = window.getComputedStyle(source);
        props.forEach((prop) => {
          const value = computed[prop];
          if (value) {
            node.style[prop] = value;
          }
        });
      });

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
      doc.write(
        `<!doctype html><html><head><title>Resume PDF</title></head><body style="margin:0;background:#fff;"></body></html>`
      );
      doc.close();
      doc.body.appendChild(cloned);

      setTimeout(() => {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
        setTimeout(() => {
          iframe.remove();
        }, 1000);
      }, 300);
      setToast({
        message: "Print dialog opened. Save as PDF to download.",
        variant: "success",
      });
    } catch (error) {
      console.error(error);
      setDownloadMessage("Unable to open print dialog.");
      setToast({ message: "PDF export failed.", variant: "error" });
    } finally {
      setExporting(false);
    }
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

  const handleTemplateChange = async (event) => {
    const nextTemplateId = event.target.value;
    setSelectedTemplateId(nextTemplateId);
    const template = templates.find((item) => item.id === nextTemplateId);
    if (!template) return;
    const nextTemplateStyles = resolveTemplateStyles(template);
    const nextSectionOrder =
      template.layout?.sectionOrder ?? resume.sectionOrder ?? [];
    setResume((prev) => ({
      ...prev,
      templateId: template.id,
      templateName: template.name ?? "Untitled template",
      templateStyles: nextTemplateStyles,
      sectionOrder: nextSectionOrder,
    }));
    if (!resumeId || !user) return;
    setSaving(true);
    try {
      await setDoc(
        doc(db, "resumes", resumeId),
        {
          userId: user.uid,
          templateId: template.id,
          templateName: template.name ?? "Untitled template",
          templateStyles: nextTemplateStyles,
          sectionOrder: nextSectionOrder,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
      setToast({
        message: `Template "${template.name ?? "Untitled"}" applied.`,
        variant: "success",
      });
    } catch (error) {
      setToast({
        message: "Unable to apply this template.",
        variant: "error",
      });
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    if (!previewOpen || !iframeRef.current || !previewRef.current) return;
    const sourceNode = previewRef.current;
    const cloned = sourceNode.cloneNode(true);
    const sourceNodes = sourceNode.querySelectorAll("*");
    const clonedNodes = cloned.querySelectorAll("*");
    const props = [
      "color",
      "backgroundColor",
      "borderTopColor",
      "borderRightColor",
      "borderBottomColor",
      "borderLeftColor",
      "outlineColor",
      "textDecorationColor",
      "fontFamily",
      "fontSize",
      "fontWeight",
      "lineHeight",
    ];
    clonedNodes.forEach((node, index) => {
      const source = sourceNodes[index];
      if (!source) return;
      const computed = window.getComputedStyle(source);
      props.forEach((prop) => {
        const value = computed[prop];
        if (value) {
          node.style[prop] = value;
        }
      });
    });
    const frameDoc = iframeRef.current.contentWindow?.document;
    if (!frameDoc) return;
    frameDoc.open();
    frameDoc.write(
      `<!doctype html><html><head><title>Resume Preview</title></head><body style="margin:0;background:#f8fafc;padding:24px;box-sizing:border-box;display:flex;justify-content:center;align-items:flex-start;min-height:100vh;"></body></html>`
    );
    frameDoc.close();
    frameDoc.body.appendChild(cloned);
    const page = resolvePageSetup(resume.templateStyles?.page);
    const applyScale = () => {
      if (!iframeRef.current) return;
      const availableWidth = iframeRef.current.clientWidth - 48;
      const availableHeight = iframeRef.current.clientHeight - 48;
      const scale = Math.min(
        availableWidth / page.width,
        availableHeight / page.height,
        1
      );
      cloned.style.transform = `scale(${scale})`;
      cloned.style.transformOrigin = "top center";
    };
    applyScale();
    const observer = new ResizeObserver(applyScale);
    observer.observe(iframeRef.current);
    return () => observer.disconnect();
  }, [previewOpen, resume]);

  return (
    <AppShell>
      <div className="flex w-full flex-col gap-8">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="app-title">Export & publish</h1>
            <p className="app-subtitle">
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
          <EmptyState
            title="No resume draft available"
            description="Start a resume draft before exporting or publishing."
            action={
              <Button onClick={() => navigate("/app/resume")}>
                Build a resume
              </Button>
            }
          />
        ) : null}

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
          <section className="app-card">
            <SectionHeader
              title="PDF preview"
              description="Review the layout that will be exported."
            />
            <div className="mt-4 grid gap-2 text-sm text-slate-200">
              <label className="flex flex-col gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                Template
                <select
                  value={selectedTemplateId}
                  onChange={handleTemplateChange}
                  disabled={templatesLoading || templates.length === 0}
                  className="rounded-2xl border border-slate-800 bg-slate-950/70 px-4 py-3 text-sm font-medium text-slate-100"
                >
                  {templatesLoading ? (
                    <option value="">Loading templates...</option>
                  ) : templates.length === 0 ? (
                    <option value="">No templates available</option>
                  ) : (
                    templates.map((template) => (
                      <option key={template.id} value={template.id}>
                        {template.name ?? "Untitled template"}
                      </option>
                    ))
                  )}
                </select>
              </label>
            </div>
            <div className="mt-6 flex justify-center">
              {loading ? (
                <div className="w-full max-w-[720px] rounded-[22px] border border-slate-800 bg-slate-950/60 p-4">
                  <LoadingSkeleton variant="panel" />
                </div>
              ) : (
                <div
                  className="w-full max-w-[720px] overflow-hidden rounded-[22px] bg-white p-4 shadow-[0_20px_40px_rgba(15,23,42,0.3)]"
                >
                  <PagePreviewFrame styles={resume.templateStyles} className="w-full">
                    <ResumePreview
                      ref={previewRef}
                      data-export-preview="true"
                      profile={resume.profile}
                      resumeData={resume.resumeData}
                      sectionOrder={resume.sectionOrder}
                      styles={resume.templateStyles}
                    />
                  </PagePreviewFrame>
                </div>
              )}
            </div>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <Button
                onClick={handleDownload}
                disabled={!resumeId || exporting}
              >
                Print PDF
              </Button>
              <Button
                variant="ghost"
                onClick={() => setPreviewOpen(true)}
                disabled={!resumeId || loading}
              >
                Open preview
              </Button>
              <span className="text-xs text-slate-400">
                {downloadMessage || "Print-ready A4 export."}
              </span>
            </div>
          </section>

          <aside className="flex flex-col gap-6">
            <section className="app-card">
              <SectionHeader
                title="Public link"
                description="Share a read-only version of your resume."
              />
              {loading ? (
                <LoadingSkeleton variant="block" className="mt-6" />
              ) : (
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
              )}
            </section>

            <section className="app-card text-xs text-slate-300">
              {loading
                ? "Loading resume data..."
                : "Your PDF export uses the latest saved draft."}
              {saving ? (
                <div className="mt-2 text-emerald-200">
                  Saving visibility settings...
                </div>
              ) : null}
            </section>
            {statusMessage ? <ErrorBanner message={statusMessage} /> : null}
          </aside>
        </div>
      </div>
      <Snackbar
        message={toast?.message}
        variant={toast?.variant}
        onDismiss={() => setToast(null)}
      />
      {exporting ? <LoaderOverlay label="Preparing your PDF..." /> : null}
      {previewOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 px-4 py-6">
          <div className="flex h-full w-full max-w-5xl flex-col overflow-hidden rounded-3xl border border-slate-800 bg-slate-950">
            <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-slate-400">
                  PDF preview
                </p>
                <h2 className="text-lg font-semibold text-slate-100">
                  Download output
                </h2>
              </div>
              <Button variant="ghost" onClick={() => setPreviewOpen(false)}>
                Close
              </Button>
            </div>
            <div className="flex-1 bg-slate-900/80 p-4">
              <iframe
                ref={iframeRef}
                title="Resume preview"
                className="h-full w-full rounded-2xl border border-slate-800 bg-white"
              />
            </div>
          </div>
        </div>
      ) : null}
    </AppShell>
  );
}
