import { Link } from "react-router-dom";
import { Badge } from "../components/ui/badge";
import { useSettings } from "../context/SettingsContext";
import { pageSection } from "../data/sitePages";
import { fillLegalPlaceholders } from "../data/legalContent";

function LegalShell({ badge, title, intro, lastUpdated, children }) {
  const { settings } = useSettings();
  const church = settings.name || "Fire-Fire International Evangelical Church";

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-orange-50" data-testid="legal-page">
      <section className="py-14 md:py-20 border-b border-red-100/80 bg-white/70">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <Badge className="bg-red-100 text-red-700 hover:bg-red-100 mb-4">{badge}</Badge>
          <h1 className="text-3xl md:text-5xl font-bold text-gray-900 tracking-tight">{title}</h1>
          {intro ? <p className="mt-4 text-gray-600 leading-relaxed">{intro}</p> : null}
          <p className="mt-3 text-sm text-gray-500">
            {lastUpdated ? <>Last updated: {lastUpdated} · </> : null}
            {church}
          </p>
        </div>
      </section>

      <section className="py-12 md:py-16">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <article className="legal-prose space-y-8 text-gray-700 leading-relaxed">{children}</article>

          <div className="mt-12 pt-8 border-t border-gray-200 flex flex-wrap gap-4 text-sm">
            <Link to="/privacy" className="text-red-700 hover:underline">
              Privacy Policy
            </Link>
            <Link to="/terms" className="text-red-700 hover:underline">
              Terms of Service
            </Link>
            <Link to="/contact" className="text-red-700 hover:underline">
              Contact us
            </Link>
            <Link to="/" className="text-gray-500 hover:underline">
              Back to home
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

function linkifyEmail(text, email) {
  if (!email || !text.includes(email)) return text;
  const parts = String(text).split(email);
  return parts.reduce((acc, part, i) => {
    if (i === 0) return [part];
    return [
      ...acc,
      <a key={`em-${i}`} href={`mailto:${email}`} className="text-red-700 underline underline-offset-2">
        {email}
      </a>,
      part,
    ];
  }, []);
}

function linkifyPaths(nodes) {
  const out = [];
  const walk = (node, keyPrefix) => {
    if (typeof node !== "string") {
      out.push(node);
      return;
    }
    const pattern = /(\/privacy|\/terms)/g;
    let last = 0;
    let match;
    let i = 0;
    while ((match = pattern.exec(node)) !== null) {
      if (match.index > last) out.push(node.slice(last, match.index));
      const path = match[0];
      out.push(
        <Link key={`${keyPrefix}-${i++}`} to={path} className="text-red-700 underline underline-offset-2">
          {path === "/privacy" ? "Privacy Policy" : "Terms of Service"}
        </Link>
      );
      last = match.index + path.length;
    }
    if (last < node.length) out.push(node.slice(last));
  };
  (Array.isArray(nodes) ? nodes : [nodes]).forEach((n, idx) => walk(n, `p${idx}`));
  return out.length ? out : nodes;
}

function BodyBlocks({ text, email }) {
  const blocks = String(text || "")
    .split(/\n\n+/)
    .map((b) => b.trim())
    .filter(Boolean);

  return (
    <div className="space-y-3 text-[15px]">
      {blocks.map((block, i) => {
        const lines = block.split("\n").map((l) => l.trim()).filter(Boolean);
        const isList = lines.length > 0 && lines.every((l) => l.startsWith("- ") || l.startsWith("• "));
        if (isList) {
          return (
            <ul key={i} className="list-disc pl-5 space-y-1.5">
              {lines.map((line, j) => {
                const content = line.replace(/^[-•]\s*/, "");
                return <li key={j}>{linkifyPaths(linkifyEmail(content, email))}</li>;
              })}
            </ul>
          );
        }
        return <p key={i}>{linkifyPaths(linkifyEmail(block.replace(/\n/g, " "), email))}</p>;
      })}
    </div>
  );
}

function LegalPage({ pageKey }) {
  const { settings } = useSettings();
  const hero = pageSection(settings, pageKey, "hero");
  const sections = pageSection(settings, pageKey, "sections");
  const vars = {
    church: settings.name || "Fire-Fire International Evangelical Church",
    email: settings.email || "info@ffiem.org",
    phone: settings.phone || "",
    location: settings.location || "",
  };
  const items = Array.isArray(sections.items) ? sections.items : [];

  return (
    <LegalShell
      badge={fillLegalPlaceholders(hero.badge || "Legal", vars)}
      title={fillLegalPlaceholders(hero.headline || (pageKey === "terms" ? "Terms of Service" : "Privacy Policy"), vars)}
      intro={fillLegalPlaceholders(hero.intro || "", vars)}
      lastUpdated={hero.lastUpdated || ""}
    >
      {items.map((item, index) => (
        <section key={`${item.title || "s"}-${index}`} className="space-y-3">
          <h2 className="text-xl font-semibold text-gray-900">
            {fillLegalPlaceholders(item.title || `Section ${index + 1}`, vars)}
          </h2>
          <BodyBlocks text={fillLegalPlaceholders(item.body || "", vars)} email={vars.email} />
        </section>
      ))}
      {!items.length && (
        <p className="text-gray-500">This page has no published sections yet.</p>
      )}
    </LegalShell>
  );
}

export function PrivacyPolicy() {
  return <LegalPage pageKey="privacy" />;
}

export function TermsOfService() {
  return <LegalPage pageKey="terms" />;
}
