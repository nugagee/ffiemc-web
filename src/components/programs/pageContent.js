export const DEFAULT_PROGRAM_PAGE = {
  badge: "",
  heading: "",
  subheading: "",
  intro: "",
  highlights: "",
  formHeading: "Register now",
  formIntro: "",
  submitLabel: "Complete registration",
  successHeading: "You're registered!",
  successBody: "Thank you for registering. A confirmation has been sent to your email.",
  closedHeading: "Registration is not open",
  closedBody: "",
  heroImage: "",
  layout: "centered",
  theme: "warm",
  showVenue: true,
  showDates: true,
  showTypeBadge: true,
  requireBranch: true,
};

export function mergeProgramPage(raw, program = {}) {
  const src = raw && typeof raw === "object" ? raw : {};
  return {
    ...DEFAULT_PROGRAM_PAGE,
    ...src,
    heading: src.heading || program.title || "",
    intro: src.intro || program.description || "",
    showVenue: src.showVenue !== false,
    showDates: src.showDates !== false,
    showTypeBadge: src.showTypeBadge !== false,
    requireBranch: src.requireBranch !== false,
    layout: ["centered", "split", "banner"].includes(src.layout) ? src.layout : "centered",
    theme: ["warm", "classic", "dark"].includes(src.theme) ? src.theme : "warm",
  };
}

export const THEME_CLASSES = {
  warm: "bg-gradient-to-br from-red-50 via-white to-orange-50 text-gray-900",
  classic: "bg-gray-50 text-gray-900",
  dark: "bg-gradient-to-br from-gray-950 via-red-950 to-black text-white",
};
