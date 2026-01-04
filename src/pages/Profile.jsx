import { useEffect, useMemo, useState } from "react";
import { updateProfile } from "firebase/auth";
import { FiChevronDown, FiChevronUp, FiMoon, FiSun } from "react-icons/fi";
import AppShell from "../components/AppShell.jsx";
import Button from "../components/Button.jsx";
import Input from "../components/Input.jsx";
import PromptModal from "../components/PromptModal.jsx";
import Snackbar from "../components/Snackbar.jsx";
import { useAuth } from "../contexts/AuthContext.jsx";
import { auth } from "../firebase.js";

const FAQS = [
  {
    question: "How do I share my resume?",
    answer:
      "Enable the public link in the Export & publish step. You can then copy the shareable URL.",
  },
  {
    question: "Can I customize templates after publishing?",
    answer:
      "Yes. Edit the resume or duplicate a template, then publish the updated version.",
  },
  {
    question: "Why is my template read-only?",
    answer:
      "Templates owned by other users are read-only. Copy them to customize.",
  },
  {
    question: "How do I delete a resume?",
    answer:
      "Go to Resumes and use the menu on a resume card to delete it permanently.",
  },
];

const THEME_STORAGE_KEY = "resumiate-theme";

export default function Profile() {
  const { user, signOut, resetPassword } = useAuth();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [displayName, setDisplayName] = useState(user?.displayName ?? "");
  const [savingName, setSavingName] = useState(false);
  const [toast, setToast] = useState(null);
  const [openFaqIndex, setOpenFaqIndex] = useState(null);
  const [theme, setTheme] = useState(
    () => localStorage.getItem(THEME_STORAGE_KEY) ?? "dark"
  );

  const isLightTheme = theme === "light";
  const email = user?.email ?? "Account";

  useEffect(() => {
    setDisplayName(user?.displayName ?? "");
  }, [user]);

  const handleThemeChange = (nextTheme) => {
    setTheme(nextTheme);
    localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
    document.documentElement.classList.toggle(
      "theme-light",
      nextTheme === "light"
    );
  };

  const handleSaveName = async () => {
    if (!user || !auth.currentUser) return;
    const nextName = displayName.trim();
    if (!nextName) {
      setToast({ message: "Enter a profile name.", variant: "error" });
      return;
    }
    setSavingName(true);
    try {
      await updateProfile(auth.currentUser, { displayName: nextName });
      setToast({ message: "Profile name updated.", variant: "success" });
    } catch (error) {
      setToast({ message: "Unable to update your name.", variant: "error" });
    } finally {
      setSavingName(false);
    }
  };

  const handlePasswordReset = async () => {
    if (!user?.email) {
      setToast({ message: "No email found for this account.", variant: "error" });
      return;
    }
    try {
      await resetPassword(user.email);
      setToast({ message: "Password reset email sent.", variant: "success" });
    } catch (error) {
      setToast({ message: "Unable to send reset email.", variant: "error" });
    }
  };

  const saveDisabled = useMemo(
    () => !displayName.trim() || savingName,
    [displayName, savingName]
  );

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

        <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="app-card flex flex-col gap-6">
            <div>
              <p className="text-xs font-semibold text-emerald-200">
                Signed in as
              </p>
              <p className="mt-2 text-lg font-semibold text-slate-100">
                {email}
              </p>
            </div>
            <div className="grid gap-4">
              <Input
                label="Profile name"
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
                placeholder="Add your name"
              />
              <div className="flex flex-wrap gap-3">
                <Button onClick={handleSaveName} disabled={saveDisabled}>
                  {savingName ? "Saving..." : "Save name"}
                </Button>
              </div>
            </div>
          </div>

          <div className="app-card flex flex-col gap-4">
            <h2 className="app-section-title">Account security</h2>
            <p className="text-sm text-slate-300">
              Manage your password and sign-in sessions.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button variant="ghost" onClick={handlePasswordReset}>
                Send password reset
              </Button>
              <Button variant="ghost" onClick={() => setConfirmOpen(true)}>
                Sign out
              </Button>
            </div>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <div className="app-card flex flex-col gap-4">
            <h2 className="app-section-title">Theme</h2>
            <p className="text-sm text-slate-300">
              Switch between light and dark mode.
            </p>
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => handleThemeChange("light")}
                className={`theme-toggle theme-toggle--light flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition ${
                  isLightTheme
                    ? "border-amber-300 bg-amber-400/10 text-amber-100"
                    : "border-slate-800 bg-slate-950/70 text-slate-300 hover:border-slate-600"
                }`}
              >
                <FiSun />
                Light
              </button>
              <button
                type="button"
                onClick={() => handleThemeChange("dark")}
                className={`theme-toggle theme-toggle--dark flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition ${
                  !isLightTheme
                    ? "border-emerald-300 bg-emerald-400/10 text-emerald-100"
                    : "border-slate-800 bg-slate-950/70 text-slate-300 hover:border-slate-600"
                }`}
              >
                <FiMoon />
                Dark
              </button>
            </div>
          </div>

          <div className="app-card flex flex-col gap-4">
            <h2 className="app-section-title">FAQs</h2>
            <div className="flex flex-col gap-3">
              {FAQS.map((item, index) => {
                const isOpen = openFaqIndex === index;
                return (
                  <div
                    key={item.question}
                    className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4"
                  >
                    <button
                      type="button"
                      className="flex w-full items-center justify-between gap-3 text-left text-sm font-semibold text-slate-100"
                      onClick={() =>
                        setOpenFaqIndex(isOpen ? null : index)
                      }
                    >
                      {item.question}
                      {isOpen ? <FiChevronUp /> : <FiChevronDown />}
                    </button>
                    {isOpen ? (
                      <p className="mt-3 text-sm text-slate-300">
                        {item.answer}
                      </p>
                    ) : null}
                  </div>
                );
              })}
            </div>
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
      <Snackbar
        message={toast?.message}
        variant={toast?.variant}
        onDismiss={() => setToast(null)}
      />
    </AppShell>
  );
}
