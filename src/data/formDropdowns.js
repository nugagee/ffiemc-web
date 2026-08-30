import { CORE_COUNTRIES } from "./countries";

export const MEMBER_FIELD_KEYS = [
  "gender",
  "state",
  "baptism_status",
  "occupation",
  "marital_status",
  "country",
  "ministry",
];

export const NIGERIA_STATES = [
  "Abia", "Adamawa", "Akwa Ibom", "Anambra", "Bauchi", "Bayelsa", "Benue", "Borno",
  "Cross River", "Delta", "Ebonyi", "Edo", "Ekiti", "Enugu", "FCT (Abuja)", "Gombe",
  "Imo", "Jigawa", "Kaduna", "Kano", "Katsina", "Kebbi", "Kogi", "Kwara", "Lagos",
  "Nasarawa", "Niger", "Ogun", "Ondo", "Osun", "Oyo", "Plateau", "Rivers", "Sokoto",
  "Taraba", "Yobe", "Zamfara",
];

export const DEFAULT_FORM_DROPDOWNS = [
  { id: "gender", label: "Gender", fieldKey: "gender", locked: true, options: ["Male", "Female"] },
  { id: "state", label: "State", fieldKey: "state", locked: true, options: NIGERIA_STATES },
  {
    id: "baptism_status",
    label: "Baptism status",
    fieldKey: "baptism_status",
    locked: true,
    options: ["Baptized", "Not baptized", "Scheduled for baptism", "Prefer not to say"],
  },
  {
    id: "occupation",
    label: "Occupation",
    fieldKey: "occupation",
    locked: true,
    options: [
      "Student",
      "Employed",
      "Self-employed / Business",
      "Unemployed",
      "Homemaker",
      "Retired",
      "Clergy / Ministry",
      "NYSC / Corps member",
      "Other",
    ],
  },
  {
    id: "marital_status",
    label: "Marital status",
    fieldKey: "marital_status",
    locked: true,
    options: ["Single", "Engaged", "Married", "Widowed", "Divorced", "Separated"],
  },
  { id: "country", label: "Country", fieldKey: "country", locked: true, options: CORE_COUNTRIES },
  { id: "ministry", label: "Ministry / department", fieldKey: "ministry", locked: true, options: [
    "Media", "Choir / Worship", "Ushering", "Youth", "Children", "Women", "Men", "Prayer", "Evangelism", "Welfare", "Other",
  ] },
];

export function slugifyFieldKey(label) {
  return String(label || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "")
    .slice(0, 40) || `field_${Date.now()}`;
}

export function mergeFormDropdowns(stored) {
  const incoming = Array.isArray(stored) ? stored : stored?.catalogs;
  const list = Array.isArray(incoming) ? incoming : [];
  const byId = new Map(list.map((row) => [row.id, row]));
  const merged = DEFAULT_FORM_DROPDOWNS.map((def) => {
    const row = byId.get(def.id);
    if (!row) return { ...def };
    return {
      ...def,
      label: row.label || def.label,
      options: Array.isArray(row.options) && row.options.length ? row.options.map(String) : def.options,
    };
  });
  list.forEach((row) => {
    if (!row?.id || DEFAULT_FORM_DROPDOWNS.some((d) => d.id === row.id)) return;
    merged.push({
      id: row.id,
      label: row.label || row.id,
      fieldKey: row.fieldKey || row.id,
      locked: false,
      options: Array.isArray(row.options) ? row.options.map(String) : [],
    });
  });
  return merged;
}

export function catalogByField(catalogs, fieldKey) {
  return (catalogs || []).find((c) => c.fieldKey === fieldKey || c.id === fieldKey);
}

export function optionsFor(catalogs, fieldKey, current) {
  const cat = catalogByField(catalogs, fieldKey);
  const opts = cat?.options?.length ? cat.options : [];
  if (current && !opts.includes(current)) return [current, ...opts];
  return opts;
}

/** Dial codes for phone country selector. Nigeria first. */
export const PHONE_COUNTRIES = [
  { iso: "NG", name: "Nigeria", dial: "234" },
  { iso: "GH", name: "Ghana", dial: "233" },
  { iso: "KE", name: "Kenya", dial: "254" },
  { iso: "ZA", name: "South Africa", dial: "27" },
  { iso: "GB", name: "United Kingdom", dial: "44" },
  { iso: "US", name: "United States", dial: "1" },
  { iso: "CA", name: "Canada", dial: "1" },
  { iso: "IE", name: "Ireland", dial: "353" },
  { iso: "DE", name: "Germany", dial: "49" },
  { iso: "FR", name: "France", dial: "33" },
  { iso: "NL", name: "Netherlands", dial: "31" },
  { iso: "IT", name: "Italy", dial: "39" },
  { iso: "ES", name: "Spain", dial: "34" },
  { iso: "AE", name: "United Arab Emirates", dial: "971" },
  { iso: "SA", name: "Saudi Arabia", dial: "966" },
  { iso: "QA", name: "Qatar", dial: "974" },
  { iso: "IN", name: "India", dial: "91" },
  { iso: "CN", name: "China", dial: "86" },
  { iso: "AU", name: "Australia", dial: "61" },
  { iso: "NZ", name: "New Zealand", dial: "64" },
  { iso: "BR", name: "Brazil", dial: "55" },
  { iso: "JM", name: "Jamaica", dial: "1876" },
  { iso: "CM", name: "Cameroon", dial: "237" },
  { iso: "BJ", name: "Benin", dial: "229" },
  { iso: "TG", name: "Togo", dial: "228" },
  { iso: "CI", name: "Côte d'Ivoire", dial: "225" },
  { iso: "UG", name: "Uganda", dial: "256" },
  { iso: "TZ", name: "Tanzania", dial: "255" },
  { iso: "RW", name: "Rwanda", dial: "250" },
];

export const DEFAULT_PHONE_ISO = "NG";

export function parsePhone(value, preferredIso) {
  const raw = String(value || "").replace(/\s+/g, "");
  if (!raw) {
    return { iso: preferredIso || DEFAULT_PHONE_ISO, local: "" };
  }
  const plus = raw.startsWith("+") ? raw.slice(1) : raw.replace(/^00/, "");
  const sorted = [...PHONE_COUNTRIES].sort((a, b) => b.dial.length - a.dial.length);
  const sameDial = (dial) => PHONE_COUNTRIES.filter((c) => c.dial === dial);
  const match = sorted.find((c) => plus.startsWith(c.dial));
  if (match) {
    const local = plus.slice(match.dial.length);
    const siblings = sameDial(match.dial);
    const preferred = siblings.find((c) => c.iso === preferredIso);
    return { iso: preferred?.iso || match.iso, local };
  }
  return { iso: preferredIso || DEFAULT_PHONE_ISO, local: plus.replace(/^0+/, "") };
}

export function formatPhone(iso, local) {
  const country = PHONE_COUNTRIES.find((c) => c.iso === iso) || PHONE_COUNTRIES[0];
  const digits = String(local || "").replace(/\D/g, "").replace(/^0+/, "");
  return `+${country.dial}${digits}`;
}
