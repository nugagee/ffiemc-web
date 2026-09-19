import { subjectFromSettings } from "./emailSubjects";
import { SURVEY_FEATURES } from "../features/experienceSurvey/surveyHelpers";

export const DEFAULT_ADMIN_EMAIL = "adenugaolajideadewale@gmail.com";
const SITE_URL = "https://ffiem.org";
const FROM_DISPLAY = "Fire-Fire International Evangelical Church";

function readAdminToken() {
  try {
    return (
      localStorage.getItem("ffiemc_admin_token") ||
      sessionStorage.getItem("ffiemc_admin_token") ||
      ""
    );
  } catch {
    return "";
  }
}

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

export function adminEmailsFromSettings(settings = {}, extra = {}) {
  return resolveAdminNotifyEmails({
    adminEmail: settings?.notificationEmail || extra.adminEmail,
    secondaryEmails: settings?.secondaryNotificationEmails,
    adminEmails: extra.adminEmails,
    fallbackAdminEmail: extra.fallbackAdminEmail || DEFAULT_ADMIN_EMAIL,
  });
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function plainToHtmlBlocks(text) {
  return String(text || "")
    .split(/\n{2,}/)
    .map((block) => {
      const lines = escapeHtml(block).replace(/\n/g, "<br/>");
      return `<p style="margin:0 0 14px;line-height:1.55;color:#1f2937">${lines}</p>`;
    })
    .join("");
}

/** Shared branded HTML wrapper for all FFIEMC transactional mail. */
export function brandedEmailHtml({ title, preheader = "", bodyText = "", bodyHtml = "" }) {
  const content = bodyHtml || plainToHtmlBlocks(bodyText);
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>${escapeHtml(title)}</title></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:Georgia,'Times New Roman',serif;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0">${escapeHtml(preheader)}</div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f3f4f6;padding:24px 12px">
    <tr><td align="center">
      <table role="presentation" width="100%" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #fee2e2">
        <tr><td style="background:linear-gradient(135deg,#b91c1c,#ea580c);padding:22px 24px;color:#fff">
          <p style="margin:0;font-size:12px;letter-spacing:.14em;text-transform:uppercase;opacity:.9">Fire-Fire International Evangelical Church</p>
          <h1 style="margin:8px 0 0;font-size:22px;line-height:1.3">${escapeHtml(title)}</h1>
        </td></tr>
        <tr><td style="padding:24px">${content}</td></tr>
        <tr><td style="padding:16px 24px 24px;border-top:1px solid #fee2e2;color:#6b7280;font-size:13px;line-height:1.5">
          <p style="margin:0">Fire-Fire Area, Papa Agric, Off Olojuoro Olunde Road, Olomi, Ibadan, Nigeria · <a href="${SITE_URL}" style="color:#b91c1c">${SITE_URL.replace("https://", "")}</a></p>
          <p style="margin:8px 0 0">Motto: Teach one by one another</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

function fieldsTable(rows = []) {
  const filtered = rows.filter(([, v]) => v != null && String(v).trim() !== "");
  if (!filtered.length) return "";
  const cells = filtered
    .map(
      ([label, value]) =>
        `<tr>
          <td style="padding:8px 10px;border-bottom:1px solid #f3f4f6;color:#6b7280;width:38%;vertical-align:top">${escapeHtml(label)}</td>
          <td style="padding:8px 10px;border-bottom:1px solid #f3f4f6;color:#111827;vertical-align:top">${escapeHtml(value)}</td>
        </tr>`
    )
    .join("");
  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border:1px solid #fee2e2;border-radius:12px;overflow:hidden;margin:0 0 16px">${cells}</table>`;
}

/**
 * Send mail through Supabase Edge → Resend.
 * No FormSubmit. Requires RESEND_API_KEY + FROM_EMAIL secrets and REACT_APP_USE_EDGE_EMAIL=true.
 */
export async function sendViaSupabaseEmail({
  purpose,
  to,
  subject,
  text,
  html,
  replyTo,
  notifyAdmins = false,
  adminEmail,
  secondaryEmails,
  adminEmails,
  confirm,
}) {
  const edgeUrl = process.env.REACT_APP_SUPABASE_URL;
  const anonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;
  if (!edgeUrl || !anonKey) {
    throw new Error("Supabase email is not configured (missing REACT_APP_SUPABASE_URL / ANON_KEY)");
  }

  const adminToken = readAdminToken();
  const bearer = adminToken || anonKey;

  const response = await fetch(`${edgeUrl}/functions/v1/send-email`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${bearer}`,
      apikey: anonKey,
    },
    body: JSON.stringify({
      purpose,
      to,
      subject,
      text,
      html,
      replyTo,
      notifyAdmins,
      adminEmail,
      secondaryEmails,
      adminEmails,
      confirm,
    }),
  });

  const errBody = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(errBody.error || errBody.message || "Email send failed");
  }
  return errBody;
}

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

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
  const mailSubject = subjectFromSettings({ emailSubjects }, "contact", { subject, fullName: name });
  const adminText =
    `New website contact message\n\n` +
    `Name: ${name}\nEmail: ${email}\nPhone: ${phone || "—"}\nSubject: ${subject}\n\n${message}`;
  const confirmText =
    `Hi ${(name || "").split(" ")[0] || name},\n\n` +
    `Thank you for contacting Fire-Fire International Evangelical Church. We've received your message and will get back to you soon.\n\n` +
    `Your message:\n${message}\n\n— ${FROM_DISPLAY}`;

  return sendViaSupabaseEmail({
    purpose: "contact",
    notifyAdmins: true,
    adminEmail,
    secondaryEmails,
    adminEmails,
    subject: mailSubject,
    text: adminText,
    html: brandedEmailHtml({
      title: "New website enquiry",
      preheader: subject,
      bodyHtml:
        fieldsTable([
          ["Name", name],
          ["Email", email],
          ["Phone", phone],
          ["Subject", subject],
        ]) + plainToHtmlBlocks(message),
    }),
    replyTo: email || DEFAULT_ADMIN_EMAIL,
    confirm: email
      ? {
          to: email,
          subject: "We've received your message — FFIEMC",
          text: confirmText,
          html: brandedEmailHtml({ title: "Message received", bodyText: confirmText }),
          replyTo: adminEmail || DEFAULT_ADMIN_EMAIL,
        }
      : undefined,
  });
}

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
  const first = (name || "").split(" ")[0] || name;
  const mailSubject = subjectFromSettings({ emailSubjects }, "testimony", { fullName: name, title });
  const adminText =
    `New testimony submission\n\nName: ${name}\nEmail: ${email}\nPhone: ${phone || "—"}\n` +
    `Role: ${role || "—"}\nMember since: ${dateJoined || "—"}\nTitle: ${title || "—"}\n\n${testimony}`;
  const confirmText =
    `Hi ${first},\n\nThank you for sharing your testimony with ${FROM_DISPLAY}.\n\n` +
    `We've received your story and our team will review it before it appears on the website. ` +
    `We'll email you again if it's published.\n\n— ${FROM_DISPLAY}`;

  return sendViaSupabaseEmail({
    purpose: "testimony_submit",
    notifyAdmins: true,
    adminEmail,
    secondaryEmails,
    adminEmails,
    subject: mailSubject,
    text: adminText,
    html: brandedEmailHtml({
      title: "New testimony submission",
      bodyHtml:
        fieldsTable([
          ["Name", name],
          ["Email", email],
          ["Phone", phone],
          ["Role", role],
          ["Member since", dateJoined],
          ["Title", title],
        ]) + plainToHtmlBlocks(testimony),
    }),
    replyTo: email || DEFAULT_ADMIN_EMAIL,
    confirm: email
      ? {
          to: email,
          subject: "We've received your testimony — FFIEMC",
          text: confirmText,
          html: brandedEmailHtml({ title: "Testimony received", bodyText: confirmText }),
        }
      : undefined,
  });
}

export async function sendTestimonyPublishedEmail({ name, email, adminEmail }) {
  if (!email) return null;
  const first = (name || "").split(" ")[0] || name || "Friend";
  const text =
    `Hi ${first},\n\nGreat news — your testimony has been published on the ${FROM_DISPLAY} website.\n\n` +
    `Thank you for encouraging others with your story.\n\n` +
    `Read testimonies: ${SITE_URL}/testimonies\n\n— ${FROM_DISPLAY}`;
  return sendViaSupabaseEmail({
    purpose: "testimony_published",
    to: email,
    subject: "Your testimony has been published — FFIEMC",
    text,
    html: brandedEmailHtml({ title: "Your testimony is live", bodyText: text }),
    replyTo: adminEmail || DEFAULT_ADMIN_EMAIL,
  });
}

export async function sendPrayerSubmissionEmails({
  name,
  email,
  phone,
  category,
  request,
  is_public,
  adminEmail,
  secondaryEmails,
  adminEmails,
  emailSubjects,
}) {
  const first = (name || "").split(" ")[0] || name;
  const mailSubject = subjectFromSettings({ emailSubjects }, "prayer", {
    fullName: name,
    category: category || "Prayer request",
  });
  const adminText =
    `New prayer request\n\n` +
    `Name: ${name}\nEmail: ${email}\nPhone: ${phone || "—"}\n` +
    `Category: ${category || "—"}\nPublic: ${is_public ? "Yes" : "No"}\n\n${request}`;
  const confirmText =
    `Hi ${first},\n\n` +
    `Thank you for sharing your prayer request with ${FROM_DISPLAY}. ` +
    `Our prayer team has received it and will be lifting you up in prayer.\n\n` +
    `Category: ${category || "Prayer request"}\n\n` +
    `If you need to add anything, reply to this email or submit another request on our website.\n\n` +
    `— ${FROM_DISPLAY}`;

  return sendViaSupabaseEmail({
    purpose: "prayer_submit",
    notifyAdmins: true,
    adminEmail,
    secondaryEmails,
    adminEmails,
    subject: mailSubject,
    text: adminText,
    html: brandedEmailHtml({
      title: "New prayer request",
      preheader: category || "Prayer request",
      bodyHtml:
        fieldsTable([
          ["Name", name],
          ["Email", email],
          ["Phone", phone],
          ["Category", category],
          ["Share publicly", is_public ? "Yes" : "No"],
        ]) + plainToHtmlBlocks(request),
    }),
    replyTo: email || DEFAULT_ADMIN_EMAIL,
    confirm: email
      ? {
          to: email,
          subject: "We've received your prayer request — FFIEMC",
          text: confirmText,
          html: brandedEmailHtml({ title: "Prayer request received", bodyText: confirmText }),
          replyTo: adminEmail || DEFAULT_ADMIN_EMAIL,
        }
      : undefined,
  });
}

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
  const text =
    `Hi ${first},\n\n` +
    `${senderName || "Our prayer team"} replied to your prayer request` +
    (category ? ` (${category})` : "") +
    `:\n\n${replyBody}\n\n` +
    `If you'd like to share more, reply to this email or submit another request on our website.\n\n— ${FROM_DISPLAY}`;
  return sendViaSupabaseEmail({
    purpose: "prayer_reply",
    to: visitorEmail,
    subject: "Response to your prayer request — FFIEMC",
    text,
    html: brandedEmailHtml({ title: "Prayer team reply", bodyText: text }),
    replyTo: adminEmail || DEFAULT_ADMIN_EMAIL,
  });
}

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
  const text =
    `Hi ${first},\n\nA prayer request from ${visitorName || "a visitor"}` +
    (category ? ` (${category})` : "") +
    ` has been assigned to you.\n\nPreview:\n${requestPreview || ""}\n\n` +
    `Please sign in to the admin platform to review and respond.`;
  return sendViaSupabaseEmail({
    purpose: "pastor_assignment",
    to: pastorEmail,
    subject: "New prayer request assigned to you — FFIEMC",
    text,
    html: brandedEmailHtml({ title: "Prayer request assigned", bodyText: text }),
    replyTo: adminEmail || DEFAULT_ADMIN_EMAIL,
  });
}

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
  const url = loginUrl || `${typeof window !== "undefined" ? window.location.origin : SITE_URL}/login`;
  const text =
    `Hi ${first},\n\nAn account has been created for you on the ${FROM_DISPLAY} prayer desk.\n\n` +
    `Login: ${url}\nUsername: ${username}\nTemporary password: ${password}\n\n` +
    `Please sign in and change your password after your first login.`;
  return sendViaSupabaseEmail({
    purpose: "pastor_credentials",
    to: pastorEmail,
    subject: "Your FFIEMC prayer pastor account",
    text,
    html: brandedEmailHtml({
      title: "Your pastor account",
      bodyHtml:
        plainToHtmlBlocks(`Hi ${first},\n\nAn account has been created for you on the prayer desk.`) +
        fieldsTable([
          ["Login", url],
          ["Username", username],
          ["Temporary password", password],
        ]) +
        plainToHtmlBlocks("Please sign in and change your password after your first login."),
    }),
    replyTo: adminEmail || DEFAULT_ADMIN_EMAIL,
  });
}

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
    `Thank you for registering for ${eventLabel} at ${FROM_DISPLAY}.\n\n` +
    `REGISTRATION CONFIRMATION\n` +
    `-------------------------\n` +
    `Reference: ${confirmationId || "pending"}\n` +
    `Name: ${fullName}\n` +
    `Email: ${email}\n` +
    `Phone: ${phone || "—"}\n` +
    `Branch: ${branchName || "—"}\n` +
    (venue ? `Venue: ${venue}\n` : "") +
    (when ? `Dates: ${when}\n` : "") +
    `\nPlease keep this email as your record. We look forward to welcoming you.\n\n— ${FROM_DISPLAY}`;

  const adminText =
    `New ${shortCode || "program"} registration\n\n` +
    `Event: ${eventLabel}\nReference: ${confirmationId || "—"}\nName: ${fullName}\n` +
    `Email: ${email}\nPhone: ${phone || "—"}\nBranch: ${branchName || "—"}\n` +
    (venue ? `Venue: ${venue}\n` : "") +
    (when ? `Dates: ${when}\n` : "") +
    (extra ? `\nExtra:\n${extra}` : "");

  return sendViaSupabaseEmail({
    purpose: "program_registration",
    notifyAdmins: true,
    adminEmail: adminEmail || fallbackAdminEmail,
    adminEmails,
    secondaryEmails,
    subject: `New ${shortCode || "program"} registration — ${fullName}`,
    text: adminText,
    html: brandedEmailHtml({
      title: "New program registration",
      bodyHtml: fieldsTable([
        ["Event", eventLabel],
        ["Reference", confirmationId],
        ["Name", fullName],
        ["Email", email],
        ["Phone", phone],
        ["Branch", branchName],
        ["Venue", venue],
        ["Dates", when],
        ["Extra", extra],
      ]),
    }),
    replyTo: email || DEFAULT_ADMIN_EMAIL,
    confirm: email
      ? {
          to: email,
          subject: `Registration confirmed — ${eventLabel}`,
          text: userCopy,
          html: brandedEmailHtml({ title: "Registration confirmed", bodyText: userCopy }),
        }
      : undefined,
  });
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

