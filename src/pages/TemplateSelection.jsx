import { useNavigate } from "react-router-dom";
import Button from "../components/Button.jsx";

export default function TemplateSelection() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-950 px-6 py-12 text-slate-100">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-slate-100">
              Choose a template
            </h1>
            <p className="mt-1 text-sm text-slate-300">
              Template selection is coming soon. Your draft is ready.
            </p>
          </div>
          <Button variant="ghost" onClick={() => navigate("/app/resume")}>
            Back to editor
          </Button>
        </header>
        <div className="rounded-[28px] border border-slate-800 bg-slate-900/60 p-6 text-sm text-slate-300">
          Preview templates here to finalize your resume.
        </div>
      </div>
    </div>
  );
}
