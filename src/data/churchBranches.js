/** Default church districts and branches — used when API is unavailable. */

export const CHURCH_DISTRICTS = [
  {
    id: "d1000001-0000-4000-8000-000000000001",
    name: "Ayegun District",
    slug: "ayegun-district",
    description: "Assemblies and fellowships under the Ayegun district oversight.",
    sortOrder: 1,
  },
  {
    id: "d1000001-0000-4000-8000-000000000002",
    name: "Oke Ogbere District",
    slug: "oke-ogbere-district",
    description: "Branches united under the Oke Ogbere district.",
    sortOrder: 2,
  },
  {
    id: "d1000001-0000-4000-8000-000000000003",
    name: "Fatusi District",
    slug: "fatusi-district",
    description: "Fellowships gathered under the Fatusi district.",
    sortOrder: 3,
  },
  {
    id: "d1000001-0000-4000-8000-000000000004",
    name: "Academy District",
    slug: "academy-district",
    description: "Academy area assemblies and outreach points.",
    sortOrder: 4,
  },
];

export const CHURCH_BRANCHES = [
  {
    id: "b1000001-0000-4000-8000-000000000001",
    name: "Headquarter",
    slug: "headquarter",
    branchType: "headquarters",
    districtId: null,
    city: "Ibadan",
    state: "Oyo",
    country: "Nigeria",
    region: "local",
    description: "Fire-Fire International Evangelical Church headquarters — Fire-Fire Area, Papa Agric, Olomi.",
    sortOrder: 1,
  },
  {
    id: "b1000001-0000-4000-8000-000000000002",
    name: "Academy",
    slug: "academy",
    branchType: "assembly",
    districtId: "d1000001-0000-4000-8000-000000000004",
    city: "Ibadan",
    state: "Oyo",
    country: "Nigeria",
    region: "local",
    description: "Academy assembly — Academy District.",
    sortOrder: 2,
  },
  {
    id: "b1000001-0000-4000-8000-000000000003",
    name: "Ayegun",
    slug: "ayegun",
    branchType: "assembly",
    districtId: "d1000001-0000-4000-8000-000000000001",
    city: "Ibadan",
    state: "Oyo",
    country: "Nigeria",
    region: "local",
    description: "Ayegun assembly — Ayegun District.",
    sortOrder: 3,
  },
  {
    id: "b1000001-0000-4000-8000-000000000004",
    name: "Fadare Ago",
    slug: "fadare-ago",
    branchType: "assembly",
    districtId: null,
    city: "Ibadan",
    state: "Oyo",
    country: "Nigeria",
    region: "local",
    description: "Fadare Ago assembly.",
    sortOrder: 4,
  },
  {
    id: "b1000001-0000-4000-8000-000000000005",
    name: "Oke Ogbere",
    slug: "oke-ogbere",
    branchType: "assembly",
    districtId: "d1000001-0000-4000-8000-000000000002",
    city: "Ibadan",
    state: "Oyo",
    country: "Nigeria",
    region: "local",
    description: "Oke Ogbere assembly — Oke Ogbere District.",
    sortOrder: 5,
  },
  {
    id: "b1000001-0000-4000-8000-000000000006",
    name: "Fatusi",
    slug: "fatusi",
    branchType: "assembly",
    districtId: "d1000001-0000-4000-8000-000000000003",
    city: "Ibadan",
    state: "Oyo",
    country: "Nigeria",
    region: "local",
    description: "Fatusi assembly — Fatusi District.",
    sortOrder: 6,
  },
  {
    id: "b1000001-0000-4000-8000-000000000007",
    name: "Muslim",
    slug: "muslim",
    branchType: "assembly",
    districtId: null,
    city: "Ibadan",
    state: "Oyo",
    country: "Nigeria",
    region: "local",
    description: "Muslim area assembly.",
    sortOrder: 7,
  },
  {
    id: "b1000001-0000-4000-8000-000000000008",
    name: "Olubadan",
    slug: "olubadan",
    branchType: "assembly",
    districtId: null,
    city: "Ibadan",
    state: "Oyo",
    country: "Nigeria",
    region: "local",
    description: "Olubadan assembly.",
    sortOrder: 8,
  },
  {
    id: "b1000001-0000-4000-8000-000000000009",
    name: "Adegbiji (Obada)",
    slug: "adegbiji-obada",
    branchType: "assembly",
    districtId: null,
    city: "Ibadan",
    state: "Oyo",
    country: "Nigeria",
    region: "local",
    description: "Adegbiji (Obada) assembly.",
    sortOrder: 9,
  },
  {
    id: "b1000001-0000-4000-8000-000000000010",
    name: "Olomi Yeye",
    slug: "olomi-yeye",
    branchType: "assembly",
    districtId: null,
    city: "Ibadan",
    state: "Oyo",
    country: "Nigeria",
    region: "local",
    description: "Olomi Yeye assembly.",
    sortOrder: 10,
  },
  {
    id: "b1000001-0000-4000-8000-000000000011",
    name: "Arowojeka",
    slug: "arowojeka",
    branchType: "assembly",
    districtId: null,
    city: "Ibadan",
    state: "Oyo",
    country: "Nigeria",
    region: "local",
    description: "Arowojeka assembly.",
    sortOrder: 11,
  },
  {
    id: "b1000001-0000-4000-8000-000000000012",
    name: "Alapa",
    slug: "alapa",
    branchType: "assembly",
    districtId: null,
    city: "Ibadan",
    state: "Oyo",
    country: "Nigeria",
    region: "local",
    description: "Alapa assembly.",
    sortOrder: 12,
  },
  {
    id: "b1000001-0000-4000-8000-000000000013",
    name: "Ibuola",
    slug: "ibuola",
    branchType: "assembly",
    districtId: null,
    city: "Ibadan",
    state: "Oyo",
    country: "Nigeria",
    region: "local",
    description: "Ibuola assembly.",
    sortOrder: 13,
  },
  {
    id: "b1000001-0000-4000-8000-000000000014",
    name: "Amuloko",
    slug: "amuloko",
    branchType: "assembly",
    districtId: null,
    city: "Ibadan",
    state: "Oyo",
    country: "Nigeria",
    region: "local",
    description: "Amuloko assembly.",
    sortOrder: 14,
  },
  {
    id: "b1000001-0000-4000-8000-000000000015",
    name: "Olode",
    slug: "olode",
    branchType: "assembly",
    districtId: null,
    city: "Ibadan",
    state: "Oyo",
    country: "Nigeria",
    region: "local",
    description: "Olode assembly.",
    sortOrder: 15,
  },
  {
    id: "b1000001-0000-4000-8000-000000000016",
    name: "FFCF OOU Ago Iwoye Campus",
    slug: "ffcf-oou-ago-iwoye",
    branchType: "campus",
    districtId: null,
    city: "Ago Iwoye",
    state: "Ogun",
    country: "Nigeria",
    region: "local",
    description: "Fire-Fire Christian Fellowship — Olabisi Onabanjo University, Ago Iwoye.",
    sortOrder: 16,
  },
  {
    id: "b1000001-0000-4000-8000-000000000017",
    name: "FFCF AAUA Akungba Campus",
    slug: "ffcf-aaua-akungba",
    branchType: "campus",
    districtId: null,
    city: "Akungba",
    state: "Ondo",
    country: "Nigeria",
    region: "local",
    description: "Fire-Fire Christian Fellowship — Adekunle Ajasin University, Akungba.",
    sortOrder: 17,
  },
];

