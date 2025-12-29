import { useEffect, useState } from "react";
import { useAuth } from "../contexts/AuthContext.jsx";
import Button from "../components/Button.jsx";
import LoaderOverlay from "../components/LoaderOverlay.jsx";
import PromptModal from "../components/PromptModal.jsx";

export default function Dashboard() {
  const { user, signOut } = useAuth();
  const [loading, setLoading] = useState(true);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

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
    <div className="min-h-screen bg-slate-950 px-6 py-12 text-slate-100">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <img
            src="/resumiate.png"
            alt="Resumiate"
            className="h-[55px] w-auto object-contain"
          />
          <Button onClick={() => setConfirmOpen(true)} variant="ghost">
            Sign out
          </Button>
        </header>

        <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-[28px] border border-slate-800 bg-slate-900/60 p-6">
            <h2 className="text-lg font-semibold text-slate-100">
              Drafts in progress
            </h2>
            <p className="mt-2 text-sm text-slate-300">
              Connect Firestore to load drafts here. This panel is ready for your
              data.
            </p>
            <div className="mt-6 grid gap-4">
              {["Product Manager", "Frontend Engineer", "Operations Lead"].map(
                (title) => (
                  <article
                    key={title}
                    className="rounded-2xl border border-slate-800 bg-slate-950/70 px-5 py-4"
                  >
                    <p className="text-sm font-semibold text-slate-100">
                      {title}
                    </p>
                    <p className="mt-1 text-xs text-slate-400">
                      Last edited 2 hours ago
                    </p>
                  </article>
                )
              )}
            </div>
          </div>
          <div className="rounded-[28px] border border-slate-800 bg-slate-900/60 p-6">
            <h2 className="text-lg font-semibold text-slate-100">
              Quick actions
            </h2>
            <div className="mt-4 grid gap-3 text-sm text-slate-200">
              {[
                "Start a new resume",
                "Import LinkedIn profile",
                "Invite a collaborator",
              ].map((action) => (
                <div
                  key={action}
                  className="rounded-2xl border border-slate-800 bg-slate-950/70 px-4 py-3"
                >
                  {action}
                </div>
              ))}
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
    </div>
  );
}
