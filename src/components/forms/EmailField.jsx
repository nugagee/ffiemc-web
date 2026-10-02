import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { invalidInputClass } from "../../lib/formErrors";
import { FieldMessage } from "./FieldMessage";

export function EmailField({
  id = "email",
  label = "Email",
  value = "",
  onChange,
  required = true,
  error = "",
  suggestion = "",
  onUseSuggestion,
  onBlur,
}) {
  return (
    <div className="space-y-2" data-field="email">
      <Label htmlFor={id}>
        {label}
        {required ? " *" : ""}
      </Label>
      <Input
        id={id}
        name="email"
        type="email"
        inputMode="email"
        autoComplete="email"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        aria-invalid={Boolean(error)}
        className={invalidInputClass(Boolean(error), "focus:border-red-500")}
      />
      {suggestion ? (
        <button
          type="button"
          className="text-sm font-medium text-red-700 underline underline-offset-2 text-left"
          onClick={() => onUseSuggestion?.(suggestion)}
        >
          Did you mean {suggestion}?
        </button>
      ) : null}
      <FieldMessage message={error} />
    </div>
  );
}
