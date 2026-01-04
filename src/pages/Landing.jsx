import { Link } from "react-router-dom";
import Button from "../components/Button.jsx";

const highlights = [
  {
    title: "Guided section builder",
    copy: "Answer smart prompts and we structure your resume in real time.",
  },
  {
    title: "Design-forward templates",
    copy: "Switch between layouts and instantly preview typography changes.",
  },
  {
    title: "Cloud synced drafts",
    copy: "Save every version and keep working from any device.",
  },
];

const steps = [
  {
    title: "Sign in securely",
    copy: "Use email + password or a single Google click.",
  },
  {
    title: "Fill the essentials",
    copy: "Drag, reorder, and polish your experience sections.",
  },
  {
    title: "Export in minutes",
    copy: "Download a PDF or keep iterating with live previews.",
  },
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -left-20 top-24 h-72 w-72 rounded-full bg-emerald-500/20 blur-[140px]" />
          <div className="absolute right-[-120px] top-10 h-80 w-80 rounded-full bg-sky-500/20 blur-[160px]" />
          <div className="absolute bottom-[-160px] left-1/3 h-72 w-72 rounded-full bg-fuchsia-500/10 blur-[150px]" />
        </div>
        <nav className="relative mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-6 sm:flex-nowrap">
          <Link to="/" className="inline-flex">
            <img
              src="/resumiate.png"
              alt="Resumiate"
              className="h-[56px] w-auto object-contain sm:h-[80px]"
            />
          </Link>
          <div className="flex items-center gap-3 text-sm text-slate-300">
            <Link to="/signup">
              <Button type="button">Get started</Button>
            </Link>
          </div>
        </nav>
        <header className="relative mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 pb-12 pt-10">
          <div className="max-w-3xl space-y-5">
            <h1 className="text-4xl font-semibold text-slate-50 sm:text-6xl">
              A modern resume studio for ambitious careers.
            </h1>
            <p className="text-base text-slate-300 sm:text-lg">
              Craft standout resumes with guided writing, live previews, and
              secure cloud storage. Resumiate keeps every edit fast, focused,
              and beautifully structured.
            </p>
            <div className="flex flex-wrap gap-4">
              <Link to="/signup">
                <Button type="button">Start building</Button>
              </Link>
              <Link to="/login">
                <Button type="button" variant="ghost">
                  I already have an account
                </Button>
              </Link>
            </div>
          </div>
          <div className="grid gap-4 lg:grid-cols-3">
            {highlights.map((item) => (
              <article
                key={item.title}
                className="rounded-[28px] border border-slate-800 bg-slate-900/70 p-6 shadow-[0_24px_70px_rgba(15,23,42,0.7)]"
              >
                <h2 className="text-lg font-semibold text-slate-100">
                  {item.title}
                </h2>
                <p className="mt-3 text-sm text-slate-300">{item.copy}</p>
              </article>
            ))}
          </div>
        </header>
      </div>

      <section className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-6 pb-16">
        <div className="rounded-[32px] border border-slate-800 bg-slate-900/70 p-8">
          <p className="text-xs font-semibold text-slate-400">
            Dashboard ready
          </p>
          <h3 className="mt-3 text-2xl font-semibold text-slate-100">
            One workspace for every resume version.
          </h3>
          <p className="mt-3 text-sm text-slate-300">
            Protected routes keep your drafts safe. Use the dashboard to track
            edits, versions, and exports.
          </p>
        </div>
        <div className="rounded-[32px] border border-emerald-400/40 bg-emerald-500/10 p-8 text-emerald-100">
          <h3 className="text-2xl font-semibold">Start free today</h3>
          <p className="mt-3 text-sm text-emerald-100/80">
            Add Firebase credentials and turn on authentication to go live.
          </p>
          <Link to="/signup" className="mt-5 inline-flex">
            <Button type="button">Create your account</Button>
          </Link>
        </div>
      </section>
    </div>
  );
}
