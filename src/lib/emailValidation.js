/**
 * Shared public-email rules for FFIEM forms.
 * Keep in step with public.validate_public_email in
 * supabase/migrations/20261031_email_validation_otp_priority.sql.
 */

const TYPO_DOMAINS = {
  "gmal.com": "gmail.com",
  "gmil.com": "gmail.com",
  "gmial.com": "gmail.com",
  "gmai.com": "gmail.com",
  "gmaill.com": "gmail.com",
  "gamil.com": "gmail.com",
  "gnail.com": "gmail.com",
  "gmali.com": "gmail.com",
  "gmaul.com": "gmail.com",
  "gmeil.com": "gmail.com",
  "gmail.con": "gmail.com",
  "gmail.co": "gmail.com",
  "gmail.co.com": "gmail.com",
  "gmail.cm": "gmail.com",
  "gmail.om": "gmail.com",
  "gmail.cim": "gmail.com",
  "gmail.vom": "gmail.com",
  "gmail.xom": "gmail.com",
  "gmail.comm": "gmail.com",
  "gmailcom": "gmail.com",
  "10gmail.com": "gmail.com",
  "yaho.com": "yahoo.com",
  "yahooo.com": "yahoo.com",
  "yahoo.con": "yahoo.com",
  "yhaoo.com": "yahoo.com",
  "hotmial.com": "hotmail.com",
  "hotmal.com": "hotmail.com",
  "hotmai.com": "hotmail.com",
  "hotmail.con": "hotmail.com",
  "outlok.com": "outlook.com",
  "outloo.com": "outlook.com",
  "outlook.con": "outlook.com",
};

const BLOCKED_DOMAINS = new Set([
  "example.com",
  "example.org",
  "example.net",
  "test.com",
  "mailinator.com",
  "guerrillamail.com",
  "localhost",
]);

const BLOCKED_LOCAL = /^(test|none|fake|noemail|no-email|example|asdf|qwerty|abc|xxx|user|email|name|null|undefined|na)\d*$/;

const KEYBOARD_RUN = /asdf|sdfg|dfgh|fghj|ghjk|hjkl|qwer|wert|erty|rtyu|tyui|yuio|uiop|zxcv|xcvb|cvbn|vbnm|asde|sdew/;

const FORMAT = /^[a-z0-9](?:[a-z0-9._%+-]{0,62}[a-z0-9])?@[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$/;

function fail(message, extra = {}) {
  return { ok: false, message, email: "", ...extra };
}

function looksLikePlaceholder(local) {
  const compact = local.replace(/[._+-]/g, "");
  const letters = local.replace(/[^a-z]/g, "");
  if (BLOCKED_LOCAL.test(compact) || BLOCKED_LOCAL.test(local)) return true;
  if (compact.length < 4) return true;
  if (letters.length >= 3 && !/[aeiou]/.test(letters)) return true;
  if (KEYBOARD_RUN.test(letters)) return true;
  return false;
}

/**
 * @param {string} value
 * @param {{ required?: boolean }} [options]
 * @returns {{ ok: boolean, message: string, email: string, suggestion?: string }}
 */
export function validateEmail(value, { required = false } = {}) {
  const raw = String(value ?? "");
  const email = raw.trim().toLowerCase();
  if (!email) {
    return required ? fail("Email is required") : { ok: true, message: "", email: "" };
  }
  if (/\s/.test(raw)) {
    return fail("Email cannot contain spaces");
  }
  if (!FORMAT.test(email) || email.includes("..")) {
    if (/\.@/.test(email) || email.includes("..")) {
      return fail("Email cannot have a dot immediately before @ or consecutive dots");
    }
    return fail("Enter a valid email address");
  }
  const at = email.lastIndexOf("@");
  const local = email.slice(0, at);
  const domain = email.slice(at + 1);
  if (local.startsWith(".") || local.endsWith(".")) {
    return fail("Email cannot have a dot immediately before @ or consecutive dots");
  }
  const suggestedDomain = TYPO_DOMAINS[domain];
  if (suggestedDomain) {
    const suggestion = `${local}@${suggestedDomain}`;
    return fail(`Did you mean @${suggestedDomain}?`, { suggestion });
  }
  if (BLOCKED_DOMAINS.has(domain)) {
    return fail("This looks like a placeholder email address");
  }
  if (looksLikePlaceholder(local)) {
    return fail("This looks like a placeholder email address");
  }
  return { ok: true, message: "", email };
}

export function phoneError(value, required = true) {
  const digits = String(value || "").replace(/\D/g, "");
  if (!digits) return required ? "Enter a phone number" : "";
  if (digits.length < 7) return "Enter a valid phone number";
  return "";
}

export function personFieldErrors(form = {}, { requireTitle = true, requireLast = true } = {}) {
  const errors = {};
  if (requireTitle && !String(form.name_title || "").trim()) {
    errors.name_title = "Select a title";
  }
  if (!String(form.first_name || "").trim()) {
    errors.first_name = "Enter a first name";
  }
  if (requireLast && !String(form.last_name || "").trim()) {
    errors.last_name = "Enter a last name";
  }
  return errors;
}

/**
 * Required-field checks for registration forms.
 * `suggestion` is kept off the error map so focus does not land on a fake field.
 */
export function registrationFieldErrors(form = {}, options = {}) {
  const {
    requireTitle = true,
    requireLast = true,
    requireEmail = true,
    requirePhone = true,
    requireBranch = false,
    requireRoles = false,
  } = options;
  const errors = personFieldErrors(form, { requireTitle, requireLast });
  const emailResult = validateEmail(form.email, { required: requireEmail });
  let suggestion = "";
  if (!emailResult.ok) {
    errors.email = emailResult.message;
    suggestion = emailResult.suggestion || "";
  }
  const phoneMsg = phoneError(form.phone, requirePhone);
  if (phoneMsg) errors.phone = phoneMsg;
  if (requireBranch && !form.branch_id) errors.branch_id = "Select your church branch";
  const roleIds = Array.isArray(form.role_ids) ? form.role_ids.filter(Boolean) : [];
  if (requireRoles && !roleIds.length) errors.role_ids = "Select at least one church role";
  return { errors, suggestion };
}
