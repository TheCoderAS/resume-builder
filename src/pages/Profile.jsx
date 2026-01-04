import { useEffect, useMemo, useState } from "react";
import { sendEmailVerification, updateProfile } from "firebase/auth";
import {
  FiCheck,
  FiChevronDown,
  FiCopy,
  FiLock,
  FiLogOut,
  FiMoon,
  FiShield,
  FiSun,
} from "react-icons/fi";
import AppShell from "../components/AppShell.jsx";
import Button from "../components/Button.jsx";
import Input from "../components/Input.jsx";
import PromptModal from "../components/PromptModal.jsx";
import Snackbar from "../components/Snackbar.jsx";
import { useAuth } from "../contexts/AuthContext.jsx";
import { auth } from "../firebase.js";

const THEME_STORAGE_KEY = "resumiate-theme";

export default function Profile() {
  const { user, signOut, resetPassword } = useAuth();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [displayName, setDisplayName] = useState(user?.displayName ?? "");
  const [savingName, setSavingName] = useState(false);
  const [toast, setToast] = useState(null);
  const [theme, setTheme] = useState(
    () => localStorage.getItem(THEME_STORAGE_KEY) ?? "dark"
  );
  const [savedName, setSavedName] = useState(user?.displayName ?? "");
  const [nameTouched, setNameTouched] = useState(false);
  const [showSaved, setShowSaved] = useState(false);
  const [verifyingEmail, setVerifyingEmail] = useState(false);

  const email = user?.email ?? "Account";

  useEffect(() => {
    const nextName = user?.displayName ?? "";
    setDisplayName(nextName);
    setSavedName(nextName);
    setNameTouched(false);
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
    if (nextName.length < 2) {
      setToast({ message: "Name must be at least 2 characters.", variant: "error" });
      return;
    }
    setSavingName(true);
    try {
      await updateProfile(auth.currentUser, { displayName: nextName });
      setSavedName(nextName);
      setNameTouched(false);
      setShowSaved(true);
      setTimeout(() => setShowSaved(false), 2000);
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

  const handleVerifyEmail = async () => {
    if (!auth.currentUser) return;
    setVerifyingEmail(true);
    try {
      await sendEmailVerification(auth.currentUser);
      setToast({ message: "Verification email sent.", variant: "success" });
    } catch (error) {
      setToast({ message: "Unable to send verification email.", variant: "error" });
    } finally {
      setVerifyingEmail(false);
    }
  };

  const handleCopyEmail = async () => {
    if (!user?.email) return;
    try {
      await navigator.clipboard.writeText(user.email);
      setToast({ message: "Copied email.", variant: "success" });
    } catch (error) {
      setToast({ message: "Copy failed.", variant: "error" });
    }
  };

  const nameError = useMemo(() => {
    if (!nameTouched) return "";
    if (!displayName.trim()) return "Name is required.";
    if (displayName.trim().length < 2) return "Name must be at least 2 characters.";
    return "";
  }, [displayName, nameTouched]);

  const isNameDirty = displayName.trim() !== savedName.trim();
  const saveDisabled = useMemo(
    () => !isNameDirty || Boolean(nameError) || savingName,
    [isNameDirty, nameError, savingName]
  );

  const securityStatus = useMemo(() => {
    const emailVerified = user?.emailVerified;
    return [
      "Password set",
      emailVerified ? "Email verified" : "Email not verified",
    ].join(" \u2022 ");
  }, [user]);

  const themeOptions = [
    { id: "light", label: "Light", icon: FiSun },
    { id: "dark", label: "Dark", icon: FiMoon },
  ];

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
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="app-title">Profile</h1>
            <p className="app-subtitle">Manage your account details.</p>
          </div>
        </header>

        <section className="grid gap-6 lg:grid-cols-2">
          <div className="flex flex-col gap-6">
            <div className="app-card flex flex-col gap-6">
              <div>
                <h2 className="app-section-title">Profile details</h2>
                <p className="text-sm text-slate-300">
                  Update how your profile appears across the app.
                </p>
              </div>
              <div className="grid gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-400">
                    Signed in as
                  </label>
                  <div className="mt-2 flex items-center justify-between gap-3 rounded-2xl border border-slate-800 bg-slate-950/60 px-4 py-3">
                    <span className="text-sm font-semibold text-slate-100">
                      {email}
                    </span>
                    <button
                      type="button"
                      onClick={handleCopyEmail}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-800 bg-slate-900/70 text-slate-200 transition hover:border-emerald-400/60 hover:text-emerald-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-300"
                      aria-label="Copy email address"
                    >
                      <FiCopy className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                <div className="grid gap-2">
                  <Input
                    label="Profile name"
                    value={displayName}
                    onChange={(event) => {
                      setDisplayName(event.target.value);
                      setNameTouched(true);
                    }}
                    placeholder="Add your name"
                    error={nameError}
                  />
                  <p className="text-xs text-slate-400">
                    This appears on your resume links.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <Button onClick={handleSaveName} disabled={saveDisabled}>
                    {savingName ? "Saving..." : "Save changes"}
                  </Button>
                  {showSaved ? (
                    <span className="inline-flex items-center gap-2 text-xs text-emerald-200">
                      <FiCheck className="h-4 w-4" />
                      Saved
                    </span>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="app-card flex flex-col gap-4">
              <h2 className="app-section-title">Theme</h2>
              <p className="text-sm text-slate-300">
                Switch between light and dark mode.
              </p>
              <div
                className="inline-flex w-full flex-wrap rounded-full border border-slate-800 bg-slate-950/60 p-1"
                role="radiogroup"
                aria-label="Theme selection"
                onKeyDown={(event) => {
                  if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
                  event.preventDefault();
                  const currentIndex = themeOptions.findIndex(
                    (option) => option.id === theme
                  );
                  const delta = event.key === "ArrowRight" ? 1 : -1;
                  const nextIndex =
                    (currentIndex + delta + themeOptions.length) %
                    themeOptions.length;
                  handleThemeChange(themeOptions[nextIndex].id);
                }}
              >
                {themeOptions.map((option) => {
                  const isSelected = theme === option.id;
                  const Icon = option.icon;
                    return (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => handleThemeChange(option.id)}
                        className={`flex flex-1 items-center justify-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 ${
                          isSelected
                            ? "bg-emerald-400/15 text-emerald-100 focus-visible:outline-emerald-300"
                            : "text-slate-300 hover:text-slate-100 focus-visible:outline-slate-400"
                        }`}
                        role="radio"
                        aria-checked={isSelected}
                        tabIndex={isSelected ? 0 : -1}
                      >
                      <Icon className="h-4 w-4" />
                      {option.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-6">
            <div className="app-card flex flex-col gap-5">
              <div>
                <h2 className="app-section-title">Account security</h2>
                <p className="text-sm text-slate-300">
                  Manage your password and sign-in sessions.
                </p>
              </div>
              <div className="flex items-center justify-between rounded-2xl border border-slate-800 bg-slate-950/60 px-4 py-3">
                <div className="flex items-center gap-2 text-sm text-slate-200">
                  <FiShield className="h-4 w-4 text-emerald-200" />
                  {securityStatus}
                </div>
                <span className="text-xs text-slate-400">Security status</span>
              </div>
              <div className="rounded-2xl border border-slate-800 bg-slate-950/60 px-4 py-3 text-sm text-slate-300">
                We’ll email a reset link to{" "}
                <span className="font-semibold text-slate-100">{email}</span>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <Button onClick={handlePasswordReset}>
                  <FiLock className="h-4 w-4" />
                  Reset password
                </Button>
                {user?.emailVerified ? null : (
                  <Button variant="ghost" onClick={handleVerifyEmail} disabled={verifyingEmail}>
                    <FiShield className="h-4 w-4" />
                    {verifyingEmail ? "Sending..." : "Verify email"}
                  </Button>
                )}
                <Button variant="ghost" onClick={() => setConfirmOpen(true)}>
                  <FiLogOut className="h-4 w-4" />
                  Sign out
                </Button>
              </div>
              <button
                type="button"
                className="flex items-center justify-between rounded-2xl border border-slate-800 bg-slate-950/40 px-4 py-3 text-sm text-slate-500"
                disabled
                title="Coming soon"
              >
                Active sessions
                <span className="text-xs text-slate-400">Coming soon</span>
              </button>
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