export async function sendChurchMembershipEmails(data = {}) {
  const fields = membershipEmailFields(data);
  const first = firstNameFromMembership(data);
  const fullName = fields.full_name || "Applicant";
  const mailSubject = subjectFromSettings({ emailSubjects: data.emailSubjects }, "membership", { fullName });

  const applicantCopy = membershipPlainText(data, {
    heading: "APPLICATION RECEIVED",
    intro:
      `Dear ${first},\n\n` +
      `Thank you for submitting your membership application to ${FROM_DISPLAY}.\n\n` +
      `We have received your details. Your application is now pending review by our leadership team. ` +
      `This is not yet confirmation of membership. You will receive a separate confirmation email once your application is approved.`,
    closing:
      `Please keep this email for your records.\n\nWith love,\nThe Leadership Team\n${FROM_DISPLAY}`,
  });

  const adminText = membershipPlainText(data, {
    heading: "NEW MEMBERSHIP APPLICATION",
    intro: `A new membership application was submitted.`,
    closing: `Review in admin → Church members / Approvals.`,
  });

  return sendViaSupabaseEmail({
    purpose: "membership",
    notifyAdmins: true,
    adminEmail: data.adminEmail,
    secondaryEmails: data.secondaryEmails,
    adminEmails: data.adminEmails,
    subject: mailSubject,
    text: adminText,
    html: brandedEmailHtml({
      title: "New membership application",
      bodyHtml: fieldsTable(MEMBERSHIP_FIELD_LABELS.map(([key, label]) => [label, fields[key]])),
    }),
    replyTo: fields.email || DEFAULT_ADMIN_EMAIL,
    confirm: fields.email
      ? {
          to: fields.email,
          subject: "We've received your membership application — FFIEMC",
          text: applicantCopy,
          html: brandedEmailHtml({ title: "Application received", bodyText: applicantCopy }),
        }
      : undefined,
  });
}

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
    `Thank you for registering your interest in serving with the ${team} at ${FROM_DISPLAY}.\n\n` +
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
    `Please keep this email for your records. We appreciate your willingness to serve.\n\n` +
    `God bless you.\n\nWith warm regards,\nThe ${team}\n${FROM_DISPLAY}\n${SITE_URL}`
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
  const adminText =
    `New volunteer application\n\nName: ${fullName}\nEmail: ${email}\nPhone: ${phone || "—"}\n` +
    `Team: ${teamName}\nRole: ${roleInterest || "—"}\nBranch: ${branchName || "—"}\n` +
    `Skills: ${skills || "—"}\nExperience: ${experienceLevel || "—"}\n` +
    `Availability: ${availability || "—"}\nNotes: ${notes || "—"}`;

  return sendViaSupabaseEmail({
    purpose: "volunteer",
    notifyAdmins: true,
    adminEmail: adminEmail || fallbackAdminEmail,
    adminEmails,
    secondaryEmails,
    subject: mailSubject,
    text: adminText,
    html: brandedEmailHtml({
      title: "New volunteer application",
      bodyHtml: fieldsTable([
        ["Name", fullName],
        ["Email", email],
        ["Phone", phone],
        ["Team", teamName],
        ["Role interest", roleInterest],
        ["Branch", branchName],
        ["Skills", skills],
        ["Experience", experienceLevel],
        ["Availability", availability],
        ["Notes", notes],
      ]),
    }),
    replyTo: email || DEFAULT_ADMIN_EMAIL,
    confirm: email
      ? {
          to: email,
          subject: `We've received your ${teamName || "volunteer"} application`,
          text: applicantCopy,
          html: brandedEmailHtml({ title: "Application received", bodyText: applicantCopy }),
        }
      : undefined,
  });
}

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
  const fromName = adminName || `${teamName} · ${FROM_DISPLAY}`;
  const mailSubject = subject || `Follow-up on your ${teamName} volunteer application`;
  const applicantMessage =
    `Dear ${first},\n\n${body.trim()}\n\n— ${fromName}\n${FROM_DISPLAY}\n${SITE_URL}`;

  return sendViaSupabaseEmail({
    purpose: "volunteer_followup",
    to: applicant,
    subject: mailSubject,
    text: applicantMessage,
    html: brandedEmailHtml({ title: mailSubject, bodyText: applicantMessage }),
    replyTo: replyToEmail || DEFAULT_ADMIN_EMAIL,
  });
}

