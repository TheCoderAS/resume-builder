import { Link } from "react-router-dom";
import { useState } from "react";
import AuthShell from "../components/AuthShell.jsx";
import Button from "../components/Button.jsx";
import Input from "../components/Input.jsx";
import LoaderOverlay from "../components/LoaderOverlay.jsx";
import Snackbar from "../components/Snackbar.jsx";
import { useAuth } from "../contexts/AuthContext.jsx";
import { getAuthErrorMessage } from "../utils/authErrors.js";

export default function ForgotPassword() {
  const { resetPassword } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setSent(false);
    setBusy(true);
    const formData = new FormData(event.currentTarget);
    const email = formData.get("email");

    try {
      await resetPassword(email);
      setSent(true);
    } catch (err) {
      setError(getAuthErrorMessage(err, "Unable to send reset email."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell
      title="Reset your password"
      subtitle="Enter the email tied to your Resumiate account and we'll send a recovery link."
    >
      <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
        <Input
          label="Email"
          name="email"
          type="email"
          placeholder="you@domain.com"
          required
        />
        {sent ? (
          <p className="rounded-2xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-3 text-xs text-emerald-200">
            Reset link sent. Check your inbox.
          </p>
        ) : null}
        <Button type="submit" disabled={busy}>
          Send reset link
        </Button>
      </form>
      <div className="mt-5 text-xs text-slate-400">
        <Link className="hover:text-emerald-300" to="/login">
          Back to sign in
        </Link>
      </div>
      {busy ? <LoaderOverlay label="Sending reset email..." /> : null}
      <Snackbar message={error} onDismiss={() => setError("")} />
    </AuthShell>
  );
}
