import { NavLink, useNavigate } from "react-router-dom";
import { FiFileText, FiHome, FiLayout, FiUser } from "react-icons/fi";
import Button from "./Button.jsx";

const NAV_ITEMS = [
  {
    label: "Dashboard",
    description: "Workspace overview",
    to: "/app",
    icon: FiHome,
  },
  {
    label: "Resumes",
    description: "Saved drafts",
    to: "/app/drafts",
    icon: FiFileText,
  },
  {
    label: "Templates",
    description: "Pick a layout",
    to: "/app/templates",
    icon: FiLayout,
  },
  {
    label: "Profile",
    description: "Account settings",
    to: "/app/profile",
    icon: FiUser,
  },
];

const linkBase =
  "group flex items-center gap-3 rounded-2xl border px-4 py-3 text-sm font-semibold transition";
const mobileLinkBase =
  "group flex flex-col items-center gap-1 rounded-2xl px-3 py-2 text-[0.6rem] font-semibold uppercase tracking-wide transition";

export default function AppShell({ children }) {
  const navigate = useNavigate();

  return (
    <div className="app-shell">
      <header className="app-topbar">
        <div className="app-topbar-inner">
          <div className="flex items-center gap-3">
            <img
              src="/resumiate.png"
              alt="Resumiate"
              className="h-9 w-auto shrink-0 object-contain"
            />
          </div>
          <div className="flex flex-nowrap items-center gap-2">
            <Button
              variant="ghost"
              onClick={() => navigate("/app/templates")}
              className="whitespace-nowrap px-3 py-2 text-xs sm:px-5 sm:py-3 sm:text-sm"
            >
              <span className="sm:hidden">Templates</span>
              <span className="hidden sm:inline">Browse templates</span>
            </Button>
            <Button
              onClick={() => navigate("/app/resume")}
              className="whitespace-nowrap px-3 py-2 text-xs sm:px-5 sm:py-3 sm:text-sm"
            >
              <span className="sm:hidden">Resume</span>
              <span className="hidden sm:inline">New resume</span>
            </Button>
          </div>
        </div>
        <div className="app-topbar-nav lg:hidden">
          <nav className="flex w-full items-center justify-around gap-2 px-4 py-3">
            {NAV_ITEMS.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === "/app"}
                className={({ isActive }) =>
                  `${mobileLinkBase} ${
                    isActive
                      ? "bg-emerald-400/10 text-emerald-100"
                      : "text-slate-300 hover:bg-slate-900/60"
                  }`
                }
              >
                <item.icon className="h-4 w-4" />
                <span>{item.label}</span>
              </NavLink>
            ))}
          </nav>
        </div>
      </header>
      <div className="app-body">
        <aside className="app-sidebar">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
            Navigation
          </p>
          <nav className="mt-4 flex flex-col gap-2">
            {NAV_ITEMS.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === "/app"}
                className={({ isActive }) =>
                  `${linkBase} ${
                    isActive
                      ? "border-emerald-400/60 bg-emerald-400/10 text-emerald-100"
                      : "border-transparent text-slate-300 hover:border-slate-700 hover:bg-slate-900/60 hover:text-slate-100"
                  }`
                }
              >
                <item.icon className="h-4 w-4 text-emerald-200 transition group-hover:text-emerald-100" />
                <div className="text-left">
                  <p>{item.label}</p>
                  <p className="text-xs font-normal text-slate-400">
                    {item.description}
                  </p>
                </div>
              </NavLink>
            ))}
          </nav>
          <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-950/70 p-4 text-xs text-slate-400">
            Manage every step of your resume from one unified workspace.
          </div>
        </aside>
        <main className="app-main">{children}</main>
      </div>
    </div>
  );
}