export async function sendMemberAnnouncementEmail({
  toEmail,
  fullName,
  subject,
  title,
  body,
  programTitle = "",
  fromName = FROM_DISPLAY,
  replyToEmail = DEFAULT_ADMIN_EMAIL,
}) {
  if (!toEmail) throw new Error("Recipient email is required");
  const first = (fullName || "").split(" ")[0] || fullName || "Friend";
  const programLine = programTitle ? `\n\nProgram: ${programTitle}` : "";
  const message = `Hi ${first},\n\n${body}${programLine}\n\n— ${fromName}`;
  return sendViaSupabaseEmail({
    purpose: "member_announcement",
    to: toEmail,
    subject: subject || title || "Church announcement",
    text: message,
    html: brandedEmailHtml({ title: subject || title || "Church announcement", bodyText: message }),
    replyTo: replyToEmail || DEFAULT_ADMIN_EMAIL,
  });
}

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

export async function deliverMemberNotifications({ notification, deliveries, onProgress }) {
  const results = [];
  const title = notification?.title || "";
  const subject = notification?.subject || notification?.title || "";
  const body = notification?.body || "";
  const programTitle = notification?.program_title || "";

  for (let i = 0; i < deliveries.length; i += 1) {
    const row = deliveries[i];
    const base = { delivery_id: row.id, channel: row.channel, status: "failed", error_message: "" };
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
    await delay(row.channel === "email" ? 400 : 400);
  }
  return results;
}

