export function parseEmailList(...values) {
  const seen = new Set();
  const out = [];
  String(values.flat().filter(Boolean).join(","))
    .split(/[,;\n]+/)
    .map((s) => s.trim().toLowerCase())
    .filter((s) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s))
    .forEach((email) => {
      if (!seen.has(email)) {
        seen.add(email);
        out.push(email);
      }
    });
  return out;
}

async function postFormSubmit(to, body) {
  const response = await fetch(`https://formsubmit.co/ajax/${encodeURIComponent(to)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    const errBody = await response.json().catch(() => ({}));
    throw new Error(errBody.message || "Could not send email");
  }
  return response.json();
}

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

/** Program registration: notify event admin + confirmation to participant. */
export async function sendProgramRegistrationEmails({
  programTitle,
  shortCode,
  adminEmail,
  adminEmails,
  fullName,
  firstName,
  nameTitle,
  lastName,
  email,
  phone,
  formData = {},
  branchName = "",
  venue = "",
  startsAt,
  endsAt,
  confirmationId,
  fallbackAdminEmail,
}) {
  const recipients = parseEmailList(adminEmails, adminEmail, fallbackAdminEmail);
  if (!recipients.length) recipients.push("adenugaolajideadewale@gmail.com");
  const greeting = firstName || (fullName || "").split(" ")[0] || "Friend";
  const eventLabel = shortCode ? `${shortCode} — ${programTitle}` : programTitle;
  const when = [startsAt, endsAt]
    .filter(Boolean)
    .map((d) => new Date(d).toLocaleString("en-GB", { day: "numeric", month: "long", year: "numeric" }))
    .join(" – ");
  const extra = Object.entries(formData || {})
    .map(([k, v]) => `${k}: ${v}`)
    .join("\n");

  const userCopy =
    `Dear ${nameTitle ? `${nameTitle} ` : ""}${greeting},\n\n` +
    `Thank you for registering for ${eventLabel} at Fire-Fire International Evangelical Church.\n\n` +
    `REGISTRATION CONFIRMATION\n` +
    `-------------------------\n` +
    `Reference: ${confirmationId || "pending"}\n` +
    `Name: ${fullName}\n` +
    `Email: ${email}\n` +
    `Phone: ${phone || "—"}\n` +
    `Branch: ${branchName || "—"}\n` +
    (venue ? `Venue: ${venue}\n` : "") +
    (when ? `Dates: ${when}\n` : "") +
    `\nPlease keep this email as your record. We look forward to welcoming you.\n\n` +
    `— Fire-Fire International Evangelical Church`;

  const payload = {
    _subject: `New ${shortCode || "program"} registration — ${fullName}`,
    _template: "table",
    _captcha: "false",
    event: eventLabel,
    confirmation_id: confirmationId || "",
    title: nameTitle || "",
    first_name: firstName || "",
    last_name: lastName || "",
    name: fullName,
    email,
    phone: phone || "",
    church_branch: branchName || "",
    venue: venue || "",
    dates: when || "",
    extra_details: extra || "—",
    coordinators_notified: recipients.join(", "),
  };

  let last;
  for (let i = 0; i < recipients.length; i += 1) {
    last = await postFormSubmit(recipients[i], {
      ...payload,
      ...(i === 0 ? { _autoresponse: userCopy } : {}),
    });
  }
  return last;
}

/** Church membership: notify admin + confirmation to applicant. */
export async function sendChurchMembershipEmails({
  fullName,
  email,
  phone,
  roleName,
  branchName = "",
  adminEmail,
  fallbackAdminEmail,
}) {
  const to = adminEmail || fallbackAdminEmail || "adenugaolajideadewale@gmail.com";
  const first = (fullName || "").split(" ")[0] || fullName || "Friend";

  const response = await fetch(`https://formsubmit.co/ajax/${encodeURIComponent(to)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      name: fullName,
      email,
      phone: phone || "",
      role: roleName || "",
      church_branch: branchName || "",
      _subject: `New church membership registration — ${fullName}`,
      _template: "table",
      _captcha: "false",
      _autoresponse:
        `Hi ${first},\n\n` +
        `Thank you for registering as a bonafide member of Fire-Fire International Evangelical Church.\n\n` +
        `Your application has been received and will be reviewed by our leadership team.\n\n` +
        `— Fire-Fire International Evangelical Church`,
    }),
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.message || "Could not send membership emails");
  }
  return response.json();
}

