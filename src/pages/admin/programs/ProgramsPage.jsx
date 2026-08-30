import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { authApi } from "../../../lib/api";
import { useAuth } from "../../../context/AuthContext";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";
import { Textarea } from "../../../components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../../components/ui/select";
import { Checkbox } from "../../../components/ui/checkbox";
import { DEFAULT_PROGRAM_FIELDS } from "../../../components/programs/DynamicFormFields";
import { DEFAULT_PROGRAM_PAGE } from "../../../components/programs/pageContent";
import ImageUrlField from "../../../components/admin/ImageUrlField";
import { Plus, Trash2, ExternalLink } from "lucide-react";
import { PageToolbar } from "../../../components/admin/PageToolbar";

function slugify(text) {
  return String(text || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function toLocalInput(value) {
  if (!value) return "";
  try {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "";
    const pad = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  } catch {
    return "";
  }
}

function fromLocalInput(value) {
  if (!value) return "";
  try {
    return new Date(value).toISOString();
  } catch {
    return "";
  }
}

function registrationStatus(p) {
  const now = Date.now();
  if (!p.is_active) return { label: "Inactive", tone: "bg-gray-100 text-gray-600" };
  if (!p.allow_public_registration) return { label: "Public form off", tone: "bg-gray-100 text-gray-600" };
  const opens = p.registration_opens_at ? new Date(p.registration_opens_at).getTime() : null;
  const closes = p.registration_closes_at ? new Date(p.registration_closes_at).getTime() : null;
  if (opens && opens > now) return { label: "Opens later", tone: "bg-blue-100 text-blue-800" };
  if (closes && closes < now) return { label: "Registration closed", tone: "bg-amber-100 text-amber-800" };
  return { label: "Registration open", tone: "bg-green-100 text-green-800" };
}

const emptyForm = () => ({
  title: "",
  slug: "",
  type_id: "",
  description: "",
  venue: "",
  admin_email: "",
  starts_at: "",
  ends_at: "",
  registration_opens_at: "",
  registration_closes_at: "",
  is_active: true,
  allow_public_registration: true,
  form_fields: [...DEFAULT_PROGRAM_FIELDS],
  page_content: { ...DEFAULT_PROGRAM_PAGE },
});

function setPage(form, patch) {
  return { ...form, page_content: { ...form.page_content, ...patch } };
}

export default function ProgramsPage() {
  const { can } = useAuth();
  const canEdit = can("programs", "edit");
  const canDelete = can("programs", "delete");
  const [types, setTypes] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState("details");
  const [form, setForm] = useState(emptyForm);
  const [editing, setEditing] = useState(null);
  const [fieldDraft, setFieldDraft] = useState({ name: "", label: "", type: "text", required: false, options: "" });

  const load = async () => {
    const [t, p] = await Promise.all([authApi.listProgramTypes(), authApi.listPrograms()]);
    setTypes(t);
    setPrograms(p);
  };
  useEffect(() => {
    load().catch((e) => toast.error(e.message));
  }, []);

  const reset = () => {
    setForm(emptyForm());
    setEditing(null);
    setOpen(false);
    setTab("details");
  };

  const save = async (e) => {
    e.preventDefault();
    await authApi.upsertProgram(editing?.id || null, {
      ...form,
      slug: form.slug || slugify(form.title),
      starts_at: fromLocalInput(form.starts_at) || null,
      ends_at: fromLocalInput(form.ends_at) || null,
      registration_opens_at: fromLocalInput(form.registration_opens_at) || null,
      registration_closes_at: fromLocalInput(form.registration_closes_at) || null,
      form_fields: form.form_fields,
      page_content: form.page_content,
    });
    toast.success(editing ? "Program updated" : "Program created");
    reset();
    load();
  };

  const addField = () => {
    if (!fieldDraft.name || !fieldDraft.label) return;
    const name = slugify(fieldDraft.name).replace(/-/g, "_");
    const next = {
      name,
      label: fieldDraft.label,
      type: fieldDraft.type,
      required: Boolean(fieldDraft.required),
    };
    if (fieldDraft.type === "select" && fieldDraft.options.trim()) {
      next.options = fieldDraft.options.split(",").map((s) => s.trim()).filter(Boolean);
    }
    setForm({ ...form, form_fields: [...form.form_fields, next] });
    setFieldDraft({ name: "", label: "", type: "text", required: false, options: "" });
  };

  const editProgram = (p) => {
    setEditing(p);
    setForm({
      title: p.title,
      slug: p.slug,
      type_id: p.type_id || "",
      description: p.description || "",
      venue: p.venue || "",
      admin_email: p.admin_email || "",
      starts_at: toLocalInput(p.starts_at),
      ends_at: toLocalInput(p.ends_at),
      registration_opens_at: toLocalInput(p.registration_opens_at),
      registration_closes_at: toLocalInput(p.registration_closes_at),
      is_active: p.is_active,
      allow_public_registration: p.allow_public_registration,
      form_fields: p.form_fields?.length ? p.form_fields : [...DEFAULT_PROGRAM_FIELDS],
      page_content: { ...DEFAULT_PROGRAM_PAGE, ...(p.page_content || {}) },
    });
    setTab("details");
    setOpen(true);
  };

  const pc = form.page_content || DEFAULT_PROGRAM_PAGE;
  const tabs = [
    { id: "details", label: "Program details" },
    { id: "page", label: "Page content & layout" },
    { id: "form", label: "Form fields" },
  ];

  return (
    <div>
      <PageToolbar
        className=""
        align="start"
        left={(
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-red-600 font-semibold">Programs</p>
            <h1 className="text-3xl font-bold mt-2">Church programs</h1>
            <p className="text-gray-500 mt-2 text-sm">
              Each program gets its own public URL <code className="text-xs bg-gray-100 px-1 rounded">/register/your-slug</code>. Customize headings, layout, images, and form fields for every future event.
            </p>
          </div>
        )}
        right={canEdit ? (
          <Button
            className="bg-red-600 hover:bg-red-700"
            onClick={() => {
              reset();
              setOpen(true);
            }}
          >
            <Plus size={16} className="mr-2" /> New program
          </Button>
        ) : null}
      />

      {open && canEdit && (
        <form onSubmit={save} className="mt-6 rounded-2xl border bg-white p-6 space-y-5">
          <div className="flex flex-wrap gap-2 border-b pb-3">
            {tabs.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium ${
                  tab === t.id ? "bg-red-600 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {tab === "details" && (
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Title</Label>
                <Input
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value, slug: form.slug || slugify(e.target.value) })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Public URL slug</Label>
                <Input value={form.slug} onChange={(e) => setForm({ ...form, slug: slugify(e.target.value) })} required />
                <p className="text-xs text-gray-500">
                  Visitors open <span className="font-mono">/register/{form.slug || "your-slug"}</span>
                </p>
              </div>
              <div className="space-y-2">
                <Label>Type</Label>
                <Select value={form.type_id || undefined} onValueChange={(v) => setForm({ ...form, type_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                  <SelectContent>{types.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Admin / coordinator email</Label>
                <Input type="email" value={form.admin_email} onChange={(e) => setForm({ ...form, admin_email: e.target.value })} />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Venue</Label>
                <Input value={form.venue} onChange={(e) => setForm({ ...form, venue: e.target.value })} />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Internal description</Label>
                <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} />
                <p className="text-xs text-gray-500">Used as the public intro if the page intro field is empty.</p>
              </div>
              <div className="space-y-2"><Label>Event starts</Label><Input type="datetime-local" value={form.starts_at} onChange={(e) => setForm({ ...form, starts_at: e.target.value })} /></div>
              <div className="space-y-2"><Label>Event ends</Label><Input type="datetime-local" value={form.ends_at} onChange={(e) => setForm({ ...form, ends_at: e.target.value })} /></div>
              <div className="space-y-2">
                <Label>Registration opens</Label>
                <Input type="datetime-local" value={form.registration_opens_at} onChange={(e) => setForm({ ...form, registration_opens_at: e.target.value })} />
                <p className="text-xs text-gray-500">Leave empty to open immediately.</p>
              </div>
              <div className="space-y-2">
                <Label>Registration closes</Label>
                <Input type="datetime-local" value={form.registration_closes_at} onChange={(e) => setForm({ ...form, registration_closes_at: e.target.value })} />
                <p className="text-xs text-gray-500">Leave empty to keep the form open until you turn it off.</p>
              </div>
              <div className="md:col-span-2 flex gap-4">
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: Boolean(v) })} /> Active
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox checked={form.allow_public_registration} onCheckedChange={(v) => setForm({ ...form, allow_public_registration: Boolean(v) })} /> Allow public registration
                </label>
              </div>
            </div>
          )}

          {tab === "page" && (
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Page layout</Label>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={pc.layout}
                  onChange={(e) => setForm(setPage(form, { layout: e.target.value }))}
                >
                  <option value="centered">Centered (image + copy + form)</option>
                  <option value="split">Split (flyer beside form)</option>
                  <option value="banner">Banner (full-width image, form below)</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label>Theme</Label>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={pc.theme}
                  onChange={(e) => setForm(setPage(form, { theme: e.target.value }))}
                >
                  <option value="warm">Warm (red / gold)</option>
                  <option value="classic">Classic (light)</option>
                  <option value="dark">Dark</option>
                </select>
              </div>
              <div className="space-y-2"><Label>Badge</Label><Input value={pc.badge} onChange={(e) => setForm(setPage(form, { badge: e.target.value }))} placeholder="e.g. FFYC'26" /></div>
              <div className="space-y-2"><Label>Page heading</Label><Input value={pc.heading} onChange={(e) => setForm(setPage(form, { heading: e.target.value }))} placeholder="Defaults to program title" /></div>
              <div className="space-y-2 md:col-span-2"><Label>Subheading</Label><Input value={pc.subheading} onChange={(e) => setForm(setPage(form, { subheading: e.target.value }))} placeholder="e.g. THE REFINER" /></div>
              <div className="space-y-2 md:col-span-2">
                <Label>Intro paragraph</Label>
                <Textarea rows={4} value={pc.intro} onChange={(e) => setForm(setPage(form, { intro: e.target.value }))} />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Highlights line</Label>
                <Input value={pc.highlights} onChange={(e) => setForm(setPage(form, { highlights: e.target.value }))} placeholder="Hosts, live/stream, extra note" />
              </div>
              <div className="md:col-span-2">
                <ImageUrlField id="program-hero" label="Hero / flyer image" value={pc.heroImage} onChange={(v) => setForm(setPage(form, { heroImage: v }))} />
              </div>
              <div className="space-y-2"><Label>Form heading</Label><Input value={pc.formHeading} onChange={(e) => setForm(setPage(form, { formHeading: e.target.value }))} /></div>
              <div className="space-y-2"><Label>Submit button text</Label><Input value={pc.submitLabel} onChange={(e) => setForm(setPage(form, { submitLabel: e.target.value }))} /></div>
              <div className="space-y-2 md:col-span-2">
                <Label>Form intro</Label>
                <Textarea rows={2} value={pc.formIntro} onChange={(e) => setForm(setPage(form, { formIntro: e.target.value }))} />
              </div>
              <div className="space-y-2"><Label>Success heading</Label><Input value={pc.successHeading} onChange={(e) => setForm(setPage(form, { successHeading: e.target.value }))} /></div>
              <div className="space-y-2"><Label>Closed heading</Label><Input value={pc.closedHeading} onChange={(e) => setForm(setPage(form, { closedHeading: e.target.value }))} /></div>
              <div className="space-y-2 md:col-span-2">
                <Label>Success message</Label>
                <Textarea rows={2} value={pc.successBody} onChange={(e) => setForm(setPage(form, { successBody: e.target.value }))} />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Closed / not-open message</Label>
                <Textarea rows={2} value={pc.closedBody} onChange={(e) => setForm(setPage(form, { closedBody: e.target.value }))} placeholder="Leave empty to use the automatic open/close dates" />
              </div>
              <label className="flex items-center gap-2 text-sm">
                <Checkbox checked={pc.showTypeBadge !== false} onCheckedChange={(v) => setForm(setPage(form, { showTypeBadge: Boolean(v) }))} /> Show badge
              </label>
              <label className="flex items-center gap-2 text-sm">
                <Checkbox checked={pc.showVenue !== false} onCheckedChange={(v) => setForm(setPage(form, { showVenue: Boolean(v) }))} /> Show venue
              </label>
              <label className="flex items-center gap-2 text-sm">
                <Checkbox checked={pc.showDates !== false} onCheckedChange={(v) => setForm(setPage(form, { showDates: Boolean(v) }))} /> Show event dates
              </label>
              <label className="flex items-center gap-2 text-sm">
                <Checkbox checked={pc.requireBranch !== false} onCheckedChange={(v) => setForm(setPage(form, { requireBranch: Boolean(v) }))} /> Require church branch
              </label>
            </div>
          )}

          {tab === "form" && (
            <div className="space-y-3">
              <p className="text-sm text-gray-500">Name, email, and phone are always collected. Add extra questions for this program only.</p>
              <ul className="text-sm text-gray-700 space-y-1">
                {form.form_fields.map((f) => (
                  <li key={f.name} className="flex justify-between gap-3 border-b border-gray-50 py-1">
                    <span>
                      {f.label} <span className="text-gray-400">({f.type})</span>
                      {f.required ? " *" : ""}
                      {f.options?.length ? ` — ${f.options.join(", ")}` : ""}
                    </span>
                    {!["full_name", "email", "phone"].includes(f.name) && (
                      <button
                        type="button"
                        className="text-red-600 text-xs"
                        onClick={() => setForm({ ...form, form_fields: form.form_fields.filter((x) => x.name !== f.name) })}
                      >
                        Remove
                      </button>
                    )}
                  </li>
                ))}
              </ul>
              <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-2">
                <Input placeholder="field_name" value={fieldDraft.name} onChange={(e) => setFieldDraft({ ...fieldDraft, name: e.target.value })} />
                <Input placeholder="Label" value={fieldDraft.label} onChange={(e) => setFieldDraft({ ...fieldDraft, label: e.target.value })} />
                <Select value={fieldDraft.type} onValueChange={(v) => setFieldDraft({ ...fieldDraft, type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["text", "email", "tel", "number", "textarea", "select", "checkbox"].map((t) => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  placeholder="Select options (comma)"
                  value={fieldDraft.options}
                  onChange={(e) => setFieldDraft({ ...fieldDraft, options: e.target.value })}
                  disabled={fieldDraft.type !== "select"}
                />
                <Button type="button" variant="outline" onClick={addField}>Add field</Button>
              </div>
              <label className="flex items-center gap-2 text-sm">
                <Checkbox checked={fieldDraft.required} onCheckedChange={(v) => setFieldDraft({ ...fieldDraft, required: Boolean(v) })} /> New field is required
              </label>
            </div>
          )}

          <div className="flex gap-2 pt-2 border-t">
            <Button type="submit" className="bg-red-600 hover:bg-red-700">{editing ? "Save changes" : "Create program"}</Button>
            <Button type="button" variant="outline" onClick={reset}>Cancel</Button>
          </div>
        </form>
      )}

      <div className="mt-8 grid gap-4">
        {programs.map((p) => {
          const status = registrationStatus(p);
          return (
            <div key={p.id} className="rounded-2xl border bg-white p-5 flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-semibold text-lg">{p.title}</h3>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${status.tone}`}>{status.label}</span>
                </div>
                <p className="text-sm text-gray-500 mt-1">{p.type_name} · {p.registration_count || 0} registrations</p>
                <p className="text-xs text-gray-400 mt-1">
                  Form open: {p.registration_opens_at ? new Date(p.registration_opens_at).toLocaleString("en-GB") : "now"}
                  {" → "}
                  {p.registration_closes_at ? new Date(p.registration_closes_at).toLocaleString("en-GB") : "no close date"}
                </p>
                <Link to={`/register/${p.slug}`} target="_blank" className="inline-flex items-center gap-1 text-sm text-red-600 mt-2 hover:underline">
                  /register/{p.slug} <ExternalLink size={12} />
                </Link>
              </div>
              <div className="flex gap-2">
                <Button asChild variant="outline" size="sm"><Link to={`/admin/registrations/programs?program=${p.id}`}>Registrations</Link></Button>
                {canEdit && <Button size="sm" variant="outline" onClick={() => editProgram(p)}>Edit</Button>}
                {canDelete && (
                  <Button size="sm" variant="outline" className="text-red-600" onClick={async () => { await authApi.deleteProgram(p.id); load(); }}>
                    <Trash2 size={14} />
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
