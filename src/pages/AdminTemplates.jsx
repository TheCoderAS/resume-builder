import { useEffect, useMemo, useState } from "react";
import {
  addDoc,
  collection,
  doc,
  getDocs,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import Button from "../components/Button.jsx";
import Input from "../components/Input.jsx";
import { useAuth } from "../contexts/AuthContext.jsx";
import { db } from "../firebase.js";

const STATUS_OPTIONS = ["active", "rejected", "featured", "draft"];
const EMPTY_FORM = {
  name: "",
  category: "",
  creatorName: "",
  thumbnailUrl: "",
  tags: "",
  status: "draft",
  layout: "",
  styles: "",
};

const formatJsonField = (value) =>
  value ? JSON.stringify(value, null, 2) : "";

const parseJsonField = (value, label) => {
  if (!value.trim()) return undefined;
  try {
    return JSON.parse(value);
  } catch (error) {
    throw new Error(`${label} must be valid JSON.`);
  }
};

export default function AdminTemplates() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [formError, setFormError] = useState("");
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState(null);
  const [statusUpdatingId, setStatusUpdatingId] = useState(null);

  const statusSummary = useMemo(() => {
    return templates.reduce((acc, template) => {
      const status = template.status ?? "draft";
      acc[status] = (acc[status] ?? 0) + 1;
      return acc;
    }, {});
  }, [templates]);

  const loadTemplates = async () => {
    setLoading(true);
    setError("");
    try {
      const snapshot = await getDocs(collection(db, "templates"));
      const nextTemplates = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
      }));
      setTemplates(nextTemplates);
    } catch (fetchError) {
      setError("Unable to load templates right now.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTemplates();
  }, []);

  const handleStatusChange = async (templateId, status) => {
    setStatusUpdatingId(templateId);
    try {
      await updateDoc(doc(db, "templates", templateId), {
        status,
        updatedAt: serverTimestamp(),
      });
      setTemplates((prev) =>
        prev.map((template) =>
          template.id === templateId ? { ...template, status } : template
        )
      );
    } catch (updateError) {
      setError("Unable to update template status.");
    } finally {
      setStatusUpdatingId(null);
    }
  };

  const handleEditTemplate = (template) => {
    setEditingId(template.id);
    setFormError("");
    setFormData({
      name: template.name ?? "",
      category: template.category ?? "",
      creatorName: template.creatorName ?? "",
      thumbnailUrl: template.thumbnailUrl ?? "",
      tags: template.tags?.join(", ") ?? "",
      status: template.status ?? "draft",
      layout: formatJsonField(template.layout),
      styles: formatJsonField(template.styles),
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleFormChange = (field) => (event) => {
    setFormData((prev) => ({ ...prev, [field]: event.target.value }));
  };

  const resetForm = () => {
    setFormData(EMPTY_FORM);
    setEditingId(null);
    setFormError("");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!user) return;

    setSaving(true);
    setFormError("");

    try {
      const layout = parseJsonField(formData.layout, "Layout");
      const styles = parseJsonField(formData.styles, "Styles");
      const tags = formData.tags
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean);

      const payload = {
        name: formData.name.trim() || "Untitled template",
        category: formData.category.trim() || "Professional",
        creatorName: formData.creatorName.trim() || "Resume Studio",
        thumbnailUrl: formData.thumbnailUrl.trim() || "",
        tags,
        status: formData.status,
        layout: layout ?? null,
        styles: styles ?? null,
        ownerId: user.uid,
        type: "admin",
        updatedAt: serverTimestamp(),
      };

      if (editingId) {
        await updateDoc(doc(db, "templates", editingId), payload);
      } else {
        await addDoc(collection(db, "templates"), {
          ...payload,
          createdAt: serverTimestamp(),
        });
      }

      await loadTemplates();
      resetForm();
    } catch (submitError) {
      setFormError(submitError.message || "Unable to save template.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 px-6 py-12 text-slate-100">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-slate-100">
              Admin templates
            </h1>
            <p className="mt-1 text-sm text-slate-300">
              Approve, reject, feature, and upload templates for the gallery.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button variant="ghost" onClick={() => navigate("/app")}>
              Back to dashboard
            </Button>
            <Button variant="ghost" onClick={loadTemplates}>
              Refresh
            </Button>
          </div>
        </header>

        <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-[28px] border border-slate-800 bg-slate-900/60 p-6">
            <h2 className="text-lg font-semibold text-slate-100">
              Upload or edit a template
            </h2>
            <p className="mt-1 text-sm text-slate-300">
              Paste template JSON from the playground or upload a new layout.
            </p>
            <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
              <Input
                label="Template name"
                value={formData.name}
                onChange={handleFormChange("name")}
                placeholder="Nimbus"
                required
              />
              <div className="grid gap-4 md:grid-cols-2">
                <Input
                  label="Category"
                  value={formData.category}
                  onChange={handleFormChange("category")}
                  placeholder="Professional"
                />
                <Input
                  label="Creator name"
                  value={formData.creatorName}
                  onChange={handleFormChange("creatorName")}
                  placeholder="Resume Studio"
                />
              </div>
              <Input
                label="Thumbnail URL"
                value={formData.thumbnailUrl}
                onChange={handleFormChange("thumbnailUrl")}
                placeholder="https://..."
              />
              <Input
                label="Tags (comma-separated)"
                value={formData.tags}
                onChange={handleFormChange("tags")}
                placeholder="ATS, Minimal"
              />
              <label className="flex flex-col gap-2 text-sm font-medium text-slate-200">
                <span>Status</span>
                <select
                  value={formData.status}
                  onChange={handleFormChange("status")}
                  className="rounded-2xl border border-slate-800 bg-slate-950/70 px-4 py-3 text-slate-100"
                >
                  {STATUS_OPTIONS.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-2 text-sm font-medium text-slate-200">
                <span>Layout JSON</span>
                <textarea
                  rows={6}
                  value={formData.layout}
                  onChange={handleFormChange("layout")}
                  placeholder={'{ "sections": [] }'}
                  className="rounded-2xl border border-slate-800 bg-slate-950/70 px-4 py-3 text-sm text-slate-100"
                />
              </label>
              <label className="flex flex-col gap-2 text-sm font-medium text-slate-200">
                <span>Styles JSON</span>
                <textarea
                  rows={6}
                  value={formData.styles}
                  onChange={handleFormChange("styles")}
                  placeholder={'{ "colors": {} }'}
                  className="rounded-2xl border border-slate-800 bg-slate-950/70 px-4 py-3 text-sm text-slate-100"
                />
              </label>
              {formError ? (
                <div className="rounded-2xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
                  {formError}
                </div>
              ) : null}
              <div className="flex flex-wrap gap-3">
                <Button type="submit" disabled={saving}>
                  {saving
                    ? "Saving..."
                    : editingId
                    ? "Update template"
                    : "Upload template"}
                </Button>
                <Button type="button" variant="ghost" onClick={resetForm}>
                  {editingId ? "Cancel edit" : "Clear form"}
                </Button>
              </div>
            </form>
          </div>

          <div className="flex flex-col gap-4 rounded-[28px] border border-slate-800 bg-slate-900/60 p-6">
            <h2 className="text-lg font-semibold text-slate-100">
              Status overview
            </h2>
            <div className="grid gap-3 text-sm text-slate-200">
              {Object.keys(statusSummary).length === 0 ? (
                <div className="rounded-2xl border border-slate-800 bg-slate-950/70 px-4 py-3 text-slate-300">
                  No templates loaded yet.
                </div>
              ) : (
                Object.entries(statusSummary).map(([status, count]) => (
                  <div
                    key={status}
                    className="flex items-center justify-between rounded-2xl border border-slate-800 bg-slate-950/70 px-4 py-3"
                  >
                    <span className="capitalize">{status}</span>
                    <span className="text-slate-400">{count}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </section>

        <section className="flex flex-col gap-4">
          <h2 className="text-lg font-semibold text-slate-100">
            Template moderation
          </h2>
          {loading ? (
            <div className="rounded-[24px] border border-slate-800 bg-slate-900/60 p-6 text-sm text-slate-300">
              Loading templates...
            </div>
          ) : null}
          {!loading && error ? (
            <div className="rounded-[24px] border border-rose-500/40 bg-rose-500/10 p-6 text-sm text-rose-100">
              {error}
            </div>
          ) : null}
          {!loading && !error && templates.length === 0 ? (
            <div className="rounded-[24px] border border-slate-800 bg-slate-900/60 p-6 text-sm text-slate-300">
              No templates found.
            </div>
          ) : null}
          {!loading && !error ? (
            <div className="grid gap-4 md:grid-cols-2">
              {templates.map((template) => (
                <div
                  key={template.id}
                  className="flex h-full flex-col gap-4 rounded-[24px] border border-slate-800 bg-slate-900/60 p-5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-100">
                        {template.name ?? "Untitled template"}
                      </p>
                      <p className="mt-1 text-xs text-slate-400">
                        {template.category ?? "Uncategorized"} ·{" "}
                        {template.creatorName ?? "Resume Studio"}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        Status: {template.status ?? "draft"} · Type:{" "}
                        {template.type ?? "user"}
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => handleEditTemplate(template)}
                    >
                      Edit
                    </Button>
                  </div>
                  {template.thumbnailUrl ? (
                    <div className="overflow-hidden rounded-2xl border border-slate-800">
                      <img
                        src={template.thumbnailUrl}
                        alt={`${template.name ?? "Template"} thumbnail`}
                        className="h-40 w-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className="flex h-40 items-center justify-center rounded-2xl border border-dashed border-slate-700 text-xs uppercase tracking-[0.3em] text-slate-500">
                      No thumbnail
                    </div>
                  )}
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      disabled={statusUpdatingId === template.id}
                      onClick={() => handleStatusChange(template.id, "active")}
                    >
                      Approve
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      disabled={statusUpdatingId === template.id}
                      onClick={() => handleStatusChange(template.id, "rejected")}
                    >
                      Reject
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      disabled={statusUpdatingId === template.id}
                      onClick={() => handleStatusChange(template.id, "featured")}
                    >
                      Feature
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : null}
        </section>
      </div>
    </div>
  );
}
