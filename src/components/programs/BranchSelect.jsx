import { useEffect, useMemo, useState } from "react";
import { Label } from "../ui/label";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "../ui/select";
import { listPublicChurchBranches, listPublicChurchDistricts } from "../../lib/api";
import { CHURCH_BRANCHES, CHURCH_DISTRICTS, groupChurchNetwork, normalizeBranch, normalizeDistrict } from "../../data/churchBranches";

/** Reusable church branch picker — grouped by district, type, and international. */
export function BranchSelect({ value, onChange, required = true, label = "Church branch", id = "branch" }) {
  const [branches, setBranches] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      listPublicChurchBranches().catch(() => CHURCH_BRANCHES),
      listPublicChurchDistricts().catch(() => CHURCH_DISTRICTS),
    ])
      .then(([branchRows, districtRows]) => {
        const b = (Array.isArray(branchRows) ? branchRows : CHURCH_BRANCHES).map(normalizeBranch);
        const d = (Array.isArray(districtRows) ? districtRows : CHURCH_DISTRICTS).map(normalizeDistrict);
        setBranches(b);
        setDistricts(d);
      })
      .finally(() => setLoading(false));
  }, []);

  const groups = useMemo(() => groupChurchNetwork(branches, districts), [branches, districts]);

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

          {groups.headquarters.length > 0 && (
            <SelectGroup>
              <SelectLabel>Headquarters</SelectLabel>
              {groups.headquarters.map((b) => (
                <SelectItem key={b.id} value={b.id}>{b.label || b.name}</SelectItem>
              ))}
            </SelectGroup>
          )}

          {groups.districtGroups.map(({ district, branches: districtBranches }) =>
            districtBranches.length > 0 ? (
              <SelectGroup key={district.id}>
                <SelectLabel>{district.name}</SelectLabel>
                {districtBranches.map((b) => (
                  <SelectItem key={b.id} value={b.id}>{b.label || b.name}</SelectItem>
                ))}
              </SelectGroup>
            ) : null
          )}

          {groups.standaloneAssemblies.length > 0 && (
            <SelectGroup>
              <SelectLabel>Other assemblies</SelectLabel>
              {groups.standaloneAssemblies.map((b) => (
                <SelectItem key={b.id} value={b.id}>{b.label || b.name}</SelectItem>
              ))}
            </SelectGroup>
          )}

          {groups.campuses.length > 0 && (
            <SelectGroup>
              <SelectLabel>Campus fellowships</SelectLabel>
              {groups.campuses.map((b) => (
                <SelectItem key={b.id} value={b.id}>{b.label || b.name}</SelectItem>
              ))}
            </SelectGroup>
          )}

          {groups.international.length > 0 && (
            <SelectGroup>
              <SelectLabel>International</SelectLabel>
              {groups.international.map((b) => (
                <SelectItem key={b.id} value={b.id}>{b.label || b.name}</SelectItem>
              ))}
            </SelectGroup>
          )}
        </SelectContent>
      </Select>
      {required && (
        <p className="text-xs text-gray-500">Select your Fire-Fire branch, assembly, or campus fellowship.</p>
      )}
    </div>
  );
}
