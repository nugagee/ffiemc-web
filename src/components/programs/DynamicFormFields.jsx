import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";
import { Label } from "../ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Checkbox } from "../ui/checkbox";
import { CORE_COUNTRIES, DEFAULT_COUNTRY } from "../../data/countries";

const BASE_FIELDS = new Set(["full_name", "first_name", "last_name", "name_title", "title", "email", "phone", "church", "home_church"]);

export const GENDER_OPTIONS = ["Male", "Female"];

function genderOptionsFor(field) {
  if (Array.isArray(field?.options) && field.options.length) return field.options;
  return GENDER_OPTIONS;
}

function isGenderField(field) {
  return String(field?.name || "").toLowerCase() === "gender"
    || String(field?.label || "").trim().toLowerCase() === "gender";
}

function isCountryField(field) {
  return String(field?.name || "").toLowerCase() === "country"
    || String(field?.label || "").trim().toLowerCase() === "country";
}

function countryOptionsFor(field, current) {
  const base = Array.isArray(field?.options) && field.options.length ? field.options : CORE_COUNTRIES;
  if (current && !base.includes(current)) return [current, ...base];
  return base;
}

/** Render dynamic form fields from program/membership config. */
export function DynamicFormFields({ fields = [], values = {}, onChange, idPrefix = "field" }) {
  const customFields = (fields || []).filter((f) => !BASE_FIELDS.has(f.name));

  return (
    <>
      {customFields.map((field) => {
        const id = `${idPrefix}-${field.name}`;
        const value = values[field.name] ?? "";
        const required = Boolean(field.required);
        const asGender = isGenderField(field);
        const asCountry = isCountryField(field);
        const asSelect = asGender || asCountry || (field.type === "select" && field.options?.length);
        const selectOptions = asGender
          ? genderOptionsFor(field)
          : asCountry
            ? countryOptionsFor(field, value)
            : field.options;
        const selectValue = asCountry ? (value || DEFAULT_COUNTRY) : value;

        if (field.type === "textarea") {
          return (
            <div key={field.name} className="space-y-2">
              <Label htmlFor={id}>{field.label}{required ? " *" : ""}</Label>
              <Textarea
                id={id}
                value={value}
                required={required}
                rows={3}
                onChange={(e) => onChange(field.name, e.target.value)}
                className="focus:border-red-500"
              />
            </div>
          );
        }

        if (asSelect) {
          return (
            <div key={field.name} className="space-y-2">
              <Label>{field.label}{required ? " *" : ""}</Label>
              <Select
                value={selectValue || undefined}
                onValueChange={(v) => onChange(field.name, v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder={`Select ${field.label}`} />
                </SelectTrigger>
                <SelectContent>
                  {(selectOptions || []).map((opt) => (
                    <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {required && (
                <input
                  tabIndex={-1}
                  aria-hidden
                  className="sr-only"
                  value={selectValue}
                  onChange={() => {}}
                  required
                />
              )}
            </div>
          );
        }

        if (field.type === "checkbox") {
          return (
            <div key={field.name} className="flex items-center gap-2">
              <Checkbox
                id={id}
                checked={Boolean(value)}
                onCheckedChange={(v) => onChange(field.name, Boolean(v))}
              />
              <Label htmlFor={id} className="font-normal">{field.label}</Label>
            </div>
          );
        }

        return (
          <div key={field.name} className="space-y-2">
            <Label htmlFor={id}>{field.label}{required ? " *" : ""}</Label>
            <Input
              id={id}
              type={field.type === "number" ? "number" : field.type === "email" ? "email" : field.type === "tel" ? "tel" : field.type === "date" ? "date" : "text"}
              value={value}
              required={required}
              onChange={(e) => onChange(field.name, e.target.value)}
              className="focus:border-red-500"
            />
          </div>
        );
      })}
    </>
  );
}

export function buildFormData(fields, values) {
  const data = {};
  (fields || [])
    .filter((f) => !BASE_FIELDS.has(f.name))
    .forEach((f) => {
      if (values[f.name] != null && values[f.name] !== "") data[f.name] = values[f.name];
    });
  return data;
}

export const DEFAULT_PROGRAM_FIELDS = [
  { name: "gender", label: "Gender", type: "select", required: true, options: GENDER_OPTIONS },
];
