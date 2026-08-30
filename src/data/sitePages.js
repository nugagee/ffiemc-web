export const DASHBOARD_FEATURES = [
  { key: "overview", group: "Dashboard", label: "Overview / analytics", hint: "Dashboard charts and totals", actions: ["view"] },
  { key: "visitors", group: "Dashboard", label: "Visitor tracking", hint: "Recent public page views", actions: ["view"] },
  { key: "contacts", group: "Dashboard", label: "Contact messages inbox", hint: "Messages submitted on Contact", actions: ["view", "edit", "delete"] },
  { key: "banners", group: "Banners", label: "Banners", hint: "Popup and sticky banners, analytics, and activity log", actions: ["view", "edit", "delete"] },
  { key: "program_types", group: "Programs", label: "Program types", hint: "Convention, conference, outreach categories", actions: ["view", "edit", "delete"] },
  { key: "programs", group: "Programs", label: "Church programs", hint: "Create programs with registration forms", actions: ["view", "edit", "delete"] },
  { key: "church_branches", group: "Programs", label: "Church branches", hint: "Local and international branch locations", actions: ["view", "edit", "delete"] },
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
      { key: "values", label: "Core values", ...list([
        { name: "title", label: "Title" },
        { name: "description", label: "Description", type: "textarea" },
      ], { headingFields: [
        { name: "badge", label: "Badge" },
        { name: "heading", label: "Heading" },
        { name: "intro", label: "Intro", type: "textarea" },
      ] }) },
      { key: "history", label: "History timeline", ...list([
        { name: "year", label: "Year" },
        { name: "title", label: "Title" },
        { name: "description", label: "Description", type: "textarea" },
      ], { headingFields: [
        { name: "badge", label: "Badge" },
        { name: "heading", label: "Heading" },
        { name: "intro", label: "Intro", type: "textarea" },
      ] }) },
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
      { key: "programmes", label: "Programmes / special services", ...list([
        { name: "title", label: "Title" },
        { name: "frequency", label: "Frequency" },
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
      { key: "list", label: "Event listings", ...collection("events") },
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
      ]) },
      { key: "purposes", label: "Giving purposes", ...list([
        { name: "id", label: "ID (tithe, offering, …)" },
        { name: "name", label: "Name" },
        { name: "description", label: "Description" },
      ]) },
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
        { value: "15+", label: "Years Serving" },
        { value: "500+", label: "Members Reached" },
        { value: "12", label: "Ministries" },
        { value: "4", label: "Weekly Services" },
      ],
    },
    eventsPreview: {
      badge: "What's Happening",
      heading: "Upcoming Events",
      body: "Join us for these exciting opportunities to worship, learn, and grow together in faith.",
    },
    sermonsPreview: {
      badge: "Messages",
      heading: "Latest Sermons",
      body: "Be encouraged and inspired by powerful messages from God's Word.",
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
      intro: "Discover how God has been working through Fire-Fire International Evangelical Church to transform lives and build His kingdom in our community.",
    },
    mission: {
      motto: "Teach one by one another",
      mission: "We're on a mission to ignite hearts, transform lives, and spread the fire of God's love. Our ministry is dedicated to sharing the message of hope, redemption, and salvation through Jesus Christ.",
      vision: "To be a thriving, Spirit-filled church that makes disciples, transforms communities, and impacts nations for the glory of God. We envision a church where every member is equipped to serve, every heart is ignited with God's love, and every life reflects the character of Christ.",
    },
    values: {
      badge: "Our Values",
      heading: "What We Stand For",
      intro: "These core values guide everything we do as a church family and shape our ministry approach.",
      items: [
        { title: "Love & Compassion", description: "We demonstrate God's love through genuine care and service to our community and beyond." },
        { title: "Biblical Truth", description: "We base all our teachings and practices on the solid foundation of God's Word." },
        { title: "Community & Fellowship", description: "We foster meaningful relationships and build a strong, supportive church family." },
        { title: "Spiritual Fire", description: "We maintain passion and zeal for God's kingdom and His transforming power." },
      ],
    },
    history: {
      badge: "Our Journey",
      heading: "God's Faithfulness Through the Years",
      intro: "See how God has been working in and through our church from the beginning.",
      items: [
        { year: "2010", title: "Church Founded", description: "Fire-Fire International Evangelical Church was established with a vision to ignite hearts for God." },
        { year: "2015", title: "New Building", description: "God blessed us with our current facility to better serve our growing congregation." },
        { year: "2018", title: "Youth Ministry Launch", description: "Started our dedicated youth ministry to reach the next generation." },
        { year: "2020", title: "Online Ministry", description: "Expanded our reach through digital ministry during challenging times." },
        { year: "2023", title: "Community Outreach", description: "Launched extensive community programs and evangelistic outreaches." },
      ],
    },
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
        { name: "Mid-week Service", day: "Wednesday", time: "6:00 PM - 8:00 PM", description: "Join us midweek for Bible study, prayer, and spiritual growth.", features: "Bible Study, Prayer Meeting, Testimonies, Small Groups" },
      ],
    },
    programmes: {
      badge: "Special Events",
      heading: "Special Services & Events",
      intro: "Throughout the year, we host special services and events for spiritual growth and community building.",
      items: [
        { title: "Holy Ghost Fire Conference", description: "Annual conference focused on receiving the baptism of the Holy Spirit", frequency: "Annually" },
        { title: "Revival Services", description: "Special revival meetings for spiritual renewal and awakening", frequency: "Quarterly" },
        { title: "Prayer & Fasting", description: "Corporate prayer and fasting sessions for breakthrough", frequency: "Monthly" },
        { title: "Youth Services", description: "Dynamic services designed specifically for young people", frequency: "Weekly" },
        { title: "Women's Fellowship", description: "Special services for women's ministry and empowerment", frequency: "Bi-weekly" },
        { title: "Men's Fellowship", description: "Gathering for men to grow in godliness and leadership", frequency: "Monthly" },
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
      stat1Value: "15+",
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
    hero: { badge: "Get Involved", headline: "Our", accent: "Ministries", intro: "Find your place to serve, grow, and make a difference in God's kingdom." },
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
    },
  },
  donate: {
    hero: {
      badge: "Give Cheerfully",
      headline: "Support the Ministry",
      intro: "Each of you should give what you have decided in your heart to give, for God loves a cheerful giver. — 2 Corinthians 9:7",
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
