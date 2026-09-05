/** Default privacy / terms CMS content. Placeholders: {{church}} {{email}} {{phone}} {{location}} */

export const DEFAULT_PRIVACY_CONTENT = {
  hero: {
    badge: "Legal",
    headline: "Privacy Policy",
    intro:
      "This Privacy Policy explains how {{church}} (“we”, “us”, or “the Church”) collects, uses, stores, and protects personal information when you visit our website, join church programmes, give, or otherwise connect with our ministry.",
    lastUpdated: "5 September 2026",
  },
  sections: {
    items: [
      {
        title: "1. Who we are",
        body: "We are {{church}}, a Christian ministry committed to teaching the Word of God and caring for people.\n\nIf you have questions about this policy, contact us at {{email}}{{phone_clause}}{{location_clause}}.",
      },
      {
        title: "2. Information we collect",
        body: "Depending on how you interact with us, we may collect:\n\n- Identity & contact details — such as name, email, phone number, address, gender, date of birth, and church branch, when you register for membership, programmes, volunteering, meetings, or events.\n- Ministry & pastoral information — such as prayer requests, testimonies, roles, and notes you choose to share with church leadership.\n- Giving-related details — such as your name and email if you submit a giving intent, and records needed to acknowledge gifts. Bank transfers you make independently are processed by your bank; we do not receive your full card details through this website while Paystack checkout remains pending.\n- Website usage data — such as pages visited, device type, browser, approximate region, anonymous visitor identifiers, blog reading time, reactions, shares, and comments you submit.\n- Communications — messages you send through contact forms and related correspondence.",
      },
      {
        title: "3. How we use your information",
        body: "We use personal information to:\n\n- Process membership, programme registrations, volunteer applications, and related approvals\n- Respond to prayer requests, contact messages, and pastoral follow-up where appropriate\n- Publish testimonies or comments only when you have consented and leadership has approved\n- Support giving and ministry operations (including recording gift intents and providing bank details)\n- Improve our website, measure engagement with sermons, events, and blog content, and keep the platform secure\n- Send church-related notices you have opted into or that are reasonably expected as part of membership or programme participation\n- Comply with legal obligations and protect the Church, our members, and visitors",
      },
      {
        title: "4. Legal bases & consent",
        body: "Where we ask for consent (for example membership applications, testimony publication, anonymous or named blog comments, or willing-giver agreements), we rely on that consent. You may withdraw consent where applicable by contacting us, understanding that we may still need to keep some records for ministry, safeguarding, or legal reasons.\n\nIn other cases we process information because it is necessary for our legitimate ministry interests, to perform a request you made, or to meet legal duties.",
      },
      {
        title: "5. Sharing of information",
        body: "We do not sell your personal information. We may share limited information with:\n\n- Authorised pastors, administrators, and ministry workers who need it to serve you\n- Service providers who host or operate our website, email, analytics, or (when enabled) payment tools, under appropriate safeguards\n- Authorities when required by law or to protect safety and rights",
      },
      {
        title: "6. Cookies & anonymous tracking",
        body: "Our site may store anonymous identifiers in your browser to understand visits, prevent abuse, and measure blog engagement (views, reading time, reactions, and shares). These identifiers are not used to publicly identify you. You can clear site data in your browser settings; some features may then work less accurately.",
      },
      {
        title: "7. Children's privacy",
        body: "Our public website is intended for a general audience. Where we collect information about minors (for example through parental registration for a programme), we expect a parent or guardian to provide accurate details and to consent where required. Please contact us if you believe we have collected a child's information inappropriately.",
      },
      {
        title: "8. Retention",
        body: "We keep information only as long as needed for the purposes above, including pastoral care, membership records, programme history, safeguarding, and legal requirements. Prayer requests, contact messages, comments, and analytics may be retained for operational review and then archived or deleted according to church practice.",
      },
      {
        title: "9. Security",
        body: "We take reasonable technical and organisational measures to protect personal information. No online system is completely secure; please use strong passwords for any accounts you control and avoid sharing sensitive details in public comment fields.",
      },
      {
        title: "10. Your choices",
        body: "Subject to applicable law and church policy, you may ask us to:\n\n- Access or correct personal information we hold about you\n- Withdraw consent for optional processing (such as publishing a testimony)\n- Request deletion where we are not required to keep the record\n\nTo make a request, email {{email}} with enough detail for us to verify and respond.",
      },
      {
        title: "11. External links",
        body: "Our website may link to social platforms, maps, or other external sites. Their privacy practices are governed by their own policies, not this one.",
      },
      {
        title: "12. Changes",
        body: "We may update this Privacy Policy from time to time. The “Last updated” date at the top will change when we do. Continued use of the website after updates means you acknowledge the revised policy.",
      },
    ],
  },
};

