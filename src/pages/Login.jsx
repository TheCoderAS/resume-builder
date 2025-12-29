import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import AuthShell from "../components/AuthShell.jsx";
import Button from "../components/Button.jsx";
import Input from "../components/Input.jsx";
import LoaderOverlay from "../components/LoaderOverlay.jsx";
import Snackbar from "../components/Snackbar.jsx";
import { useAuth } from "../contexts/AuthContext.jsx";
import { getAuthErrorMessage } from "../utils/authErrors.js";

export default function Login() {
  const navigate = useNavigate();
  const { signInWithEmail, signInWithGoogle } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

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
      setError(getAuthErrorMessage(err, "Unable to sign in."));
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
      setError(getAuthErrorMessage(err, "Unable to sign in with Google."));
    } finally {
      setBusy(false);
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
    </AuthShell>
  );
}
