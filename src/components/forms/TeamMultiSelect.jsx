import { Label } from "../ui/label";
import { Checkbox } from "../ui/checkbox";
import { AUDIENCE_TEAMS } from "../../data/audienceCatalog";

export function TeamMultiSelect({
  value = [],
  onChange,
  options = AUDIENCE_TEAMS,
  label = "Teams",
  hint = "Choose Choir, Ushers, or any other team to narrow this list. Leave every box clear to include all teams.",
}) {
  const selected = Array.isArray(value) ? value.filter(Boolean) : [];
  const choices = [...options];
  selected.forEach((item) => {
    if (!choices.includes(item)) choices.push(item);
  });

  const toggle = (name) => {
    const next = selected.includes(name)
      ? selected.filter((item) => item !== name)
      : [...selected, name];
    onChange(next);
  };

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {hint ? <p className="text-xs text-gray-500">{hint}</p> : null}
      <div className="rounded-xl border border-gray-200 p-3 grid sm:grid-cols-2 gap-2 max-h-64 overflow-y-auto">
        {choices.map((name) => (
          <label key={name} className="flex items-center gap-2 text-sm text-gray-800">
            <Checkbox checked={selected.includes(name)} onCheckedChange={() => toggle(name)} />
            <span>{name}</span>
          </label>
        ))}
      </div>
    </div>
  );
}

export function CategoryMultiSelect({ value = [], onChange }) {
  const selected = Array.isArray(value) ? value.filter(Boolean) : [];
  const options = [
    { id: "worker", label: "Workers" },
    { id: "participant", label: "Participants" },
  ];

  const toggle = (id) => {
    const next = selected.includes(id)
      ? selected.filter((item) => item !== id)
      : [...selected, id];
    onChange(next);
  };

  return (
    <div className="space-y-2">
      <Label>Registration category</Label>
      <p className="text-xs text-gray-500">
        Workers and participants are the audiences used for announcements, meetings, and publicity.
      </p>
      <div className="rounded-xl border border-gray-200 p-3 grid sm:grid-cols-2 gap-2">
        {options.map((item) => (
          <label key={item.id} className="flex items-center gap-2 text-sm text-gray-800">
            <Checkbox checked={selected.includes(item.id)} onCheckedChange={() => toggle(item.id)} />
            <span>{item.label}</span>
          </label>
        ))}
      </div>
    </div>
  );
}
