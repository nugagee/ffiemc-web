import { useEffect, useMemo, useRef, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { GripVertical, Plus, Save, Trash2 } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useSettings } from "../../context/SettingsContext";
import { getSitePage, pageSection } from "../../data/sitePages";
import { authApi, formatApiError } from "../../lib/api";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Textarea } from "../../components/ui/textarea";
import { Label } from "../../components/ui/label";
import { Card } from "../../components/ui/card";
import ImageUrlField, { isImageField } from "../../components/admin/ImageUrlField";
import { AboutHistoryEditor } from "../../components/admin/about/AboutHistoryEditor";
import { AboutCatechismEditor } from "../../components/admin/about/AboutCatechismEditor";
import { AboutDoctrinesEditor } from "../../components/admin/about/AboutDoctrinesEditor";
import {
  HeroCms,
  EventsCms,
  SermonsCms,
  MinistriesCms,
  TestimoniesCms,
  PrayersCms,
  AnnouncementsCms,
} from "./AdminDashboard";

const CMS = {
  hero: HeroCms,
  events: EventsCms,
  sermons: SermonsCms,
  ministries: MinistriesCms,
  testimonies: TestimoniesCms,
  prayers: PrayersCms,
  announcements: AnnouncementsCms,
};

function Field({ field, value, onChange, disabled }) {
  const id = field.name;
  if (isImageField(field)) {
    return (
      <ImageUrlField
        id={id}
        label={field.label}
        value={value || ""}
        onChange={onChange}
        disabled={disabled}
      />
    );
  }
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{field.label}</Label>
      {field.type === "textarea" ? (
        <Textarea id={id} rows={field.rows || 3} value={value || ""} disabled={disabled} onChange={(e) => onChange(e.target.value)} />
      ) : (
        <Input id={id} value={value || ""} disabled={disabled} onChange={(e) => onChange(e.target.value)} />
      )}
    </div>
  );
}

