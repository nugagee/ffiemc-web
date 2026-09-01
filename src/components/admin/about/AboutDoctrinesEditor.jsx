import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { GripVertical, Plus, Save, Trash2 } from "lucide-react";
import { useSettings } from "../../../context/SettingsContext";
import { doctrinesCmsDefaults } from "../../../data/aboutDefaults";
import { authApi, formatApiError } from "../../../lib/api";
import { Button } from "../../ui/button";
import { Card } from "../../ui/card";
import { Input } from "../../ui/input";
import { Label } from "../../ui/label";
import { Textarea } from "../../ui/textarea";

function mergeDoctrinesForm(settings) {
  const defaults = doctrinesCmsDefaults();
  const stored = settings?.pages?.about?.doctrines || {};
  return {
    ...defaults,
    ...stored,
    items: Array.isArray(stored.items) && stored.items.length ? stored.items : defaults.items,
  };
}

export function AboutDoctrinesEditor({ canEdit }) {
  const { settings, refresh } = useSettings();
  const [form, setForm] = useState(() => mergeDoctrinesForm(settings));
  const [saving, setSaving] = useState(false);
  const dirty = useRef(false);
  const dragIndex = useRef(null);
  const items = form.items || [];

  useEffect(() => {
    if (dirty.current) return;
    setForm(mergeDoctrinesForm(settings));
  }, [settings]);

  const updateForm = (next) => {
    dirty.current = true;
    setForm(next);
  };

  const save = async () => {
    setSaving(true);
    try {
      await authApi.updatePageSection("about", "doctrines", form);
      dirty.current = false;
      await refresh({ notify: true });
      toast.success("Church doctrines saved");
    } catch (err) {
      toast.error(formatApiError(err.message) || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const moveItem = (from, to) => {
    if (from === to || from == null || to == null) return;
    const next = [...items];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    updateForm({ ...form, items: next.map((item, index) => ({ ...item, id: String(index + 1) })) });
  };

  return (
    <Card className="p-5 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="font-semibold text-lg">Church doctrines</h3>
          <p className="text-sm text-gray-500 mt-1">Edit all 30 doctrines shown on the About page.</p>
        </div>
        {canEdit && (
          <Button onClick={save} disabled={saving} className="bg-red-600 hover:bg-red-700">
            <Save className="h-4 w-4 mr-2" />
            {saving ? "Saving…" : "Save"}
          </Button>
        )}
      </div>

      <fieldset disabled={!canEdit} className="space-y-4 border-0 p-0">
        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="purposeTitle">Purpose block title</Label>
            <Input
              id="purposeTitle"
              value={form.purposeTitle || ""}
              onChange={(e) => updateForm({ ...form, purposeTitle: e.target.value })}
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="purposeDefinition">Purpose definition</Label>
            <Textarea
              id="purposeDefinition"
              rows={3}
              value={form.purposeDefinition || ""}
              onChange={(e) => updateForm({ ...form, purposeDefinition: e.target.value })}
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="purposeAttitudes">Purpose attitudes (one per line)</Label>
            <Textarea
              id="purposeAttitudes"
              rows={5}
              value={form.purposeAttitudes || ""}
              onChange={(e) => updateForm({ ...form, purposeAttitudes: e.target.value })}
            />
          </div>
        </div>

        {items.map((item, index) => (
          <div
            key={`${item.id}-${index}`}
            className={`rounded-xl border border-gray-100 p-4 space-y-3 ${canEdit ? "cursor-grab active:cursor-grabbing" : ""}`}
            draggable={canEdit}
            onDragStart={() => { dragIndex.current = index; }}
            onDragOver={(e) => {
              e.preventDefault();
              if (dragIndex.current === null || dragIndex.current === index) return;
              moveItem(dragIndex.current, index);
              dragIndex.current = index;
            }}
            onDragEnd={() => { dragIndex.current = null; }}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-gray-400">
                {canEdit ? <GripVertical className="h-5 w-5" /> : null}
                <span className="text-xs uppercase tracking-wider">Doctrine {item.id || index + 1}</span>
              </div>
              <Button
                type="button"
                size="icon"
                variant="outline"
                className="text-red-600"
                onClick={() => updateForm({ ...form, items: items.filter((_, i) => i !== index) })}
                onMouseDown={(e) => e.stopPropagation()}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
            <div className="grid md:grid-cols-2 gap-3" onMouseDown={(e) => e.stopPropagation()}>
              <div className="space-y-2">
                <Label>Number</Label>
                <Input
                  value={item.id || ""}
                  onChange={(e) => {
                    const next = [...items];
                    next[index] = { ...item, id: e.target.value };
                    updateForm({ ...form, items: next });
                  }}
                />
              </div>
              <div className="space-y-2">
                <Label>Title</Label>
                <Input
                  value={item.title || ""}
                  onChange={(e) => {
                    const next = [...items];
                    next[index] = { ...item, title: e.target.value };
                    updateForm({ ...form, items: next });
                  }}
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Summary</Label>
                <Textarea
                  rows={3}
                  value={item.summary || ""}
                  onChange={(e) => {
                    const next = [...items];
                    next[index] = { ...item, summary: e.target.value };
                    updateForm({ ...form, items: next });
                  }}
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Scripture references (comma-separated)</Label>
                <Input
                  value={item.scriptures || ""}
                  onChange={(e) => {
                    const next = [...items];
                    next[index] = { ...item, scriptures: e.target.value };
                    updateForm({ ...form, items: next });
                  }}
                />
              </div>
            </div>
          </div>
        ))}

        <Button
          type="button"
          variant="outline"
          onClick={() =>
            updateForm({
              ...form,
              items: [
                ...items,
                { id: String(items.length + 1), title: "", summary: "", scriptures: "" },
              ],
            })
          }
        >
          <Plus className="h-4 w-4 mr-2" />
          Add doctrine
        </Button>
      </fieldset>
    </Card>
  );
}

export default AboutDoctrinesEditor;
