import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { authApi, formatApiError } from "../../../lib/api";
import { useAuth } from "../../../context/AuthContext";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";
import { Switch } from "../../../components/ui/switch";

export default function EmailPriorityPage() {
  const { can } = useAuth();
  const canEdit = can("member_notifications", "edit") || can("church_members", "edit");
  const [flagged, setFlagged] = useState([]);
  const [members, setMembers] = useState([]);
  const [query, setQuery] = useState("");
  const [addQuery, setAddQuery] = useState("");
  const [settings, setSettings] = useState({ max_recipients: 60, skip_unverified: false, skip_invalid: true });
  const [preview, setPreview] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const [list, people, sendSettings] = await Promise.all([
      authApi.listEmailPriority(),
      authApi.listChurchMembers(),
      authApi.getEmailSendSettings(),
    ]);
    setFlagged(Array.isArray(list) ? list : []);
    setMembers(Array.isArray(people) ? people : []);
    if (sendSettings) setSettings(sendSettings);
  };

  useEffect(() => {
    load().catch((err) => toast.error(formatApiError(err.message)));
  }, []);

  const flaggedIds = useMemo(() => new Set(flagged.map((row) => row.id)), [flagged]);
  const visible = flagged.filter((row) => {
    const hay = `${row.full_name} ${row.email} ${row.role_name} ${row.ministry}`.toLowerCase();
    return hay.includes(query.trim().toLowerCase());
  });
  const addable = members.filter((row) => !flaggedIds.has(row.id) && `${row.full_name} ${row.email}`.toLowerCase().includes(addQuery.trim().toLowerCase())).slice(0, 8);

  const saveSettings = async () => {
    setBusy(true);
    try {
      const saved = await authApi.updateEmailSendSettings({
        max_recipients: Number(settings.max_recipients) || 60,
        skip_unverified: Boolean(settings.skip_unverified),
        skip_invalid: Boolean(settings.skip_invalid),
      });
      setSettings(saved || settings);
      toast.success("Send settings saved");
    } catch (err) {
      toast.error(formatApiError(err.message));
    } finally {
      setBusy(false);
    }
  };

  const previewSend = async () => {
    setBusy(true);
    try {
      const result = await authApi.previewEmailSend();
      setPreview(result);
    } catch (err) {
      toast.error(formatApiError(err.message));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Email priority list</h1>
        <p className="mt-2 max-w-3xl text-sm text-gray-500">
          Announcements go to priority members first, then a daily selection of people whose role is Member, up to the maximum.
          Each address is used once, and a household shares one email. Skip unverified is off by default so existing members still receive mail.
        </p>
      </div>

      <section className="grid gap-4 rounded-2xl border bg-white p-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-1">
          <Label htmlFor="max-recipients">Max emails per send</Label>
          <Input id="max-recipients" type="number" min={1} max={500} value={settings.max_recipients ?? 60} onChange={(e) => setSettings({ ...settings, max_recipients: e.target.value })} />
        </div>
        <label className="flex items-center gap-3 text-sm">
          <Switch checked={Boolean(settings.skip_unverified)} onCheckedChange={(v) => setSettings({ ...settings, skip_unverified: Boolean(v) })} />
          Skip unverified addresses
        </label>
        <label className="flex items-center gap-3 text-sm">
          <Switch checked={settings.skip_invalid !== false} onCheckedChange={(v) => setSettings({ ...settings, skip_invalid: Boolean(v) })} />
          Skip invalid addresses
        </label>
        <div className="flex items-end">
          <Button className="bg-red-600 hover:bg-red-700" disabled={!canEdit || busy} onClick={saveSettings}>Save settings</Button>
        </div>
      </section>

      <section className="rounded-2xl border bg-white p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-semibold">Flagged members ({flagged.length})</h2>
          <Button variant="outline" disabled={!canEdit || busy} onClick={async () => {
            try {
              const result = await authApi.resyncEmailPriority();
              toast.success(`Added ${result?.added || 0} member(s) from role rules. Manual flags were kept.`);
              load();
            } catch (err) {
              toast.error(formatApiError(err.message));
            }
          }}>Re-sync from role rules</Button>
        </div>
        <p className="text-xs text-gray-500">Re-sync adds members who match Media Team, Youth Leader, Minister, Pastor, Choir Director, Choir, Deacon, or Worker. It does not remove anyone you added by hand.</p>
        <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search the priority list" />
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="text-left text-xs uppercase text-gray-400">
              <tr><th className="py-2 pr-3">Name</th><th className="py-2 pr-3">Email</th><th className="py-2 pr-3">Role</th><th className="py-2 pr-3">Source</th><th /></tr>
            </thead>
            <tbody>
              {visible.map((row) => (
                <tr key={row.id} className="border-t">
                  <td className="py-2 pr-3">{row.full_name}</td>
                  <td className="py-2 pr-3 break-all">{row.email || "—"}</td>
                  <td className="py-2 pr-3">{row.role_name || row.ministry || "—"}</td>
                  <td className="py-2 pr-3 capitalize">{row.email_priority_source || "—"}</td>
                  <td className="py-2 text-right">
                    <Button size="sm" variant="outline" disabled={!canEdit} onClick={async () => {
                      await authApi.setMemberEmailPriority(row.id, false);
                      toast.success("Removed from the priority list");
                      load();
                    }}>Remove</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!visible.length ? <p className="py-6 text-center text-sm text-gray-500">No flagged members match.</p> : null}
        </div>
        <div className="space-y-2">
          <Label>Add a member</Label>
          <Input value={addQuery} onChange={(e) => setAddQuery(e.target.value)} placeholder="Search members who are not flagged" />
          <ul className="space-y-1">
            {addQuery.trim() ? addable.map((row) => (
              <li key={row.id} className="flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm">
                <span className="min-w-0 break-words">{row.full_name} · {row.email || "no email"}</span>
                <Button size="sm" className="bg-red-600 hover:bg-red-700" disabled={!canEdit} onClick={async () => {
                  await authApi.setMemberEmailPriority(row.id, true);
                  toast.success("Added to the priority list");
                  setAddQuery("");
                  load();
                }}>Add</Button>
              </li>
            )) : null}
          </ul>
        </div>
      </section>

      <section className="rounded-2xl border bg-white p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-semibold">Next send preview</h2>
          <Button variant="outline" disabled={busy} onClick={previewSend}>Preview recipients</Button>
        </div>
        <p className="text-xs text-gray-500">This is the next send to members before extra audience filters. A member announcement applies the same cap inside its selected audience. The Member fill is shuffled once per day, so this preview matches today's send.</p>
        {preview ? (
          <>
            <p className="text-sm text-gray-700">{preview.email_count || 0} recipient(s). Maximum {preview.settings?.max_recipients || settings.max_recipients}.</p>
            {Number(preview.email_count) >= Number(preview.settings?.max_recipients || settings.max_recipients) ? (
              <p className="text-sm text-amber-700">The list is full. Other members wait for a later send.</p>
            ) : null}
            <ul className="max-h-80 space-y-1 overflow-auto text-sm">
              {(preview.recipients || []).map((row) => (
                <li key={`${row.recipient_id}-${row.ord}`} className="flex justify-between gap-3 border-b py-1">
                  <span>{row.ord}. {row.full_name}</span>
                  <span className="text-gray-500">{row.email_priority ? "Priority" : "Member fill"} · {row.email}</span>
                </li>
              ))}
            </ul>
          </>
        ) : null}
      </section>
    </div>
  );
}
