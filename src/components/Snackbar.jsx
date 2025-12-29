import { useEffect, useState } from "react";
import { FiX } from "react-icons/fi";

export default function Snackbar({
  message,
  onDismiss,
  duration = 3000,
}) {
  const [visible, setVisible] = useState(Boolean(message));

  useEffect(() => {
    if (!message) {
      setVisible(false);
      return;
    }
    setVisible(true);
    const timer = setTimeout(() => {
      setVisible(false);
      onDismiss?.();
    }, duration);
    return () => clearTimeout(timer);
  }, [message, duration, onDismiss]);

  if (!message || !visible) {
    return null;
  }

  return (
    <div className="fixed bottom-6 left-1/2 z-50 w-[min(520px,90vw)] -translate-x-1/2 rounded-2xl border border-rose-400/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-200 shadow-[0_18px_50px_rgba(15,23,42,0.6)] backdrop-blur">
      <div className="flex items-start justify-between gap-3">
        <span>{message}</span>
        <button
          className="rounded-full p-1 text-rose-200/80 transition hover:bg-rose-500/20 hover:text-rose-100"
          type="button"
          aria-label="Dismiss notification"
          onClick={() => {
            setVisible(false);
            onDismiss?.();
          }}
        >
          <FiX className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