export const BRANCH_TYPE_LABELS = {
  headquarters: "Headquarters",
  assembly: "Assembly",
  campus: "Campus Fellowship",
};

export function normalizeBranch(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name || "",
    slug: row.slug || "",
    branchType: row.branchType || row.branch_type || "assembly",
    districtId: row.districtId || row.district_id || null,
    districtName: row.districtName || row.district_name || "",
    city: row.city || "",
    state: row.state || "",
    country: row.country || "Nigeria",
    region: row.region || "local",
    isInternational: Boolean(row.isInternational ?? row.is_international),
    description: row.description || "",
    sortOrder: Number(row.sortOrder ?? row.sort_order ?? 0),
    label: row.label || row.name,
  };
}

export function normalizeDistrict(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name || "",
    slug: row.slug || "",
    description: row.description || "",
    sortOrder: Number(row.sortOrder ?? row.sort_order ?? 0),
  };
}

/** Group branches for display and form dropdowns. */
export function groupChurchNetwork(branches, districts) {
  const districtMap = new Map((districts || []).map((d) => [d.id, d]));
  const normalized = (branches || []).map(normalizeBranch).filter(Boolean);

  const headquarters = normalized.filter((b) => b.branchType === "headquarters");
  const campuses = normalized.filter((b) => b.branchType === "campus");
  const international = normalized.filter((b) => b.region === "international" || b.isInternational);
  const assemblies = normalized.filter(
    (b) => b.branchType === "assembly" && !(b.region === "international" || b.isInternational)
  );

  const districtGroups = (districts || []).map((district) => ({
    district,
    branches: assemblies.filter((b) => b.districtId === district.id),
  }));

  const districtIds = new Set((districts || []).map((d) => d.id));
  const standaloneAssemblies = assemblies.filter((b) => !b.districtId || !districtIds.has(b.districtId));

  return {
    all: normalized,
    headquarters,
    campuses,
    assemblies,
    international,
    districtGroups,
    standaloneAssemblies,
    districtMap,
    stats: {
      branches: normalized.length,
      districts: (districts || []).length,
      campuses: campuses.length,
      assemblies: assemblies.length,
    },
  };
}
