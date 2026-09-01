import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { GripVertical, Plus, Save, Trash2 } from "lucide-react";
import { useSettings } from "../../../context/SettingsContext";
import { historyCmsDefaults } from "../../../data/aboutDefaults";
import { authApi, formatApiError } from "../../../lib/api";
import { Button } from "../../ui/button";
import { Card } from "../../ui/card";
import { Input } from "../../ui/input";
import { Label } from "../../ui/label";
import { Textarea } from "../../ui/textarea";

function mergeHistoryForm(settings) {
  const defaults = historyCmsDefaults();
  const stored = settings?.pages?.about?.history || {};
  return {
    ...defaults,
    ...stored,
    story: Array.isArray(stored.story) && stored.story.length ? stored.story : defaults.story,
    pillars: Array.isArray(stored.pillars) && stored.pillars.length ? stored.pillars : defaults.pillars,
    timeline: Array.isArray(stored.timeline) && stored.timeline.length ? stored.timeline : defaults.timeline,
  };
}

function ListBlock({ title, hint, items, fields, onChange, canEdit, emptyItem }) {
  const dragIndex = useRef(null);

  const moveItem = (from, to) => {
    if (from === to || from == null || to == null) return;
    const next = [...items];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    onChange(next);
  };

  return (
    <div className="space-y-3">
      <div>
        <h4 className="font-semibold">{title}</h4>
        {hint ? <p className="text-xs text-gray-500 mt-1">{hint}</p> : null}
      </div>
      {items.map((item, index) => (
        <div
          key={index}
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
              <span className="text-xs uppercase tracking-wider">Item {index + 1}</span>
            </div>
            <Button
              type="button"
              size="icon"
              variant="outline"
              className="text-red-600"
              onClick={() => onChange(items.filter((_, i) => i !== index))}
              onMouseDown={(e) => e.stopPropagation()}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
          <div className="grid gap-3" onMouseDown={(e) => e.stopPropagation()}>
            {fields.map((field) => (
              <div key={field.name} className="space-y-2">
                <Label>{field.label}</Label>
                {field.type === "textarea" ? (
                  <Textarea
                    rows={field.rows || 3}
                    value={item[field.name] || ""}
                    onChange={(e) => {
                      const next = [...items];
                      next[index] = { ...item, [field.name]: e.target.value };
                      onChange(next);
                    }}
                  />
                ) : (
                  <Input
                    value={item[field.name] || ""}
                    onChange={(e) => {
                      const next = [...items];
                      next[index] = { ...item, [field.name]: e.target.value };
                      onChange(next);
                    }}
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
      <Button type="button" variant="outline" onClick={() => onChange([...items, emptyItem()])}>
        <Plus className="h-4 w-4 mr-2" />
        Add item
      </Button>
    </div>
  );
}

export function AboutHistoryEditor({ canEdit }) {
  const { settings, refresh } = useSettings();
  const [form, setForm] = useState(() => mergeHistoryForm(settings));
  const [saving, setSaving] = useState(false);
  const dirty = useRef(false);

  useEffect(() => {
    if (dirty.current) return;
    setForm(mergeHistoryForm(settings));
  }, [settings]);

  const updateForm = (next) => {
    dirty.current = true;
    setForm(next);
  };

  const save = async () => {
    setSaving(true);
    try {
      await authApi.updatePageSection("about", "history", form);
      dirty.current = false;
      await refresh({ notify: true });
      toast.success("Church history saved");
    } catch (err) {
      toast.error(formatApiError(err.message) || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="p-5 space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="font-semibold text-lg">Church history</h3>
          <p className="text-sm text-gray-500 mt-1">
            Full history section on the About page — story chapters, pillars, and milestones.
          </p>
        </div>
        {canEdit && (
          <Button onClick={save} disabled={saving} className="bg-red-600 hover:bg-red-700">
            <Save className="h-4 w-4 mr-2" />
            {saving ? "Saving…" : "Save"}
          </Button>
        )}
      </div>

      <fieldset disabled={!canEdit} className="space-y-6 border-0 p-0">
        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Badge</Label>
            <Input value={form.badge || ""} onChange={(e) => updateForm({ ...form, badge: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>Heading</Label>
            <Input value={form.heading || ""} onChange={(e) => updateForm({ ...form, heading: e.target.value })} />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Intro</Label>
            <Textarea rows={3} value={form.intro || ""} onChange={(e) => updateForm({ ...form, intro: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>Founded date</Label>
            <Input value={form.foundedDate || ""} onChange={(e) => updateForm({ ...form, foundedDate: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>Founder / General Overseer</Label>
            <Input value={form.founder || ""} onChange={(e) => updateForm({ ...form, founder: e.target.value })} />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>First meeting place</Label>
            <Input value={form.foundingPlace || ""} onChange={(e) => updateForm({ ...form, foundingPlace: e.target.value })} />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Headquarters</Label>
            <Input value={form.headquarters || ""} onChange={(e) => updateForm({ ...form, headquarters: e.target.value })} />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Opening quote</Label>
            <Textarea rows={3} value={form.openingQuote || ""} onChange={(e) => updateForm({ ...form, openingQuote: e.target.value })} />
          </div>
        </div>

        <ListBlock
          title="Story chapters"
          hint="Narrative sections shown in the interactive story panel."
          items={form.story || []}
          fields={[
            { name: "title", label: "Chapter title" },
            { name: "body", label: "Content", type: "textarea", rows: 4 },
          ]}
          onChange={(story) => updateForm({ ...form, story })}
          canEdit={canEdit}
          emptyItem={() => ({ title: "", body: "" })}
        />

        <ListBlock
          title="Ministry pillars"
          hint="Highlight cards — mountain ministry, holiness, evangelism, Bible college, etc."
          items={form.pillars || []}
          fields={[
            { name: "title", label: "Title" },
            { name: "body", label: "Description", type: "textarea", rows: 3 },
          ]}
          onChange={(pillars) => updateForm({ ...form, pillars })}
          canEdit={canEdit}
          emptyItem={() => ({ title: "", body: "" })}
        />

        <ListBlock
          title="Timeline milestones"
          hint="Year chips and milestone detail card at the bottom of the section."
          items={form.timeline || []}
          fields={[
            { name: "year", label: "Year" },
            { name: "title", label: "Title" },
            { name: "description", label: "Description", type: "textarea", rows: 3 },
          ]}
          onChange={(timeline) => updateForm({ ...form, timeline })}
          canEdit={canEdit}
          emptyItem={() => ({ year: "", title: "", description: "" })}
        />
      </fieldset>
    </Card>
  );
}

export default AboutHistoryEditor;
