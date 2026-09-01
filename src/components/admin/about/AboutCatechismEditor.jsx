import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { GripVertical, Plus, Save, Trash2 } from "lucide-react";
import { useSettings } from "../../../context/SettingsContext";
import { catechismCmsDefaults } from "../../../data/aboutDefaults";
import { authApi, formatApiError } from "../../../lib/api";
import { Button } from "../../ui/button";
import { Card } from "../../ui/card";
import { Input } from "../../ui/input";
import { Label } from "../../ui/label";
import { Textarea } from "../../ui/textarea";

function mergeCatechismForm(settings) {
  const defaults = catechismCmsDefaults();
  const stored = settings?.pages?.about?.catechism || {};
  return {
    ...defaults,
    ...stored,
    items: Array.isArray(stored.items) && stored.items.length ? stored.items : defaults.items,
  };
}

export function AboutCatechismEditor({ canEdit }) {
  const { settings, refresh } = useSettings();
  const [form, setForm] = useState(() => mergeCatechismForm(settings));
  const [saving, setSaving] = useState(false);
  const dirty = useRef(false);
  const dragIndex = useRef(null);
  const items = form.items || [];

  useEffect(() => {
    if (dirty.current) return;
    setForm(mergeCatechismForm(settings));
  }, [settings]);

  const updateForm = (next) => {
    dirty.current = true;
    setForm(next);
  };

  const save = async () => {
    setSaving(true);
    try {
      await authApi.updatePageSection("about", "catechism", form);
      dirty.current = false;
      await refresh({ notify: true });
      toast.success("Catechism saved");
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
          <h3 className="font-semibold text-lg">Catechism</h3>
          <p className="text-sm text-gray-500 mt-1">Questions, answers, and Bible book lists for the About page.</p>
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
          <div className="space-y-2">
            <Label htmlFor="catechismBadge">Badge</Label>
            <Input
              id="catechismBadge"
              value={form.badge || ""}
              onChange={(e) => updateForm({ ...form, badge: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="catechismHeading">Heading</Label>
            <Input
              id="catechismHeading"
              value={form.heading || ""}
              onChange={(e) => updateForm({ ...form, heading: e.target.value })}
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="catechismIntro">Intro</Label>
            <Textarea
              id="catechismIntro"
              rows={3}
              value={form.intro || ""}
              onChange={(e) => updateForm({ ...form, intro: e.target.value })}
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="oldTestamentBooks">Old Testament books (one per line)</Label>
            <Textarea
              id="oldTestamentBooks"
              rows={6}
              value={form.oldTestamentBooks || ""}
              onChange={(e) => updateForm({ ...form, oldTestamentBooks: e.target.value })}
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="newTestamentBooks">New Testament books (one per line)</Label>
            <Textarea
              id="newTestamentBooks"
              rows={5}
              value={form.newTestamentBooks || ""}
              onChange={(e) => updateForm({ ...form, newTestamentBooks: e.target.value })}
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
                <span className="text-xs uppercase tracking-wider">Question {item.id || index + 1}</span>
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
            <div className="grid gap-3" onMouseDown={(e) => e.stopPropagation()}>
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
                <Label>Question</Label>
                <Textarea
                  rows={2}
                  value={item.question || ""}
                  onChange={(e) => {
                    const next = [...items];
                    next[index] = { ...item, question: e.target.value };
                    updateForm({ ...form, items: next });
                  }}
                />
              </div>
              <div className="space-y-2">
                <Label>Answer</Label>
                <Textarea
                  rows={4}
                  value={item.answer || ""}
                  onChange={(e) => {
                    const next = [...items];
                    next[index] = { ...item, answer: e.target.value };
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
              items: [...items, { id: String(items.length + 1), question: "", answer: "" }],
            })
          }
        >
          <Plus className="h-4 w-4 mr-2" />
          Add question
        </Button>
      </fieldset>
    </Card>
  );
}

export default AboutCatechismEditor;
