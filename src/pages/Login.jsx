import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import {
  EmailAuthProvider,
  GoogleAuthProvider,
  fetchSignInMethodsForEmail,
  linkWithCredential,
  signInWithEmailAndPassword,
  signInWithPopup,
} from "firebase/auth";
import AuthShell from "../components/AuthShell.jsx";
import Button from "../components/Button.jsx";
import Input from "../components/Input.jsx";
import LoaderOverlay from "../components/LoaderOverlay.jsx";
import Snackbar from "../components/Snackbar.jsx";
import { useAuth } from "../contexts/AuthContext.jsx";
import { getAuthErrorMessage } from "../utils/authErrors.js";
import { auth } from "../firebase.js";
import PromptModal from "../components/PromptModal.jsx";

export default function Login() {
  const navigate = useNavigate();
  const { signInWithEmail, signInWithGoogle } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkEmail, setLinkEmail] = useState("");
  const [linkPassword, setLinkPassword] = useState("");
  const [linkMode, setLinkMode] = useState("");
  const [linkPendingCred, setLinkPendingCred] = useState(null);
  const [linkError, setLinkError] = useState("");
  const [linkBusy, setLinkBusy] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setBusy(true);
    const formData = new FormData(event.currentTarget);
    const email = formData.get("email");
    const password = formData.get("password");

    try {
      await signInWithEmail(email, password);
      navigate("/app");
    } catch (err) {
      const methods = await fetchSignInMethodsForEmail(auth, email).catch(() => []);
      const hasGoogleOnly =
        methods.includes("google.com") && !methods.includes("password");
      if (hasGoogleOnly) {
        setLinkMode("password-to-google");
        setLinkEmail(email);
        setLinkPassword(password);
        setLinkPendingCred(null);
        setLinkError("");
        setLinkOpen(true);
      } else {
        setError(getAuthErrorMessage(err, "Unable to sign in."));
      }
    } finally {
      setBusy(false);
    }
  };

  const handleGoogle = async () => {
    setError("");
    setBusy(true);
    try {
      await signInWithGoogle();
      navigate("/app");
    } catch (err) {
      if (err?.code === "auth/account-exists-with-different-credential") {
        const email = err?.customData?.email;
        const pendingCred = GoogleAuthProvider.credentialFromError(err);
        if (email && pendingCred) {
          setLinkMode("google-to-password");
          setLinkEmail(email);
          setLinkPendingCred(pendingCred);
          setLinkPassword("");
          setLinkError("");
          setLinkOpen(true);
        } else {
          setError(getAuthErrorMessage(err, "Unable to sign in with Google."));
        }
      } else {
        setError(getAuthErrorMessage(err, "Unable to sign in with Google."));
      }
    } finally {
      setBusy(false);
    }
  };

  const handleLinkConfirm = async () => {
    setLinkBusy(true);
    setLinkError("");
    try {
      if (linkMode === "google-to-password") {
        const result = await signInWithEmailAndPassword(
          auth,
          linkEmail,
          linkPassword
        );
        await linkWithCredential(result.user, linkPendingCred);
        navigate("/app");
      } else if (linkMode === "password-to-google") {
        const result = await signInWithPopup(auth, new GoogleAuthProvider());
        const passwordCred = EmailAuthProvider.credential(
          linkEmail,
          linkPassword
        );
        await linkWithCredential(result.user, passwordCred);
        navigate("/app");
      }
      setLinkOpen(false);
    } catch (err) {
      setLinkError(getAuthErrorMessage(err, "Unable to link accounts."));
    } finally {
      setLinkBusy(false);
    }
  };

  return (
    <AuthShell
      title="Welcome back to Resumiate"
      subtitle="Sign in to keep your resume drafts synced across devices and export them whenever you want."
      footnote="By continuing you agree to our Terms and acknowledge our Privacy Policy."
    >
      <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
        <Input
          label="Email"
          name="email"
          type="email"
          placeholder="you@domain.com"
          required
        />
        <Input label="Password" name="password" type="password" required />
        <Button type="submit" disabled={busy}>
          Sign in
        </Button>
      </form>
      <div className="mt-5 flex items-center justify-between text-xs text-slate-400">
        <Link className="hover:text-emerald-300" to="/forgot-password">
          Forgot password?
        </Link>
        <Link className="hover:text-emerald-300" to="/signup">
          Create account
        </Link>
      </div>
      <div className="my-6 h-px w-full bg-slate-800" />
      <Button type="button" variant="ghost" onClick={handleGoogle} disabled={busy}>
        Sign in with Google
      </Button>
      {busy ? <LoaderOverlay label="Signing you in..." /> : null}
      <Snackbar message={error} onDismiss={() => setError("")} />
      <PromptModal
        open={linkOpen}
        title="Link your account"
        description={
          linkMode === "google-to-password"
            ? "This email already has a password. Enter it once to connect Google."
            : "This email is tied to Google. Confirm Google sign-in to add a password."
        }
        confirmLabel="Continue"
        cancelLabel="Cancel"
        onConfirm={handleLinkConfirm}
        onCancel={() => setLinkOpen(false)}
        busy={linkBusy}
      >
        {linkMode === "google-to-password" ? (
          <Input
            label="Password"
            name="link-password"
            type="password"
            value={linkPassword}
            onChange={(event) => setLinkPassword(event.target.value)}
            error={linkError}
            required
          />
        ) : linkError ? (
          <p className="text-sm text-rose-200">{linkError}</p>
        ) : null}
      </PromptModal>
    </AuthShell>
  );
}
