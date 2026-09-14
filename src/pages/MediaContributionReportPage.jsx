import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { toast } from "sonner";
import { CheckCircle2, Copy, Share2, Wallet } from "lucide-react";
import { authApi, formatApiError } from "../lib/api";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { ContributionProofDetails } from "../components/media/ContributionProofDetails";
import {
  PRIVATE_AMOUNT_MASK,
  formatContributionShareLine,
  formatPrivateOrMoney,
} from "../lib/mediaContributions";

const money = (n) =>
  `₦${Number(n || 0).toLocaleString("en-NG", { maximumFractionDigits: 2 })}`;

function buildShareText(report, slug) {
  if (!report?.month) return "";
  const s = report.summary || {};
  const lines = [
    `📊 *Social Media Team — ${report.month.label}*`,
    "",
    `Total raised: *${money(s.total_raised)}*`,
    `Paid members: ${s.paid_roster_count || 0}/${s.active_roster_count || 0}`,
    `Commitments: ${money(s.commitments_total)}`,
    `Balance: ${money(s.balance)}`,
    "",
    "*Contributions* (individual amounts private)",
  ];
  (report.contributions || []).forEach((c) => {
    lines.push(formatContributionShareLine(c, { money, hideAmount: true }));
  });
  if ((report.commitments || []).length) {
    lines.push("", "*Equipment / commitments*");
    report.commitments.forEach((c) => lines.push(`• ${c.title} — ${money(c.amount)} (${c.status})`));
  }
  const unpaid = (report.roster || []).filter((m) => !m.paid);
  if (unpaid.length) {
    lines.push("", "*Still outstanding*");
    unpaid.forEach((m) => lines.push(`• ${m.full_name}`));
  }
  const origin = typeof window !== "undefined" ? window.location.origin : "https://ffiem.org";
  lines.push("", `Report: ${origin}/contribute/media/${slug}/report`);
  return lines.join("\n");
}

export default function MediaContributionReportPage() {
  const { slug } = useParams();
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const data = await authApi.getPublicMediaContributionReport(slug);
        setReport(data);
      } catch (err) {
        toast.error(formatApiError(err.message) || "Report unavailable");
        setReport(null);
      } finally {
        setLoading(false);
      }
    })();
  }, [slug]);

  const copyReport = async () => {
    try {
      await navigator.clipboard.writeText(buildShareText(report, slug));
      toast.success("Report copied — paste into WhatsApp");
    } catch {
      toast.error("Could not copy");
    }
  };

  if (loading) {
    return <div className="min-h-[60vh] flex items-center justify-center text-gray-500">Loading report…</div>;
  }

  if (!report?.month) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3 px-4">
        <p className="text-gray-600">This report is unavailable.</p>
        <Button asChild variant="outline"><Link to="/">Go home</Link></Button>
      </div>
    );
  }

  const s = report.summary || {};

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-red-50" data-testid="media-contribute-report">
      <section className="py-12 md:py-16">
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-8">
            <Badge className="bg-red-100 text-red-700 hover:bg-red-100 mb-3">Team audit report</Badge>
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 flex items-center justify-center gap-2">
              <Wallet className="h-8 w-8 text-red-600" /> {report.month.label}
            </h1>
            <p className="text-gray-600 mt-3">
              Social media team contributions & commitments
            </p>
            <p className="text-xs text-gray-400 mt-2">
              Individual contribution amounts are private (shown as {PRIVATE_AMOUNT_MASK}).
            </p>
            <div className="mt-5 flex flex-wrap justify-center gap-2">
              <Button onClick={copyReport} className="bg-red-600 hover:bg-red-700">
                <Share2 className="h-4 w-4 mr-2" /> Copy for WhatsApp
              </Button>
              <Button variant="outline" onClick={copyReport}>
                <Copy className="h-4 w-4 mr-2" /> Copy text
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
            {[
              { label: "Raised", value: money(s.total_raised) },
              { label: "Paid", value: `${s.paid_roster_count || 0}/${s.active_roster_count || 0}` },
              { label: "Commitments", value: money(s.commitments_total) },
              { label: "Balance", value: money(s.balance) },
            ].map((card) => (
              <Card key={card.label} className="border-0 shadow-md">
                <CardContent className="p-4 text-center">
                  <p className="text-xs text-gray-500">{card.label}</p>
                  <p className="text-lg font-bold text-gray-900 mt-1">{card.value}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card className="border-0 shadow-md mb-6">
            <CardContent className="p-5">
              <h2 className="font-semibold text-gray-900 mb-3">Contributions</h2>
              <ul className="space-y-2">
                {(report.contributions || []).map((c, i) => (
                  <li key={`${c.full_name}-${i}`} className="flex items-start justify-between gap-3 border-b border-gray-50 pb-3">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-gray-900">{c.full_name}</p>
                      <ContributionProofDetails
                        paymentDate={c.payment_date}
                        receiptUrl={c.receipt_url}
                        note={c.note}
                        compact
                        className="mt-1.5"
                      />
                    </div>
                    <span className="font-semibold text-red-700 shrink-0 tracking-wider" title="Amount private">
                      {formatPrivateOrMoney(c, money)}
                    </span>
                  </li>
                ))}
                {(report.contributions || []).length === 0 && (
                  <p className="text-sm text-gray-500">No contributions recorded yet.</p>
                )}
              </ul>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-md mb-6">
            <CardContent className="p-5">
              <h2 className="font-semibold text-gray-900 mb-3">Equipment & commitments</h2>
              <ul className="space-y-3">
                {(report.commitments || []).map((c, i) => (
                  <li key={`${c.title}-${i}`} className="flex justify-between gap-3">
                    <div>
                      <p className="font-medium text-gray-900">{c.title}</p>
                      {c.description ? <p className="text-sm text-gray-500">{c.description}</p> : null}
                      <Badge className="mt-1 bg-slate-100 text-slate-700 capitalize">{c.status}</Badge>
                    </div>
                    <p className="font-semibold">{money(c.amount)}</p>
                  </li>
                ))}
                {(report.commitments || []).length === 0 && (
                  <p className="text-sm text-gray-500">No commitments listed yet.</p>
                )}
              </ul>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-md mb-8">
            <CardContent className="p-5">
              <h2 className="font-semibold text-gray-900 mb-3">Roster status</h2>
              <ul className="space-y-2">
                {(report.roster || []).map((m) => (
                  <li
                    key={m.full_name}
                    className={`flex items-start justify-between gap-3 rounded-lg px-3 py-2.5 text-sm ${
                      m.paid ? "bg-gray-50" : "bg-amber-50/60"
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <p className={`font-medium ${m.paid ? "text-gray-800" : "text-gray-900"}`}>{m.full_name}</p>
                      {m.paid ? (
                        <ContributionProofDetails
                          paymentDate={m.payment_date}
                          receiptUrl={m.receipt_url}
                          note={m.note}
                          compact
                          className="mt-1.5"
                        />
                      ) : null}
                    </div>
                    {m.paid ? (
                      <span
                        className="inline-flex items-center gap-1 text-green-700 shrink-0 mt-0.5 tracking-wider"
                        title="Amount private"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" /> {formatPrivateOrMoney(m, money)}
                      </span>
                    ) : (
                      <Badge variant="outline" className="text-amber-700 border-amber-200 shrink-0 mt-0.5">
                        Outstanding
                      </Badge>
                    )}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <p className="text-center text-sm text-gray-500">
            <Link to={`/contribute/media/${slug}`} className="text-red-600 hover:underline">
              Submit a contribution
            </Link>
          </p>
        </div>
      </section>
    </div>
  );
}
