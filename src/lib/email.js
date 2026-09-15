import { subjectFromSettings } from "./emailSubjects";

export const DEFAULT_ADMIN_EMAIL = "adenugaolajideadewale@gmail.com";

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

/** Resolve primary + secondary admin notify addresses (FormSubmit recipients). */
export function resolveAdminNotifyEmails({
  adminEmail,
  adminEmails,
  secondaryEmails,
  fallbackAdminEmail,
} = {}) {
  const list = parseEmailList(adminEmails, adminEmail, secondaryEmails, fallbackAdminEmail);
  if (!list.length) list.push(DEFAULT_ADMIN_EMAIL);
  return list;
}

/** Build notify list from site settings (Website → Contact). */
export function adminEmailsFromSettings(settings = {}, extra = {}) {
  return resolveAdminNotifyEmails({
    adminEmail: settings?.notificationEmail || extra.adminEmail,
    secondaryEmails: settings?.secondaryNotificationEmails,
    adminEmails: extra.adminEmails,
    fallbackAdminEmail: extra.fallbackAdminEmail || DEFAULT_ADMIN_EMAIL,
  });
}

/**
 * Post to FormSubmit AJAX.
 * Uses form-urlencoded first (simple CORS request — fewer "Failed to fetch" / preflight issues).
 * Falls back to JSON if needed.
 *
 * Important: the `to` address must already have activated FormSubmit (confirmation email).
 * Prefer posting to your primary admin inbox and delivering to users via `_autoresponse` / `_cc`.
 */
async function postFormSubmit(to, body) {
  const endpoint = `https://formsubmit.co/ajax/${encodeURIComponent(String(to).trim())}`;
  const payload = { _captcha: "false", ...body };

  const attempt = async (headers, serialize) => {
    const response = await fetch(endpoint, {
      method: "POST",
      headers,
      body: serialize(payload),
    });
    const errBody = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(errBody.message || `FormSubmit error (${response.status})`);
    }
    if (errBody.success === "false" || errBody.success === false) {
      throw new Error(errBody.message || "FormSubmit rejected the request");
    }
    return errBody;
  };

  try {
    // Prefer urlencoded — avoids CORS preflight that often causes "Failed to fetch"
    const params = new URLSearchParams();
    Object.entries(payload).forEach(([key, value]) => {
      if (value == null) return;
      params.append(key, typeof value === "string" ? value : String(value));
    });
    return await attempt(
      { Accept: "application/json", "Content-Type": "application/x-www-form-urlencoded" },
      () => params
    );
  } catch (err) {
    const msg = String(err?.message || err || "");
    const isNetwork =
      err instanceof TypeError ||
      /failed to fetch|networkerror|load failed|cors/i.test(msg);

    if (!isNetwork) throw err;

    try {
      return await attempt(
        { Accept: "application/json", "Content-Type": "application/json" },
        (data) => JSON.stringify(data)
      );
    } catch (err2) {
      throw new Error(
        "Could not reach FormSubmit (Failed to fetch). " +
          "Check your connection, disable ad blockers for formsubmit.co, " +
          "and ensure the admin notification inbox has activated FormSubmit. " +
          "Details: " +
          (err2?.message || msg)
      );
    }
  }
}

/** Post the same payload to each admin inbox; autoresponse only on the first. */
async function notifyAdminInboxes(recipients, body, { autoresponse } = {}) {
  const list = recipients?.length ? recipients : [DEFAULT_ADMIN_EMAIL];
  let last;
  for (let i = 0; i < list.length; i += 1) {
    last = await postFormSubmit(list[i], {
      ...body,
      ...(i === 0 && autoresponse ? { _autoresponse: autoresponse } : {}),
      coordinators_notified: list.join(", "),
    });
  }
  return last;
}