export async function sendMembershipApprovedEmail(data = {}) {
  const email = data.email;
  if (!email) return null;
  const first = firstNameFromMembership(data);
  const siteUrl = data.siteUrl || SITE_URL;
  const payload = { ...data, status: "approved" };
  const message = membershipPlainText(payload, {
    heading: "MEMBERSHIP CONFIRMED",
    intro:
      `Dear ${first},\n\nCongratulations!\n\n` +
      `Your membership application with ${FROM_DISPLAY} has been reviewed and approved. ` +
      `You are now a bonafide member of the FFIEMC family.`,
    closing:
      `We are glad to walk with you in faith, fellowship, and service.\n\n` +
      `Visit our website: ${siteUrl}\n` +
      `If you have any questions, reply to this email or write to contact@ffiem.org.\n\n` +
      `May the Lord bless you and keep you.\n\nWith love,\nThe Leadership Team\n${FROM_DISPLAY}`,
  });

  return sendViaSupabaseEmail({
    purpose: "membership_approved",
    to: email,
    subject: "Welcome to the FFIEMC family — your membership is approved",
    text: message,
    html: brandedEmailHtml({ title: "Membership approved", bodyText: message }),
    replyTo: "contact@ffiem.org",
  });
}

export async function sendMeetingInviteEmail({
  toEmail,
  fullName,
  title,
  whenLabel,
  description,
  meetUrl,
  calendarUrl,
  pageUrl,
  fromName = FROM_DISPLAY,
}) {
  if (!toEmail) throw new Error("Recipient email is required");
  const first = (fullName || "").split(" ")[0] || fullName || "Beloved";
  const text =
    `Dear ${first},\n\nYou are invited to a church meeting.\n\n` +
    `━━━━━━━━━━━━━━━━━━━━━━━━\n${title}\nWhen: ${whenLabel}\n━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
    `${description ? `${description}\n\n` : ""}` +
    `JOIN THE MEETING\n${meetUrl || pageUrl}\n\n` +
    `ADD TO YOUR CALENDAR\nGoogle Calendar: ${calendarUrl}\n` +
    (pageUrl ? `Apple / Outlook (open page, then Download .ics): ${pageUrl}\n\n` : "\n") +
    `We look forward to seeing you.\n\n— ${fromName}`;

  return sendViaSupabaseEmail({
    purpose: "meeting_invite",
    to: toEmail,
    subject: `You're invited: ${title}`,
    text,
    html: brandedEmailHtml({
      title: "Meeting invitation",
      bodyHtml:
        fieldsTable([
          ["Meeting", title],
          ["When", whenLabel],
          ["Join", meetUrl || pageUrl],
          ["Calendar", calendarUrl],
        ]) + plainToHtmlBlocks(description || ""),
    }),
    replyTo: "contact@ffiem.org",
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
    await delay(400);
  }
  return results;
}

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
  const money = `₦${Number(amount || 0).toLocaleString("en-NG", { maximumFractionDigits: 2 })}`;
  const origin = typeof window !== "undefined" ? window.location.origin : SITE_URL;
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
  const text =
    `A social media team member submitted a contribution.\n\n` +
    `Name: ${fullName}\nAmount: ${money}\nPayment date: ${paidOn}\nMonth: ${monthLabel || "—"}\n` +
    `Note: ${note || "—"}\nReceipt: ${receiptUrl || "Not attached"}\n` +
    (reportUrl ? `Report: ${reportUrl}\n` : "") +
    `Admin: ${auditUrl}\n`;

  return sendViaSupabaseEmail({
    purpose: "media_contribution",
    notifyAdmins: true,
    adminEmail,
    secondaryEmails,
    adminEmails,
    subject: mailSubject,
    text,
    html: brandedEmailHtml({
      title: "Media contribution received",
      bodyHtml: fieldsTable([
        ["Name", fullName],
        ["Amount", money],
        ["Payment date", paidOn],
        ["Month", monthLabel],
        ["Note", note],
        ["Receipt", receiptUrl || "Not attached"],
        ["Report", reportUrl],
        ["Admin", auditUrl],
      ]),
    }),
    replyTo: DEFAULT_ADMIN_EMAIL,
  });
}

