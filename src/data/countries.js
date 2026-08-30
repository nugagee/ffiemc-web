/** Core countries for registration dropdowns (Nigeria first as church home base). */
export const CORE_COUNTRIES = [
  "Nigeria",
  "Ghana",
  "Kenya",
  "South Africa",
  "United Kingdom",
  "United States",
  "Canada",
  "Ireland",
  "Germany",
  "France",
  "Netherlands",
  "Italy",
  "Spain",
  "United Arab Emirates",
  "Saudi Arabia",
  "Qatar",
  "India",
  "China",
  "Australia",
  "New Zealand",
  "Brazil",
  "Jamaica",
  "Trinidad and Tobago",
  "Cameroon",
  "Benin",
  "Togo",
  "Côte d'Ivoire",
  "Uganda",
  "Tanzania",
  "Rwanda",
  "Other",
];

export const DEFAULT_COUNTRY = "Nigeria";

export function countrySelectOptions(current) {
  const extra = current && !CORE_COUNTRIES.includes(current) ? [current] : [];
  return [...extra, ...CORE_COUNTRIES];
}
