export const BIBLE_SCHOOL_DEFAULTS = {
  badge: "Bible College",
  headline: "God's Quarry Site",
  accent: "Bible College",
  collegeName: "God's Quarry Site Bible College (GOSBC)",
  motto: "Teach one to one another",
  announcement: "Admission form is out again",
  formPrice: "₦1,000",
  formInstructions: "You can purchase a form at the College Office.",
  description:
    "GOSBC is a theology institution — a private, non-sectarian educational and training institution for pastors and evangelists.",
  tagline: "You need Biblical teaching to fulfil your Christian calling and ministry.",
  scriptureRef: "1 Kings 6:7; 1 Peter 2:5",
  image: "/gosbc-admission-flyer.png",
  contactHeading: "For enquiries",
  phones: "08161761657\n07045819878",
  items: [
    {
      question: "Do you want to be a firebrand in the hand of the Almighty?",
    },
    {
      question:
        "Do you want God to hew your stone and make you ready before bringing you into His house?",
    },
  ],
};

export function resolveBibleSchoolContent(settings) {
  const stored = settings?.pages?.ministries?.bibleSchool || {};
  const items =
    Array.isArray(stored.items) && stored.items.length
      ? stored.items
      : BIBLE_SCHOOL_DEFAULTS.items;

  return {
    ...BIBLE_SCHOOL_DEFAULTS,
    ...stored,
    items,
    phoneList: String(stored.phones ?? BIBLE_SCHOOL_DEFAULTS.phones)
      .split(/[\n,]+/)
      .map((p) => p.trim())
      .filter(Boolean),
  };
}
