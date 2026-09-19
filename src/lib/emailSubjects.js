/** Default outbound email subject templates (Resend / Edge). Use {placeholders}. */
export const DEFAULT_EMAIL_SUBJECTS = {
  contact: "New FFIEMC website enquiry: {subject}",
  volunteer: "New volunteer application — {teamName} — {fullName}",
  testimony: "New testimony submission from {fullName}",
  prayer: "New prayer request — {category} — {fullName}",
  membership: "New church membership registration — {fullName}",
  mediaContribution: "Media contribution received — {fullName} ({amount})",
  experienceSurvey: "New website experience survey — {rating}/5 — {fullName}",
  compose: "{subject}",
};

export const EMAIL_SUBJECT_FIELDS = [
  {
    key: "contact",
    label: "Contact form",
    hint: "Placeholders: {subject}, {fullName}",
  },
  {
    key: "volunteer",
    label: "Volunteer application",
    hint: "Placeholders: {teamName}, {fullName}, {role}",
  },
  {
    key: "testimony",
    label: "Testimony submission",
    hint: "Placeholders: {fullName}, {title}",
  },
  {
    key: "prayer",
    label: "Prayer request",
    hint: "Placeholders: {fullName}, {category}",
  },
  {
    key: "membership",
    label: "Church membership",
    hint: "Placeholders: {fullName}",
  },
  {
    key: "mediaContribution",
    label: "Media contribution",
    hint: "Placeholders: {fullName}, {amount}, {monthLabel}",
  },
  {
    key: "experienceSurvey",
    label: "Experience survey",
    hint: "Placeholders: {fullName}, {rating}, {averageComfort}",
  },
];

export function mergeEmailSubjects(stored = {}) {
  return { ...DEFAULT_EMAIL_SUBJECTS, ...(stored || {}) };
}

/** Fill `{name}` placeholders in a subject template. */
export function formatEmailSubject(templateOrKey, vars = {}, subjectsMap = {}) {
  const map = mergeEmailSubjects(subjectsMap);
  let tpl =
    (templateOrKey && map[templateOrKey]) ||
    templateOrKey ||
    DEFAULT_EMAIL_SUBJECTS.compose ||
    "{subject}";
  if (map[templateOrKey]) tpl = map[templateOrKey];
  Object.entries(vars || {}).forEach(([key, value]) => {
    tpl = String(tpl).replace(new RegExp(`\\{${key}\\}`, "g"), value == null ? "" : String(value));
  });
  return tpl.replace(/\{[a-zA-Z0-9_]+\}/g, "").replace(/\s{2,}/g, " ").trim();
}

export function subjectFromSettings(settings, key, vars = {}) {
  return formatEmailSubject(key, vars, settings?.emailSubjects);
}
