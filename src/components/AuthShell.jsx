import { Link } from "react-router-dom";

export default function AuthShell({ title, subtitle, children, footnote }) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-950 text-slate-100">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-16 top-12 h-72 w-72 rounded-full bg-emerald-500/20 blur-[120px]" />
        <div className="absolute right-[-120px] top-1/2 h-80 w-80 rounded-full bg-sky-500/20 blur-[140px]" />
        <div className="absolute bottom-[-120px] left-1/3 h-64 w-64 rounded-full bg-fuchsia-500/10 blur-[120px]" />
      </div>
      <div className="relative mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-10 px-6 py-12">
        <Link to="/" className="inline-flex">
          <img
            src="/resumiate.png"
            alt="Resumiate"
            className="h-[80px] w-auto object-contain"
          />
        </Link>
        <div className="grid items-center gap-10 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-4">
            <h1 className="text-4xl font-semibold text-slate-50 sm:text-5xl">
              {title}
            </h1>
            <p className="max-w-xl text-base text-slate-300">{subtitle}</p>
          </div>
          <div className="rounded-[32px] border border-slate-800 bg-slate-900/70 p-6 shadow-[0_30px_80px_rgba(15,23,42,0.65)] sm:p-8">
            {children}
            {footnote ? (
              <p className="mt-6 text-xs text-slate-400">{footnote}</p>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
