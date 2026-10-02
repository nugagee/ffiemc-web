import { Label } from "../ui/label";
import { Input } from "../ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { PERSON_TITLES } from "../../lib/personName";
import { invalidInputClass } from "../../lib/formErrors";
import { FieldMessage } from "./FieldMessage";

export function PersonNameFields({
  value = {},
  onChange,
  required = true,
  requireTitle,
  requireLast,
  errors = {},
  idPrefix = "person",
}) {
  const titleRequired = requireTitle ?? required;
  const lastRequired = requireLast ?? required;
  const patch = (part) => onChange({ ...value, ...part });
  return (
    <>
      <div className="space-y-2" data-field="name_title">
        <Label htmlFor={`${idPrefix}-title`}>Title{titleRequired ? " *" : ""}</Label>
        <Select
          value={value.name_title || undefined}
          onValueChange={(name_title) => patch({ name_title })}
        >
          <SelectTrigger id={`${idPrefix}-title`} className={errors.name_title ? "border-red-500 ring-1 ring-red-200" : ""}>
            <SelectValue placeholder="Select title" />
          </SelectTrigger>
          <SelectContent>
            {PERSON_TITLES.map((t) => (
              <SelectItem key={t} value={t}>{t}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <FieldMessage message={errors.name_title} />
      </div>
      <div className="space-y-2" data-field="first_name">
        <Label htmlFor={`${idPrefix}-first`}>First name{required ? " *" : ""}</Label>
        <Input
          id={`${idPrefix}-first`}
          value={value.first_name || ""}
          onChange={(e) => patch({ first_name: e.target.value })}
          className={invalidInputClass(Boolean(errors.first_name), "focus:border-red-500")}
          autoComplete="given-name"
          aria-invalid={Boolean(errors.first_name)}
        />
        <FieldMessage message={errors.first_name} />
      </div>
      <div className="space-y-2" data-field="last_name">
        <Label htmlFor={`${idPrefix}-last`}>Last name{lastRequired ? " *" : ""}</Label>
        <Input
          id={`${idPrefix}-last`}
          value={value.last_name || ""}
          onChange={(e) => patch({ last_name: e.target.value })}
          className={invalidInputClass(Boolean(errors.last_name), "focus:border-red-500")}
          autoComplete="family-name"
          aria-invalid={Boolean(errors.last_name)}
        />
        <FieldMessage message={errors.last_name} />
      </div>
    </>
  );
}