export async function sendExperienceSurveySubmissionEmail({
  surveyId,
  name = "",
  email = "",
  overallRating,
  averageComfort = null,
  comfortScores = {},
  improvements = "",
  wishedFeatures = "",
  feedbackText = "",
  path = "/",
  audience = "visitor",
  adminEmail,
  secondaryEmails,
  adminEmails,
  emailSubjects,
}) {
  // Prefer dedicated edge path when surveyId is available (idempotent notify)
  const edgeUrl = process.env.REACT_APP_SUPABASE_URL;
  const anonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;
  if (edgeUrl && anonKey && surveyId) {
    try {
      const response = await fetch(`${edgeUrl}/functions/v1/notify-experience-survey`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${anonKey}`,
          apikey: anonKey,
        },
        body: JSON.stringify({
          surveyId,
          siteOrigin: typeof window !== "undefined" ? window.location.origin : SITE_URL,
          adminEmail,
          secondaryEmails,
        }),
      });
      if (response.ok) return response.json();
    } catch {
      /* fall through to generic send */
    }
  }

  const displayName = String(name || "").trim() || "Anonymous visitor";
  const rating = `${Number(overallRating) || "—"}`;
  const avg =
    averageComfort != null && Number.isFinite(Number(averageComfort))
      ? String(averageComfort)
      : "—";
  const inboxUrl = `${typeof window !== "undefined" ? window.location.origin : SITE_URL}/admin/experience-surveys`;
  const mailSubject = subjectFromSettings(
    { emailSubjects },
    "experienceSurvey",
    { fullName: displayName, rating, averageComfort: avg }
  );

  const comfortLines = (SURVEY_FEATURES || [])
    .map((feature) => {
      const score = comfortScores?.[feature.key];
      return `- ${feature.label}: ${score ?? "—"}/5`;
    })
    .join("\n");
  const comfortFieldRows = (SURVEY_FEATURES || []).map((feature) => [
    feature.label,
    `${comfortScores?.[feature.key] ?? "—"}/5`,
  ]);

  const text =
    `A new website experience survey was submitted.\n\n` +
    `── Step 1: About you ──\n` +
    `Name: ${displayName}\nEmail: ${String(email || "").trim() || "Not provided"}\n` +
    `Audience: ${audience || "visitor"}\nPage: ${path || "/"}\n\n` +
    `── Step 2: Comfort with each area (1–5) ──\n${comfortLines || "(none)"}\n` +
    `Average comfort: ${avg}/5\n\n` +
    `── Step 3: Overall experience ──\nOverall rating: ${rating}/5\n\n` +
    `── Step 4: What to improve ──\n${String(improvements || "").trim() || "(none)"}\n\n` +
    `── Step 5: Features they would like ──\n${String(wishedFeatures || "").trim() || "(none)"}\n\n` +
    `Review: ${inboxUrl}\n`;

  return sendViaSupabaseEmail({
    purpose: "experience_survey",
    notifyAdmins: true,
    adminEmail,
    secondaryEmails,
    adminEmails,
    subject: mailSubject,
    text,
    html: brandedEmailHtml({
      title: "New experience survey",
      bodyHtml:
        fieldsTable([
          ["Name", displayName],
          ["Email", email || "Not provided"],
          ["Audience", audience],
          ["Page", path],
          ...comfortFieldRows,
          ["Average comfort", `${avg}/5`],
          ["Overall rating", `${rating}/5`],
          ["Improvements", improvements || "(none)"],
          ["Wished features", wishedFeatures || "(none)"],
          ["Admin", inboxUrl],
        ]) + plainToHtmlBlocks(feedbackText || ""),
    }),
    replyTo: String(email || "").trim() || DEFAULT_ADMIN_EMAIL,
  });
}

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

  return sendViaSupabaseEmail({
    purpose: "compose",
    to: recipients,
    subject: subject.trim(),
    text: body.trim(),
    html: brandedEmailHtml({
      title: subject.trim(),
      preheader: fromName,
      bodyText: body.trim(),
    }),
    replyTo: replyToEmail,
  });
}