function CopyEditor({ pageKey, section, canEdit }) {
  const { settings, refresh } = useSettings();
  const initial = pageSection(settings, pageKey, section.key);
  const [form, setForm] = useState(initial);
  const [saving, setSaving] = useState(false);
  const dirty = useRef(false);

  useEffect(() => {
    if (dirty.current) return;
    setForm(pageSection(settings, pageKey, section.key));
  }, [settings, pageKey, section.key]);

  const save = async () => {
    setSaving(true);
    try {
      await authApi.updatePageSection(pageKey, section.key, form);
      dirty.current = false;
      await refresh({ notify: true });
      toast.success(`${section.label} saved`);
    } catch (err) {
      toast.error(formatApiError(err.message) || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const setField = (name, value) => {
    dirty.current = true;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  return (
    <Card className="min-w-0 overflow-hidden p-3 sm:p-5 space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h3 className="font-semibold text-base sm:text-lg break-words min-w-0">{section.label}</h3>
        {canEdit && (
          <Button onClick={save} disabled={saving} className="bg-red-600 hover:bg-red-700 w-full sm:w-auto shrink-0">
            <Save className="h-4 w-4 mr-2" />{saving ? "Saving…" : "Save"}
          </Button>
        )}
      </div>
      <fieldset disabled={!canEdit} className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 border-0 p-0 min-w-0">
        {section.fields.map((field) => (
          <div key={field.name} className={`min-w-0 ${field.type === "textarea" || isImageField(field) ? "md:col-span-2" : ""}`}>
            <Field field={field} value={form[field.name]} onChange={(v) => setField(field.name, v)} disabled={!canEdit} />
          </div>
        ))}
      </fieldset>
    </Card>
  );
}

function ListEditor({ pageKey, section, canEdit }) {
  const { settings, refresh } = useSettings();
  const initial = pageSection(settings, pageKey, section.key);
  const [form, setForm] = useState(initial);
  const [saving, setSaving] = useState(false);
  const dragIndex = useRef(null);
  const dirty = useRef(false);
  const items = form.items || [];
  const isLeadershipList = pageKey === "leadership" && (section.key === "team" || section.key === "youthEscos");
  const itemNoun = section.key === "youthEscos" ? "executive" : section.key === "team" ? "leader" : "item";

  useEffect(() => {
    if (dirty.current) return;
    setForm(pageSection(settings, pageKey, section.key));
  }, [settings, pageKey, section.key]);

  const save = async () => {
    setSaving(true);
    try {
      await authApi.updatePageSection(pageKey, section.key, form);
      dirty.current = false;
      await refresh({ notify: true });
      toast.success(`${section.label} saved`);
    } catch (err) {
      toast.error(formatApiError(err.message) || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const emptyItem = () => Object.fromEntries((section.itemFields || []).map((f) => [f.name, ""]));

  const updateForm = (next) => {
    dirty.current = true;
    setForm(next);
  };

  const moveItem = (from, to) => {
    if (from === to || from == null || to == null) return;
    const next = [...items];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    updateForm({ ...form, items: next });
  };

  return (
    <Card className="min-w-0 overflow-hidden p-3 sm:p-5 space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h3 className="font-semibold text-base sm:text-lg break-words">{section.label}</h3>
          {section.hint ? <p className="text-xs text-gray-500 mt-1 leading-relaxed">{section.hint}</p> : null}
          {canEdit && items.length > 1 ? (
            <p className="text-xs text-gray-500 mt-1">Drag the handle to rearrange, then save.</p>
          ) : null}
        </div>
        {canEdit && (
          <Button
            onClick={save}
            disabled={saving}
            className="hidden sm:inline-flex bg-red-600 hover:bg-red-700 w-full sm:w-auto shrink-0"
          >
            <Save className="h-4 w-4 mr-2" />{saving ? "Saving…" : "Save"}
          </Button>
        )}
      </div>
      <fieldset disabled={!canEdit} className="space-y-3 sm:space-y-4 border-0 p-0 min-w-0">
        {section.headingFields?.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 rounded-xl border border-gray-100 bg-gray-50/70 p-3 sm:p-4">
            {section.headingFields.map((field) => (
              <div key={field.name} className={`min-w-0 ${field.type === "textarea" || isImageField(field) ? "md:col-span-2" : ""}`}>
                <Field field={field} value={form[field.name]} onChange={(v) => updateForm({ ...form, [field.name]: v })} />
              </div>
            ))}
          </div>
        )}
        {items.map((item, index) => {
          const previewName = item.name || item.title || `${itemNoun} ${index + 1}`;
          const previewRole = item.post || item.position || "";
          const previewImage = item.image || "";
          return (
            <div
              key={index}
              className="min-w-0 overflow-hidden rounded-xl border border-gray-100 bg-white p-3 sm:p-4 space-y-3"
              onDragOver={(e) => {
                if (dragIndex.current === null) return;
                e.preventDefault();
                if (dragIndex.current === index) return;
                moveItem(dragIndex.current, index);
                dragIndex.current = index;
              }}
            >
              <div className="flex items-start justify-between gap-2 min-w-0">
                <div className="flex items-start gap-2 sm:gap-3 min-w-0 flex-1">
                  {canEdit ? (
                    <button
                      type="button"
                      className="mt-0.5 h-9 w-9 shrink-0 inline-flex items-center justify-center rounded-lg border border-gray-200 text-gray-400 hover:bg-gray-50 cursor-grab active:cursor-grabbing touch-none"
                      aria-label={`Reorder ${previewName}`}
                      draggable
                      onDragStart={() => { dragIndex.current = index; }}
                      onDragEnd={() => { dragIndex.current = null; }}
                    >
                      <GripVertical className="h-4 w-4" />
                    </button>
                  ) : null}
                  {isLeadershipList ? (
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <div className="h-11 w-11 sm:h-12 sm:w-12 shrink-0 overflow-hidden rounded-full bg-gray-100 border border-gray-200">
                        {previewImage ? (
                          <img src={previewImage} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <div className="h-full w-full flex items-center justify-center text-sm font-semibold text-red-500">
                            {String(previewName).charAt(0).toUpperCase() || "?"}
                          </div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{previewName}</p>
                        {previewRole ? (
                          <p className="text-xs text-gray-500 line-clamp-2 break-words">{previewRole}</p>
                        ) : (
                          <p className="text-[11px] uppercase tracking-wider text-gray-400">
                            {itemNoun} {index + 1}
                          </p>
                        )}
                      </div>
                    </div>
                  ) : (
                    <span className="text-xs uppercase tracking-wider text-gray-400 pt-2">
                      Item {index + 1}
                    </span>
                  )}
                </div>
                {canEdit ? (
                  <Button
                    type="button"
                    size="icon"
                    variant="outline"
                    className="text-red-600 shrink-0"
                    onClick={() => updateForm({ ...form, items: items.filter((_, i) => i !== index) })}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                ) : null}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 min-w-0">
                {section.itemFields.map((field) => (
                  <div key={field.name} className={`min-w-0 ${field.type === "textarea" || isImageField(field) ? "md:col-span-2" : ""}`}>
                    <Field
                      field={field}
                      value={item[field.name]}
                      onChange={(v) => {
                        const next = [...items];
                        next[index] = { ...item, [field.name]: v };
                        updateForm({ ...form, items: next });
                      }}
                    />
                  </div>
                ))}
              </div>
            </div>
          );
        })}
        {canEdit ? (
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between pt-1">
            <Button
              type="button"
              variant="outline"
              className="w-full sm:w-auto"
              onClick={() => updateForm({ ...form, items: [...items, emptyItem()] })}
            >
              <Plus className="h-4 w-4 mr-2" />Add {itemNoun}
            </Button>
            <Button
              type="button"
              onClick={save}
              disabled={saving}
              className="bg-red-600 hover:bg-red-700 w-full sm:w-auto"
            >
              <Save className="h-4 w-4 mr-2" />{saving ? "Saving…" : "Save"}
            </Button>
          </div>
        ) : null}
      </fieldset>
    </Card>
  );
}

export default function PageEditor() {
  const { pageKey } = useParams();
  const { can } = useAuth();
  const page = useMemo(() => getSitePage(pageKey), [pageKey]);

  if (!page) return <Navigate to="/admin" replace />;
  if (!can(page.key, "view")) return <Navigate to="/admin" replace />;

  const visibleSections = page.sections.filter((section) => can(`${page.key}.${section.key}`, "view"));

  return (
    <div className="space-y-4 sm:space-y-6 min-w-0">
      <div className="min-w-0">
        <p className="text-xs uppercase tracking-[0.25em] text-red-600 font-semibold">Website page</p>
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold mt-2 break-words">{page.label}</h1>
        <p className="text-sm text-gray-500 mt-2">
          Edit only the contents this account is allowed to change. Unpermitted sections stay hidden.
        </p>
      </div>
      {visibleSections.map((section) => {
        const canEdit = can(`${page.key}.${section.key}`, "edit");
        if (section.cms === "blog") {
          return (
            <div key={`${page.key}-${section.key}`} className="rounded-2xl bg-white border border-gray-100 p-4 sm:p-5">
              <h2 className="text-lg font-semibold">Blog posts</h2>
              <p className="text-sm text-gray-500 mt-1">
                Create, format, schedule, and publish posts from the Blog workspace.
              </p>
              <Link
                to="/admin/blog"
                className="inline-flex mt-4 items-center rounded-xl bg-red-600 px-4 py-2 text-sm text-white hover:bg-red-700 transition-colors"
              >
                Open blog workspace
              </Link>
            </div>
          );
        }
        if (section.key === "inbox" && page.key === "prayer") {
          return (
            <div key={`${page.key}-${section.key}`} className="rounded-2xl bg-white border border-gray-100 p-4 sm:p-5">
              <h2 className="text-lg font-semibold">Prayer requests</h2>
              <p className="text-sm text-gray-500 mt-1">
                Review conversations, assign pastors, and reply to visitors from the prayer desk.
              </p>
              <Link
                to="/admin/prayer"
                className="inline-flex mt-4 items-center rounded-xl bg-red-600 px-4 py-2 text-sm text-white hover:bg-red-700 transition-colors"
              >
                Open prayer inbox
              </Link>
            </div>
          );
        }
        if (section.key === "pastors") {
          return (
            <div key={`${page.key}-${section.key}`} className="rounded-2xl bg-white border border-gray-100 p-4 sm:p-5">
              <h2 className="text-lg font-semibold">Prayer pastors</h2>
              <p className="text-sm text-gray-500 mt-1">
                Create pastor logins and email their username and temporary password.
              </p>
              <Link
                to="/admin/prayer/pastors"
                className="inline-flex mt-4 items-center rounded-xl bg-red-600 px-4 py-2 text-sm text-white hover:bg-red-700 transition-colors"
              >
                Manage pastors
              </Link>
            </div>
          );
        }
        if (section.cms === "announcements") {
          return (
            <div key={`${page.key}-${section.key}`} className="rounded-2xl bg-white border border-gray-100 p-4 sm:p-5">
              <h2 className="text-lg font-semibold">Event banners</h2>
              <p className="text-sm text-gray-500 mt-1">
                Create popup and sticky banners, then review analytics and visitor activity from the Banners workspace.
              </p>
              <Link
                to="/admin/banners"
                className="inline-flex mt-4 items-center rounded-xl bg-red-600 px-4 py-2 text-sm text-white hover:bg-red-700 transition-colors"
              >
                Open banners workspace
              </Link>
            </div>
          );
        }
        if (section.kind === "collection" || section.kind === "inbox") {
          const Cms = CMS[section.cms];
          return Cms ? (
            <div key={`${page.key}-${section.key}`} className="rounded-2xl bg-white border border-gray-100 p-4 sm:p-5">
              <Cms />
            </div>
          ) : null;
        }
        if (section.kind === "history") {
          return <AboutHistoryEditor key={`${page.key}-${section.key}`} canEdit={canEdit} />;
        }
        if (section.kind === "doctrines") {
          return <AboutDoctrinesEditor key={`${page.key}-${section.key}`} canEdit={canEdit} />;
        }
        if (section.kind === "catechism") {
          return <AboutCatechismEditor key={`${page.key}-${section.key}`} canEdit={canEdit} />;
        }
        if (section.kind === "list") {
          return <ListEditor key={`${page.key}-${section.key}`} pageKey={page.key} section={section} canEdit={canEdit} />;
        }
        return <CopyEditor key={`${page.key}-${section.key}`} pageKey={page.key} section={section} canEdit={canEdit} />;
      })}
    </div>
  );
}
