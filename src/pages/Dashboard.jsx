import { useEffect, useMemo, useState } from "react";
import {
  collection,
  getDocs,
  limit,
  orderBy,
  query,
  where,
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
  const [publishedLoading, setPublishedLoading] = useState(true);
  const [publishedResume, setPublishedResume] = useState(null);
  const [comments, setComments] = useState([]);
  const [commentsLoading, setCommentsLoading] = useState(true);
  const drafts = [];

  useEffect(() => {
    const timeout = setTimeout(() => setLoading(false), 700);
    return () => clearTimeout(timeout);
  }, []);

  useEffect(() => {
    let isMounted = true;
    const loadPublishedResume = async () => {
      if (!user) {
        setPublishedLoading(false);
        return;
      }
      setPublishedLoading(true);
      try {
        const snapshot = await getDocs(
          query(
            collection(db, "resumes"),
            where("userId", "==", user.uid),
            orderBy("updatedAt", "desc"),
            limit(10)
          )
        );
        const docSnap = snapshot.docs.find(
          (item) => item.data()?.visibility?.isPublic === true
        );
        if (isMounted) {
          setPublishedResume(
            docSnap
              ? {
                  id: docSnap.id,
                  ...docSnap.data(),
                }
              : null
          );
        }
      } catch (error) {
        if (isMounted) {
          setPublishedResume(null);
        }
      } finally {
        if (isMounted) {
          setPublishedLoading(false);
        }
      }
    };

    loadPublishedResume();
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

  const visitCount =
    publishedResume?.analytics?.visits ??
    publishedResume?.analytics?.viewCount ??
    publishedResume?.visitCount ??
    0;
  const uniqueVisitors =
    publishedResume?.analytics?.uniqueVisitors ??
    publishedResume?.analytics?.unique ??
    0;
  const topLocation = publishedResume?.analytics?.topLocation ?? "Collecting";
  const topDevice = publishedResume?.analytics?.topDevice ?? "Collecting";
  const showAnalyticsHint =
    visitCount === 0 && topLocation === "Collecting" && topDevice === "Collecting";

  return (
    <AppShell>
      <div className="flex flex-col gap-6">
        <header>
          <h1 className="app-title">Dashboard</h1>
        </header>

        <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="app-card">
            <h2 className="app-section-title">Drafts in progress</h2>
            <p className="app-subtitle">
              Pick up where you left off or start a new draft.
            </p>
            <div className="mt-6 grid gap-4">
              {loading ? (
                <LoadingSkeleton variant="panel" />
              ) : drafts.length === 0 ? (
                <EmptyState
                  title="No active drafts yet"
                  description="Create a resume draft to see it listed here."
                  action={
                    <Button onClick={() => navigate("/app/resume")}>
                      Start a new resume
                    </Button>
                  }
                />
              ) : (
                drafts.map((draft) => (
                  <article
                    key={draft.id}
                    className="rounded-2xl border border-slate-800 bg-slate-950/70 px-5 py-4"
                  >
                    <p className="text-sm font-semibold text-slate-100">
                      {draft.title}
                    </p>
                    <p className="mt-1 text-xs text-slate-400">
                      Last edited {draft.updatedAt}
                    </p>
                  </article>
                ))
              )}
            </div>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <div className="app-card">
            <h2 className="app-section-title">Published resume</h2>
            <p className="app-subtitle">
              Share the latest version you have published.
            </p>
            <div className="mt-6">
              {publishedLoading ? (
                <LoadingSkeleton variant="panel" />
              ) : publishedResume ? (
                <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
                  <p className="text-sm font-semibold text-slate-100">
                    {publishedResume.resumeTitle ||
                      publishedResume.profile?.fullName ||
                      "Published resume"}
                  </p>
                  <p className="mt-1 text-xs text-slate-400">
                    {publishedResume.profile?.title || "Public link live"}
                  </p>
                  <div className="mt-4 flex flex-wrap items-center gap-3">
                    {publishedLink ? (
                      <a
                        href={publishedLink}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-full border border-emerald-400/60 px-4 py-2 text-xs font-semibold text-emerald-100 transition hover:bg-emerald-400/10"
                      >
                        Visit published link
                      </a>
                    ) : null}
                    <Button
                      variant="ghost"
                      onClick={() =>
                        navigate("/app/resume", { state: { stepIndex: 2 } })
                      }
                    >
                      Manage visibility
                    </Button>
                  </div>
                </div>
              ) : (
                <EmptyState
                  title="No published resume yet"
                  description="Publish a resume to unlock a shareable link."
                  action={
                    <Button
                      onClick={() =>
                        navigate("/app/resume", { state: { stepIndex: 2 } })
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
            <h2 className="app-section-title">Link analytics</h2>
            <p className="app-subtitle">
              Track visits and audience insights for your public link.
            </p>
            {publishedLoading ? (
              <div className="mt-6">
                <LoadingSkeleton variant="panel" />
              </div>
            ) : (
              <div className="mt-6 grid gap-3 text-sm text-slate-200">
                <div className="flex items-center justify-between rounded-2xl border border-slate-800 bg-slate-950/70 px-4 py-3">
                  <span>Total visits</span>
                  <span className="text-slate-100">
                    {visitCount.toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center justify-between rounded-2xl border border-slate-800 bg-slate-950/70 px-4 py-3">
                  <span>Unique visitors</span>
                  <span className="text-slate-100">
                    {uniqueVisitors.toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center justify-between rounded-2xl border border-slate-800 bg-slate-950/70 px-4 py-3">
                  <span>Top location</span>
                  <span className="text-slate-100">{topLocation}</span>
                </div>
                <div className="flex items-center justify-between rounded-2xl border border-slate-800 bg-slate-950/70 px-4 py-3">
                  <span>Top device</span>
                  <span className="text-slate-100">{topDevice}</span>
                </div>
                {showAnalyticsHint ? (
                  <p className="text-xs text-slate-500">
                    Connect Google Analytics or enable server-side tracking for
                    richer attribution, device, and referral insights.
                  </p>
                ) : null}
              </div>
            )}
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
