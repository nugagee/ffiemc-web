import { Label } from "../ui/label";
import { Input } from "../ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { PERSON_TITLES } from "../../lib/personName";

export function PersonNameFields({
  value = {},
  onChange,
  required = true,
  idPrefix = "person",
}) {
  const patch = (part) => onChange({ ...value, ...part });
  return (
    <>
      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-title`}>Title{required ? " *" : ""}</Label>
        <Select
          value={value.name_title || undefined}
          onValueChange={(name_title) => patch({ name_title })}
        >
          <SelectTrigger id={`${idPrefix}-title`}>
            <SelectValue placeholder="Select title" />
          </SelectTrigger>
          <SelectContent>
            {PERSON_TITLES.map((t) => (
              <SelectItem key={t} value={t}>{t}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {required ? (
          <input
            tabIndex={-1}
            aria-hidden
            className="sr-only"
            value={value.name_title || ""}
            onChange={() => {}}
            required
          />
        ) : null}
      </div>
      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-first`}>First name{required ? " *" : ""}</Label>
        <Input
          id={`${idPrefix}-first`}
          value={value.first_name || ""}
          onChange={(e) => patch({ first_name: e.target.value })}
          required={required}
          className="focus:border-red-500"
          autoComplete="given-name"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-last`}>Last name{required ? " *" : ""}</Label>
        <Input
          id={`${idPrefix}-last`}
          value={value.last_name || ""}
          onChange={(e) => patch({ last_name: e.target.value })}
          required={required}
          className="focus:border-red-500"
          autoComplete="family-name"
        />
      </div>
    </>
  );
}
