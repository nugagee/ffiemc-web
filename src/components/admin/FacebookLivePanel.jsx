import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { ExternalLink, Radio, Save } from "lucide-react";
import { Link } from "react-router-dom";
import { useSettings } from "../../context/SettingsContext";
import { DEFAULT_FACEBOOK_LIVE, getFacebookLiveConfig } from "../../data/facebookLive";
import { authApi, formatApiError } from "../../lib/api";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Switch } from "../ui/switch";
import { Textarea } from "../ui/textarea";
import { Badge } from "../ui/badge";

export function FacebookLivePanel({ canEdit = true }) {
  const { settings, refresh } = useSettings();
  const toForm = (raw) => ({ ...DEFAULT_FACEBOOK_LIVE, ...raw });
  const [form, setForm] = useState(() => toForm(getFacebookLiveConfig(settings)));
  const [saving, setSaving] = useState(false);
  const dirty = useRef(false);

  useEffect(() => {
    if (dirty.current) return;
    setForm(toForm(getFacebookLiveConfig(settings)));
  }, [settings]);

  const patch = (next) => {
    dirty.current = true;
    setForm((prev) => ({ ...prev, ...next }));
  };

  const save = async (override) => {
    if (!canEdit) return;
    const payload = { ...form, ...(override || {}) };
    setSaving(true);
    try {
      await authApi.updatePageSection("home", "facebookLive", {
        enabled: payload.enabled === true,
        isLive: payload.isLive === true,
        videoUrl: String(payload.videoUrl || "").trim(),
        title: String(payload.title || "").trim() || DEFAULT_FACEBOOK_LIVE.title,
        idleHeading:
          String(payload.idleHeading || "").trim() || DEFAULT_FACEBOOK_LIVE.idleHeading,
        idleBody: String(payload.idleBody || "").trim() || DEFAULT_FACEBOOK_LIVE.idleBody,
        ctaLabel: String(payload.ctaLabel || "").trim() || DEFAULT_FACEBOOK_LIVE.ctaLabel,
      });
      dirty.current = false;
      await refresh({ notify: true });
      toast.success(
        payload.isLive ? "Homepage is showing LIVE" : "Facebook Live settings saved"
      );
    } catch (err) {
      toast.error(formatApiError(err.message) || "Could not save");
    } finally {
      setSaving(false);
    }
  };

  const goLive = async () => {
    patch({ isLive: true });
    await save({ isLive: true });
  };

  const endLive = async () => {
    patch({ isLive: false });
    await save({ isLive: false });
  };

  const pageUrl = settings?.socials?.facebook || "https://www.facebook.com/firefireministry";

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-lg font-semibold text-gray-900">Facebook Live</h3>
            {form.isLive ? (
              <Badge className="bg-red-600 text-white border-0">LIVE</Badge>
            ) : (
              <Badge variant="outline">Offline</Badge>
            )}
          </div>
          <p className="text-sm text-gray-500 mt-1 max-w-2xl">
            When you go live on Facebook, flip <strong>We are live</strong> so the homepage
            shows the stream immediately. Paste the live video share link for in-page playback;
            visitors still see the Facebook page feed beside it.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline" size="sm">
            <a href={pageUrl} target="_blank" rel="noreferrer">
              Open page <ExternalLink className="ml-1.5 h-3.5 w-3.5" />
            </a>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link to="/admin/banners/live-analytics">View analytics</Link>
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          disabled={!canEdit || saving || form.isLive}
          className="bg-red-600 hover:bg-red-700"
          onClick={goLive}
        >
          <Radio className="h-4 w-4 mr-2" />
          Go live on website
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={!canEdit || saving || !form.isLive}
          onClick={endLive}
        >
          End live
        </Button>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div className="flex items-center justify-between rounded-lg border px-3 py-2.5">
          <div>
            <p className="text-sm font-medium">Show section on homepage</p>
            <p className="text-xs text-gray-500">Hide the whole Watch Live block</p>
          </div>
          <Switch
            checked={form.enabled}
            disabled={!canEdit}
            onCheckedChange={(v) => patch({ enabled: v })}
          />
        </div>
        <div className="flex items-center justify-between rounded-lg border px-3 py-2.5">
          <div>
            <p className="text-sm font-medium">We are live</p>
            <p className="text-xs text-gray-500">Switches homepage to live mode</p>
          </div>
          <Switch
            checked={form.isLive}
            disabled={!canEdit}
            onCheckedChange={(v) => patch({ isLive: v })}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Live video URL (recommended)</Label>
        <Input
          value={form.videoUrl}
          disabled={!canEdit}
          placeholder="https://www.facebook.com/…/videos/…"
          onChange={(e) => patch({ videoUrl: e.target.value })}
        />
        <p className="text-xs text-gray-500">
          On Facebook Live: Share → Copy link. Without this, visitors get a “Watch on Facebook”
          button while live.
        </p>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Live title</Label>
          <Input
            value={form.title}
            disabled={!canEdit}
            onChange={(e) => patch({ title: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label>Button label</Label>
          <Input
            value={form.ctaLabel}
            disabled={!canEdit}
            onChange={(e) => patch({ ctaLabel: e.target.value })}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Idle heading</Label>
        <Input
          value={form.idleHeading}
          disabled={!canEdit}
          onChange={(e) => patch({ idleHeading: e.target.value })}
        />
      </div>
      <div className="space-y-2">
        <Label>Idle message</Label>
        <Textarea
          rows={3}
          value={form.idleBody}
          disabled={!canEdit}
          onChange={(e) => patch({ idleBody: e.target.value })}
        />
      </div>

      {canEdit ? (
        <Button type="button" disabled={saving} onClick={() => save()} className="bg-red-600 hover:bg-red-700">
          <Save className="h-4 w-4 mr-2" />
          {saving ? "Saving…" : "Save settings"}
        </Button>
      ) : null}
    </div>
  );
}

export default FacebookLivePanel;
