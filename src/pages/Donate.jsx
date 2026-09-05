import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import {
  Building2,
  Check,
  Copy,
  CreditCard,
  Gift,
  Heart,
  Landmark,
  Lock,
} from "lucide-react";
import { useSettings } from "../context/SettingsContext";
import { pageSection } from "../data/sitePages";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Checkbox } from "../components/ui/checkbox";
import { Label } from "../components/ui/label";

const METHOD_BANK = "bank";
const METHOD_PAYSTACK = "paystack";

const ACCOUNT_STYLES = {
  tithe_gtb: {
    card: "bg-[#7a1f2b]",
    icon: Heart,
  },
  tithe_opay: {
    card: "bg-[#0f5c3b]",
    icon: Heart,
  },
  offering: {
    card: "bg-[#163a5f]",
    icon: Gift,
  },
  building: {
    card: "bg-[#4a2d6b]",
    icon: Building2,
  },
};

function accountStyle(id) {
  return ACCOUNT_STYLES[id] || { card: "bg-zinc-800", icon: Landmark };
}

function maskAccountNumber(value) {
  const digits = String(value || "").replace(/\s/g, "");
  if (!digits) return "••••••••••";
  return "•".repeat(Math.max(digits.length, 8));
}

async function copyText(value, label) {
  try {
    await navigator.clipboard.writeText(String(value || ""));
    toast.success(`${label} copied`);
    return true;
  } catch {
    toast.error("Could not copy — please copy manually");
    return false;
  }
}