/** Volunteer application: notify assigned admin + confirmation to applicant. */
export async function sendVolunteerApplicationEmails({
  fullName,
  email,
  phone,
  teamName,
  roleInterest,
  branchName = "",
  skills = "",
  adminEmail,
  fallbackAdminEmail,
}) {
  const to = adminEmail || fallbackAdminEmail || "adenugaolajideadewale@gmail.com";
  const first = (fullName || "").split(" ")[0] || fullName || "Friend";
  const response = await fetch(`https://formsubmit.co/ajax/${encodeURIComponent(to)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      name: fullName,
      email,
      phone: phone || "",
      team: teamName,
      role: roleInterest || "",
      church_branch: branchName || "",
      skills: skills || "",
      _subject: `New volunteer application — ${teamName} — ${fullName}`,
      _template: "table",
      _captcha: "false",
      _autoresponse:
        `Hi ${first},\n\n` +
        `Thank you for registering your interest in the ${teamName} at Fire-Fire International Evangelical Church.\n\n` +
        `We've received your application. An assigned admin will review it and you'll hear from us after approval.\n\n` +
        `— Fire-Fire International Evangelical Church`,
    }),
  });

  if (!response.ok) {
    const errBody = await response.json().catch(() => ({}));
    throw new Error(errBody.message || "Could not send volunteer emails");
  }
  return response.json();
}

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** Send a single member announcement email via FormSubmit. */
export async function sendMemberAnnouncementEmail({
  toEmail,
  fullName,
  subject,
  title,
  body,
  programTitle = "",
  fromName = "Fire-Fire International Evangelical Church",
}) {
  if (!toEmail) throw new Error("Recipient email is required");
  const first = (fullName || "").split(" ")[0] || fullName || "Friend";
  const programLine = programTitle ? `\n\nProgram: ${programTitle}` : "";

  const response = await fetch(`https://formsubmit.co/ajax/${encodeURIComponent(toEmail)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      _subject: subject || title || "Church announcement",
      _template: "box",
      _captcha: "false",
      _replyto: "info@firefireintl.org",
      message:
        `Hi ${first},\n\n${body}${programLine}\n\n` +
        `— ${fromName}`,
    }),
  });

  if (!response.ok) {
    const errBody = await response.json().catch(() => ({}));
    throw new Error(errBody.message || "Email delivery failed");
  }
  return response.json();
}

/**
 * Send SMS via configured provider (Termii-compatible API).
 * Set REACT_APP_SMS_API_URL and REACT_APP_SMS_API_KEY in .env
 */
export async function sendMemberAnnouncementSms({ toPhone, message }) {
  const apiUrl = process.env.REACT_APP_SMS_API_URL;
  const apiKey = process.env.REACT_APP_SMS_API_KEY;
  const senderId = process.env.REACT_APP_SMS_SENDER_ID || "FFIEMC";

  if (!apiUrl || !apiKey) {
    throw new Error("SMS is not configured. Add REACT_APP_SMS_API_URL and REACT_APP_SMS_API_KEY.");
  }

  const phone = String(toPhone || "").replace(/\s+/g, "");
  if (!phone) throw new Error("Recipient phone is required");

  const response = await fetch(apiUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      to: phone,
      from: senderId,
      sms: message,
      message,
      type: "plain",
      channel: "generic",
    }),
  });

  if (!response.ok) {
    const errBody = await response.json().catch(() => ({}));
    throw new Error(errBody.message || errBody.error || "SMS delivery failed");
  }
  return response.json();
}

