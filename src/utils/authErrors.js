const codeToMessage = {
  "auth/invalid-credential": "Email or password is incorrect.",
  "auth/user-not-found": "We couldn't find an account with that email.",
  "auth/wrong-password": "Email or password is incorrect.",
  "auth/email-already-in-use": "That email is already in use.",
  "auth/weak-password": "Password should be at least 6 characters.",
  "auth/invalid-email": "Please enter a valid email address.",
  "auth/popup-closed-by-user": "Google sign-in was cancelled.",
  "auth/cancelled-popup-request": "Google sign-in was cancelled.",
  "auth/too-many-requests":
    "Too many attempts. Please wait a bit and try again.",
};

export function getAuthErrorMessage(error, fallback) {
  const code = error?.code || "";
  return codeToMessage[code] || fallback || "Something went wrong. Try again.";
}
