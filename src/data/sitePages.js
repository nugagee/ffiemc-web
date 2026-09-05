import { catechismCmsDefaults, doctrinesCmsDefaults, historyCmsDefaults } from "./aboutDefaults";
import { DEFAULT_PRIVACY_CONTENT, DEFAULT_TERMS_CONTENT } from "./legalContent";

export const DASHBOARD_FEATURES = [
  { key: "overview", group: "Dashboard", label: "Overview / analytics", hint: "Dashboard charts and totals", actions: ["view"] },
  { key: "visitors", group: "Dashboard", label: "Visitor tracking", hint: "Recent public page views", actions: ["view"] },
  { key: "contacts", group: "Dashboard", label: "Contact messages inbox", hint: "Messages submitted on Contact", actions: ["view", "edit", "delete"] },
  { key: "banners", group: "Banners", label: "Banners", hint: "Popup and sticky banners, analytics, and activity log", actions: ["view", "edit", "delete"] },
  { key: "program_types", group: "Programs", label: "Program types", hint: "Convention, conference, outreach categories", actions: ["view", "edit", "delete"] },
  { key: "programs", group: "Programs", label: "Church programs", hint: "Create programs with registration forms", actions: ["view", "edit", "delete"] },
  { key: "church_branches", group: "Programs", label: "Branches & districts", hint: "Headquarters, assemblies, campus fellowships, and district groupings", actions: ["view", "edit", "delete"] },
  { key: "church_roles", group: "Programs", label: "Church roles", hint: "Pastor, deacon, member, and other roles — members may hold more than one", actions: ["view", "edit", "delete"] },
  { key: "member_notifications", group: "Programs", label: "Member announcements", hint: "Email and SMS announcements to members by category", actions: ["view", "edit", "delete"] },
  { key: "program_registrations", group: "Registrations", label: "Event registrations", hint: "FFIEYC and other program sign-ups, including registering on behalf of participants", actions: ["view", "edit", "delete"] },
  { key: "volunteer_applications", group: "Registrations", label: "Volunteer applications", hint: "Media team and ministry volunteer sign-ups", actions: ["view", "edit", "delete"] },
  { key: "church_members", group: "Registrations", label: "Church members", hint: "Pending, approved, and all member records — including multiple church roles per person", actions: ["view", "edit", "delete"] },
  { key: "form_dropdowns", group: "Registrations", label: "Form dropdowns", hint: "State, baptism, occupation and custom form options", actions: ["view", "edit"] },
  { key: "approvals", group: "Approvals", label: "Approval requests", hint: "Review changes submitted by other admins", actions: ["view", "edit"] },
  { key: "church_meetings", group: "Utilities", label: "Church meetings", hint: "Schedule meetings, invite members, video join and calendar", actions: ["view", "edit", "delete"] },
  { key: "utilities", group: "Utilities", label: "Admin utilities", hint: "Speech to text, notes & diary, Google Translate, and text tools", actions: ["view", "edit", "delete"] },
];

const copy = (fields) => ({ kind: "copy", fields });
const list = (itemFields, extra = {}) => ({ kind: "list", itemFields, ...extra });
const collection = (cms, actions = ["edit", "delete"]) => ({ kind: "collection", cms, actions });
const structured = (kind) => ({ kind });

