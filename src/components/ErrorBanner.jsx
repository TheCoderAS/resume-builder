import { FiAlertTriangle } from "react-icons/fi";

export default function ErrorBanner({ message }) {
  if (!message) return null;

  return (
    <div className="flex items-start gap-3 rounded-[24px] border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
      <FiAlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
      <span>{message}</span>
    </div>
  );
}
