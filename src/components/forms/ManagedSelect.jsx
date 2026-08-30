import { Label } from "../ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { optionsFor } from "../../data/formDropdowns";

export function ManagedSelect({
  catalogs,
  fieldKey,
  label,
  value,
  onChange,
  required = false,
  placeholder,
}) {
  const options = optionsFor(catalogs, fieldKey, value);
  return (
    <div className="space-y-2">
      {label ? <Label>{label}{required ? " *" : ""}</Label> : null}
      <Select value={value || undefined} onValueChange={onChange}>
        <SelectTrigger>
          <SelectValue placeholder={placeholder || `Select ${label || fieldKey}`} />
        </SelectTrigger>
        <SelectContent>
          {options.map((opt) => (
            <SelectItem key={opt} value={opt}>{opt}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