export const SITE_PAGES = [
  {
    key: "home",
    label: "Home",
    path: "/admin/pages/home",
    sections: [
      { key: "hero", label: "Homepage banners", hint: "Hero carousel slides — upload images, edit headlines, reorder", ...collection("hero") },
      {
        key: "announcements",
        label: "Event banners",
        hint: "Managed under Banners in the sidebar — popup, sticky, analytics, and activity",
        kind: "inbox",
        cms: "announcements",
        actions: ["edit", "delete"],
        actionLabels: { edit: "Manage", delete: "Delete" },
      },
      { key: "welcome", label: "Welcome section", ...copy([
        { name: "headline", label: "Headline" },
        { name: "body", label: "Intro text", type: "textarea" },
        { name: "card1Title", label: "Card 1 title" },
        { name: "card1Body", label: "Card 1 text" },
        { name: "card2Title", label: "Card 2 title" },
        { name: "card2Body", label: "Card 2 text" },
      ]) },
      { key: "stats", label: "Home stats", ...list([
        { name: "value", label: "Value" },
        { name: "label", label: "Label" },
      ]) },
      { key: "eventsPreview", label: "Events preview heading", ...copy([
        { name: "badge", label: "Badge" },
        { name: "heading", label: "Heading" },
        { name: "body", label: "Intro text", type: "textarea" },
      ]) },
      { key: "sermonsPreview", label: "Sermons preview heading", ...copy([
        { name: "badge", label: "Badge" },
        { name: "heading", label: "Heading" },
        { name: "body", label: "Intro text", type: "textarea" },
      ]) },
      { key: "blogPreview", label: "Blog preview heading", ...copy([
        { name: "badge", label: "Badge" },
        { name: "heading", label: "Heading" },
        { name: "body", label: "Intro text", type: "textarea" },
      ]) },
      { key: "ministriesPreview", label: "Ministries preview heading", ...copy([
        { name: "badge", label: "Badge" },
        { name: "heading", label: "Heading" },
        { name: "body", label: "Intro text", type: "textarea" },
      ]) },
      { key: "cta", label: "Call to action", ...copy([
        { name: "badge", label: "Badge" },
        { name: "heading", label: "Heading" },
        { name: "body", label: "Text", type: "textarea" },
      ]) },
      { key: "testimoniesPreview", label: "Testimonies preview heading", ...copy([
        { name: "badge", label: "Badge" },
        { name: "heading", label: "Heading" },
        { name: "body", label: "Intro text", type: "textarea" },
      ]) },
      { key: "social", label: "Social feed", ...list([
        { name: "platform", label: "Platform (facebook, instagram, twitter, tiktok, youtube, audiomack)" },
        { name: "content", label: "Post text", type: "textarea" },
        { name: "timestamp", label: "Time label (e.g. 2 hours ago)" },
        { name: "likes", label: "Likes" },
        { name: "comments", label: "Comments" },
        { name: "shares", label: "Shares" },
        { name: "image", label: "Image", type: "image" },
        { name: "link", label: "Link URL" },
      ], { headingFields: [
        { name: "badge", label: "Badge" },
        { name: "heading", label: "Heading" },
        { name: "body", label: "Intro text", type: "textarea" },
      ] }) },
    ],
  },
  {
    key: "about",
    label: "About",
    path: "/admin/pages/about",
    sections: [
      { key: "hero", label: "Page header", ...copy([
        { name: "badge", label: "Badge" },
        { name: "headline", label: "Headline" },
        { name: "accent", label: "Accent line" },
        { name: "intro", label: "Intro text", type: "textarea" },
      ]) },
      { key: "mission", label: "Mission & vision", ...copy([
        { name: "motto", label: "Motto" },
        { name: "mission", label: "Mission", type: "textarea" },
        { name: "vision", label: "Vision", type: "textarea" },
      ]) },
      { key: "values", label: "Doctrines section heading", ...copy([
        { name: "badge", label: "Badge" },
        { name: "heading", label: "Heading" },
        { name: "intro", label: "Intro", type: "textarea" },
      ]) },
      { key: "doctrines", label: "Church doctrines", ...structured("doctrines") },
      { key: "catechism", label: "Catechism", ...structured("catechism") },
      { key: "history", label: "Church history", ...structured("history") },
      { key: "pastor", label: "Pastor's message", ...copy([
        { name: "badge", label: "Badge" },
        { name: "heading", label: "Heading" },
        { name: "quote", label: "Quote", type: "textarea" },
      ]) },
      { key: "visit", label: "Plan your visit", ...copy([
        { name: "badge", label: "Badge" },
        { name: "heading", label: "Heading" },
        { name: "intro", label: "Intro", type: "textarea" },
        { name: "expect", label: "What to expect" },
      ]) },
    ],
  },
  {
    key: "services",
    label: "Services",
    path: "/admin/pages/services",
    sections: [
      { key: "hero", label: "Page header", ...copy([
        { name: "badge", label: "Badge" },
        { name: "headline", label: "Headline" },
        { name: "accent", label: "Accent line" },
        { name: "intro", label: "Intro text", type: "textarea" },
      ]) },
      { key: "times", label: "Service times", ...list([
        { name: "name", label: "Name" },
        { name: "day", label: "Day" },
        { name: "time", label: "Time" },
        { name: "description", label: "Description", type: "textarea" },
        { name: "features", label: "Features (comma-separated)", type: "textarea" },
      ], { headingFields: [
        { name: "badge", label: "Badge" },
        { name: "heading", label: "Heading" },
        { name: "intro", label: "Intro", type: "textarea" },
      ] }) },
      { key: "programmes", label: "Church activities & special events", ...list([
        { name: "group", label: "Category (Monthly, Mountain Programs, Yearly)" },
        { name: "title", label: "Title" },
        { name: "frequency", label: "Schedule" },
        { name: "description", label: "Description", type: "textarea" },
      ], { headingFields: [
        { name: "badge", label: "Badge" },
        { name: "heading", label: "Heading" },
        { name: "intro", label: "Intro", type: "textarea" },
      ] }) },
      { key: "expect", label: "What to expect", ...list([
        { name: "title", label: "Title" },
        { name: "description", label: "Description", type: "textarea" },
      ], { headingFields: [
        { name: "badge", label: "Badge" },
        { name: "heading", label: "Heading" },
      ] }) },
      { key: "guidelines", label: "Service guidelines", ...list([
        { name: "title", label: "Title" },
        { name: "description", label: "Description", type: "textarea" },
      ], { headingFields: [
        { name: "heading", label: "Section heading" },
      ] }) },
      { key: "cta", label: "Bottom call to action", ...copy([
        { name: "heading", label: "Heading" },
        { name: "body", label: "Text", type: "textarea" },
      ]) },
    ],
  },
  {
    key: "leadership",
    label: "Leadership",
    path: "/admin/pages/leadership",
    sections: [
      { key: "hero", label: "Page header", ...copy([
        { name: "badge", label: "Badge" },
        { name: "headline", label: "Headline" },
        { name: "accent", label: "Accent line" },
        { name: "intro", label: "Intro text", type: "textarea" },
      ]) },
      { key: "team", label: "Pastoral team", ...list([
        { name: "name", label: "Name" },
        { name: "position", label: "Position" },
        { name: "image", label: "Photo URL", type: "image" },
        { name: "bio", label: "Bio", type: "textarea" },
      ], { headingFields: [
        { name: "badge", label: "Badge" },
        { name: "heading", label: "Heading" },
        { name: "intro", label: "Intro", type: "textarea" },
      ] }) },
      {
        key: "youthEscos",
        label: "Youth ministry executives (Escos)",
        hint: "Add, edit, delete, and drag to reorder youth executives. Photos appear on the Leadership page.",
        ...list(
          [
            { name: "name", label: "Name" },
            { name: "post", label: "Post held" },
            { name: "branch", label: "Church branch" },
            { name: "email", label: "Email" },
            { name: "phone", label: "Phone" },
            { name: "image", label: "Photo", type: "image" },
          ],
          {
            headingFields: [
              { name: "badge", label: "Badge" },
              { name: "heading", label: "Heading" },
              { name: "intro", label: "Intro", type: "textarea" },
            ],
          }
        ),
      },
      { key: "departments", label: "Ministry departments", ...list([
        { name: "name", label: "Name" },
        { name: "head", label: "Led by" },
        { name: "description", label: "Description", type: "textarea" },
      ], { headingFields: [
        { name: "badge", label: "Badge" },
        { name: "heading", label: "Heading" },
        { name: "intro", label: "Intro", type: "textarea" },
      ] }) },
      { key: "values", label: "Leadership values", ...list([
        { name: "title", label: "Quality title" },
        { name: "description", label: "Quality description", type: "textarea" },
      ], { headingFields: [
        { name: "badge", label: "Badge" },
        { name: "heading", label: "Heading" },
        { name: "body", label: "Intro", type: "textarea" },
        { name: "quote", label: "Quote", type: "textarea" },
        { name: "cite", label: "Quote attribution" },
        { name: "stat1Value", label: "Stat 1 value" },
        { name: "stat1Label", label: "Stat 1 label" },
        { name: "stat2Value", label: "Stat 2 value" },
        { name: "stat2Label", label: "Stat 2 label" },
      ] }) },
      { key: "cta", label: "Join leadership", ...copy([
        { name: "heading", label: "Heading" },
        { name: "body", label: "Text", type: "textarea" },
      ]) },
    ],
  },
  {
    key: "ministries",
    label: "Ministries",
    path: "/admin/pages/ministries",
    sections: [
      { key: "hero", label: "Page header", ...copy([
        { name: "badge", label: "Badge" },
        { name: "headline", label: "Headline" },
        { name: "accent", label: "Accent line" },
        { name: "intro", label: "Intro text", type: "textarea" },
      ]) },
      { key: "network", label: "Branches & districts intro", ...copy([
        { name: "body", label: "Network section intro", type: "textarea" },
      ]) },
      { key: "departments", label: "Ministry departments heading", ...copy([
        { name: "badge", label: "Badge" },
        { name: "heading", label: "Heading" },
        { name: "body", label: "Intro text", type: "textarea" },
      ]) },
      {
        key: "bibleSchool",
        label: "Bible School (GOSBC)",
        hint: "God's Quarry Site Bible College — admission, description, and contact details",
        ...list(
          [{ name: "question", label: "Engagement question", type: "textarea" }],
          {
            headingFields: [
              { name: "badge", label: "Section badge" },
              { name: "headline", label: "Headline" },
              { name: "accent", label: "Accent line" },
              { name: "collegeName", label: "College full name" },
              { name: "motto", label: "Motto / tagline under title" },
              { name: "announcement", label: "Admission announcement" },
              { name: "formPrice", label: "Form price (e.g. ₦1,000)" },
              { name: "formInstructions", label: "How to get a form", type: "textarea" },
              { name: "description", label: "About the college", type: "textarea" },
              { name: "tagline", label: "Motivational tagline", type: "textarea" },
              { name: "scriptureRef", label: "Scripture reference" },
              { name: "image", label: "Flyer / hero image", type: "image" },
              { name: "contactHeading", label: "Contact heading" },
              { name: "phones", label: "Phone numbers (one per line)", type: "textarea" },
            ],
          }
        ),
      },
      { key: "list", label: "Ministry listings", ...collection("ministries") },
    ],
  },
  {
    key: "events",
    label: "Events",
    path: "/admin/pages/events",
    sections: [
      { key: "hero", label: "Page header", ...copy([
        { name: "badge", label: "Badge" },
        { name: "headline", label: "Headline" },
        { name: "accent", label: "Accent line" },
        { name: "intro", label: "Intro text", type: "textarea" },
      ]) },
      { key: "list", label: "Event listings", hint: "Upload an image per event and drag rows to set homepage card order", ...collection("events") },
    ],
  },
  {
    key: "sermons",
    label: "Sermons",
    path: "/admin/pages/sermons",
    sections: [
      { key: "hero", label: "Page header", ...copy([
        { name: "badge", label: "Badge" },
        { name: "headline", label: "Headline" },
        { name: "accent", label: "Accent line" },
        { name: "intro", label: "Intro text", type: "textarea" },
      ]) },
      { key: "list", label: "Sermon listings", ...collection("sermons") },
    ],
  },
  {
    key: "blog",
    label: "Blog page",
    path: "/admin/pages/blog",
    sections: [
      { key: "hero", label: "Page header", ...copy([
        { name: "badge", label: "Badge" },
        { name: "headline", label: "Headline" },
        { name: "accent", label: "Accent line" },
        { name: "intro", label: "Intro text", type: "textarea" },
      ]) },
      { key: "posts", label: "Blog posts", ...collection("blog") },
    ],
  },
  {
    key: "testimonies",
    label: "Testimonies",
    path: "/admin/pages/testimonies",
    sections: [
      { key: "hero", label: "Page header", ...copy([
        { name: "badge", label: "Badge" },
        { name: "headline", label: "Headline" },
        { name: "accent", label: "Accent line" },
        { name: "intro", label: "Intro text", type: "textarea" },
      ]) },
      {
        key: "list",
        label: "Testimony review & publishing",
        hint: "Review form submissions, edit for formality, approve/reject, and publish to the website",
        kind: "inbox",
        cms: "testimonies",
        actions: ["edit", "delete"],
        actionLabels: {
          edit: "Review / publish",
          delete: "Delete",
        },
      },
    ],
  },
  {
    key: "contact",
    label: "Contact",
    path: "/admin/pages/contact",
    sections: [
      { key: "hero", label: "Page header", ...copy([
        { name: "badge", label: "Badge" },
        { name: "headline", label: "Headline" },
        { name: "accent", label: "Accent line" },
        { name: "intro", label: "Intro text", type: "textarea" },
      ]) },
      { key: "church", label: "Church details & socials", ...copy([
        { name: "name", label: "Church name" },
        { name: "pastor", label: "Senior pastor" },
        { name: "logo", label: "Logo", type: "image" },
        { name: "location", label: "Address" },
        { name: "phone", label: "Phone" },
        { name: "email", label: "Public email" },
        { name: "notificationEmail", label: "Notification email (form copies)" },
        { name: "facebook", label: "Facebook URL" },
        { name: "twitter", label: "Twitter URL" },
        { name: "instagram", label: "Instagram URL" },
        { name: "tiktok", label: "TikTok URL" },
        { name: "youtube", label: "YouTube URL" },
        { name: "audiomack", label: "Audiomack URL" },
      ]) },
      { key: "hours", label: "Office hours", ...copy([
        { name: "weekday", label: "Monday–Friday" },
        { name: "saturday", label: "Saturday" },
        { name: "sunday", label: "Sunday" },
      ]) },
    ],
  },
  {
    key: "prayer",
    label: "Prayer request",
    path: "/admin/pages/prayer",
    sections: [
      { key: "hero", label: "Page header", ...copy([
        { name: "badge", label: "Badge" },
        { name: "headline", label: "Headline" },
        { name: "accent", label: "Accent line" },
        { name: "intro", label: "Intro text", type: "textarea" },
      ]) },
      { key: "categories", label: "Prayer categories", ...list([
        { name: "name", label: "Category name" },
      ]) },
      {
        key: "inbox",
        label: "Prayer chat & assignments",
        hint: "Review requests, reply in chat, assign pastors, email visitors",
        kind: "inbox",
        cms: "prayers",
        actions: ["edit", "delete"],
        actionLabels: {
          edit: "Review / reply",
          delete: "Delete",
        },
      },
      {
        key: "pastors",
        label: "Prayer pastors",
        hint: "Create pastor accounts that can log in and handle assigned requests",
        kind: "copy",
        fields: [],
        actions: ["edit", "delete"],
        actionLabels: {
          edit: "Manage pastors",
          delete: "Disable",
        },
      },
    ],
  },
  {
    key: "join",
    label: "Join the church",
    path: "/admin/pages/join",
    sections: [
      { key: "hero", label: "Membership page header", hint: "Public /join-church copy. Registrants can select more than one church role.", ...copy([
        { name: "badge", label: "Badge" },
        { name: "headline", label: "Headline" },
        { name: "intro", label: "Intro text", type: "textarea" },
        { name: "consentTitle", label: "Consent heading" },
        { name: "consentText", label: "Consent checkbox text", type: "textarea" },
      ]) },
    ],
  },
  {
    key: "donate",
    label: "Donate",
    path: "/admin/pages/donate",
    sections: [
      { key: "hero", label: "Page header", ...copy([
        { name: "badge", label: "Badge" },
        { name: "headline", label: "Heading" },
        { name: "intro", label: "Intro / verse", type: "textarea" },
        { name: "consentTitle", label: "Consent heading" },
        { name: "consentText", label: "Consent checkbox text", type: "textarea" },
      ]) },
      { key: "accounts", label: "Bank accounts", ...list([
        { name: "id", label: "ID (tithe_gtb, tithe_opay, offering, building)" },
        { name: "label", label: "Label" },
        { name: "accountNumber", label: "Account number" },
        { name: "accountName", label: "Account name" },
        { name: "bank", label: "Bank" },
      ]) },
      { key: "purposes", label: "Giving purposes (legacy)", ...list([
        { name: "id", label: "ID (tithe, offering, …)" },
        { name: "name", label: "Name" },
        { name: "description", label: "Description" },
      ]) },
    ],
  },
  {
    key: "privacy",
    label: "Privacy policy",
    path: "/admin/pages/privacy",
    sections: [
      {
        key: "hero",
        label: "Page header",
        hint: "Public /privacy. Use placeholders {{church}} {{email}} {{phone}} {{location}} in intro text if needed.",
        ...copy([
          { name: "badge", label: "Badge" },
          { name: "headline", label: "Title" },
          { name: "intro", label: "Intro", type: "textarea", rows: 4 },
          { name: "lastUpdated", label: "Last updated" },
        ]),
      },
      {
        key: "sections",
        label: "Policy sections",
        hint: "Each item is a numbered heading plus body. Use blank lines between paragraphs. Start bullet lines with “- ”. Placeholders: {{church}} {{email}} {{phone_clause}} {{location_clause}}.",
        ...list([
          { name: "title", label: "Section title" },
          { name: "body", label: "Section body", type: "textarea", rows: 8 },
        ]),
      },
    ],
  },
  {
    key: "terms",
    label: "Terms of service",
    path: "/admin/pages/terms",
    sections: [
      {
        key: "hero",
        label: "Page header",
        hint: "Public /terms. Use placeholders {{church}} {{email}} {{phone}} {{location}} in intro text if needed.",
        ...copy([
          { name: "badge", label: "Badge" },
          { name: "headline", label: "Title" },
          { name: "intro", label: "Intro", type: "textarea", rows: 4 },
          { name: "lastUpdated", label: "Last updated" },
        ]),
      },
      {
        key: "sections",
        label: "Terms sections",
        hint: "Each item is a heading plus body. Use blank lines between paragraphs. Start bullet lines with “- ”. Placeholders: {{church}} {{email}} {{location_paren}} {{location_clause}}.",
        ...list([
          { name: "title", label: "Section title" },
          { name: "body", label: "Section body", type: "textarea", rows: 8 },
        ]),
      },
    ],
  },
];

