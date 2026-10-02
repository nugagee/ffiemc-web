import { useEffect, useState } from "react";
import { toast } from "sonner";
import { authApi, formatApiError } from "../../../lib/api";
import { useAuth } from "../../../context/AuthContext";
import { RELATIONSHIPS } from "../../../lib/duplicateCheck";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../../components/ui/select";

export default function HouseholdDuplicatesPage() {
  const { can } = useAuth();
  const canEdit = can("church_members", "edit");
  const canDelete = can("church_members", "delete");
  const [groups, setGroups] = useState([]);
  const [query, setQuery] = useState("");
  const [primaryByGroup, setPrimaryByGroup] = useState({});
  const [linksByGroup, setLinksByGroup] = useState({});
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const rows = await authApi.listContactDuplicates();
    setGroups(Array.isArray(rows) ? rows : []);
  };

  useEffect(() => {
    load().catch((err) => toast.error(formatApiError(err.message)));
  }, []);

  const visible = groups.filter((group) => {
    const hay = `${group.value} ${(group.members || []).map((m) => m.full_name).join(" ")}`.toLowerCase();
    return hay.includes(query.trim().toLowerCase());
  });

  const setLink = (key, memberId, patch) => {
    setLinksByGroup((prev) => ({
      ...prev,
      [key]: { ...(prev[key] || {}), [memberId]: { relationship: "child", ...(prev[key] || {})[memberId], ...patch } },
    }));
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-3xl font-bold">Duplicate contacts</h1>
        <p className="mt-2 max-w-3xl text-sm text-gray-500">
          Members who share an email or phone. Merge keeps one record and removes the others. Convert to household keeps everyone and links them to the primary account.
        </p>
      </div>
      <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search a shared email, phone, or name" />
      {!visible.length ? <p className="rounded-2xl border bg-white p-8 text-center text-sm text-gray-500">No shared emails or phones match.</p> : null}
      {visible.map((group) => {
        const key = `${group.kind}:${group.value}`;
        const primary = primaryByGroup[key] || group.members?.[0]?.id;
        return (
          <section key={key} className="space-y-3 rounded-2xl border bg-white p-4">
            <h2 className="font-semibold break-all">{group.kind === "email" ? group.value : group.value} <span className="text-sm font-normal text-gray-500">· {group.count} members · {group.kind}</span></h2>
            <ul className="space-y-3">
              {(group.members || []).map((member) => (
                <li key={member.id} className="grid gap-2 rounded-xl border border-gray-100 p-3 sm:grid-cols-[auto_1fr_180px] sm:items-center">
                  <label className="flex items-center gap-2 text-sm">
                    <input type="radio" name={key} checked={primary === member.id} onChange={() => setPrimaryByGroup({ ...primaryByGroup, [key]: member.id })} />
                    Primary
                  </label>
                  <div className="min-w-0 text-sm">
                    <p className="font-medium">{member.full_name}</p>
                    <p className="break-all text-gray-500">{member.email || "No email"} · {member.phone || "No phone"} · {member.household_role}</p>
                  </div>
                  {member.id !== primary ? (
                    <Select
                      value={(linksByGroup[key] || {})[member.id]?.relationship || "child"}
                      onValueChange={(relationship) => setLink(key, member.id, { relationship })}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {RELATIONSHIPS.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  ) : <span className="text-xs text-gray-400">Kept as the account holder</span>}
                </li>
              ))}
            </ul>
            <div className="flex flex-wrap gap-2">
              <Button className="bg-red-600 hover:bg-red-700" disabled={!canEdit || busy} onClick={async () => {
                const links = (group.members || []).filter((member) => member.id !== primary).map((member) => ({
                  member_id: member.id,
                  relationship: (linksByGroup[key] || {})[member.id]?.relationship || "child",
                  relationship_other: "",
                  use_primary_email: true,
                }));
                setBusy(true);
                try {
                  const result = await authApi.convertHousehold(primary, links);
                  toast.success(`Linked ${result?.linked || links.length} member(s) into one household.`);
                  load();
                } catch (err) {
                  toast.error(formatApiError(err.message));
                } finally {
                  setBusy(false);
                }
              }}>Convert to household</Button>
              <Button variant="outline" disabled={!canDelete || busy} onClick={async () => {
                const ids = (group.members || []).map((member) => member.id).filter((id) => id !== primary);
                if (!window.confirm(`Merge ${ids.length} duplicate record(s) into the selected primary? This deletes the other records.`)) return;
                setBusy(true);
                try {
                  const result = await authApi.mergeMembers(primary, ids);
                  toast.success(`Merged ${result?.merged || 0} record(s).`);
                  load();
                } catch (err) {
                  toast.error(formatApiError(err.message));
                } finally {
                  setBusy(false);
                }
              }}>Merge into primary</Button>
            </div>
          </section>
        );
      })}
    </div>
  );
}
