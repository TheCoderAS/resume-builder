import { useEffect, useMemo, useState } from "react";
import { FiEdit2, FiExternalLink, FiSettings } from "react-icons/fi";
import {
  collection,
  getDocs,
  limit,
  query,
  where,
  orderBy,
} from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import AppShell from "../components/AppShell.jsx";
import Button from "../components/Button.jsx";
import EmptyState from "../components/EmptyState.jsx";
import LoaderOverlay from "../components/LoaderOverlay.jsx";
import LoadingSkeleton from "../components/LoadingSkeleton.jsx";
import { useAuth } from "../contexts/AuthContext.jsx";
import { db } from "../firebase.js";

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [draftResumes, setDraftResumes] = useState([]);
  const [publishedResumes, setPublishedResumes] = useState([]);
  const [comments, setComments] = useState([]);
  const [commentsLoading, setCommentsLoading] = useState(true);
  const publishedResume = useMemo(
    () => publishedResumes[0] ?? null,
    [publishedResumes]
  );
  const latestDrafts = useMemo(
    () => draftResumes.slice(0, 5),
    [draftResumes]
  );
  const latestPublished = useMemo(
    () => publishedResumes.slice(0, 5),
    [publishedResumes]
  );

  const formatDate = (timestamp) => {
    if (!timestamp?.toDate) return "Just now";
    return timestamp.toDate().toLocaleString();
  };

  useEffect(() => {
    let isMounted = true;
    const loadResumes = async () => {
      if (!user) {
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const snapshot = await getDocs(
          query(
            collection(db, "resumes"),
            where("userId", "==", user.uid),
            orderBy("updatedAt", "desc"),
            limit(50)
          )
        );
        const items = snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...docSnap.data(),
        }));
        const published = items.filter(
          (item) => item.visibility?.isPublic === true
        );
        const drafts = items.filter(
          (item) => item.visibility?.isPublic !== true
        );
        if (isMounted) {
          setPublishedResumes(published);
          setDraftResumes(drafts);
        }
      } catch (error) {
        console.error(error)
        if (isMounted) {
          setPublishedResumes([]);
          setDraftResumes([]);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadResumes();
    return () => {
      isMounted = false;
    };
  }, [user]);

  useEffect(() => {
    let isMounted = true;
    const loadComments = async () => {
      if (!user) {
        setCommentsLoading(false);
        return;
      }
      setCommentsLoading(true);
      try {
        const resumeSnapshot = await getDocs(
          query(
            collection(db, "resumes"),
            where("userId", "==", user.uid),
            limit(50)
          )
        );
        const resumeMap = new Map(
          resumeSnapshot.docs.map((docSnap) => [
            docSnap.id,
            docSnap.data(),
          ])
        );
        const resumeIds = Array.from(resumeMap.keys());
        if (resumeIds.length === 0) {
          if (isMounted) {
            setComments([]);
          }
          return;
        }
        const chunks = [];
        for (let i = 0; i < resumeIds.length; i += 10) {
          chunks.push(resumeIds.slice(i, i + 10));
        }
        const results = [];
        for (const chunk of chunks) {
          const commentsSnapshot = await getDocs(
            query(
              collection(db, "resumeComments"),
              where("resumeId", "in", chunk),
              limit(50)
            )
          );
          commentsSnapshot.docs.forEach((docSnap) => {
            const data = docSnap.data();
            const resume = resumeMap.get(data.resumeId);
            results.push({
              id: docSnap.id,
              ...data,
              resumeTitle:
                resume?.resumeTitle ||
                resume?.profile?.fullName ||
                "Resume",
            });
          });
        }
        results.sort((a, b) => {
          const aTime = a.createdAt?.toMillis?.() ?? 0;
          const bTime = b.createdAt?.toMillis?.() ?? 0;
          return bTime - aTime;
        });
        if (isMounted) {
          setComments(results.slice(0, 8));
        }
      } catch (error) {
        if (isMounted) {
          setComments([]);
        }
      } finally {
        if (isMounted) {
          setCommentsLoading(false);
        }
      }
    };

    loadComments();
    return () => {
      isMounted = false;
    };
  }, [user]);

  const publishedLink = useMemo(() => {
    if (!publishedResume) return "";
    const slug = publishedResume.publicSlug || publishedResume.id;
    return slug ? `${window.location.origin}/r/${slug}` : "";
  }, [publishedResume]);

  return (
    <AppShell>
      <div className="flex flex-col gap-6">
        {/* <header>
          <h1 className="app-title">Dashboard</h1>
        </header> */}

        <section className="grid gap-6 lg:grid-cols-2">
          <div className="app-card">
            <h2 className="app-section-title">Published resume</h2>
            <p className="app-subtitle">
              Share the latest version you have published.
            </p>
            <div className="mt-6">
              {loading ? (
                <LoadingSkeleton variant="panel" />
              ) : latestPublished.length > 0 ? (
                <div className="grid gap-3">
                  {latestPublished.map((item) => {
                    const slug = item.publicSlug || item.id;
                    const link = slug
                      ? `${window.location.origin}/r/${slug}`
                      : "";
                    return (
                      <div
                        key={item.id}
                        className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-slate-100">
                              {item.resumeTitle ||
                                item.profile?.fullName ||
                                "Published resume"}
                            </p>
                            <p className="mt-1 text-xs text-slate-400">
                              {item.profile?.title || "Public link live"}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            {link ? (
                              <a
                                href={link}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-emerald-400/60 text-emerald-100 transition hover:bg-emerald-400/10"
                                aria-label="Visit published link"
                                title="Visit published link"
                              >
                                <FiExternalLink className="h-4 w-4" />
                              </a>
                            ) : null}
                            <button
                              type="button"
                              onClick={() =>
                                navigate(`/app/resume/${item.id}`, {
                                  state: { stepIndex: 2 },
                                })
                              }
                              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-800 bg-slate-900/70 text-slate-100 transition hover:bg-slate-900"
                              aria-label="Manage visibility"
                              title="Manage visibility"
                            >
                              <FiSettings className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <EmptyState
                  title="No published resume yet"
                  description="Publish a resume to unlock a shareable link."
                  action={
                    <Button
                      onClick={() =>
                        navigate("/app/resume/new", { state: { stepIndex: 2 } })
                      }
                    >
                      Publish resume
                    </Button>
                  }
                />
              )}
            </div>
          </div>

          <div className="app-card">
            <h2 className="app-section-title">Drafts in progress</h2>
            <p className="app-subtitle">
              Pick up where you left off or start a new draft.
            </p>
            <div className="mt-6 grid gap-4">
              {loading ? (
                <LoadingSkeleton variant="panel" />
              ) : latestDrafts.length === 0 ? (
                <EmptyState
                  title="No active drafts yet"
                  description="Create a resume draft to see it listed here."
                  action={
                    <Button onClick={() => navigate("/app/resume/new")}>
                      Start a new resume
                    </Button>
                  }
                />
              ) : (
                latestDrafts.map((draft) => (
                  <article
                    key={draft.id}
                    className="rounded-2xl border border-slate-800 bg-slate-950/70 px-5 py-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-slate-100">
                          {draft.resumeTitle ||
                            draft.profile?.fullName ||
                            "Untitled resume"}
                        </p>
                        <p className="mt-1 text-xs text-slate-400">
                          Updated {formatDate(draft.updatedAt)}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => navigate(`/app/resume/${draft.id}`)}
                        className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-800 bg-slate-900/70 text-slate-100 transition hover:bg-slate-900"
                        aria-label="Edit resume"
                        title="Edit resume"
                      >
                        <FiEdit2 className="h-4 w-4" />
                      </button>
                    </div>
                  </article>
                ))
              )}
            </div>
          </div>
        </section>

        <section className="app-card">
          <h2 className="app-section-title">Recent comments</h2>
          <p className="app-subtitle">
            Feedback left on your public resumes.
          </p>
          <div className="mt-6 grid gap-3">
            {commentsLoading ? (
              <LoadingSkeleton variant="panel" />
            ) : comments.length === 0 ? (
              <EmptyState
                title="No comments yet"
                description="Share your public link to collect feedback."
              />
            ) : (
              comments.map((comment) => (
                <div
                  key={comment.id}
                  className="rounded-2xl border border-slate-800 bg-slate-950/70 px-5 py-4 text-sm text-slate-100"
                >
                  <p className="text-slate-100">{comment.comment}</p>
                  <p className="mt-2 text-xs text-slate-400">
                    {comment.commenterName
                      ? `${comment.commenterName} · `
                      : ""}
                    {comment.resumeTitle
                      ? `${comment.resumeTitle} · `
                      : ""}
                    {comment.createdAt?.toDate?.().toLocaleString() ||
                      "Just now"}
                  </p>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
      {loading ? <LoaderOverlay label="Fetching your workspace..." /> : null}
    </AppShell>
  );
}
