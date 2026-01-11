import { FiX } from "react-icons/fi";
import Button from "./Button.jsx";

export default function PromptModal({
  open,
  title,
  description,
  children,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  onConfirm,
  onCancel,
  busy = false,
}) {
  if (!open) {
    return null;
  }

  return (
    <div className="prompt-modal fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 px-4 py-6 backdrop-blur">
      <div className="prompt-modal__panel flex max-h-[calc(100vh-3rem)] w-full max-w-md flex-col rounded-[28px] border border-slate-800 bg-slate-900/90 p-6 text-slate-100 shadow-[0_24px_70px_rgba(15,23,42,0.7)]">
        <div className="flex-1 overflow-y-auto pr-1">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-slate-50">{title}</h2>
              {description ? (
                <p className="mt-2 text-sm text-slate-300">{description}</p>
              ) : null}
            </div>
            <button
              type="button"
              onClick={onCancel}
              className="prompt-modal__close rounded-full p-2 text-slate-400 transition hover:bg-slate-800 hover:text-slate-100"
              aria-label="Close dialog"
            >
              <FiX className="h-4 w-4" />
            </button>
          </div>
          {children ? <div className="mt-5">{children}</div> : null}
        </div>
        <div className="mt-6 flex flex-wrap justify-end gap-3">
          <Button type="button" variant="ghost" onClick={onCancel} disabled={busy}>
            {cancelLabel}
          </Button>
          <Button type="button" onClick={onConfirm} disabled={busy}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