export const Donate = () => {
  const { settings } = useSettings();
  const hero = pageSection(settings, "donate", "hero");
  const accountsSection = pageSection(settings, "donate", "accounts");
  const accounts = useMemo(
    () => (Array.isArray(accountsSection.items) ? accountsSection.items : []),
    [accountsSection.items]
  );

  const [consent, setConsent] = useState(false);
  const [method, setMethod] = useState(METHOD_BANK);
  const [copiedId, setCopiedId] = useState("");

  const onCopyAccount = async (account) => {
    if (!consent) {
      toast.error("Please confirm you are giving willingly before copying account details");
      return;
    }
    const ok = await copyText(account.accountNumber, "Account number");
    if (ok) {
      setCopiedId(account.id || account.accountNumber);
      window.setTimeout(() => setCopiedId(""), 2000);
    }
  };

  const selectMethod = (next) => {
    if (!consent) {
      toast.error("Please tick the consent box to continue");
      return;
    }
    setMethod(next);
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white" data-testid="donate-page">
      <section className="relative overflow-hidden border-b border-white/10">
        <div
          className="absolute inset-0 opacity-80"
          style={{
            background:
              "radial-gradient(ellipse 80% 60% at 70% 0%, rgba(180,40,40,0.45), transparent 55%), radial-gradient(ellipse 50% 40% at 10% 100%, rgba(212,160,40,0.12), transparent 50%), #0a0a0a",
          }}
        />
        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-20">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-8">
            <div className="max-w-2xl">
              {settings.logo ? (
                <img
                  src={settings.logo}
                  alt={settings.name || "Church logo"}
                  className="h-16 w-16 rounded-full bg-white object-contain mb-6 shadow-lg"
                />
              ) : null}
              <Badge className="bg-red-700/90 text-white hover:bg-red-700 mb-4 border-0">
                {hero.badge || "Partner with us"}
              </Badge>
              <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-amber-300">
                {hero.headline || "Giving Options"}
              </h1>
              <p className="mt-4 text-lg text-zinc-300 leading-relaxed max-w-xl">
                {hero.intro ||
                  "Your giving makes a difference. Partner with Fire-Fire International Evangelical Church through bank transfer — online checkout is coming soon."}
              </p>
            </div>
            <p className="text-sm uppercase tracking-[0.2em] text-red-300/90 md:text-right md:max-w-xs">
              Partner with us · Your giving makes a difference
            </p>
          </div>
        </div>
      </section>

      <section className="relative py-12 md:py-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
          <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-5 sm:p-6 space-y-3">
            <p className="text-sm font-semibold text-amber-200">
              {hero.consentTitle || "Willing giver agreement"}
            </p>
            <div className="flex items-start gap-3">
              <Checkbox
                id="donate-consent"
                checked={consent}
                onCheckedChange={(v) => setConsent(Boolean(v))}
                className="mt-0.5 border-amber-400 data-[state=checked]:bg-amber-500 data-[state=checked]:border-amber-500 data-[state=checked]:text-zinc-950"
              />
              <Label
                htmlFor="donate-consent"
                className="font-normal text-sm text-zinc-200 leading-relaxed cursor-pointer"
              >
                {hero.consentText ||
                  "I confirm that I am giving willingly and cheerfully to Fire-Fire International Evangelical Church. I understand bank transfers are made at my own initiative, account details are for ministry giving only, and online Paystack payments will be available when enabled. I give this gift freely for the work of the gospel."}
                {" "}*
                <span className="block mt-2 text-xs text-zinc-400">
                  See our{" "}
                  <Link to="/privacy" className="text-amber-300 underline underline-offset-2">
                    privacy policy
                  </Link>
                  {" "}and{" "}
                  <Link to="/terms" className="text-amber-300 underline underline-offset-2">
                    terms of service
                  </Link>
                  .
                </span>
              </Label>
            </div>
          </div>

          <div className={`space-y-8 transition-opacity ${consent ? "opacity-100" : "opacity-50"}`}>
            {!consent && (
              <p className="flex items-center gap-2 text-sm text-zinc-400">
                <Lock className="h-4 w-4" />
                Tick the agreement above to unlock giving options.
              </p>
            )}

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={!consent}
                onClick={() => selectMethod(METHOD_BANK)}
                className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium border transition-colors disabled:cursor-not-allowed ${
                  method === METHOD_BANK
                    ? "bg-white text-zinc-950 border-white"
                    : "border-white/20 text-zinc-300 hover:border-white/40"
                }`}
              >
                <Landmark className="h-4 w-4" />
                Bank transfer
              </button>
              <button
                type="button"
                disabled={!consent}
                onClick={() => selectMethod(METHOD_PAYSTACK)}
                className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium border transition-colors disabled:cursor-not-allowed ${
                  method === METHOD_PAYSTACK
                    ? "bg-white text-zinc-950 border-white"
                    : "border-white/20 text-zinc-300 hover:border-white/40"
                }`}
              >
                <CreditCard className="h-4 w-4" />
                Paystack
                <span className="rounded-full bg-amber-400/20 text-amber-200 text-[10px] uppercase tracking-wider px-2 py-0.5">
                  Coming soon
                </span>
              </button>
            </div>

            {method === METHOD_BANK && (
              <div>
                <h2 className="text-xl font-semibold text-white mb-2">Bank accounts</h2>
                <p className="text-sm text-zinc-400 mb-6">
                  {consent
                    ? "Transfer to the account that matches your gift. Tap an account number to copy it."
                    : "Account numbers stay hidden until you tick the willing giver agreement above."}
                </p>
                <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">
                  {accounts.map((account) => {
                    const style = accountStyle(account.id);
                    const Icon = style.icon;
                    const isCopied = copiedId === (account.id || account.accountNumber);
                    const displayNumber = consent
                      ? account.accountNumber
                      : maskAccountNumber(account.accountNumber);
                    return (
                      <div
                        key={account.id || account.accountNumber}
                        className={`rounded-2xl ${style.card} p-5 text-center shadow-lg flex flex-col min-h-[260px]`}
                      >
                        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-white/10">
                          <Icon className="h-6 w-6 text-white" />
                        </div>
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/85">
                          {account.label}
                        </p>
                        <button
                          type="button"
                          disabled={!consent}
                          onClick={() => onCopyAccount(account)}
                          className={`mt-4 text-2xl font-bold tracking-wide text-white disabled:cursor-not-allowed ${
                            consent ? "hover:text-amber-100" : "select-none blur-[3px] opacity-80"
                          }`}
                          title={consent ? "Copy account number" : "Accept the agreement to reveal"}
                          aria-label={consent ? `Account number ${account.accountNumber}` : "Account number hidden"}
                        >
                          {displayNumber}
                        </button>
                        {!consent && (
                          <p className="mt-2 text-[11px] text-white/70 inline-flex items-center justify-center gap-1">
                            <Lock className="h-3 w-3" />
                            Hidden until you consent
                          </p>
                        )}
                        <div className="my-3 h-px w-full bg-white/25" />
                        <p className="text-xs text-white/80 leading-snug flex-1">
                          {account.accountName}
                        </p>
                        <p className="mt-3 text-sm font-semibold text-white">{account.bank}</p>
                        <Button
                          type="button"
                          size="sm"
                          disabled={!consent}
                          variant="secondary"
                          className="mt-4 w-full bg-white/15 hover:bg-white/25 text-white border-0 disabled:opacity-60"
                          onClick={() => onCopyAccount(account)}
                        >
                          {isCopied ? (
                            <>
                              <Check className="h-4 w-4 mr-1.5" /> Copied
                            </>
                          ) : consent ? (
                            <>
                              <Copy className="h-4 w-4 mr-1.5" /> Copy number
                            </>
                          ) : (
                            <>
                              <Lock className="h-4 w-4 mr-1.5" /> Locked
                            </>
                          )}
                        </Button>
                      </div>
                    );
                  })}
                </div>
                {!accounts.length && (
                  <p className="text-sm text-zinc-400">Giving accounts will appear here once published.</p>
                )}
              </div>
            )}

            {method === METHOD_PAYSTACK && (
              <div className="rounded-2xl border border-dashed border-white/20 bg-white/5 p-8 sm:p-10 text-center max-w-2xl mx-auto">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-amber-400/15 text-amber-300">
                  <CreditCard className="h-7 w-7" />
                </div>
                <Badge className="bg-amber-400/20 text-amber-200 hover:bg-amber-400/20 border-0 mb-3">
                  Coming soon
                </Badge>
                <h2 className="text-2xl font-semibold text-white mb-2">Paystack checkout</h2>
                <p className="text-sm text-zinc-400 leading-relaxed">
                  Card and instant bank payments through Paystack are being prepared. For now,
                  please use <strong className="text-zinc-200">bank transfer</strong> with the
                  accounts listed under the Bank transfer tab. Thank you for partnering with us.
                </p>
                <Button
                  type="button"
                  className="mt-6 bg-red-600 hover:bg-red-700"
                  disabled={!consent}
                  onClick={() => selectMethod(METHOD_BANK)}
                >
                  Use bank transfer instead
                </Button>
              </div>
            )}
          </div>

          <div className="rounded-xl border border-amber-500/20 bg-zinc-900/80 px-5 py-4 text-center">
            <p className="text-sm text-amber-200/90">
              Thank you for your generosity · Your support helps us reach more lives and build God&apos;s kingdom.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};
