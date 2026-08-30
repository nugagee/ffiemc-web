import { Label } from "../ui/label";
import { Checkbox } from "../ui/checkbox";

export function RoleMultiSelect({
  roles = [],
  value = [],
  onChange,
  required = false,
  label = "Church roles",
  hint = "Select every role this person holds in the church.",
}) {
  const ids = Array.isArray(value) ? value.filter(Boolean) : value ? [value] : [];

  const toggle = (id) => {
    const next = ids.includes(id) ? ids.filter((item) => item !== id) : [...ids, id];
    onChange(next);
  };

  return (
    <div className="space-y-2">
      <Label>
        {label}
        {required ? " *" : ""}
      </Label>
      {hint ? <p className="text-xs text-gray-500">{hint}</p> : null}
      <div className="rounded-xl border border-gray-200 p-3 grid sm:grid-cols-2 gap-2">
        {roles.length === 0 ? (
          <p className="text-sm text-gray-500 col-span-2">No roles yet. Add them under Programs → Church roles.</p>
        ) : (
          roles.map((role) => (
            <label key={role.id} className="flex items-center gap-2 text-sm text-gray-800">
              <Checkbox checked={ids.includes(role.id)} onCheckedChange={() => toggle(role.id)} />
              <span>{role.name}</span>
            </label>
          ))
        )}
      </div>
    </div>
  );
}

export function memberRoleIds(row) {
  if (Array.isArray(row?.role_ids) && row.role_ids.length) return row.role_ids.filter(Boolean);
  if (row?.role_id) return [row.role_id];
  return [];
}

export function memberRoleLabel(row, roles = []) {
  if (row?.role_names) return row.role_names;
  const ids = memberRoleIds(row);
  const names = roles.filter((role) => ids.includes(role.id)).map((role) => role.name);
  return names.join(", ") || row?.role_name || "";
}
