import { useEffect, useState } from "react";
import { collection, doc, getDoc, getDocs, limit, query, where } from "firebase/firestore";
import { useParams } from "react-router-dom";
import PagePreviewFrame from "../components/PagePreviewFrame.jsx";
import ResumePreview from "../components/ResumePreview.jsx";
import { db } from "../firebase.js";
import { DEFAULT_TEMPLATE_STYLES } from "../utils/resumePreview.js";

export default function PublicResume() {
  const { slug } = useParams();
  const [resume, setResume] = useState(null);
  const [status, setStatus] = useState("loading");

  useEffect(() => {
    let isMounted = true;
    const loadResume = async () => {
      setStatus("loading");
      try {
        const byIdSnapshot = await getDoc(doc(db, "resumes", slug));
        const byIdResume = byIdSnapshot.exists() ? byIdSnapshot.data() : null;
        if (byIdResume?.visibility?.isPublic) {
          if (isMounted) {
            setResume({
              ...byIdResume,
              templateStyles:
                byIdResume.templateStyles ?? DEFAULT_TEMPLATE_STYLES,
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
            setResume({
              ...queryResume,
              templateStyles:
                queryResume.templateStyles ?? DEFAULT_TEMPLATE_STYLES,
            });
            setStatus("ready");
          } else {
            setResume(null);
            setStatus("missing");
          }
        }
      } catch (error) {
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

  return (
    <div className="min-h-screen bg-slate-950 px-6 py-12 text-slate-100">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
        <header className="flex flex-col gap-2">
          <h1 className="text-2xl font-semibold text-slate-100">
            Public resume
          </h1>
          <p className="text-sm text-slate-300">
            This view is read-only and reflects the latest published version.
          </p>
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

        {status === "ready" && resume ? (
          <div className="rounded-[28px] border border-slate-800 bg-slate-900/60 p-6">
            <div className="flex justify-center">
              <div className="w-full max-w-[760px] rounded-[22px] bg-white p-4 shadow-[0_20px_40px_rgba(15,23,42,0.3)]">
                <PagePreviewFrame styles={resume.templateStyles} className="w-full">
                  <ResumePreview
                    profile={resume.profile}
                    resumeData={resume.resumeData}
                    sectionOrder={resume.sectionOrder}
                    styles={resume.templateStyles}
                  />
                </PagePreviewFrame>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
