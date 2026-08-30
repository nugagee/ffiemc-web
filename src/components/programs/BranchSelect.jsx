import { useEffect, useMemo, useState } from "react";
import { Label } from "../ui/label";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "../ui/select";
import { listPublicChurchBranches } from "../../lib/api";

/** Reusable church branch picker — local & international groups. */
export function BranchSelect({ value, onChange, required = true, label = "Church branch", id = "branch" }) {
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listPublicChurchBranches()
      .then(setBranches)
      .catch(() => setBranches([]))
      .finally(() => setLoading(false));
  }, []);

  const { local, international } = useMemo(() => {
    const loc = [];
    const intl = [];
    (branches || []).forEach((b) => {
      if (b.region === "international" || b.isInternational) intl.push(b);
      else loc.push(b);
    });
    return { local: loc, international: intl };
  }, [branches]);

  return (
    <div className="space-y-2">
      {label ? (
        <Label htmlFor={id}>{label}{required ? " *" : ""}</Label>
      ) : null}
      <Select value={value || (required ? undefined : "all")} onValueChange={(v) => onChange(v === "all" ? "" : v)} required={required} disabled={loading}>
        <SelectTrigger id={id || undefined} className="focus:border-red-500">
          <SelectValue placeholder={loading ? "Loading branches…" : required ? "Select your branch" : "All branches"} />
        </SelectTrigger>
        <SelectContent>
          {!required && <SelectItem value="all">All branches</SelectItem>}
          {local.length > 0 && (
            <SelectGroup>
              <SelectLabel>Local branches (Nigeria)</SelectLabel>
              {local.map((b) => (
                <SelectItem key={b.id} value={b.id}>{b.label || b.name}</SelectItem>
              ))}
            </SelectGroup>
          )}
          {international.length > 0 && (
            <SelectGroup>
              <SelectLabel>International</SelectLabel>
              {international.map((b) => (
                <SelectItem key={b.id} value={b.id}>{b.label || b.name}</SelectItem>
              ))}
            </SelectGroup>
          )}
        </SelectContent>
      </Select>
      {required && (
        <p className="text-xs text-gray-500">Select the Fire-Fire branch you belong to, or International if you fellowship online from abroad.</p>
      )}
    </div>
  );
}
