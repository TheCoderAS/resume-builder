import { useEffect, useMemo, useState } from "react";
import { collection, deleteDoc, doc, getDocs, query, where } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import { FiClock, FiMoreVertical, FiTrash2 } from "react-icons/fi";
import AppShell from "../components/AppShell.jsx";
import Button from "../components/Button.jsx";
import EmptyState from "../components/EmptyState.jsx";
import ErrorBanner from "../components/ErrorBanner.jsx";
import LoadingSkeleton from "../components/LoadingSkeleton.jsx";
import PromptModal from "../components/PromptModal.jsx";
import Snackbar from "../components/Snackbar.jsx";
import { useAuth } from "../contexts/AuthContext.jsx";
import { db } from "../firebase.js";
import { TemplatePreview } from "../components/TemplatePreview.jsx";
import { buildPreviewResumeJson } from "../utils/resumeData.js";
import { applyTemplateOverrides, hydrateTemplate } from "../templateModel.js";

const formatDate = (timestamp) => {
  if (!timestamp?.toDate) return "Just now";
  return timestamp.toDate().toLocaleString();
};

export default function Drafts() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [drafts, setDrafts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [menuOpenId, setMenuOpenId] = useState(null);
  const [confirmId, setConfirmId] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [toast, setToast] = useState("");

  useEffect(() => {
    let isMounted = true;
    const loadDrafts = async () => {
      if (!user) return;
      setLoading(true);
      setError("");
      try {
        const snapshot = await getDocs(
          query(collection(db, "resumes"), where("userId", "==", user.uid))
        );
        const nextDrafts = snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...docSnap.data(),
        }));
        nextDrafts.sort((a, b) => {
          const aTime = a.updatedAt?.toMillis?.() ?? 0;
          const bTime = b.updatedAt?.toMillis?.() ?? 0;
          return bTime - aTime;
        });
        if (isMounted) {
          setDrafts(nextDrafts);
        }
      } catch (fetchError) {
        if (isMounted) {
          setError("Unable to load your drafts right now.");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadDrafts();
    return () => {
      isMounted = false;
    };
  }, [user]);

  useEffect(() => {
    if (!menuOpenId) return;
    const handleClick = (event) => {
      if (event.target.closest("[data-context-menu='true']")) return;
      setMenuOpenId(null);
    };
    document.addEventListener("click", handleClick);
    return () => {
      document.removeEventListener("click", handleClick);
    };
  }, [menuOpenId]);

  const draftCount = useMemo(() => drafts.length, [drafts]);

  const handleOpenDraft = (draftId) => {
    navigate(`/app/resume/${draftId}`);
  };

  const handleDeleteDraft = async () => {
    if (!confirmId) return;
    setDeleting(true);
    try {
      await deleteDoc(doc(db, "resumes", confirmId));
      setDrafts((prev) => prev.filter((draft) => draft.id !== confirmId));
      setToast("Draft deleted.");
    } catch (deleteError) {
      setToast("Unable to delete this draft.");
    } finally {
      setDeleting(false);
      setConfirmId(null);
      setMenuOpenId(null);
    }
  };

  return (
    <AppShell>
      <div className="flex w-full flex-col gap-6">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="app-title">Resumes</h1>
            <p className="app-subtitle">
              {draftCount} saved resume{draftCount === 1 ? "" : "s"}
            </p>
          </div>
          <Button onClick={() => navigate("/app/resume/new")}>
            New resume
          </Button>
        </header>

        {error ? <ErrorBanner message={error} /> : null}

        {loading ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={`draft-skeleton-${index}`} className="app-card">
                <LoadingSkeleton />
              </div>
            ))}
          </div>
        ) : null}

        {!loading && drafts.length === 0 ? (
          <EmptyState
            title="No resumes yet"
            description="Start a new resume to see it here."
            action={
              <Button onClick={() => navigate("/app/resume/new")}>
                Start now
              </Button>
            }
          />
        ) : null}

        {!loading && drafts.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {drafts.map((draft) => {
              const hydratedTemplate = draft.templateSnapshot
                ? hydrateTemplate(draft.templateSnapshot)
                : null;
              const effectiveTemplate = hydratedTemplate
                ? applyTemplateOverrides(
                    hydratedTemplate,
                    draft.templateOverrides
                  )
                : null;
              const previewResumeJson = effectiveTemplate
                ? buildPreviewResumeJson(
                    effectiveTemplate,
                    draft.values ?? draft.formValues ?? {}
                  )
                : null;

              return (
                <div
                  key={draft.id}
                  className={`group relative flex h-full flex-col gap-4 rounded-[28px] border border-slate-800 p-5 text-left transition hover:-translate-y-0.5 hover:border-emerald-400/60 hover:shadow-[0_16px_32px_rgba(15,23,42,0.45)] ${
                    draft.visibility?.isPublic
                      ? "bg-emerald-500/10"
                      : "bg-slate-900/60"
                  }`}
                >
                <button
                  type="button"
                  onClick={() => handleOpenDraft(draft.id)}
                  className="flex flex-1 flex-col gap-2 text-left"
                >
                  <div className="rounded-2xl border border-slate-800/80 bg-slate-950/70 p-2 shadow-inner">
                    <div className="h-48 overflow-hidden rounded-xl bg-slate-900/40 pointer-events-none select-none">
                      {effectiveTemplate?.layout?.root && previewResumeJson ? (
                        <TemplatePreview
                          template={effectiveTemplate}
                          resumeJson={previewResumeJson}
                          embedLinks={false}
                          showPlaceholders={true}
                          className="pointer-events-none select-none"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-xs text-slate-400">
                          Preview unavailable
                        </div>
                      )}
                    </div>
                  </div>
                  <div>
                    <p className="text-base font-semibold text-slate-100">
                      {draft.resumeTitle ||
                        draft.profile?.fullName ||
                        "Untitled resume"}
                    </p>
                    {/* <p className="mt-1 text-xs text-slate-400">
                      {draft.profile?.title || "No headline yet"}
                    </p> */}
                  </div>
                  <div className="mt-auto flex items-center gap-2 text-xs text-slate-400">
                    <FiClock className="h-4 w-4" />
                    Updated {formatDate(draft.updatedAt)}
                  </div>
                </button>
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    setMenuOpenId((current) =>
                      current === draft.id ? null : draft.id
                    );
                  }}
                  className="context-menu-trigger absolute right-4 top-4 rounded-full p-2 text-slate-400 transition hover:bg-slate-800 hover:text-slate-100"
                  aria-label="Open draft menu"
                  data-context-menu="true"
                >
                  <FiMoreVertical className="h-4 w-4" />
                </button>
                {menuOpenId === draft.id ? (
                  <div
                    className="context-menu absolute right-4 top-14 z-10 w-40 rounded-2xl border border-slate-800 bg-slate-950/95 p-2 text-sm shadow-[0_18px_40px_rgba(15,23,42,0.6)]"
                    data-context-menu="true"
                  >
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        setConfirmId(draft.id);
                      }}
                      className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-rose-200 transition hover:bg-rose-500/10"
                    >
                      <FiTrash2 className="h-4 w-4" />
                      Delete
                    </button>
                  </div>
                ) : null}
                </div>
              );
            })}
          </div>
        ) : null}
      </div>
      <PromptModal
        open={Boolean(confirmId)}
        title="Delete this draft?"
        description="This action cannot be undone."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        onConfirm={handleDeleteDraft}
        onCancel={() => setConfirmId(null)}
        busy={deleting}
      />
      <Snackbar message={toast} onDismiss={() => setToast("")} />
    </AppShell>
  );
}