export const DEFAULT_PAGE_CONTENT = {
  home: {
    welcome: {
      headline: "Teaching One by One Another",
      body: "At Fire-Fire International Evangelical Church, we believe in the transformative power of personal discipleship. Every member is both a student and a teacher in God's kingdom.",
      card1Title: "Transform Lives",
      card1Body: "Through God's love",
      card2Title: "Build Community",
      card2Body: "Lasting bonds in Christ",
    },
    stats: {
      items: [
        { value: "35+", label: "Years Serving" },
        { value: "500+", label: "Members Reached" },
        { value: "17+", label: "Branches & Assemblies" },
        { value: "4", label: "Weekly Services" },
      ],
    },
    eventsPreview: {
      badge: "What's Happening",
      heading: "Upcoming Events",
      body: "Don't miss FFYC'26 — The Refiner. Join us for worship, teaching, and renewal across every branch and campus.",
    },
    sermonsPreview: {
      badge: "Messages",
      heading: "Latest Sermons",
      body: "Be encouraged and inspired by powerful messages from God's Word.",
    },
    blogPreview: {
      badge: "From the Blog",
      heading: "Latest Articles & Stories",
      body: "Teaching, inspiration, and church news — fresh from our ministry and convention resources.",
    },
    ministriesPreview: {
      badge: "Get Involved",
      heading: "Our Ministries",
      body: "Find your place to serve, grow, and make a difference in God's kingdom.",
    },
    cta: {
      badge: "Ready to Start Your Journey?",
      heading: "Experience God's Love Today",
      body: "Join our church family and discover the life-changing power of God's love. We're here to walk with you every step of the way.",
    },
    testimoniesPreview: {
      badge: "Life Changing Stories",
      heading: "What God is Doing",
      body: "Hear from our church family members about how God has transformed their lives through His love and our community.",
    },
    social: {
      badge: "Stay Connected",
      heading: "Follow Our Journey",
      body: "Stay updated with our latest activities, messages, and community highlights across all our social platforms.",
      items: [
        {
          platform: "facebook",
          content: "Join us this Sunday for a powerful message on 'Walking in Divine Purpose'! Service starts at 9:00 AM. Come hungry for God's Word!",
          timestamp: "2 hours ago",
          likes: "45",
          comments: "12",
          shares: "8",
          image: "https://images.unsplash.com/photo-1438032005730-c779502df39b?w=400&h=250&fit=crop",
          link: "#",
        },
        {
          platform: "instagram",
          content: "Our youth are on fire for God! Last night's youth service was absolutely amazing. The next generation is rising up!",
          timestamp: "5 hours ago",
          likes: "78",
          comments: "23",
          shares: "15",
          image: "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=400&h=250&fit=crop",
          link: "#",
        },
        {
          platform: "twitter",
          content: "Prayer changes everything! Join our Wednesday prayer meeting at 6 PM. Let's seek God's face together!",
          timestamp: "1 day ago",
          likes: "32",
          comments: "8",
          shares: "12",
          image: "",
          link: "#",
        },
      ],
    },
  },
  about: {
    hero: {
      badge: "About Us",
      headline: "Our Story of",
      accent: "Faith & Fire",
      intro: "Discover how God has been working through Fire-Fire International Evangelical Church since April 3, 1991 — transforming lives and building His kingdom in our community.",
    },
    mission: {
      motto: "Teach one by one another",
      mission: "We're on a mission to ignite hearts, transform lives, and spread the fire of God's love. Our ministry is dedicated to sharing the message of hope, redemption, and salvation through Jesus Christ.",
      vision: "To be a thriving, Spirit-filled church that makes disciples, transforms communities, and impacts nations for the glory of God. We envision a church where every member is equipped to serve, every heart is ignited with God's love, and every life reflects the character of Christ.",
    },
    values: {
      badge: "Our Doctrines",
      heading: "What We Stand For",
      intro: "Thirty foundational teachings from God's Word — the backbone of our faith, practice, and proclamation as Fire-Fire International Evangelical Church.",
    },
    doctrines: doctrinesCmsDefaults(),
    catechism: catechismCmsDefaults(),
    history: historyCmsDefaults(),
    pastor: {
      badge: "Pastor's Message",
      heading: "A Word from Our Pastor",
      quote: "God has called us to be a lighthouse in our community, spreading His love and truth to everyone we encounter. At Fire-Fire International, we're not just building a church - we're building God's kingdom, one heart at a time.",
    },
    visit: {
      badge: "Visit Us",
      heading: "Plan Your Visit",
      intro: "We'd love to welcome you to our church family. Here's everything you need to know.",
      expect: "Warm fellowship, inspiring worship, biblical teaching, and a welcoming atmosphere for all.",
    },
  },
  services: {
    hero: {
      badge: "Our Services",
      headline: "Worship With Us",
      accent: "Every Week",
      intro: "Join our church family for inspiring worship, biblical teaching, and meaningful fellowship. Every service is designed to draw you closer to God and build lasting relationships.",
    },
    times: {
      badge: "Weekly Schedule",
      heading: "Regular Services",
      intro: "Join us for our regular worship services throughout the week.",
      items: [
        { name: "Sitting at the Jesus feet", day: "Sunday", time: "8:00 AM - 9:00 AM", description: "A time of intimate worship and reflection where we sit quietly at Jesus' feet.", features: "Quiet Worship, Personal Prayer, Meditation, Scripture Reading" },
        { name: "Main Service", day: "Sunday", time: "9:00 AM - 12:00 PM", description: "Our primary worship service featuring dynamic worship, powerful preaching, prayer, and fellowship.", features: "Praise & Worship, Biblical Preaching, Prayer Time, Fellowship" },
        { name: "Bible Study", day: "Monday", time: "5:00 PM - 7:00 PM", description: "Deep dive into God's Word and biblical teachings.", features: "Scripture Study, Teaching, Discussion, Prayer" },
        { name: "Revival Hour", day: "Wednesday", time: "5:00 PM - 7:00 PM", description: "A midweek revival gathering for prayer, worship, and spiritual renewal.", features: "Worship, Prayer, Teaching, Testimonies" },
        { name: "Men's Program", day: "Friday", time: "9:00 AM - 3:00 PM", description: "Weekly men's gathering for prayer, teaching, fellowship, and spiritual growth as we come up higher in Christ.", features: "Prayer, Teaching, Fellowship, Men's Ministry" },
        { name: "Night Vigil", day: "Friday", time: "12:00 AM - 5:00 AM", description: "Overnight prayer and worship as we seek God's face through the night.", features: "Prayer, Worship, Intercession, Communion with God" },
      ],
    },
    programmes: {
      badge: "Church Calendar",
      heading: "Church Activities & Special Events",
      intro: "Monthly gatherings, mountain prayer meetings, and annual conventions that shape our church life throughout the year.",
      items: [
        { group: "Monthly", title: "Workers Meeting", frequency: "Every third Sunday of the month", description: "Fellowship and coordination for church workers and ministry leaders." },
        { group: "Monthly", title: "Brother's Vigil", frequency: "Last Thursday of the month", description: "A night of prayer and intercession for the men of the church." },
        { group: "Monthly", title: "Sister's Vigil", frequency: "Third Thursday of the month", description: "A night of prayer and intercession for the women of the church." },
        { group: "Mountain Programs", title: "Daily Prayer Meeting", frequency: "Daily", description: "Corporate prayer on the mountain — seeking God's face together every day." },
        { group: "Mountain Programs", title: "Mowoofin", frequency: "Every Wednesday", description: "Prayer meeting for women on the mountain." },
        { group: "Mountain Programs", title: "Coming Up Higher", frequency: "Every Friday", description: "Prayer meeting for men on the mountain." },
        { group: "Yearly", title: "Beginning With God", frequency: "First Wednesday–Friday of the year", description: "Opening the year with consecration, prayer, and seeking the Lord together." },
        { group: "Yearly", title: "Annual Convention", frequency: "Usually Easter weekend / period", description: "Our flagship annual convention — worship, teaching, and revival." },
        { group: "Yearly", title: "August Revival", frequency: "11th–31st August every year", description: "A season of intensive revival, prayer, and spiritual renewal." },
        { group: "Yearly", title: "Men Annual Convention", frequency: "September", description: "Annual gathering for men — teaching, prayer, and empowerment." },
        { group: "Yearly", title: "Youth Convention", frequency: "September", description: "Annual youth convention — faith, fire, and purpose for the next generation." },
        { group: "Yearly", title: "Women Annual Convention", frequency: "November", description: "Annual gathering for women — worship, teaching, and fellowship." },
        { group: "Yearly", title: "Good Morning Jesus (GMJ)", frequency: "1st–21st December every year", description: "Twenty-one days of morning devotion and prayer to close the year in God's presence." },
      ],
    },
    expect: {
      badge: "Before You Visit",
      heading: "What to Expect",
      items: [
        { title: "Inspiring Worship", description: "Contemporary and traditional worship songs that glorify God." },
        { title: "Biblical Teaching", description: "Practical, life-changing messages directly from God's Word." },
        { title: "Warm Fellowship", description: "A welcoming community that feels like family." },
        { title: "Prayer & Ministry", description: "Personal prayer and ministry for your needs." },
      ],
    },
    guidelines: {
      heading: "Service Guidelines",
      items: [
        { title: "Dress Code", description: "Come as you are! We welcome all styles of dress, from casual to formal. The most important thing is your heart's desire to worship God." },
        { title: "Children", description: "Children are welcome in all services. We have a dedicated children's ministry during the main service for ages 3-12." },
        { title: "Parking", description: "Free parking is available on-site. Our ushers will be happy to direct you to available spaces." },
        { title: "Accessibility", description: "Our facility is wheelchair accessible with designated seating areas." },
      ],
    },
    cta: {
      heading: "Ready to Join Us?",
      body: "We can't wait to welcome you to our church family. Come as you are and experience the transforming love of God with us.",
    },
  },
  leadership: {
    hero: {
      badge: "Our Leadership",
      headline: "Shepherds Called",
      accent: "By God",
      intro: "Meet the dedicated leaders who have been called by God to serve, guide, and nurture our church family with wisdom, love, and spiritual maturity.",
    },
    team: {
      badge: "Senior Leadership",
      heading: "Our Pastoral Team",
      intro: "God has blessed us with faithful leaders who are committed to serving Him and His people.",
      items: [
        { name: "Pastor S.O. Moronranti", position: "Senior Pastor", image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&h=300&fit=crop&crop=face", bio: "Pastor Moronranti has been serving the Lord for over 15 years, dedicated to spreading the gospel and nurturing spiritual growth in our community." },
        { name: "Pastor (Mrs.) Grace Moronranti", position: "Assistant Pastor", image: "https://images.unsplash.com/photo-1494790108755-2616b612b3c5?w=300&h=300&fit=crop&crop=face", bio: "Pastor Grace leads our women's ministry and counseling services, bringing compassion and wisdom to our congregation." },
        { name: "Deacon John Adebayo", position: "Church Secretary", image: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=300&h=300&fit=crop&crop=face", bio: "Deacon Adebayo oversees administrative duties and coordinates church activities with dedication and excellence." },
      ],
    },
    youthEscos: {
      badge: "Youth Ministry",
      heading: "Youth Executives (Escos)",
      intro: "Meet the Fire Youth executives serving across our branches and campuses — discipling the next generation and coordinating worship, prayer, academics, and welfare.",
      items: [
        { name: "Samuel Oreoluwa Shontan", post: "Academic Coordinator", branch: "FFCF OOU / Academy Branch", email: "shontansamuel@gmail.com", phone: "", image: "/leadership/youth-escos/samuel-shontan.png" },
        { name: "Moronranti John Oladipupo", post: "Youth Choir Coordinator", branch: "FIRE-FIRE Headquarters", email: "johnmoronranti@gmail.com", phone: "", image: "/leadership/youth-escos/john-moronranti.png" },
        { name: "Gbenro Funmilayo Temitope", post: "Secretary / Sister Coordinator", branch: "Headquarters", email: "gbenrofunmilayo96@gmail.com", phone: "09037926490", image: "/leadership/youth-escos/funmilayo-gbenro.png" },
        { name: "Joshua O. Shontan", post: "Public Relations Officer", branch: "Headquarters", email: "shontanjoshua26@gmail.com", phone: "08051819265", image: "/leadership/youth-escos/joshua-shontan.png" },
        { name: "Adesokan Bukola Grace", post: "Ass. Sister Welfare", branch: "Headquarters", email: "bukolagrace355@gmail.com", phone: "08105113677", image: "/leadership/youth-escos/bukola-adesokan.png" },
        { name: "Ajala Mercy Olatomiwa", post: "Ass. Sister Welfare", branch: "Ayegun", email: "Ajalamercy@gmail.com", phone: "09012591544", image: "/leadership/youth-escos/mercy-ajala.png" },
        { name: "Olayemi Oluwapelumi Tonade", post: "Financial Secretary / Coordinator", branch: "Academy Branch", email: "Oluwapelumi2019@gmail.com", phone: "08149237847", image: "/leadership/youth-escos/oluwapelumi-tonade.png" },
        { name: "Emmanuel Sobalaje", post: "Prayer Coordinator 1", branch: "FFCF / Headquarters", email: "emmanuelericsobalaje@gmail.com", phone: "07035206144", image: "/leadership/youth-escos/emmanuel-sobalaje.png" },
      ],
    },
    departments: {
      badge: "Ministry Departments",
      heading: "Ministry Leadership",
      intro: "Our ministry departments are led by dedicated servants who are passionate about their areas of service.",
      items: [
        { name: "Pastoral Care", head: "Pastor S.O. Moronranti", description: "Spiritual guidance, counseling, and pastoral care for the congregation" },
        { name: "Administration", head: "Deacon John Adebayo", description: "Church operations, finance, and administrative coordination" },
        { name: "Women's Ministry", head: "Pastor (Mrs.) Grace Moronranti", description: "Empowering women through fellowship, teaching, and service" },
        { name: "Youth Ministry", head: "Pastor Michael Ade", description: "Reaching and discipling the next generation for Christ" },
        { name: "Children's Ministry", head: "Sister Mary Oluwaseun", description: "Teaching children about God's love through age-appropriate programs" },
        { name: "Worship Ministry", head: "Brother David Praise", description: "Leading the congregation in spirit-filled worship and praise" },
      ],
    },
    values: {
      badge: "Leadership Values",
      heading: "Servant Leadership",
      body: "Our leaders are called to serve with humility, integrity, and a heart for God's people. They exemplify the character of Christ in their daily lives and ministry.",
      quote: "Leadership is not about being served, but about serving others. We lead by example, showing God's love through our actions and walking humbly before Him.",
      cite: "Pastor S.O. Moronranti",
      stat1Value: "35+",
      stat1Label: "Years of Ministry",
      stat2Value: "6",
      stat2Label: "Ministry Departments",
      items: [
        { title: "Heart for God", description: "Passionate relationship with Jesus Christ and commitment to His Word." },
        { title: "Love for People", description: "Genuine care and compassion for every member of our church family." },
        { title: "Biblical Wisdom", description: "Sound doctrine and practical application of God's Word in leadership." },
      ],
    },
    cta: {
      heading: "Called to Lead?",
      body: "If God has placed a calling on your heart to serve in leadership, we'd love to hear from you. Our church is always looking for faithful servants to join our team.",
    },
  },
  ministries: {
    hero: {
      badge: "Our Network",
      headline: "Branches &",
      accent: "Districts",
      intro: "From headquarters in Olomi to assemblies across Ibadan and campus fellowships at OOU and AAUA — discover where Fire-Fire gathers.",
    },
    network: {
      body: "Explore our districts, local assemblies, and campus fellowships. Every branch is part of one family on mission to teach one by one another.",
    },
    departments: {
      badge: "Serve & Grow",
      heading: "Ministry Departments",
      body: "Beyond our branch network, find your place in youth, women, men, and children's ministries.",
    },
    bibleSchool: {
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
        { question: "Do you want to be a firebrand in the hand of the Almighty?" },
        {
          question:
            "Do you want God to hew your stone and make you ready before bringing you into His house?",
        },
      ],
    },
  },
  events: {
    hero: { badge: "What's Happening", headline: "Upcoming", accent: "Events", intro: "Join us for these opportunities to worship, learn, and grow together in faith." },
  },
  sermons: {
    hero: { badge: "Messages", headline: "Sermons &", accent: "Media", intro: "Be encouraged and inspired by powerful messages from God's Word." },
  },
  blog: {
    hero: { badge: "From Our Heart", headline: "The Fire", accent: "Blog", intro: "Encouragement, teaching, and updates from Fire-Fire International Evangelical Church." },
  },
  testimonies: {
    hero: { badge: "Life Changing Stories", headline: "What God", accent: "Is Doing", intro: "Hear from our church family about how God has transformed lives through His love and this community." },
  },
  contact: {
    hero: {
      badge: "Get In Touch",
      headline: "We'd Love to",
      accent: "Hear From You",
      intro: "Whether you have questions, need prayer, or want to get involved, we're here to help. Reach out to us and let's connect!",
    },
    church: {
      name: "Fire-Fire International Evangelical Church",
      pastor: "Pastor S.O. Moronranti",
      logo: "https://customer-assets.emergentagent.com/job_divine-flame/artifacts/5bkxw8fc_Logo%20png.png",
      location: "Fire-Fire Area, Papa Agric, Off Olojuoro Olunde Road, Olomi, Ibadan, Nigeria",
      phone: "+234 816 267 4805",
      email: "info@firefireintl.org",
      notificationEmail: "adenugaolajideadewale@gmail.com",
      facebook: "https://www.facebook.com/firefireministry",
      twitter: "https://x.com/firefiremin",
      instagram: "https://www.instagram.com/firefireministry",
      tiktok: "https://www.tiktok.com/@firefire.ministry",
      youtube: "",
      audiomack: "https://audiomack.com/fire-fire-ministry",
    },
    hours: {
      weekday: "Mon - Fri: 9:00 AM - 5:00 PM",
      saturday: "Sat: 10:00 AM - 2:00 PM",
      sunday: "Sun: Service Hours",
    },
  },
  prayer: {
    hero: {
      badge: "We Believe in Prayer",
      headline: "Submit a",
      accent: "Prayer Request",
      intro: "Whatever you're facing, you don't have to face it alone. Share your request and our prayer team will stand with you in faith.",
    },
    categories: {
      items: [
        { name: "Personal Prayer Request" },
        { name: "Family" },
        { name: "Healing" },
        { name: "Financial" },
        { name: "Career/Business" },
        { name: "Relationships" },
        { name: "Spiritual Growth" },
        { name: "Church Ministry" },
        { name: "Community/Nation" },
        { name: "Thanksgiving" },
      ],
    },
  },
  join: {
    hero: {
      badge: "Membership",
      headline: "Join Fire-Fire International",
      intro: "Register as a bonafide member of the church. Pastors, workers, and members can complete this form with full details.",
      consentTitle: "Consent",
      consentText: "I confirm that the information I have provided is true, and I consent to Fire-Fire International Evangelical Church collecting and using my details to process this membership application, contact me about church life, and keep a membership record. I understand my application will remain pending until it is approved by church leadership.",
    },
  },
  donate: {
    hero: {
      badge: "Partner with us",
      headline: "Giving Options",
      intro: "Each of you should give what you have decided in your heart to give, for God loves a cheerful giver. — 2 Corinthians 9:7",
      consentTitle: "Willing giver agreement",
      consentText: "I confirm that I am giving willingly and cheerfully to Fire-Fire International Evangelical Church. I understand bank transfers are made at my own initiative, account details are for ministry giving only. I give this gift freely for the work of the gospel.",
    },
    accounts: {
      items: [
        {
          id: "tithe_gtb",
          label: "Tithe Account",
          accountNumber: "0449806275",
          accountName: "FIREFIRE INTL EVANG CHTITHE",
          bank: "GTB",
        },
        {
          id: "tithe_opay",
          label: "Tithe",
          accountNumber: "6104585635",
          accountName: "SAMUEL OLUKUNLE MORONRANTI",
          bank: "OPay",
        },
        {
          id: "offering",
          label: "Offering Account",
          accountNumber: "0158946758",
          accountName: "FIREFIRE INTL EVANGELICAL CH",
          bank: "GTB",
        },
        {
          id: "building",
          label: "Building Account",
          accountNumber: "0095881239",
          accountName: "FIRE FIRE INTERNATIONAL EVANGELICAL",
          bank: "Sterling Bank",
        },
      ],
    },
    purposes: {
      items: [
        { id: "tithe", name: "Tithe", description: "Regular tithe offering" },
        { id: "offering", name: "General Offering", description: "Support church operations" },
        { id: "building", name: "Building Fund", description: "Church building development" },
        { id: "missions", name: "Missions", description: "Support evangelism and outreach" },
        { id: "youth", name: "Youth Ministry", description: "Support youth programs" },
        { id: "special", name: "Special Projects", description: "Special church projects" },
      ],
    },
  },
  privacy: DEFAULT_PRIVACY_CONTENT,
  terms: DEFAULT_TERMS_CONTENT,
};

export function getSitePage(key) {
  return SITE_PAGES.find((page) => page.key === key);
}

function mergeSection(defaultValue, current) {
  if (!defaultValue) return current || {};
  if (Object.prototype.hasOwnProperty.call(defaultValue, "items")) {
    const items = Array.isArray(current?.items)
      ? current.items
      : (defaultValue.items || []);
    return {
      ...defaultValue,
      ...(current || {}),
      items,
    };
  }
  return { ...defaultValue, ...(current || {}) };
}

export function mergePageContent(storedPages = {}) {
  const next = {};
  SITE_PAGES.forEach((page) => {
    const defaults = DEFAULT_PAGE_CONTENT[page.key] || {};
    const stored = storedPages[page.key] || {};
    next[page.key] = {};
    page.sections.forEach((section) => {
      if (section.kind === "collection" || section.kind === "inbox") return;
      next[page.key][section.key] = mergeSection(defaults[section.key], stored[section.key]);
    });
  });
  return next;
}

export function pageSection(settings, pageKey, sectionKey) {
  const defaults = DEFAULT_PAGE_CONTENT[pageKey]?.[sectionKey] || {};
  const current = settings?.pages?.[pageKey]?.[sectionKey];
  return mergeSection(defaults, current);
}
