import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { useAuth } from "../../../context/AuthContext";
import { useSettings } from "../../../context/SettingsContext";
import api, { authApi, formatApiError } from "../../../lib/api";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";
import {
  mergeFormDropdowns,
  slugifyFieldKey,
  MEMBER_FIELD_KEYS,
} from "../../../data/formDropdowns";

export default function FormDropdownsPage() {
  const { can } = useAuth();
  const { settings, refresh } = useSettings();
  const canEdit = can("form_dropdowns", "edit") || can("church_members", "edit");
  const catalogs = useMemo(() => mergeFormDropdowns(settings.formDropdowns), [settings.formDropdowns]);
  const [selectedId, setSelectedId] = useState(catalogs[0]?.id || "");
  const [draft, setDraft] = useState(null);
  const [newOption, setNewOption] = useState("");
  const [newLabel, setNewLabel] = useState("");
  const [saving, setSaving] = useState(false);

  const selected = draft && draft.id === selectedId
    ? draft
    : catalogs.find((c) => c.id === selectedId) || catalogs[0];

  const setSelected = (id) => {
    setSelectedId(id);
    setDraft(null);
    setNewOption("");
  };

  const updateSelected = (patch) => {
    const current = selected || catalogs[0];
    setDraft({ ...current, ...patch });
    setSelectedId(current.id);
  };

  const working = catalogs.map((c) => (draft && draft.id === c.id ? draft : c));

  const persist = async (next) => {
    setSaving(true);
    try {
      const payload = next.map(({ id, label, fieldKey, options, locked }) => ({
        id, label, fieldKey, options, locked: Boolean(locked),
      }));
      try {
        await authApi.saveFormDropdowns(payload);
      } catch {
        const { data } = await api.get("/settings");
        await api.put("/settings", { ...(data || {}), formDropdowns: payload });
      }
      await refresh({ notify: true });
      toast.success("Dropdown lists saved");
      setDraft(null);
    } catch (err) {
      toast.error(formatApiError(err.message || err));
    } finally {
      setSaving(false);
    }
  };

  const addOption = () => {
    const value = newOption.trim();
    if (!value || !selected) return;
    if ((selected.options || []).includes(value)) {
      toast.error("That option already exists");
      return;
    }
    updateSelected({ options: [...(selected.options || []), value] });
    setNewOption("");
  };

  const removeOption = (opt) => {
    updateSelected({ options: (selected.options || []).filter((o) => o !== opt) });
  };

  const createCatalog = () => {
    const label = newLabel.trim();
    if (!label) return;
    const id = slugifyFieldKey(label);
    if (working.some((c) => c.id === id)) {
      toast.error("A dropdown with that name already exists");
      return;
    }
    const row = { id, label, fieldKey: id, locked: false, options: [] };
    persist([...working, row]);
    setNewLabel("");
    setSelectedId(id);
  };

  const deleteCatalog = () => {
    if (!selected || selected.locked) {
      toast.error("Built-in dropdowns cannot be deleted. You can still remove options.");
      return;
    }
    if (!window.confirm(`Delete “${selected.label}” and all of its options?`)) return;
    persist(working.filter((c) => c.id !== selected.id));
    setSelectedId(working.find((c) => c.id !== selected.id)?.id || "");
  };

  return (
    <div>
      <p className="text-xs uppercase tracking-[0.25em] text-red-600 font-semibold">Registrations</p>
      <h1 className="text-3xl font-bold mt-2">Form dropdowns</h1>
      <p className="text-sm text-gray-500 mt-2 max-w-2xl">
        Manage the lists used on membership and registration forms (state, baptism, occupation, and any new dropdown you create). Changes go live on public forms after save.
      </p>

      <div className="mt-8 grid lg:grid-cols-[280px_1fr] gap-6">
        <div className="rounded-2xl border bg-white p-4 space-y-2">
          <p className="text-xs uppercase tracking-widest text-gray-400 px-1">Dropdowns</p>
          {working.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setSelected(c.id)}
              className={`w-full text-left px-3 py-2 rounded-xl text-sm ${
                selected?.id === c.id ? "bg-red-600 text-white" : "hover:bg-gray-50 text-gray-800"
              }`}
            >
              {c.label}
              <span className={`block text-[11px] ${selected?.id === c.id ? "text-white/70" : "text-gray-400"}`}>
                {c.options?.length || 0} options
              </span>
            </button>
          ))}
          {canEdit && (
            <div className="pt-3 border-t space-y-2">
              <Label>New dropdown</Label>
              <Input value={newLabel} onChange={(e) => setNewLabel(e.target.value)} placeholder="e.g. Age group" />
              <Button type="button" variant="outline" size="sm" className="w-full" onClick={createCatalog}>
                <Plus size={14} className="mr-1" /> Create
              </Button>
            </div>
          )}
        </div>

        {selected && (
          <div className="rounded-2xl border bg-white p-5 space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold">{selected.label}</h2>
                <p className="text-xs text-gray-400 mt-1">
                  Field key: <code>{selected.fieldKey}</code>
                  {MEMBER_FIELD_KEYS.includes(selected.fieldKey)
                    ? " · saved on the member record"
                    : " · saved as extra form data"}
                </p>
              </div>
              {canEdit && !selected.locked && (
                <Button type="button" variant="outline" className="text-red-600" onClick={deleteCatalog}>
                  Delete dropdown
                </Button>
              )}
            </div>

            {canEdit && (
              <div className="space-y-2 max-w-md">
                <Label>Display label</Label>
                <Input value={selected.label} onChange={(e) => updateSelected({ label: e.target.value })} />
              </div>
            )}

            <div className="space-y-2">
              <Label>Options</Label>
              <div className="divide-y rounded-xl border">
                {(selected.options || []).map((opt) => (
                  <div key={opt} className="flex items-center justify-between px-3 py-2 text-sm">
                    <span>{opt}</span>
                    {canEdit && (
                      <button type="button" className="text-red-600 p-1" onClick={() => removeOption(opt)} aria-label={`Remove ${opt}`}>
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                ))}
                {!(selected.options || []).length && (
                  <p className="px-3 py-4 text-sm text-gray-500">No options yet.</p>
                )}
              </div>
              {canEdit && (
                <div className="flex gap-2">
                  <Input
                    value={newOption}
                    onChange={(e) => setNewOption(e.target.value)}
                    placeholder="Add an option"
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addOption(); } }}
                  />
                  <Button type="button" variant="outline" onClick={addOption}>Add</Button>
                </div>
              )}
            </div>

            {canEdit && (
              <Button className="bg-red-600 hover:bg-red-700" disabled={saving} onClick={() => persist(working)}>
                {saving ? "Saving…" : "Save changes"}
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
