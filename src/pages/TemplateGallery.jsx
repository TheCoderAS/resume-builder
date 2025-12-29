import { useEffect, useMemo, useState } from "react";
import {
  collection,
  doc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  where,
} from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import AppShell from "../components/AppShell.jsx";
import Button from "../components/Button.jsx";
import EmptyState from "../components/EmptyState.jsx";
import ErrorBanner from "../components/ErrorBanner.jsx";
import Input from "../components/Input.jsx";
import LoadingSkeleton from "../components/LoadingSkeleton.jsx";
import Snackbar from "../components/Snackbar.jsx";
import { useAuth } from "../contexts/AuthContext.jsx";
import { db } from "../firebase.js";

const FILTER_OPTIONS = ["All", "Professional", "Creative", "Minimal", "ATS"];

const getTemplateCategory = (template) =>
  template.category ?? template.tags?.[0] ?? "Professional";

export default function TemplateGallery() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [templates, setTemplates] = useState([]);
  const [filter, setFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [savingId, setSavingId] = useState(null);
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

  const filteredTemplates = useMemo(() => {
    const queryValue = search.trim().toLowerCase();
    return templates.filter((template) => {
      const category = getTemplateCategory(template);
      const matchesFilter =
        filter === "All" || category.toLowerCase() === filter.toLowerCase();
      const name = template.name ?? "Untitled template";
      const creator = template.creatorName ?? "Resume Studio";
      const matchesSearch =
        !queryValue ||
        name.toLowerCase().includes(queryValue) ||
        creator.toLowerCase().includes(queryValue);
      return matchesFilter && matchesSearch;
    });
  }, [filter, search, templates]);

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
          <Button variant="ghost" onClick={() => navigate("/app/resume")}>Back to editor</Button>
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
                  key={option}
                  type="button"
                  onClick={() => setFilter(option)}
                  className={`app-pill ${
                    filter === option
                      ? "border-emerald-300 bg-emerald-400/10 text-emerald-100"
                      : "border-slate-700 text-slate-300 hover:border-slate-500"
                  }`}
                >
                  {option}
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
              />
            </div>
          ) : null}
          {!loading && !error
            ? filteredTemplates.map((template) => {
                const category = getTemplateCategory(template);
                const usage = template.usageCount ?? 0;
                const thumbnail = template.thumbnailUrl;
                const isSaving = savingId === template.id;

                return (
                  <button
                    key={template.id}
                    type="button"
                    onClick={() => handleSelectTemplate(template)}
                    disabled={!resumeId || isSaving}
                    className="flex h-full flex-col gap-4 rounded-[28px] border border-slate-800 bg-slate-900/60 p-5 text-left transition hover:-translate-y-0.5 hover:border-emerald-400/60 hover:shadow-[0_16px_32px_rgba(15,23,42,0.45)] disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-950">
                      <div className="aspect-[4/3] w-full">
                        {thumbnail ? (
                          <img
                            src={thumbnail}
                            alt={`${template.name ?? "Template"} thumbnail`}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-xs uppercase tracking-[0.4em] text-slate-500">
                            {category}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-1 flex-col gap-2">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-emerald-200">
                          {category}
                        </p>
                        <h2 className="text-lg font-semibold text-slate-100">
                          {template.name ?? "Untitled template"}
                        </h2>
                        <p className="text-sm text-slate-400">
                          Created by {template.creatorName ?? "Resume Studio"}
                        </p>
                      </div>
                      <div className="mt-auto flex items-center justify-between text-sm text-slate-300">
                        <span>{usage.toLocaleString()} uses</span>
                        <span className="text-xs font-semibold text-emerald-200">
                          {isSaving ? "Applying..." : "Select template"}
                        </span>
                      </div>
                    </div>
                  </button>
                );
              })
            : null}
        </div>
      </div>
      <Snackbar
        message={toast?.message}
        variant={toast?.variant}
        onDismiss={() => setToast(null)}
      />
    </AppShell>
  );
}
