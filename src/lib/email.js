export async function sendContactEmails({ name, email, subject, message, phone, adminEmail }) {
  const to = adminEmail || "adenugaolajideadewale@gmail.com";
  const response = await fetch(`https://formsubmit.co/ajax/${encodeURIComponent(to)}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      name,
      email,
      phone: phone || "",
      subject,
      message,
      _subject: `New FFIEMC website enquiry: ${subject}`,
      _template: "table",
      _captcha: "false",
      _autoresponse:
        `Hi ${name.split(" ")[0] || name},\n\n` +
        `Thank you for contacting Fire-Fire International Evangelical Church. We've received your message and will get back to you soon.\n\n` +
        `Your message:\n${message}\n\n` +
        `— Fire-Fire International Evangelical Church`,
    }),
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.message || "Could not send confirmation emails");
  }

  return response.json();
}

/** Notify admin of a new testimony submission and send submitter a confirmation. */
export async function sendTestimonySubmissionEmails({
  name,
  email,
  phone,
  role,
  dateJoined,
  title,
  testimony,
  adminEmail,
}) {
  const to = adminEmail || "adenugaolajideadewale@gmail.com";
  const first = (name || "").split(" ")[0] || name;
  const response = await fetch(`https://formsubmit.co/ajax/${encodeURIComponent(to)}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      name,
      email,
      phone: phone || "",
      role: role || "",
      member_since: dateJoined || "",
      title: title || "",
      testimony,
      _subject: `New testimony submission from ${name}`,
      _template: "table",
      _captcha: "false",
      _autoresponse:
        `Hi ${first},\n\n` +
        `Thank you for sharing your testimony with Fire-Fire International Evangelical Church.\n\n` +
        `We've received your story and our team will review it before it appears on the website. ` +
        `We'll email you again if it's published.\n\n` +
        `— Fire-Fire International Evangelical Church`,
    }),
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.message || "Could not send testimony emails");
  }

  return response.json();
}

/** Optional email when a testimony is published (admin checkbox). */
export async function sendTestimonyPublishedEmail({ name, email, adminEmail }) {
  if (!email) return null;
  const to = adminEmail || "adenugaolajideadewale@gmail.com";
  const first = (name || "").split(" ")[0] || name || "Friend";
  const response = await fetch(`https://formsubmit.co/ajax/${encodeURIComponent(to)}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      name,
      email,
      _subject: `Your testimony has been published — FFIEMC`,
      _template: "table",
      _captcha: "false",
      // FormSubmit sends the autoresponse to the submitter's email field
      _autoresponse:
        `Hi ${first},\n\n` +
        `Great news — your testimony has been published on the Fire-Fire International Evangelical Church website.\n\n` +
        `Thank you for encouraging others with your story.\n\n` +
        `You can read published testimonies at: https://firefireintl.org/testimonies\n\n` +
        `— Fire-Fire International Evangelical Church`,
      message: `Please notify ${name} (${email}) that their testimony is now live on the website.`,
    }),
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.message || "Could not send publish notification");
  }

  return response.json();
}

async function formSubmit(to, payload) {
  const response = await fetch(`https://formsubmit.co/ajax/${encodeURIComponent(to)}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      _template: "table",
      _captcha: "false",
      ...payload,
    }),
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.message || "Could not send email");
  }
  return response.json();
}

/** Email visitor when staff/pastor replies in the prayer chat. */
export async function sendPrayerReplyEmail({
  visitorName,
  visitorEmail,
  replyBody,
  senderName,
  category,
  adminEmail,
}) {
  if (!visitorEmail) return null;
  const first = (visitorName || "").split(" ")[0] || visitorName || "Friend";
  return formSubmit(visitorEmail, {
    name: senderName || "FFIEMC Prayer Team",
    email: adminEmail || "adenugaolajideadewale@gmail.com",
    category: category || "",
    message: replyBody,
    _subject: `Response to your prayer request — FFIEMC`,
    _autoresponse:
      `Hi ${first},\n\n` +
      `${senderName || "Our prayer team"} replied to your prayer request` +
      (category ? ` (${category})` : "") +
      `:\n\n${replyBody}\n\n` +
      `If you'd like to share more, reply to this email or submit another request on our website.\n\n` +
      `— Fire-Fire International Evangelical Church`,
  });
}

/** Notify pastor when a request is assigned to them. */
export async function sendPastorAssignmentEmail({
  pastorName,
  pastorEmail,
  visitorName,
  category,
  requestPreview,
  adminEmail,
}) {
  if (!pastorEmail) return null;
  const first = (pastorName || "").split(" ")[0] || pastorName || "Pastor";
  return formSubmit(pastorEmail, {
    name: "FFIEMC Prayer Desk",
    email: adminEmail || "adenugaolajideadewale@gmail.com",
    visitor: visitorName || "",
    category: category || "",
    request: requestPreview || "",
    _subject: `New prayer request assigned to you — FFIEMC`,
    message:
      `Hi ${first},\n\nA prayer request from ${visitorName || "a visitor"}` +
      (category ? ` (${category})` : "") +
      ` has been assigned to you.\n\nPreview:\n${requestPreview || ""}\n\n` +
      `Please sign in to the admin platform to review and respond.`,
  });
}

/** Send pastor login credentials after account creation. */
export async function sendPastorCredentialsEmail({
  pastorName,
  pastorEmail,
  username,
  password,
  loginUrl,
  adminEmail,
}) {
  if (!pastorEmail) return null;
  const first = (pastorName || "").split(" ")[0] || pastorName || "Pastor";
  const url = loginUrl || `${typeof window !== "undefined" ? window.location.origin : ""}/login`;
  return formSubmit(pastorEmail, {
    name: "FFIEMC Admin",
    email: adminEmail || "adenugaolajideadewale@gmail.com",
    username,
    temporary_password: password,
    login_url: url,
    _subject: `Your FFIEMC prayer pastor account`,
    message:
      `Hi ${first},\n\nAn account has been created for you on the Fire-Fire International Evangelical Church prayer desk.\n\n` +
      `Login: ${url}\nUsername: ${username}\nTemporary password: ${password}\n\n` +
      `Please sign in and change your password after your first login.`,
  });
}
