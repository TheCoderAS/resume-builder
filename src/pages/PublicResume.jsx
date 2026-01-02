import { useEffect, useMemo, useState } from "react";
import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  serverTimestamp,
  where,
} from "firebase/firestore";
import { useParams } from "react-router-dom";

import { db } from "../firebase.js";
import Button from "../components/Button.jsx";
import PromptModal from "../components/PromptModal.jsx";
import Snackbar from "../components/Snackbar.jsx";
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

export default function PublicResume() {
  const { slug } = useParams();
  const [resume, setResume] = useState(EMPTY_RESUME);
  const [template, setTemplate] = useState(createEmptyTemplate());
  const [resumeId, setResumeId] = useState(null);
  const [status, setStatus] = useState("loading");
  const [exporting, setExporting] = useState(false);
  const [downloadMessage, setDownloadMessage] = useState("");
  const [commentOpen, setCommentOpen] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [toast, setToast] = useState(null);

  useEffect(() => {
    const originalTitle = document.title;
    const name =
      resume.resumeTitle ||
      resume.profile?.fullName ||
      resume.profile?.name ||
      "";
    const nextTitle = name ? `${name} | Resumiate` : originalTitle;
    document.title = nextTitle;
    return () => {
      document.title = originalTitle;
    };
  }, [resume.resumeTitle, resume.profile?.fullName, resume.profile?.name]);

  const resumeJson = useMemo(
    () => buildResumeJson(template, resume.values ?? {}),
    [template, resume.values]
  );

  useEffect(() => {
    let isMounted = true;
    const loadResume = async () => {
      setStatus("loading");
      try {
        const byIdSnapshot = await getDoc(doc(db, "resumes", slug));
        const byIdResume = byIdSnapshot.exists() ? byIdSnapshot.data() : null;
        if (byIdResume?.visibility?.isPublic) {
          if (isMounted) {
            setResumeId(slug);
            setResume({
              ...EMPTY_RESUME,
              ...byIdResume,
              values: byIdResume.values ?? byIdResume.formValues ?? {},
            });
            setStatus("ready");
          }
          return;
        }

        const resumesQuery = query(
          collection(db, "resumes"),
          where("publicSlug", "==", slug),
          where("visibility.isPublic", "==", true),
          limit(1)
        );
        const querySnapshot = await getDocs(resumesQuery);
        const queryResume = querySnapshot.docs[0]?.data() ?? null;
        if (isMounted) {
          if (queryResume) {
            setResumeId(querySnapshot.docs[0]?.id ?? null);
            setResume({
              ...EMPTY_RESUME,
              ...queryResume,
              values: queryResume.values ?? queryResume.formValues ?? {},
            });
            setStatus("ready");
          } else {
            setResume(EMPTY_RESUME);
            setStatus("missing");
          }
        }
      } catch (error) {
        console.error(error)
        if (isMounted) {
          setStatus("error");
        }
      }
    };

    if (slug) {
      loadResume();
    } else {
      setStatus("missing");
    }

    return () => {
      isMounted = false;
    };
  }, [slug]);

  useEffect(() => {
    let isMounted = true;
    const loadTemplate = async () => {
      if (resume.templateSnapshot) {
        if (isMounted) {
          setTemplate(hydrateTemplate(resume.templateSnapshot));
        }
        return;
      }
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
            setStatus("error");
          }
        }
      } catch (error) {
        console.error(error)
        if (isMounted) {
          setTemplate(createEmptyTemplate());
          setStatus("error");
        }
      }
    };

    if (status === "ready") {
      loadTemplate();
    }

    return () => {
      isMounted = false;
    };
  }, [resume.templateId, status]);

  const handleDownload = async () => {
    setDownloadMessage("Opening print dialog...");
    setExporting(true);
    const originalTitle = document.title;
    try {
      const name =
        resume.resumeTitle ||
        resume.profile?.fullName ||
        resume.profile?.name ||
        "Resume";
      document.title = name;
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
      doc.write(buildHTML(template, resumeJson, { embedLinks: true }));
      doc.close();

      setTimeout(() => {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
        setTimeout(() => {
          iframe.remove();
          document.title = originalTitle;
        }, 1000);
      }, 300);
      setToast({
        message: "Print dialog opened. Save as PDF to download.",
        variant: "success",
      });
    } catch (error) {
      setDownloadMessage("Unable to open print dialog.");
      setToast({ message: "PDF export failed.", variant: "error" });
      document.title = originalTitle;
    } finally {
      setExporting(false);
    }
  };

  const handleSubmitComment = async () => {
    if (!commentText.trim()) {
      setToast({ message: "Add a comment before submitting.", variant: "error" });
      return;
    }
    if (!resumeId) {
      setToast({ message: "Resume not available for comments.", variant: "error" });
      return;
    }
    const text = commentText.trim();
    setCommentText("");
    setCommentOpen(false);
    try {
      await addDoc(collection(db, "resumeComments"), {
        resumeId,
        publicSlug: resume.publicSlug || slug || null,
        comment: text,
        createdAt: serverTimestamp(),
        userAgent: navigator.userAgent,
      });
      setToast({ message: "Thanks for your feedback!", variant: "success" });
    } catch (error) {
      console.error(error)
      setToast({ message: "Unable to send comment.", variant: "error" });
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 px-6 py-12 text-slate-100">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <header className="flex flex-wrap justify-center">
          <div className="flex w-full max-w-[794px] flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase  text-slate-400">
                resume
              </p>
              <h1 className="text-lg font-semibold text-slate-100">
                {resume.resumeTitle ||
                  resume.profile?.fullName ||
                  resume.profile?.name ||
                  "Resume"}
              </h1>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Button
                onClick={handleDownload}
                disabled={exporting || status !== "ready"}
              >
                Export PDF
              </Button>
              <Button
                variant="ghost"
                onClick={() => setCommentOpen(true)}
                disabled={status !== "ready"}
              >
                Add comment
              </Button>
              <a
                href="/app"
                className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-700 px-5 py-3 text-sm font-semibold text-slate-200 transition hover:border-slate-500 hover:text-white"
              >
                Build your resume
              </a>
            </div>
          </div>
        </header>
        {status === "loading" ? (
          <div className="rounded-[24px] border border-slate-800 bg-slate-900/60 p-6 text-sm text-slate-300">
            Loading resume...
          </div>
        ) : null}

        {status === "missing" ? (
          <div className="rounded-[24px] border border-amber-500/40 bg-amber-500/10 p-6 text-sm text-amber-100">
            This resume is not available or has been set to private.
          </div>
        ) : null}

        {status === "error" ? (
          <div className="rounded-[24px] border border-rose-500/40 bg-rose-500/10 p-6 text-sm text-rose-100">
            We couldn&apos;t load this resume right now.
          </div>
        ) : null}

        {status === "ready" ? (
          <div className="flex flex-col items-center gap-6">
            <div className="w-full max-w-[794px] overflow-hidden bg-white shadow-[0_20px_40px_rgba(15,23,42,0.3)] bg-slate-100 p-2">
              <TemplatePreview
                template={template}
                resumeJson={resumeJson}
                embedLinks
                className="w-full border border-slate-200 bg-white shadow-md"
              />
            </div>
          </div>
        ) : null}
      </div>
      <PromptModal
        open={commentOpen}
        title="Add a comment"
        description="Share feedback with the resume owner."
        confirmLabel="Send"
        onCancel={() => setCommentOpen(false)}
        onConfirm={handleSubmitComment}
      >
        <label className="flex flex-col gap-2 text-xs font-semibold uppercase  text-slate-400">
          Comment
          <textarea
            value={commentText}
            onChange={(event) => setCommentText(event.target.value)}
            rows={4}
            className="rounded-2xl border border-slate-800 bg-slate-950/70 px-4 py-3 text-sm text-slate-100 placeholder:text-slate-500"
            placeholder="What stood out? Any suggestions?"
          />
        </label>
      </PromptModal>
      <Snackbar
        message={toast?.message}
        variant={toast?.variant}
        onDismiss={() => setToast(null)}
      />
    </div>
  );
}
