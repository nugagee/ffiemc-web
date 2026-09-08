/** Shared age bracket options for registration forms. */
export const AGE_BRACKETS = [
  "Under 15",
  "15-20",
  "20-25",
  "25-30",
  "30-35",
  "35-40",
  "40-45",
  "45-50",
  "50-55",
  "55-60",
  "60+",
];

export function isAgeField(field) {
  const name = String(field?.name || "").toLowerCase();
  const label = String(field?.label || "").trim().toLowerCase();
  return (
    name === "age"
    || name === "age_bracket"
    || name === "age_group"
    || name === "age_range"
    || label === "age"
    || label === "age bracket"
    || label === "age group"
    || label.includes("age bracket")
    || label.includes("age group")
  );
}

export function ageOptionsFor(field) {
  if (Array.isArray(field?.options) && field.options.length) return field.options.map(String);
  return AGE_BRACKETS;
}
