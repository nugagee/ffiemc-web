import { useEffect, useState } from "react";
import { Label } from "../ui/label";
import { Input } from "../ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { DEFAULT_PHONE_ISO, PHONE_COUNTRIES, formatPhone, parsePhone } from "../../data/formDropdowns";

export function PhoneField({
  label = "Phone",
  value,
  onChange,
  required = false,
  id = "phone",
}) {
  const [iso, setIso] = useState(() => parsePhone(value).iso || DEFAULT_PHONE_ISO);
  const parsed = parsePhone(value, iso);
  const local = parsed.local;

  useEffect(() => {
    const next = parsePhone(value, iso);
    if (next.iso && next.iso !== iso && next.local) setIso(next.iso);
    // Keep the user's country pick when the number is empty (otherwise it snaps back to Nigeria).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const setCountry = (nextIso) => {
    setIso(nextIso);
    onChange(formatPhone(nextIso, local));
  };

  const setLocal = (nextLocal) => {
    onChange(formatPhone(iso, nextLocal));
  };

  return (
    <div className="space-y-2">
      {label ? <Label htmlFor={id}>{label}{required ? " *" : ""}</Label> : null}
      <div className="flex gap-2">
        <Select value={iso} onValueChange={setCountry}>
          <SelectTrigger className="w-[168px] shrink-0">
            <SelectValue placeholder="Country" />
          </SelectTrigger>
          <SelectContent>
            {PHONE_COUNTRIES.map((c) => (
              <SelectItem key={c.iso} value={c.iso}>
                {c.iso} +{c.dial}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          id={id}
          type="tel"
          inputMode="tel"
          value={local}
          required={required}
          minLength={required ? 7 : undefined}
          placeholder="8012345678"
          className="focus:border-red-500"
          onChange={(e) => setLocal(e.target.value)}
        />
      </div>
    </div>
  );
}
