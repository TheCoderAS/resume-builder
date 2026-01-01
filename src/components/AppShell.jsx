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

const mobileLinkBase =
  "group flex flex-col items-center gap-1 rounded-2xl px-3 py-2 text-[0.6rem] font-semibold uppercase tracking-wide transition";
const horizontalLinkBase =
  "group flex items-center gap-2 rounded-2xl px-3 py-2 text-sm font-semibold transition";

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
      </header>
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
      <div className="hidden border-b border-slate-900/80 bg-slate-950/70 lg:block">
        <div className="mx-auto w-full max-w-7xl px-4 py-3">
          <nav className="flex flex-wrap items-center justify-start gap-3">
            {NAV_ITEMS.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === "/app"}
                className={({ isActive }) =>
                  `${horizontalLinkBase} ${
                    isActive
                      ? "rounded-2xl bg-emerald-400/10 text-emerald-100"
                      : "text-slate-300 hover:text-slate-100"
                  }`
                }
              >
                <item.icon className="h-4 w-4 text-emerald-200 transition group-hover:text-emerald-100" />
                <span>{item.label}</span>
              </NavLink>
            ))}
          </nav>
        </div>
      </div>
      <div className="app-body">
        <main className="app-main">{children}</main>
      </div>
    </div>
  );
}
