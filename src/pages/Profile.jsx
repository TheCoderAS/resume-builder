import { useState } from "react";
import AppShell from "../components/AppShell.jsx";
import Button from "../components/Button.jsx";
import PromptModal from "../components/PromptModal.jsx";
import { useAuth } from "../contexts/AuthContext.jsx";

export default function Profile() {
  const { user, signOut } = useAuth();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

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
      <div className="flex w-full flex-col gap-6">
        <header>
          <h1 className="app-title">Profile</h1>
          <p className="app-subtitle">Manage your account details.</p>
        </header>

        <section className="app-card flex flex-col gap-4">
          <div>
            <p className="text-xs font-semibold text-emerald-200">
              Signed in as
            </p>
            <p className="mt-2 text-lg font-semibold text-slate-100">
              {user?.email ?? "Account"}
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button variant="ghost" onClick={() => setConfirmOpen(true)}>
              Sign out
            </Button>
          </div>
        </section>
      </div>
      <PromptModal
        open={confirmOpen}
        title="Sign out?"
        description="You can sign back in anytime to access your resumes."
        confirmLabel="Sign out"
        cancelLabel="Stay signed in"
        onConfirm={handleSignOut}
        onCancel={() => setConfirmOpen(false)}
        busy={signingOut}
      />
    </AppShell>
  );
}
