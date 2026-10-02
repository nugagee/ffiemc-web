/** Audience categories and team subcategories for members, announcements, and meetings. */

export const REGISTRATION_CATEGORIES = [
  {
    id: "worker",
    label: "Workers",
    description: "People who registered to serve at the youth convention.",
  },
  {
    id: "participant",
    label: "Participants",
    description: "People who registered to attend the youth convention.",
  },
];

/** Convention teams, then the existing ministry list so older records still match. */
export const AUDIENCE_TEAMS = [
  "Choir",
  "Ushers",
  "Prayer Team",
  "Media / Photography",
  "Medical Team",
  "Technical / Engineers",
  "Welfare / Hospitality",
  "Protocol",
  "Feeding",
  "Interpretation",
  "Decoration",
  "Registration",
  "Moderators",
  "Accommodation",
  "Logistics",
  "Transportation",
  "Sanitation",
  "Publicity",
  "Media",
  "Choir / Worship",
  "Ushering",
  "Youth",
  "Children",
  "Women",
  "Men",
  "Prayer",
  "Evangelism",
  "Welfare",
  "Other",
];

export function categoryIds(row) {
  return Array.isArray(row?.registration_categories) ? row.registration_categories.filter(Boolean) : [];
}

export function categoryLabel(ids) {
  const list = Array.isArray(ids) ? ids : [];
  return list
    .map((id) => REGISTRATION_CATEGORIES.find((item) => item.id === id)?.label || id)
    .filter(Boolean)
    .join(", ");
}

export function teamsFromRow(row) {
  if (Array.isArray(row?.audience_teams) && row.audience_teams.length) {
    return row.audience_teams.map((item) => String(item).trim()).filter(Boolean);
  }
  return String(row?.ministry || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function buildAudienceFilters({ roleIds = [], branchId = "", teams = [], ministry = "" } = {}) {
  const filters = {};
  if (roleIds?.length) filters.role_ids = roleIds;
  if (branchId) filters.branch_ids = [branchId];
  if (teams?.length) filters.teams = teams;
  if (ministry && !teams?.length) filters.ministry = ministry;
  return filters;
}
