import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext.jsx";
import AppShell from "../components/AppShell.jsx";
import Button from "../components/Button.jsx";
import EmptyState from "../components/EmptyState.jsx";
import LoaderOverlay from "../components/LoaderOverlay.jsx";
import LoadingSkeleton from "../components/LoadingSkeleton.jsx";
import PromptModal from "../components/PromptModal.jsx";

export default function Dashboard() {
  const { signOut, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const drafts = [];

  useEffect(() => {
    const timeout = setTimeout(() => setLoading(false), 700);
    return () => clearTimeout(timeout);
  }, []);

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      await signOut();
    } finally {
      setSigningOut(false);
      setConfirmOpen(false);
    }
  };

  return (
    <AppShell>
      <div className="flex flex-col gap-6">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="app-title">Dashboard</h1>
            <p className="app-subtitle">
              Track drafts, templates, and next steps in one space.
            </p>
          </div>
          <Button onClick={() => setConfirmOpen(true)} variant="ghost">
            Sign out
          </Button>
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
          <div className="app-card">
            <h2 className="app-section-title">Quick actions</h2>
            <div className="mt-4 grid gap-3 text-sm text-slate-200">
              <button
                type="button"
                onClick={() => navigate("/app/resume")}
                className="rounded-2xl border border-slate-800 bg-slate-950/70 px-4 py-3 text-left transition hover:border-emerald-400/60"
              >
                Start a new resume
              </button>
              <button
                type="button"
                onClick={() => navigate("/app/template-playground")}
                className="rounded-2xl border border-slate-800 bg-slate-950/70 px-4 py-3 text-left transition hover:border-emerald-400/60"
              >
                Build a template
              </button>
              {isAdmin ? (
                <button
                  type="button"
                  onClick={() => navigate("/app/admin/templates")}
                  className="rounded-2xl border border-slate-800 bg-slate-950/70 px-4 py-3 text-left transition hover:border-emerald-400/60"
                >
                  Review admin templates
                </button>
              ) : null}
              {["Import LinkedIn profile", "Invite a collaborator"].map(
                (action) => (
                  <div
                    key={action}
                    className="rounded-2xl border border-slate-800 bg-slate-950/70 px-4 py-3"
                  >
                    {action}
                  </div>
                )
              )}
            </div>
          </div>
        </section>
      </div>
      {loading ? <LoaderOverlay label="Fetching your workspace..." /> : null}
      <PromptModal
        open={confirmOpen}
        title="Sign out?"
        description="You can sign back in anytime to access your drafts."
        confirmLabel="Sign out"
        cancelLabel="Stay signed in"
        onConfirm={handleSignOut}
        onCancel={() => setConfirmOpen(false)}
        busy={signingOut}
      />
    </AppShell>
  );
}