export async function sendContactEmails({
  name,
  email,
  subject,
  message,
  phone,
  adminEmail,
  secondaryEmails,
  adminEmails,
  emailSubjects,
}) {
  const recipients = resolveAdminNotifyEmails({ adminEmail, secondaryEmails, adminEmails });
  const mailSubject = subjectFromSettings(
    { emailSubjects },
    "contact",
    { subject, fullName: name }
  );
  return notifyAdminInboxes(
    recipients,
    {
      name,
      email,
      phone: phone || "",
      subject,
      message,
      _subject: mailSubject,
      _template: "table",
      _captcha: "false",
      _replyto: email || DEFAULT_ADMIN_EMAIL,
    },
    {
      autoresponse:
        `Hi ${name.split(" ")[0] || name},\n\n` +
        `Thank you for contacting Fire-Fire International Evangelical Church. We've received your message and will get back to you soon.\n\n` +
        `Your message:\n${message}\n\n` +
        `— Fire-Fire International Evangelical Church`,
    }
  );
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
  secondaryEmails,
  adminEmails,
  emailSubjects,
}) {
  const recipients = resolveAdminNotifyEmails({ adminEmail, secondaryEmails, adminEmails });
  const first = (name || "").split(" ")[0] || name;
  const mailSubject = subjectFromSettings(
    { emailSubjects },
    "testimony",
    { fullName: name, title }
  );
  return notifyAdminInboxes(
    recipients,
    {
      name,
      email,
      phone: phone || "",
      role: role || "",
      member_since: dateJoined || "",
      title: title || "",
      testimony,
      _subject: mailSubject,
      _template: "table",
      _captcha: "false",
      _replyto: email || DEFAULT_ADMIN_EMAIL,
    },
    {
      autoresponse:
        `Hi ${first},\n\n` +
        `Thank you for sharing your testimony with Fire-Fire International Evangelical Church.\n\n` +
        `We've received your story and our team will review it before it appears on the website. ` +
        `We'll email you again if it's published.\n\n` +
        `— Fire-Fire International Evangelical Church`,
    }
  );
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
  secondaryEmails,
}) {
  const recipients = resolveAdminNotifyEmails({
    adminEmails,
    adminEmail,
    secondaryEmails,
    fallbackAdminEmail,
  });
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

const MEMBERSHIP_CONSENT_KEYS = new Set(["consent", "consent_at", "consent_text"]);

const MEMBERSHIP_FIELD_LABELS = [
  ["title", "Title"],
  ["first_name", "First name"],
  ["last_name", "Last name"],
  ["full_name", "Full name"],
  ["email", "Email"],
  ["phone", "Phone"],
  ["gender", "Gender"],
  ["date_of_birth", "Date of birth"],
  ["address", "Address"],
  ["city", "City"],
  ["state", "State"],
  ["country", "Country"],
  ["church_roles", "Church role(s)"],
  ["church_branch", "Church branch"],
  ["ministry", "Ministry / department"],
  ["occupation", "Occupation"],
  ["baptism_status", "Baptism status"],
  ["marital_status", "Marital status"],
  ["emergency_contact_name", "Emergency contact name"],
  ["emergency_contact_phone", "Emergency contact phone"],
  ["notes", "Additional notes"],
  ["additional_form_answers", "Other form answers"],
  ["data_consent", "Data consent"],
  ["consent_timestamp", "Consent given at"],
  ["application_status", "Application status"],
];

function extraFormAnswers(formData) {
  if (!formData || typeof formData !== "object" || Array.isArray(formData)) return "";
  return Object.entries(formData)
    .filter(([key, value]) => !MEMBERSHIP_CONSENT_KEYS.has(key) && value != null && String(value).trim() !== "" && typeof value !== "object")
    .map(([key, value]) => `${String(key).replace(/_/g, " ")}: ${value}`)
    .join("\n");
}

function dash(value) {
  const text = String(value || "").trim();
  return text || "";
}

/** Flatten a membership application for admin emails and confirmation copy. */
export function membershipEmailFields(data = {}) {
  const formData = data.formData || data.form_data || {};
  const consent = data.consent === true || formData.consent === true || formData.consent === "true";
  return {
    title: dash(data.nameTitle || data.name_title),
    first_name: dash(data.firstName || data.first_name),
    last_name: dash(data.lastName || data.last_name),
    full_name: dash(data.fullName || data.full_name),
    email: dash(data.email),
    phone: dash(data.phone),
    gender: dash(data.gender),
    date_of_birth: dash(data.dateOfBirth || data.date_of_birth),
    address: dash(data.address),
    city: dash(data.city),
    state: dash(data.state),
    country: dash(data.country),
    church_roles: dash(data.roleName || data.role_name || data.role_names),
    church_branch: dash(data.branchName || data.branch_name),
    ministry: dash(data.ministry),
    occupation: dash(data.occupation),
    baptism_status: dash(data.baptismStatus || data.baptism_status),
    marital_status: dash(data.maritalStatus || data.marital_status),
    emergency_contact_name: dash(data.emergencyContactName || data.emergency_contact_name),
    emergency_contact_phone: dash(data.emergencyContactPhone || data.emergency_contact_phone),
    notes: dash(data.notes),
    additional_form_answers: extraFormAnswers(formData),
    data_consent: consent ? "Yes — applicant consented to data processing" : "",
    consent_timestamp: dash(data.consentAt || formData.consent_at),
    application_status: dash(data.status) || "pending",
  };
}

function membershipPlainText(data, { heading, intro, closing }) {
  const fields = membershipEmailFields(data);
  const lines = MEMBERSHIP_FIELD_LABELS
    .map(([key, label]) => {
      const value = fields[key];
      if (!value) return null;
      return `${label}: ${value}`;
    })
    .filter(Boolean)
    .join("\n");
  return (
    `${intro}\n\n` +
    `${heading}\n` +
    `------------------------------\n` +
    `${lines}\n` +
    `------------------------------\n\n` +
    `${closing}`
  );
}

function firstNameFromMembership(data) {
  const first = String(data.firstName || data.first_name || "").trim();
  if (first) return first;
  const full = String(data.fullName || data.full_name || "").trim();
  return full.split(" ")[0] || "Beloved";
}

/** Church membership: notify admin with full form + acknowledgement to applicant. */
export async function sendChurchMembershipEmails(data = {}) {
  const recipients = resolveAdminNotifyEmails({
    adminEmail: data.adminEmail,
    secondaryEmails: data.secondaryEmails,
    adminEmails: data.adminEmails,
    fallbackAdminEmail: data.fallbackAdminEmail,
  });
  const fields = membershipEmailFields(data);
  const first = firstNameFromMembership(data);
  const fullName = fields.full_name || "Applicant";
  const mailSubject = subjectFromSettings(
    { emailSubjects: data.emailSubjects },
    "membership",
    { fullName }
  );

  const applicantCopy = membershipPlainText(data, {
    heading: "APPLICATION RECEIVED",
    intro:
      `Dear ${first},\n\n` +
      `Thank you for submitting your membership application to Fire-Fire International Evangelical Church.\n\n` +
      `We have received your details. Your application is now pending review by our leadership team. ` +
      `This is not yet confirmation of membership. You will receive a separate confirmation email once your application is approved.`,
    closing:
      `Please keep this email for your records.\n\n` +
      `With love,\n` +
      `The Leadership Team\n` +
      `Fire-Fire International Evangelical Church`,
  });

  return notifyAdminInboxes(
    recipients,
    {
      ...fields,
      name: fullName,
      email: fields.email,
      _subject: mailSubject,
      _template: "table",
      _captcha: "false",
      _replyto: fields.email || DEFAULT_ADMIN_EMAIL,
    },
    { autoresponse: applicantCopy }
  );
}

/** Volunteer application: notify team + site admins, confirm to applicant. */
export function buildVolunteerApplicantConfirmation({
  fullName,
  teamName,
  roleInterest = "",
  branchName = "",
}) {
  const first = (fullName || "").split(" ")[0] || fullName || "Friend";
  const team = teamName || "our volunteer team";
  return (
    `Dear ${first},\n\n` +
    `Thank you for registering your interest in serving with the ${team} at Fire-Fire International Evangelical Church.\n\n` +
    `APPLICATION RECEIVED\n` +
    `--------------------\n` +
    `Name: ${fullName || "—"}\n` +
    `Team: ${team}\n` +
    (roleInterest ? `Role interest: ${roleInterest}\n` : "") +
    (branchName ? `Branch: ${branchName}\n` : "") +
    `\nWhat happens next:\n` +
    `1. Our team will review your application carefully.\n` +
    `2. You may receive a follow-up email if we need more information.\n` +
    `3. Once a decision is made, we will contact you by email.\n\n` +
    `Please keep this email for your records. We appreciate your willingness to serve and look forward to connecting with you.\n\n` +
    `God bless you.\n\n` +
    `With warm regards,\n` +
    `The ${team}\n` +
    `Fire-Fire International Evangelical Church\n` +
    `https://ffiem.org`
  );
}

export async function sendVolunteerApplicationEmails({
  fullName,
  email,
  phone,
  teamName,
  roleInterest,
  branchName = "",
  skills = "",
  experienceLevel = "",
  availability = "",
  notes = "",
  adminEmail,
  adminEmails,
  secondaryEmails,
  fallbackAdminEmail,
  emailSubjects,
}) {
  const recipients = resolveAdminNotifyEmails({
    adminEmails,
    adminEmail,
    secondaryEmails,
    fallbackAdminEmail,
  });

  const applicantCopy = buildVolunteerApplicantConfirmation({
    fullName,
    teamName,
    roleInterest,
    branchName,
  });

  const mailSubject = subjectFromSettings(
    { emailSubjects },
    "volunteer",
    { teamName, fullName, role: roleInterest }
  );

  return notifyAdminInboxes(
    recipients,
    {
      name: fullName,
      email,
      phone: phone || "",
      team: teamName,
      role: roleInterest || "",
      church_branch: branchName || "",
      skills: skills || "",
      experience_level: experienceLevel || "",
      availability: availability || "",
      notes: notes || "",
      _subject: mailSubject,
      _template: "table",
      _captcha: "false",
      _replyto: email || DEFAULT_ADMIN_EMAIL,
    },
    { autoresponse: applicantCopy }
  );
}

/**
 * Admin follow-up to a volunteer applicant.
 * Posts to the activated admin inbox (FormSubmit destination), and delivers the
 * actual follow-up to the applicant via `_autoresponse` (FormSubmit sends that
 * to the form `email` field). Avoids posting directly to unactivated Gmail addresses,
 * which often fails with "Failed to fetch" / activation walls.
 */
export async function sendVolunteerFollowUpEmail({
  toEmail,
  applicantName,
  teamName = "Media Department",
  subject,
  body,
  adminName = "",
  replyToEmail = "",
}) {
  const applicant = (toEmail || "").trim();
  if (!applicant) throw new Error("Applicant email is required");
  if (!(body || "").trim()) throw new Error("Message body is required");

  const first = (applicantName || "").split(" ")[0] || applicantName || "Friend";
  const fromName = adminName || `${teamName} · Fire-Fire International Evangelical Church`;
  const adminInbox = (replyToEmail || DEFAULT_ADMIN_EMAIL).trim() || DEFAULT_ADMIN_EMAIL;
  const mailSubject =
    subject || `Follow-up on your ${teamName} volunteer application`;

  const applicantMessage =
    `Dear ${first},\n\n` +
    `${body.trim()}\n\n` +
    `— ${fromName}\n` +
    `Fire-Fire International Evangelical Church\n` +
    `https://ffiem.org`;

  return postFormSubmit(adminInbox, {
    name: fromName,
    email: applicant,
    applicant_name: applicantName || "",
    team: teamName,
    _subject: mailSubject,
    _template: "box",
    _captcha: "false",
    _replyto: adminInbox,
    _cc: applicant,
    message:
      `Follow-up email for volunteer applicant.\n` +
      `To: ${applicant} (${applicantName || "—"})\n` +
      `Team: ${teamName}\n\n` +
      `--- Message delivered to applicant ---\n${applicantMessage}`,
    _autoresponse: applicantMessage,
  });
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
  replyToEmail = DEFAULT_ADMIN_EMAIL,
}) {
  if (!toEmail) throw new Error("Recipient email is required");
  const first = (fullName || "").split(" ")[0] || fullName || "Friend";
  const programLine = programTitle ? `\n\nProgram: ${programTitle}` : "";
  const adminInbox = (replyToEmail || DEFAULT_ADMIN_EMAIL).trim();
  const message =
    `Hi ${first},\n\n${body}${programLine}\n\n` +
    `— ${fromName}`;

  return postFormSubmit(adminInbox, {
    name: fromName,
    email: toEmail,
    _subject: subject || title || "Church announcement",
    _template: "box",
    _captcha: "false",
    _replyto: adminInbox,
    _cc: toEmail,
    message: `Member announcement to ${toEmail}\n\n---\n${message}`,
    _autoresponse: message,
  });
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
export async function sendMembershipApprovedEmail(data = {}) {
  const email = data.email;
  if (!email) return null;
  const first = firstNameFromMembership(data);
  const siteUrl = data.siteUrl || "https://firefireintl.org";
  const payload = { ...data, status: "approved" };

  const message = membershipPlainText(payload, {
    heading: "MEMBERSHIP CONFIRMED",
    intro:
      `Dear ${first},\n\n` +
      `Congratulations!\n\n` +
      `Your membership application with Fire-Fire International Evangelical Church has been reviewed and approved. ` +
      `You are now a bonafide member of the FFIEMC family.`,
    closing:
      `We are glad to walk with you in faith, fellowship, and service. Stay connected for Sunday services, programmes, and church meetings.\n\n` +
      `Visit our website: ${siteUrl}\n` +
      `If you have any questions, reply to this email or write to info@firefireintl.org.\n\n` +
      `May the Lord bless you and keep you.\n\n` +
      `With love,\n` +
      `The Leadership Team\n` +
      `Fire-Fire International Evangelical Church`,
  });

  return formSubmit(email, {
    name: "Fire-Fire International Evangelical Church",
    email: "info@firefireintl.org",
    _subject: `Welcome to the FFIEMC family — your membership is approved`,
    _template: "box",
    _replyto: "info@firefireintl.org",
    message,
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

/** Notify superadmin / church notification inbox of a public media contribution. */
export async function sendMediaContributionSubmissionEmail({
  fullName,
  amount,
  monthLabel,
  note = "",
  receiptUrl = "",
  paymentDate = "",
  monthSlug = "",
  adminEmail,
  secondaryEmails,
  adminEmails,
  emailSubjects,
}) {
  const recipients = resolveAdminNotifyEmails({ adminEmail, secondaryEmails, adminEmails });
  const money = `₦${Number(amount || 0).toLocaleString("en-NG", { maximumFractionDigits: 2 })}`;
  const origin = typeof window !== "undefined" ? window.location.origin : "https://ffiem.org";
  const auditUrl = `${origin}/admin/utilities/media-contributions`;
  const reportUrl = monthSlug ? `${origin}/contribute/media/${monthSlug}/report` : "";
  const paidOn = paymentDate
    ? new Date(`${paymentDate}T12:00:00`).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "—";

  const mailSubject = subjectFromSettings(
    { emailSubjects },
    "mediaContribution",
    { fullName, amount: money, monthLabel }
  );

  return notifyAdminInboxes(recipients, {
    name: fullName,
    amount: money,
    month: monthLabel || "",
    payment_date: paidOn,
    note: note || "",
    receipt_url: receiptUrl || "Not attached",
    report_url: reportUrl || "",
    admin_audit: auditUrl,
    _subject: mailSubject,
    _template: "table",
    _captcha: "false",
    _replyto: DEFAULT_ADMIN_EMAIL,
    message:
      `A social media team member submitted a contribution via the payment link.\n\n` +
      `Name: ${fullName}\n` +
      `Amount: ${money}\n` +
      `Payment date: ${paidOn}\n` +
      `Month: ${monthLabel || "—"}\n` +
      `Note: ${note || "—"}\n` +
      `Receipt: ${receiptUrl || "Not attached"}\n` +
      (reportUrl ? `Report: ${reportUrl}\n` : "") +
      `Admin: ${auditUrl}\n`,
  });
}

/**
 * Admin compose: send a free-form email to one or more recipients.
 * Uses FormSubmit per recipient (same stack as other FFIEMC alerts).
 * Prefer Supabase Edge + Resend when REACT_APP_USE_EDGE_EMAIL=true (see supabase/functions/send-email).
 */
export async function sendAdminComposedEmail({
  to,
  cc = "",
  subject,
  body,
  fromName = "FFIEMC Admin",
  replyToEmail = DEFAULT_ADMIN_EMAIL,
}) {
  const recipients = parseEmailList(to, cc);
  if (!recipients.length) throw new Error("Add at least one valid recipient email");
  if (!String(subject || "").trim()) throw new Error("Subject is required");
  if (!String(body || "").trim()) throw new Error("Message body is required");

  const edgeUrl = process.env.REACT_APP_SUPABASE_URL;
  const useEdge = String(process.env.REACT_APP_USE_EDGE_EMAIL || "").toLowerCase() === "true";

  if (useEdge && edgeUrl) {
    const { getAdminToken } = await import("./api");
    const token = typeof getAdminToken === "function" ? getAdminToken() : "";
    const response = await fetch(`${edgeUrl}/functions/v1/send-email`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token || process.env.REACT_APP_SUPABASE_ANON_KEY || ""}`,
      },
      body: JSON.stringify({
        to: recipients,
        subject: subject.trim(),
        text: body.trim(),
        fromName,
        replyTo: replyToEmail,
      }),
    });
    if (!response.ok) {
      const errBody = await response.json().catch(() => ({}));
      throw new Error(errBody.error || errBody.message || "Edge email send failed");
    }
    return response.json();
  }

  let last;
  for (let i = 0; i < recipients.length; i += 1) {
    const recipient = recipients[i];
    // Post through activated admin inbox; deliver to recipient via autoresponse + CC
    last = await postFormSubmit(replyToEmail || DEFAULT_ADMIN_EMAIL, {
      name: fromName,
      email: recipient,
      _subject: subject.trim(),
      _template: "box",
      _captcha: "false",
      _replyto: replyToEmail || DEFAULT_ADMIN_EMAIL,
      _cc: recipient,
      message:
        `Admin composed email.\nTo: ${recipient}\n\n--- Message ---\n${body.trim()}`,
      _autoresponse: body.trim(),
    });
  }
  return last;
}


