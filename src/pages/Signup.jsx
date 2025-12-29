import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import AuthShell from "../components/AuthShell.jsx";
import Button from "../components/Button.jsx";
import Input from "../components/Input.jsx";
import LoaderOverlay from "../components/LoaderOverlay.jsx";
import Snackbar from "../components/Snackbar.jsx";
import { useAuth } from "../contexts/AuthContext.jsx";
import { getAuthErrorMessage } from "../utils/authErrors.js";

export default function Signup() {
  const navigate = useNavigate();
  const { signUpWithEmail, signInWithGoogle } = useAuth();
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
      await signUpWithEmail(email, password);
      navigate("/app");
    } catch (err) {
      setError(getAuthErrorMessage(err, "Unable to create account."));
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
      setError(getAuthErrorMessage(err, "Unable to sign up with Google."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell
      title="Create your Resumiate workspace"
      subtitle="Start building a standout resume with smart prompts, live previews, and secure cloud storage."
      footnote="We will never share your email without your permission."
    >
      <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
        <Input
          label="Email"
          name="email"
          type="email"
          placeholder="you@domain.com"
          required
        />
        <Input
          label="Password"
          name="password"
          type="password"
          placeholder="At least 6 characters"
          required
        />
        <Button type="submit" disabled={busy}>
          Create account
        </Button>
      </form>
      <div className="mt-5 flex items-center justify-between text-xs text-slate-400">
        <Link className="hover:text-emerald-300" to="/login">
          Already have an account?
        </Link>
      </div>
      <div className="my-6 h-px w-full bg-slate-800" />
      <Button type="button" variant="ghost" onClick={handleGoogle} disabled={busy}>
        Sign up with Google
      </Button>
      {busy ? <LoaderOverlay label="Creating your account..." /> : null}
      <Snackbar message={error} onDismiss={() => setError("")} />
    </AuthShell>
  );
}
