import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";
import { Label } from "../ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Checkbox } from "../ui/checkbox";
import { CORE_COUNTRIES, DEFAULT_COUNTRY } from "../../data/countries";
import { AGE_BRACKETS, ageOptionsFor, isAgeField } from "../../data/ageBrackets";
import { invalidInputClass } from "../../lib/formErrors";
import { FieldMessage } from "../forms/FieldMessage";

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
export function DynamicFormFields({ fields = [], values = {}, onChange, idPrefix = "field", errors = {} }) {
  const customFields = (fields || []).filter((f) => !BASE_FIELDS.has(f.name));

  return (
    <>
      {customFields.map((field) => {
        const id = `${idPrefix}-${field.name}`;
        const value = values[field.name] ?? "";
        const required = Boolean(field.required);
        const asGender = isGenderField(field);
        const asCountry = isCountryField(field);
        const asAge = isAgeField(field);
        const asSelect = asGender || asCountry || asAge || (field.type === "select" && field.options?.length);
        const selectOptions = asGender
          ? genderOptionsFor(field)
          : asCountry
            ? countryOptionsFor(field, value)
            : asAge
              ? ageOptionsFor(field)
              : field.options;
        const selectValue = asCountry ? (value || DEFAULT_COUNTRY) : value;

        if (field.type === "textarea") {
          return (
            <div key={field.name} className="space-y-2" data-field={field.name}>
              <Label htmlFor={id}>{field.label}{required ? " *" : ""}</Label>
              <Textarea
                id={id}
                value={value}
                rows={3}
                onChange={(e) => onChange(field.name, e.target.value)}
                className={invalidInputClass(Boolean(errors[field.name]), "focus:border-red-500")}
              />
              <FieldMessage message={errors[field.name]} />
            </div>
          );
        }

        if (asSelect) {
          return (
            <div key={field.name} className="space-y-2" data-field={field.name}>
              <Label>{field.label}{required ? " *" : ""}</Label>
              <Select
                value={selectValue || undefined}
                onValueChange={(v) => onChange(field.name, v)}
              >
                <SelectTrigger className={errors[field.name] ? "border-red-500 ring-1 ring-red-200" : ""}>
                  <SelectValue placeholder={asAge ? "Select age bracket" : `Select ${field.label}`} />
                </SelectTrigger>
                <SelectContent>
                  {(selectOptions || []).map((opt) => (
                    <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FieldMessage message={errors[field.name]} />
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
          <div key={field.name} className="space-y-2" data-field={field.name}>
            <Label htmlFor={id}>{field.label}{required ? " *" : ""}</Label>
            <Input
              id={id}
              type={field.type === "number" ? "number" : field.type === "email" ? "email" : field.type === "tel" ? "tel" : field.type === "date" ? "date" : "text"}
              value={value}
              onChange={(e) => onChange(field.name, e.target.value)}
              className={invalidInputClass(Boolean(errors[field.name]), "focus:border-red-500")}
            />
            <FieldMessage message={errors[field.name]} />
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
  { name: "age", label: "Age", type: "select", required: true, options: AGE_BRACKETS },
];
