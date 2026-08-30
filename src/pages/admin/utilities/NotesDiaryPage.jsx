import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { toast } from "sonner";
import { NotebookPen, Plus, Trash2 } from "lucide-react";
import { authApi, formatApiError } from "../../../lib/api";
import { noteToDocument } from "../../../lib/downloadDocument";
import { useAuth } from "../../../context/AuthContext";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";
import { Textarea } from "../../../components/ui/textarea";
import { PageToolbar } from "../../../components/admin/PageToolbar";
import { DownloadDocumentButton } from "../../../components/admin/DownloadDocumentButton";

const empty = () => ({
  title: "",
  body: "",
  kind: "note",
  entry_date: new Date().toISOString().slice(0, 10),
});

export default function NotesDiaryPage() {
  const { can } = useAuth();
  const location = useLocation();
  const canEdit = can("utilities", "edit");
  const canDelete = can("utilities", "delete") || canEdit;
  const [kind, setKind] = useState("all");
  const [rows, setRows] = useState([]);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(empty());
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const list = await authApi.listUtilityNotes(kind === "all" ? null : kind);
    setRows(Array.isArray(list) ? list : []);
  };

  useEffect(() => {
    load().catch((e) => toast.error(formatApiError(e.message)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind]);

  useEffect(() => {
    const incoming = location.state;
    if (incoming?.body) {
      setEditing(null);
      setForm({
        ...empty(),
        title: incoming.title || "Dictation",
        body: incoming.body,
        kind: "note",
      });
    }
  }, [location.state]);

  const filtered = useMemo(() => rows, [rows]);

  const save = async (e) => {
    e.preventDefault();
    if (!form.title.trim() && !form.body.trim()) {
      toast.error("Add a title or note body");
      return;
    }
    setSaving(true);
    try {
      await authApi.upsertUtilityNote(editing?.id || null, form);
      toast.success("Saved");
      setEditing(null);
      setForm(empty());
      await load();
    } catch (err) {
      toast.error(formatApiError(err.message));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <p className="text-xs uppercase tracking-[0.25em] text-red-600 font-semibold">Utilities</p>
      <h1 className="text-3xl font-bold mt-2 flex items-center gap-2">
        <NotebookPen className="h-7 w-7 text-red-600" /> Notes & diary
      </h1>
      <p className="text-sm text-gray-500 mt-2 max-w-2xl">
        Private to your admin account. Use notes for tasks and diary entries for dated reflections or meeting minutes.
      </p>

      <PageToolbar
        left={["all", "note", "diary"].map((id) => (
          <Button
            key={id}
            type="button"
            size="sm"
            variant={kind === id ? "default" : "outline"}
            className={kind === id ? "bg-red-600 hover:bg-red-700" : ""}
            onClick={() => setKind(id)}
          >
            {id === "all" ? "All" : id === "note" ? "Notes" : "Diary"}
          </Button>
        ))}
        right={canEdit ? (
          <Button
            className="bg-red-600 hover:bg-red-700"
            onClick={() => { setEditing(null); setForm(empty()); }}
          >
            <Plus className="h-4 w-4 mr-2" /> New entry
          </Button>
        ) : null}
      />

      {canEdit && (
        <form onSubmit={save} className="mt-6 rounded-2xl border bg-white p-5 space-y-4">
          <div className="grid md:grid-cols-3 gap-4">
            <div className="space-y-2 md:col-span-2">
              <Label>Title</Label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Sunday follow-up, prayer list…" />
            </div>
            <div className="space-y-2">
              <Label>Type</Label>
              <select
                className="w-full h-10 rounded-md border px-3 text-sm"
                value={form.kind}
                onChange={(e) => setForm({ ...form, kind: e.target.value })}
              >
                <option value="note">Note</option>
                <option value="diary">Diary</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label>Date</Label>
              <Input type="date" value={form.entry_date} onChange={(e) => setForm({ ...form, entry_date: e.target.value })} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Body</Label>
            <Textarea rows={8} value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="submit" className="bg-red-600 hover:bg-red-700" disabled={saving}>
              {saving ? "Saving…" : editing ? "Update" : "Save"}
            </Button>
            <DownloadDocumentButton
              disabled={!form.title.trim() && !form.body.trim()}
              getDocument={() => noteToDocument(form)}
              label="Download draft"
            />
          </div>
        </form>
      )}

      <div className="mt-6 space-y-3">
        {filtered.length === 0 ? (
          <p className="text-sm text-gray-500 rounded-2xl border bg-white p-8 text-center">No entries yet.</p>
        ) : filtered.map((row) => (
          <div key={row.id} className="rounded-2xl border bg-white p-4 flex gap-4">
            <div className="min-w-0 flex-1">
              <p className="text-[11px] uppercase tracking-widest text-gray-400">
                {row.kind} · {row.entry_date}
              </p>
              <p className="font-semibold mt-1">{row.title || "Untitled"}</p>
              <p className="text-sm text-gray-600 mt-2 whitespace-pre-wrap line-clamp-4">{row.body}</p>
            </div>
            <div className="flex flex-col gap-2 shrink-0">
              <DownloadDocumentButton
                getDocument={() => noteToDocument(row)}
                iconOnly
                variant="ghost"
              />
              {canEdit && (
                <Button size="sm" variant="outline" onClick={() => {
                  setEditing(row);
                  setForm({
                    title: row.title || "",
                    body: row.body || "",
                    kind: row.kind || "note",
                    entry_date: row.entry_date || empty().entry_date,
                  });
                }}>
                  Edit
                </Button>
              )}
              {canDelete && (
                <Button
                  size="icon"
                  variant="ghost"
                  className="text-red-600"
                  onClick={async () => {
                    if (!window.confirm("Delete this entry?")) return;
                    try {
                      await authApi.deleteUtilityNote(row.id);
                      toast.success("Deleted");
                      load();
                    } catch (err) {
                      toast.error(formatApiError(err.message));
                    }
                  }}
                >
                  <Trash2 size={16} />
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