/** Deliver a batch of member notification deliveries with rate limiting. */
export async function deliverMemberNotifications({
  notification,
  deliveries,
  onProgress,
}) {
  const results = [];
  const title = notification?.title || "";
  const subject = notification?.subject || notification?.title || "";
  const body = notification?.body || "";
  const programTitle = notification?.program_title || "";

  for (let i = 0; i < deliveries.length; i += 1) {
    const row = deliveries[i];
    const base = {
      delivery_id: row.id,
      channel: row.channel,
      status: "failed",
      error_message: "",
    };

    try {
      if (row.channel === "email") {
        await sendMemberAnnouncementEmail({
          toEmail: row.email,
          fullName: row.full_name,
          subject,
          title,
          body,
          programTitle,
        });
        results.push({ ...base, status: "sent" });
      } else if (row.channel === "sms") {
        const smsText = `${title}\n\n${body}`.slice(0, 480);
        await sendMemberAnnouncementSms({ toPhone: row.phone, message: smsText });
        results.push({ ...base, status: "sent" });
      } else {
        results.push({ ...base, error_message: "Unknown channel" });
      }
    } catch (err) {
      results.push({ ...base, error_message: err.message || "Delivery failed" });
    }

    if (onProgress) onProgress(i + 1, deliveries.length);
    if (row.channel === "email") await delay(1200);
    else await delay(400);
  }

  return results;
}

/** Structured congratulations after membership is approved. */
export async function sendMembershipApprovedEmail({
  fullName,
  email,
  roleName = "",
  branchName = "",
  siteUrl = "https://firefireintl.org",
}) {
  if (!email) return null;
  const first = (fullName || "").split(" ")[0] || fullName || "Beloved";
  const roleLine = roleName ? `Your registered role(s): ${roleName}\n` : "";
  const branchLine = branchName ? `Your church branch: ${branchName}\n` : "";

  return formSubmit(email, {
    name: "Fire-Fire International Evangelical Church",
    email: "info@firefireintl.org",
    _subject: `Welcome to the FFIEMC family — your membership is approved`,
    _template: "box",
    _replyto: "info@firefireintl.org",
    message:
      `Dear ${first},\n\n` +
      `Congratulations!\n\n` +
      `Your membership registration with Fire-Fire International Evangelical Church has been reviewed and approved. ` +
      `You are now a bonafide member of the FFIEMC family.\n\n` +
      `${roleLine}${branchLine}\n` +
      `We are glad to walk with you in faith, fellowship, and service. Stay connected for services, programmes, and church meetings.\n\n` +
      `Visit: ${siteUrl}\n` +
      `Website membership: ${siteUrl}/join-church\n\n` +
      `May the Lord bless you and keep you.\n\n` +
      `With love,\n` +
      `The Leadership Team\n` +
      `Fire-Fire International Evangelical Church`,
  });
}

/** Church meeting invite with join + calendar links. */
export async function sendMeetingInviteEmail({
  toEmail,
  fullName,
  title,
  whenLabel,
  description,
  meetUrl,
  calendarUrl,
  pageUrl,
  fromName = "Fire-Fire International Evangelical Church",
}) {
  if (!toEmail) throw new Error("Recipient email is required");
  const first = (fullName || "").split(" ")[0] || fullName || "Beloved";
  return formSubmit(toEmail, {
    name: fromName,
    email: "info@firefireintl.org",
    _subject: `You're invited: ${title}`,
    _template: "box",
    _replyto: "info@firefireintl.org",
    message:
      `Dear ${first},\n\n` +
      `You are invited to a church meeting.\n\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `${title}\n` +
      `When: ${whenLabel}\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
      `${description ? `${description}\n\n` : ""}` +
      `JOIN THE MEETING\n${meetUrl || pageUrl}\n\n` +
      `ADD TO YOUR CALENDAR\n` +
      `Google Calendar: ${calendarUrl}\n` +
      (pageUrl ? `Apple / Outlook (open page, then Download .ics): ${pageUrl}\n\n` : "\n") +
      `We look forward to seeing you.\n\n` +
      `— ${fromName}`,
  });
}

export async function deliverMeetingInvites({ meeting, invites, calendarUrl, pageUrl, onProgress }) {
  const results = [];
  for (let i = 0; i < (invites || []).length; i += 1) {
    const row = invites[i];
    const base = { invite_id: row.id, status: "failed", error_message: "" };
    try {
      await sendMeetingInviteEmail({
        toEmail: row.email,
        fullName: row.full_name,
        title: meeting.title,
        whenLabel: meeting.whenLabel,
        description: meeting.description,
        meetUrl: meeting.meet_url,
        calendarUrl,
        pageUrl,
      });
      results.push({ ...base, status: "sent" });
    } catch (err) {
      results.push({ ...base, error_message: err.message || "Delivery failed" });
    }
    if (onProgress) onProgress(i + 1, invites.length);
    await delay(1200);
  }
  return results;
}

