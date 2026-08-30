export const PERSON_TITLES = [
  "Mr", "Mrs", "Miss", "Ms", "Dr", "Pastor", "Rev", "Prof",
  "Chief", "Elder", "Evangelist", "Brother", "Sister",
];

export function composeFullName({ name_title, first_name, last_name }) {
  return [name_title, first_name, last_name].map((p) => String(p || "").trim()).filter(Boolean).join(" ");
}

export function personFromRow(row = {}) {
  const first = row.first_name || "";
  const last = row.last_name || "";
  if (first || last) {
    return {
      name_title: row.name_title || "",
      first_name: first,
      last_name: last,
    };
  }
  const parts = String(row.full_name || "").trim().split(/\s+/).filter(Boolean);
  return {
    name_title: row.name_title || "",
    first_name: parts[0] || "",
    last_name: parts.slice(1).join(" "),
  };
}

export function withPersonPayload(form) {
  const name_title = String(form.name_title || "").trim();
  const first_name = String(form.first_name || "").trim();
  const last_name = String(form.last_name || "").trim();
  return {
    name_title,
    first_name,
    last_name,
    full_name: composeFullName({ name_title, first_name, last_name }),
  };
}
