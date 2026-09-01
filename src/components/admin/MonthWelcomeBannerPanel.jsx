import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { CalendarRange, Save } from "lucide-react";
import { useSettings } from "../../context/SettingsContext";
import { authApi, formatApiError } from "../../lib/api";
import {
  fromLocalDateTimeInput,
  getMonthWelcomeConfig,
  isMonthWelcomeActive,
  toLocalDateTimeInput,
  weekWindowFrom,
} from "../../data/monthBanner";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Switch } from "../ui/switch";
import { Textarea } from "../ui/textarea";
import ImageUrlField from "./ImageUrlField";

export function MonthWelcomeBannerPanel({ canEdit = true }) {
  const { settings, refresh } = useSettings();
  const toForm = (raw) => ({
    ...raw,
    starts_at: toLocalDateTimeInput(raw.starts_at) || raw.starts_at || "",
    ends_at: toLocalDateTimeInput(raw.ends_at) || raw.ends_at || "",
  });

  const initial = toForm(getMonthWelcomeConfig(settings));
  const [form, setForm] = useState(initial);
  const [saving, setSaving] = useState(false);
  const dirty = useRef(false);

  useEffect(() => {
    if (dirty.current) return;
    setForm(toForm(getMonthWelcomeConfig(settings)));
  }, [settings]);

  const patch = (next) => {
    dirty.current = true;
    setForm((prev) => ({ ...prev, ...next }));
  };

  const applyWeekFromToday = () => {
    const window = weekWindowFrom(new Date());
    patch({
      starts_at: toLocalDateTimeInput(window.starts_at),
      ends_at: toLocalDateTimeInput(window.ends_at),
    });
    toast.message("Scheduled for 7 days from now");
  };

  const save = async () => {
    if (form.enabled && !form.starts_at) {
      toast.error("Choose a start date");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        ...form,
        starts_at: fromLocalDateTimeInput(form.starts_at) || form.starts_at || "",
        ends_at: fromLocalDateTimeInput(form.ends_at) || form.ends_at || "",
      };
      await authApi.updatePageSection("home", "monthWelcome", payload);
      dirty.current = false;
      await refresh({ notify: true });
      toast.success("Month welcome popup saved");
      setForm(toForm(payload));
    } catch (err) {
      toast.error(formatApiError(err.message) || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const live = isMonthWelcomeActive({
    ...form,
    starts_at: fromLocalDateTimeInput(form.starts_at) || form.starts_at,
    ends_at: fromLocalDateTimeInput(form.ends_at) || form.ends_at,
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Month welcome popup</h2>
          <p className="text-sm text-gray-500 mt-1 max-w-2xl">
            Priority popup on the homepage — shown before other event banners. Schedule for one week with “7 days from today”.
          </p>
        </div>
        <span
          className={`text-xs font-semibold uppercase tracking-wide px-2.5 py-1 rounded-full ${
            live ? "bg-emerald-100 text-emerald-800" : "bg-gray-100 text-gray-600"
          }`}
        >
          {live ? "Live on site" : "Not showing"}
        </span>
      </div>

      <div className="flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50/80 px-4 py-3">
        <div>
          <p className="font-medium text-sm">Show popup</p>
          <p className="text-xs text-gray-500">Turn off to hide without deleting your image or schedule</p>
        </div>
        <Switch
          checked={Boolean(form.enabled)}
          disabled={!canEdit}
          onCheckedChange={(enabled) => patch({ enabled })}
        />
      </div>

      <ImageUrlField
        id="month-welcome-image"
        label="Banner image / flyer"
        value={form.image || ""}
        disabled={!canEdit}
        onChange={(image) => patch({ image })}
        hint="Upload the monthly graphic. Recommended: portrait or square flyer, at least 1200px wide."
      />

      <div className="space-y-2">
        <Label htmlFor="month-welcome-title">Popup title</Label>
        <Input
          id="month-welcome-title"
          value={form.title || ""}
          disabled={!canEdit}
          onChange={(e) => patch({ title: e.target.value })}
          placeholder="Happy New Month"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="month-welcome-body">Message</Label>
        <Textarea
          id="month-welcome-body"
          rows={14}
          value={form.body || ""}
          disabled={!canEdit}
          onChange={(e) => patch({ body: e.target.value })}
          placeholder="Greeting, scripture, and blessings for the new month…"
          className="font-normal leading-relaxed"
        />
        <p className="text-xs text-gray-500">Shown below the flyer image. Line breaks and emojis are preserved.</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="month-welcome-alt">Accessibility description</Label>
        <Input
          id="month-welcome-alt"
          value={form.alt || ""}
          disabled={!canEdit}
          onChange={(e) => patch({ alt: e.target.value })}
          placeholder="Short description of the banner for screen readers"
        />
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Show from</Label>
          <Input
            type="datetime-local"
            value={form.starts_at || ""}
            disabled={!canEdit}
            onChange={(e) => patch({ starts_at: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label>Show until</Label>
          <Input
            type="datetime-local"
            value={form.ends_at || ""}
            disabled={!canEdit}
            onChange={(e) => patch({ ends_at: e.target.value })}
          />
        </div>
      </div>

      {canEdit ? (
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" onClick={applyWeekFromToday}>
            <CalendarRange className="h-4 w-4 mr-2" />
            7 days from today
          </Button>
          <Button
            type="button"
            className="bg-red-600 hover:bg-red-700"
            disabled={saving}
            onClick={save}
          >
            <Save className="h-4 w-4 mr-2" />
            {saving ? "Saving…" : "Save popup"}
          </Button>
        </div>
      ) : null}
    </div>
  );
}

export default MonthWelcomeBannerPanel;
