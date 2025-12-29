import { useEffect, useMemo, useState } from "react";
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import {
  FiArchive,
  FiCheckCircle,
  FiEdit3,
  FiMoreVertical,
  FiStar,
  FiTrash2,
} from "react-icons/fi";
import AppShell from "../components/AppShell.jsx";
import Button from "../components/Button.jsx";
import EmptyState from "../components/EmptyState.jsx";
import ErrorBanner from "../components/ErrorBanner.jsx";
import Input from "../components/Input.jsx";
import LoadingSkeleton from "../components/LoadingSkeleton.jsx";
import PromptModal from "../components/PromptModal.jsx";
import Snackbar from "../components/Snackbar.jsx";
import { useAuth } from "../contexts/AuthContext.jsx";
import { db } from "../firebase.js";

const FILTER_OPTIONS = [
  { label: "All", value: "all" },
  { label: "Admin", value: "admin" },
  { label: "My templates", value: "mine" },
  { label: "Archived", value: "archived" },
];

const getTemplateCategory = (template) =>
  template.category ?? template.tags?.[0] ?? "Professional";

export default function TemplateGallery() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [templates, setTemplates] = useState([]);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [savingId, setSavingId] = useState(null);
  const [defaultTemplateId, setDefaultTemplateId] = useState(() =>
    window.localStorage.getItem("defaultTemplateId")
  );
  const [menuOpenId, setMenuOpenId] = useState(null);
  const [confirmAction, setConfirmAction] = useState(null);
  const [confirming, setConfirming] = useState(false);
  const [toast, setToast] = useState(null);

  const resumeId = useMemo(
    () => window.localStorage.getItem("activeResumeId"),
    []
  );

  useEffect(() => {
    let isMounted = true;

    const loadTemplates = async () => {
      setLoading(true);
      setError("");
      try {
        const templatesRef = collection(db, "templates");
        const publicQuery = query(
          templatesRef,
          where("type", "==", "admin"),
          where("status", "==", "active")
        );
        const [publicSnapshot, userSnapshot] = await Promise.all([
          getDocs(publicQuery),
          user
            ? getDocs(query(templatesRef, where("ownerId", "==", user.uid)))
            : Promise.resolve(null),
        ]);
        const publicTemplates = publicSnapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...docSnap.data(),
        }));
        const userTemplates = userSnapshot
          ? userSnapshot.docs.map((docSnap) => ({
              id: docSnap.id,
              ...docSnap.data(),
            }))
          : [];
        const nextTemplates = [...publicTemplates, ...userTemplates];
        if (isMounted) {
          setTemplates(nextTemplates);
        }
      } catch (fetchError) {
        if (isMounted) {
          setError("Unable to load templates right now.");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadTemplates();

    return () => {
      isMounted = false;
    };
  }, [user]);

  useEffect(() => {
    if (!menuOpenId) return;
    const handleClick = (event) => {
      if (event.target.closest("[data-template-menu='true']")) return;
      setMenuOpenId(null);
    };
    document.addEventListener("click", handleClick);
    return () => {
      document.removeEventListener("click", handleClick);
    };
  }, [menuOpenId]);

  const filteredTemplates = useMemo(() => {
    const queryValue = search.trim().toLowerCase();
    return templates.filter((template) => {
      const category = getTemplateCategory(template);
      const status = template.status ?? "active";
      const isAdminTemplate = template.type === "admin";
      const isUserTemplate = user && template.ownerId === user.uid;
      const matchesFilter = (() => {
        if (filter === "all") return true;
        if (filter === "admin") return isAdminTemplate;
        if (filter === "mine") return isUserTemplate;
        if (filter === "archived") return status === "archived";
        return category.toLowerCase() === filter.toLowerCase();
      })();
      const name = template.name ?? "Untitled template";
      const creator = template.creatorName ?? "Resume Studio";
      const matchesSearch =
        !queryValue ||
        name.toLowerCase().includes(queryValue) ||
        creator.toLowerCase().includes(queryValue);
      return matchesFilter && matchesSearch;
    });
  }, [filter, search, templates, user]);

  const handleSelectTemplate = async (template) => {
    if (!resumeId || !user) return;
    setSavingId(template.id);
    try {
      await setDoc(
        doc(db, "resumes", resumeId),
        {
          userId: user.uid,
          templateId: template.id,
          templateName: template.name ?? "Untitled template",
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
      setToast({
        message: `Template "${template.name ?? "Untitled"}" applied.`,
        variant: "success",
      });
      navigate("/app/resume");
    } catch (error) {
      setToast({
        message: "Unable to apply this template.",
        variant: "error",
      });
    } finally {
      setSavingId(null);
    }
  };

  const handleSetDefault = (templateId) => {
    window.localStorage.setItem("defaultTemplateId", templateId);
    setDefaultTemplateId(templateId);
    setToast({ message: "Default template updated.", variant: "success" });
    setMenuOpenId(null);
  };

  const handleToggleArchive = async (template) => {
    const nextStatus = template.status === "archived" ? "active" : "archived";
    try {
      await updateDoc(doc(db, "templates", template.id), {
        status: nextStatus,
        updatedAt: serverTimestamp(),
      });
      setTemplates((prev) =>
        prev.map((item) =>
          item.id === template.id ? { ...item, status: nextStatus } : item
        )
      );
      setToast({
        message:
          nextStatus === "archived"
            ? "Template archived."
            : "Template restored.",
        variant: "success",
      });
    } catch (error) {
      setToast({
        message: "Unable to update template status.",
        variant: "error",
      });
    } finally {
      setMenuOpenId(null);
    }
  };

  const handleDeleteTemplate = async (template) => {
    if (template.id === defaultTemplateId) {
      setToast({
        message: "Default templates can't be deleted.",
        variant: "error",
      });
      return;
    }
    try {
      await deleteDoc(doc(db, "templates", template.id));
      setTemplates((prev) => prev.filter((item) => item.id !== template.id));
      setToast({ message: "Template deleted.", variant: "success" });
    } catch (error) {
      setToast({ message: "Unable to delete template.", variant: "error" });
    } finally {
      setMenuOpenId(null);
    }
  };

  const handleConfirmAction = async () => {
    if (!confirmAction) return;
    setConfirming(true);
    try {
      if (confirmAction.type === "delete") {
        await handleDeleteTemplate(confirmAction.template);
      } else {
        await handleToggleArchive(confirmAction.template);
      }
    } finally {
      setConfirming(false);
      setConfirmAction(null);
    }
  };

  return (
    <AppShell>
      <div className="flex w-full flex-col gap-6">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="app-title">Template gallery</h1>
            <p className="app-subtitle">
              Pick a layout and style to finish your resume.
            </p>
          </div>
          <Button onClick={() => navigate("/app/template-playground")}>
            New template
          </Button>
        </header>

        {!resumeId ? (
          <div className="rounded-[24px] border border-amber-500/40 bg-amber-500/10 p-4 text-sm text-amber-100">
            Start a resume draft before selecting a template.
          </div>
        ) : null}

        <div className="app-card flex flex-col gap-4">
          <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
            <Input
              label="Search templates"
              placeholder="Search by name or creator"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
            <div className="flex flex-wrap gap-2">
              {FILTER_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setFilter(option.value)}
                  className={`app-pill ${
                    filter === option.value
                      ? "border-emerald-300 bg-emerald-400/10 text-emerald-100"
                      : "border-slate-700 text-slate-300 hover:border-slate-500"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {loading
            ? Array.from({ length: 6 }).map((_, index) => (
                <div key={`skeleton-${index}`} className="app-card">
                  <LoadingSkeleton />
                </div>
              ))
            : null}
          {!loading && error ? (
            <div className="col-span-full">
              <ErrorBanner message={error} />
            </div>
          ) : null}
          {!loading && !error && filteredTemplates.length === 0 ? (
            <div className="col-span-full">
              <EmptyState
                title="No templates match yet"
                description="Try clearing filters or changing your search."
                action={
                  <Button onClick={() => navigate("/app/template-playground")}>
                    Create a new template
                  </Button>
                }
              />
            </div>
          ) : null}
          {!loading && !error
            ? filteredTemplates.map((template) => {
                const category = getTemplateCategory(template);
                const usage = template.usageCount ?? 0;
                const thumbnail = template.thumbnailUrl;
                const isSaving = savingId === template.id;
                const isAdminTemplate = template.type === "admin";
                const isUserTemplate = user && template.ownerId === user.uid;
                const status = template.status ?? "active";
                const isDefaultTemplate =
                  defaultTemplateId && defaultTemplateId === template.id;

                return (
                  <div
                    key={template.id}
                    className="relative flex h-full flex-col gap-4 overflow-hidden rounded-[28px] border border-slate-800 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-5 text-left shadow-[0_18px_40px_rgba(15,23,42,0.45)] transition hover:-translate-y-0.5 hover:border-emerald-400/60"
                  >
                    {isAdminTemplate ? (
                      <div className="absolute right-5 top-5 flex items-center gap-1 rounded-full border border-emerald-400/60 bg-emerald-400/10 px-2 py-1 text-[0.6rem] font-semibold uppercase tracking-[0.2em] text-emerald-100">
                        <FiStar className="h-3 w-3" />
                        Featured
                      </div>
                    ) : null}
                    {isUserTemplate ? (
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          setMenuOpenId((current) =>
                            current === template.id ? null : template.id
                          );
                        }}
                        className="absolute right-5 top-5 rounded-full border border-slate-800 bg-slate-950/70 p-2 text-slate-300 transition hover:border-emerald-400/60 hover:text-emerald-100"
                        aria-label="Open template menu"
                        data-template-menu="true"
                      >
                        <FiMoreVertical className="h-4 w-4" />
                      </button>
                    ) : null}
                    {menuOpenId === template.id && isUserTemplate ? (
                      <div
                        className="absolute right-5 top-14 z-20 w-48 rounded-2xl border border-slate-800 bg-slate-950/95 p-2 text-sm shadow-[0_18px_40px_rgba(15,23,42,0.6)]"
                        data-template-menu="true"
                      >
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            handleSetDefault(template.id);
                          }}
                          disabled={isDefaultTemplate}
                          className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-emerald-100 transition hover:bg-emerald-400/10 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          <FiCheckCircle className="h-4 w-4" />
                          {isDefaultTemplate ? "Default template" : "Set as default"}
                        </button>
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            navigate("/app/template-playground", {
                              state: { templateId: template.id },
                            });
                            setMenuOpenId(null);
                          }}
                          className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-slate-200 transition hover:bg-slate-800"
                        >
                          <FiEdit3 className="h-4 w-4" />
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            setConfirmAction({
                              type: status === "archived" ? "unarchive" : "archive",
                              template,
                            });
                            setMenuOpenId(null);
                          }}
                          className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-slate-200 transition hover:bg-slate-800"
                        >
                          <FiArchive className="h-4 w-4" />
                          {status === "archived" ? "Unarchive" : "Archive"}
                        </button>
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            setConfirmAction({ type: "delete", template });
                            setMenuOpenId(null);
                          }}
                          disabled={isDefaultTemplate}
                          className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-rose-200 transition hover:bg-rose-500/10 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <FiTrash2 className="h-4 w-4" />
                          Delete
                        </button>
                        {isDefaultTemplate ? (
                          <p className="px-3 pb-2 pt-1 text-xs text-emerald-200">
                            Default templates can’t be deleted.
                          </p>
                        ) : null}
                      </div>
                    ) : null}
                    <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-950">
                      <div className="aspect-[4/3] w-full">
                        {thumbnail ? (
                          <img
                            src={thumbnail}
                            alt={`${template.name ?? "Template"} thumbnail`}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-xs uppercase tracking-[0.4em] text-slate-400">
                            <span>{category}</span>
                            <span className="text-[0.55rem] text-slate-500">
                              Template preview
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-1 flex-col gap-3">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-emerald-200">
                          {category}
                        </p>
                        <h2 className="text-lg font-semibold text-slate-100">
                          {template.name ?? "Untitled template"}
                        </h2>
                        {isDefaultTemplate ? (
                          <span className="mt-2 inline-flex items-center rounded-full border border-emerald-400/50 bg-emerald-400/10 px-2 py-1 text-[0.6rem] font-semibold uppercase tracking-[0.3em] text-emerald-100">
                            Default
                          </span>
                        ) : null}
                        <p className="text-sm text-slate-400">
                          Created by {template.creatorName ?? "Resume Studio"}
                        </p>
                      </div>
                      <div className="mt-auto flex flex-wrap items-center justify-between gap-2 text-xs text-slate-300">
                        <span>{usage.toLocaleString()} uses</span>
                        <span className="rounded-full border border-slate-800 px-3 py-1 text-[0.6rem] uppercase tracking-[0.3em] text-slate-400">
                          {status}
                        </span>
                      </div>
                      <Button
                        variant="ghost"
                        onClick={() => handleSelectTemplate(template)}
                        disabled={!resumeId || isSaving}
                      >
                        {isSaving ? "Applying..." : "Use template"}
                      </Button>
                    </div>
                  </div>
                );
              })
            : null}
        </div>
      </div>
      <PromptModal
        open={Boolean(confirmAction)}
        title={
          confirmAction?.type === "delete"
            ? "Delete template?"
            : confirmAction?.type === "archive"
              ? "Archive template?"
              : "Restore template?"
        }
        description={
          confirmAction?.type === "delete"
            ? "This action cannot be undone."
            : "You can change this later from the template menu."
        }
        confirmLabel={
          confirmAction?.type === "delete"
            ? "Delete"
            : confirmAction?.type === "archive"
              ? "Archive"
              : "Restore"
        }
        onConfirm={handleConfirmAction}
        onCancel={() => setConfirmAction(null)}
        busy={confirming}
      />
      <Snackbar
        message={toast?.message}
        variant={toast?.variant}
        onDismiss={() => setToast(null)}
      />
    </AppShell>
  );
}
