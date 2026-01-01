import { useEffect, useMemo, useRef, useState } from "react";
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import AppShell from "../components/AppShell.jsx";
import Button from "../components/Button.jsx";
import EmptyState from "../components/EmptyState.jsx";
import ErrorBanner from "../components/ErrorBanner.jsx";
import Input from "../components/Input.jsx";
import LoadingSkeleton from "../components/LoadingSkeleton.jsx";
import LoaderOverlay from "../components/LoaderOverlay.jsx";
import SectionHeader from "../components/SectionHeader.jsx";
import Snackbar from "../components/Snackbar.jsx";
import VisibilityToggle from "../components/VisibilityToggle.jsx";
import { useAuth } from "../contexts/AuthContext.jsx";
import { db } from "../firebase.js";
import { TemplatePreview } from "../components/TemplatePreview.jsx";
import { createEmptyTemplate } from "../templateModel.js";
import { buildResumeJson } from "../utils/resumeData.js";
import { buildHTML } from "../utils/TemplateToHTML.js";

const EMPTY_RESUME = {
  values: {},
  templateId: null,
  templateName: "",
  visibility: { isPublic: false },
  publicSlug: "",
};

const BUILDER_SCHEMA_VERSION = "builder-v1";
const PAGE_SIZES = {
  A4: { width: 794, height: 1123 },
  Letter: { width: 816, height: 1056 },
  Legal: { width: 816, height: 1344 },
};

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

export default function ExportPublish() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const iframeRef = useRef(null);
  const [resume, setResume] = useState(EMPTY_RESUME);
  const [template, setTemplate] = useState(createEmptyTemplate());
  const [loading, setLoading] = useState(true);
  const [statusMessage, setStatusMessage] = useState("");
  const [copyMessage, setCopyMessage] = useState("Copy link");
  const [downloadMessage, setDownloadMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [toast, setToast] = useState(null);

  const resumeId = useMemo(
    () => window.localStorage.getItem("activeResumeId"),
    []
  );
  const resumeJson = useMemo(
    () => buildResumeJson(template, resume.values ?? {}),
    [template, resume.values]
  );
  const pageSize = useMemo(() => {
    const sizeKey = template?.page?.size ?? "A4";
    return PAGE_SIZES[sizeKey] ?? PAGE_SIZES.A4;
  }, [template?.page?.size]);

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
            values: data.values ?? data.formValues ?? {},
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
  }, [resumeId, user]);

  useEffect(() => {
    let isMounted = true;
    const loadTemplate = async () => {
      if (!resume.templateId) {
        setTemplate(createEmptyTemplate());
        return;
      }
      try {
        const snapshot = await getDoc(doc(db, "templates", resume.templateId));
        if (!snapshot.exists()) {
          if (isMounted) {
            setTemplate(createEmptyTemplate());
          }
          return;
        }
        const data = snapshot.data();
        const layout = data.layout;
        const isBuilderLayout =
          layout?.schemaVersion === BUILDER_SCHEMA_VERSION;
        if (isMounted) {
          setTemplate(isBuilderLayout ? hydrateTemplate(layout) : createEmptyTemplate());
          if (!isBuilderLayout) {
            setStatusMessage("This template isn't compatible with the builder format.");
          }
        }
      } catch (error) {
        if (isMounted) {
          setTemplate(createEmptyTemplate());
          setStatusMessage("We couldn't load the template details.");
        }
      }
    };

    loadTemplate();
    return () => {
      isMounted = false;
    };
  }, [resume.templateId]);

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
    setDownloadMessage("Opening print dialog...");
    setExporting(true);
    try {
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
      doc.write(buildHTML(template, resumeJson));
      doc.close();

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

  useEffect(() => {
    if (!previewOpen || !iframeRef.current) return;
    const frameDoc = iframeRef.current.contentWindow?.document;
    if (!frameDoc) return;
    frameDoc.open();
    frameDoc.write(
      `<!doctype html><html><head><title>Resume Preview</title></head><body style="margin:0;background:#f8fafc;padding:24px;box-sizing:border-box;display:flex;justify-content:center;align-items:flex-start;min-height:100vh;"></body></html>`
    );
    frameDoc.close();
    const bodyHtml = frameDoc.body;
    bodyHtml.innerHTML = buildHTML(template, resumeJson);
    const innerBody = bodyHtml.querySelector("body");
    if (innerBody) {
      bodyHtml.innerHTML = innerBody.innerHTML;
    }
    const applyScale = () => {
      if (!iframeRef.current) return;
      const availableWidth = iframeRef.current.clientWidth - 48;
      const availableHeight = iframeRef.current.clientHeight - 48;
      const scale = Math.min(
        availableWidth / pageSize.width,
        availableHeight / pageSize.height,
        1
      );
      const body = frameDoc.body;
      body.style.transform = `scale(${scale})`;
      body.style.transformOrigin = "top center";
    };
    applyScale();
    const observer = new ResizeObserver(applyScale);
    observer.observe(iframeRef.current);
    return () => observer.disconnect();
  }, [previewOpen, resumeJson, template, pageSize]);

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
            <div className="mt-6 flex justify-center">
              {loading ? (
                <div className="w-full max-w-[720px] rounded-[22px] border border-slate-800 bg-slate-950/60 p-4">
                  <LoadingSkeleton variant="panel" />
                </div>
              ) : (
                <div
                  className="w-full max-w-[720px] overflow-hidden rounded-[22px] bg-white p-4 shadow-[0_20px_40px_rgba(15,23,42,0.3)]"
                >
                  <TemplatePreview
                    template={template}
                    resumeJson={resumeJson}
                    className="w-full"
                  />
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
                <p className="text-xs uppercase tracking-[0.1em] text-slate-400">
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