export const DEFAULT_TERMS_CONTENT = {
  hero: {
    badge: "Legal",
    headline: "Terms of Service",
    intro:
      "These Terms of Service (“Terms”) govern your use of the website and related online services operated by {{church}}. By accessing or using this site, you agree to these Terms.",
    lastUpdated: "5 September 2026",
  },
  sections: {
    items: [
      {
        title: "1. About these Terms",
        body: "This website shares information about our worship services, ministries, events, teachings, programmes, and ways to connect with {{church}}{{location_paren}}. It may also allow forms for membership, registrations, prayer, contact, testimonies, comments, and giving information.",
      },
      {
        title: "2. Acceptable use",
        body: "You agree to use this website lawfully and respectfully. You must not:\n\n- Submit false, misleading, abusive, defamatory, or unlawful content\n- Attempt to disrupt, hack, scrape excessively, or misuse church systems\n- Impersonate another person or misrepresent your affiliation with the Church\n- Use the site to spam, harass, or collect personal data of others without permission\n- Post content that contradicts our statement of faith in a disruptive or hostile manner in community features",
      },
      {
        title: "3. Accounts & submissions",
        body: "Some features are administered by church staff. Public forms you submit (membership, programmes, volunteering, prayer, contact, testimonies, blog comments) may be reviewed before action or publication. Submitting a form does not guarantee approval, publication, or a particular pastoral outcome.\n\nYou confirm that information you provide is accurate to the best of your knowledge, and that you have the right to share it.",
      },
      {
        title: "4. Giving",
        body: "Bank account details published for tithes, offerings, building, and related gifts are provided so you may give willingly. Transfers are made at your initiative through your bank or payment provider. Online Paystack checkout, when shown as “coming soon”, is not yet available; do not rely on it until enabled.\n\nGifts are generally voluntary contributions to the ministry. If you need a receipt or clarification about a donation, contact us at {{email}}.",
      },
      {
        title: "5. Content & intellectual property",
        body: "Sermons, articles, images, logos, graphics, and other materials on this site are owned by {{church}} or used with permission. You may share links for personal, non-commercial edification. You may not copy, republish, or commercially exploit site content without prior written permission, except where fair dealing or applicable law allows.",
      },
      {
        title: "6. User-generated content",
        body: "If you submit a testimony, comment, or similar content, you grant the Church a non-exclusive licence to review, moderate, edit for clarity/length where needed, and (where you have consented) publish it on our website and related church communications. We may refuse or remove content that violates these Terms or our pastoral standards.",
      },
      {
        title: "7. Events, programmes & pastoral care",
        body: "Programme details, schedules, venues, and fees (if any) may change. Registration confirmations and emails are informational. Online content does not replace in-person pastoral counsel, medical advice, or professional services.",
      },
      {
        title: "8. Third-party services",
        body: "The site may integrate hosting, email, maps, social media, analytics, or payment providers. Your use of those services may be subject to their terms. We are not responsible for the availability or policies of third-party platforms.",
      },
      {
        title: "9. Disclaimer",
        body: "The website is provided “as is”. While we aim for accuracy and availability, we do not warrant that the site will be uninterrupted, error-free, or complete. Teaching and articles are shared for spiritual encouragement and discipleship.",
      },
      {
        title: "10. Limitation of liability",
        body: "To the fullest extent permitted by law, {{church}} and its leaders, staff, and volunteers are not liable for indirect, incidental, or consequential losses arising from your use of the website or reliance on its content. Nothing in these Terms excludes liability that cannot be excluded under applicable law.",
      },
      {
        title: "11. Privacy",
        body: "Personal information is handled as described in our Privacy Policy (/privacy).",
      },
      {
        title: "12. Changes to the Terms",
        body: "We may update these Terms periodically. The “Last updated” date will reflect changes. Continued use of the site after updates constitutes acceptance of the revised Terms.",
      },
      {
        title: "13. Contact",
        body: "Questions about these Terms: {{email}}{{location_clause}}.",
      },
    ],
  },
};

export function fillLegalPlaceholders(text, vars = {}) {
  const church = vars.church || "Fire-Fire International Evangelical Church";
  const email = vars.email || "info@ffiem.org";
  const phone = vars.phone || "";
  const location = vars.location || "";
  const phone_clause = phone ? ` or ${phone}` : "";
  const location_clause = location ? ` · ${location}` : "";
  const location_paren = location ? ` (${location})` : "";

  return String(text || "")
    .replaceAll("{{church}}", church)
    .replaceAll("{{email}}", email)
    .replaceAll("{{phone}}", phone)
    .replaceAll("{{location}}", location)
    .replaceAll("{{phone_clause}}", phone_clause)
    .replaceAll("{{location_clause}}", location_clause)
    .replaceAll("{{location_paren}}", location_paren);
}
