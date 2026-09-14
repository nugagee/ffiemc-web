import { useMemo } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Activity,
  BarChart3,
  RefreshCw,
  Target,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";
import { Button } from "../ui/button";
import { Card } from "../ui/card";
import { Badge } from "../ui/badge";

const money = (n) =>
  `₦${Number(n || 0).toLocaleString("en-NG", { maximumFractionDigits: 0 })}`;

const moneyExact = (n) =>
  `₦${Number(n || 0).toLocaleString("en-NG", { maximumFractionDigits: 2 })}`;

const CHART = {
  raised: "#dc2626",
  commitments: "#f59e0b",
  balance: "#059669",
  target: "#64748b",
  public: "#0ea5e9",
  admin: "#7c3aed",
  planned: "#94a3b8",
  purchased: "#f59e0b",
  achieved: "#10b981",
  timeline: "#dc2626",
};

const SOURCE_COLORS = {
  public: CHART.public,
  admin: CHART.admin,
  unknown: "#94a3b8",
};

const STATUS_COLORS = {
  planned: CHART.planned,
  purchased: CHART.purchased,
  achieved: CHART.achieved,
};

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 shadow-md text-xs">
      {label ? <p className="font-semibold text-gray-900 mb-1">{label}</p> : null}
      {payload.map((p) => (
        <p key={p.dataKey} className="text-gray-600" style={{ color: p.color || p.fill }}>
          {p.name}: {typeof p.value === "number" && String(p.dataKey).includes("pct")
            ? `${p.value}%`
            : moneyExact(p.value)}
        </p>
      ))}
    </div>
  );
}

function KpiCard({ label, value, hint, icon: Icon, tone = "default" }) {
  const tones = {
    default: "bg-white border",
    hot: "bg-gradient-to-br from-red-600 to-red-700 text-white border-0",
    cool: "bg-white border",
  };
  const isHot = tone === "hot";
  return (
    <Card className={`p-4 ${tones[tone]}`}>
      <div className="flex items-start justify-between gap-2">
        <p className={`text-xs ${isHot ? "text-white/80" : "text-gray-500"}`}>{label}</p>
        {Icon ? <Icon className={`h-4 w-4 shrink-0 ${isHot ? "text-white/70" : "text-red-600"}`} /> : null}
      </div>
      <p className={`text-xl font-bold mt-1 ${isHot ? "" : "text-gray-900"}`}>{value}</p>
      {hint ? <p className={`text-xs mt-1 ${isHot ? "text-white/70" : "text-gray-400"}`}>{hint}</p> : null}
    </Card>
  );
}

function EmptyChart({ message = "No data yet — add months and contributions to unlock charts." }) {
  return (
    <div className="h-64 flex items-center justify-center text-sm text-gray-400 px-6 text-center">
      {message}
    </div>
  );
}

export default function MediaContributionAnalytics({ data, loading, refreshing, onRefresh }) {
  const overview = data?.overview || {};
  const months = data?.months || [];
  const ranked = data?.months_ranked || [];
  const sources = data?.sources || [];
  const timeline = data?.payment_timeline || [];
  const members = data?.members || [];
  const commitStatus = data?.commitments_by_status || [];
  const commitByMonth = data?.commitments_by_month || [];

  const sourceChart = useMemo(
    () =>
      sources.map((s) => ({
        name: s.source === "public" ? "Payment link" : s.source === "admin" ? "Admin entry" : s.source,
        key: s.source,
        value: Number(s.amount || 0),
        count: Number(s.count || 0),
      })),
    [sources]
  );

  const statusChart = useMemo(
    () =>
      commitStatus.map((s) => ({
        name: String(s.status || "").replace(/^\w/, (c) => c.toUpperCase()),
        key: s.status,
        value: Number(s.amount || 0),
        count: Number(s.count || 0),
      })),
    [commitStatus]
  );

  const rankedBars = useMemo(
    () =>
      ranked.map((m) => ({
        name: m.short_label || m.label,
        raised: Number(m.total_raised || 0),
        commitments: Number(m.commitments_total || 0),
        balance: Number(m.balance || 0),
      })),
    [ranked]
  );

  const monthTrend = useMemo(
    () =>
      months.map((m) => ({
        name: m.short_label || m.label,
        raised: Number(m.total_raised || 0),
        commitments: Number(m.commitments_total || 0),
        balance: Number(m.balance || 0),
        target: Number(m.target_amount || 0),
        completion: Number(m.completion_pct || 0),
      })),
    [months]
  );

  const commitStack = useMemo(
    () =>
      commitByMonth.map((m) => ({
        name: m.short_label || m.label,
        planned: Number(m.planned || 0),
        purchased: Number(m.purchased || 0),
        achieved: Number(m.achieved || 0),
        raised: Number(m.raised || 0),
      })),
    [commitByMonth]
  );

  const timelineChart = useMemo(
    () =>
      timeline.map((t) => ({
        date: t.date
          ? new Date(`${t.date}T12:00:00`).toLocaleDateString("en-GB", {
              day: "numeric",
              month: "short",
            })
          : "",
        amount: Number(t.amount || 0),
        count: Number(t.count || 0),
      })),
    [timeline]
  );

  const topMembers = useMemo(
    () =>
      members
        .filter((m) => Number(m.total_amount || 0) > 0)
        .slice(0, 12)
        .map((m) => ({
          name: m.full_name,
          total: Number(m.total_amount || 0),
          months: Number(m.months_paid || 0),
        })),
    [members]
  );

  const monthKeys = useMemo(
    () => months.map((m) => ({ id: m.id, label: m.short_label || m.label })),
    [months]
  );

  const memberHeatRows = useMemo(() => {
    const paid = members.filter((m) => Number(m.total_amount || 0) > 0 || m.is_active);
    return paid.slice(0, 40).map((m) => {
      const map = Object.fromEntries(
        (m.by_month || []).map((b) => [b.month_id, Number(b.amount || 0)])
      );
      return {
        id: m.member_id,
        name: m.full_name,
        total: Number(m.total_amount || 0),
        monthsPaid: Number(m.months_paid || 0),
        cells: monthKeys.map((mk) => ({
          monthId: mk.id,
          label: mk.label,
          amount: map[mk.id] || 0,
        })),
      };
    });
  }, [members, monthKeys]);

  const maxCell = useMemo(() => {
    let max = 0;
    memberHeatRows.forEach((row) => {
      row.cells.forEach((c) => {
        if (c.amount > max) max = c.amount;
      });
    });
    return max || 1;
  }, [memberHeatRows]);

  const cellColor = (amount) => {
    if (!amount) return "bg-gray-50 text-gray-300";
    const t = amount / maxCell;
    if (t > 0.75) return "bg-red-600 text-white";
    if (t > 0.5) return "bg-red-500 text-white";
    if (t > 0.25) return "bg-red-300 text-red-950";
    return "bg-red-100 text-red-800";
  };

  if (loading && !data) {
    return <p className="text-gray-500 py-12 text-center">Loading analytics…</p>;
  }

  return (
    <div className="space-y-6" data-testid="media-contribution-analytics">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-red-600" /> Contribution analytics
          </h2>
          <p className="text-sm text-gray-500 mt-0.5">
            Live across all months — refreshes when you add payments, commitments, or months.
            {data?.generated_at ? (
              <span className="text-gray-400">
                {" "}
                · Updated {new Date(data.generated_at).toLocaleString()}
              </span>
            ) : null}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={onRefresh} disabled={refreshing}>
          <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <KpiCard
          label="Total raised"
          value={money(overview.total_raised)}
          hint={`${overview.contribution_count || 0} payments · avg ${money(overview.avg_contribution)}`}
          icon={Wallet}
          tone="hot"
        />
        <KpiCard
          label="Commitments"
          value={money(overview.total_commitments)}
          hint={`Net balance ${money(overview.net_balance)}`}
          icon={Target}
        />
        <KpiCard
          label="Avg monthly raised"
          value={money(overview.avg_monthly_raised)}
          hint={`${overview.month_count || 0} month(s) tracked`}
          icon={TrendingUp}
        />
        <KpiCard
          label="Roster completion"
          value={`${overview.avg_roster_completion || 0}%`}
          hint={`Receipts on ${overview.receipt_rate || 0}% of payments`}
          icon={Users}
        />
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        <Card className="p-4 border-0 shadow-md">
          <p className="text-xs text-gray-500">Highest month</p>
          <p className="font-semibold text-gray-900 mt-1">
            {overview.highest_month?.label || "—"}
          </p>
          <p className="text-red-700 font-bold">{money(overview.highest_month?.total_raised)}</p>
        </Card>
        <Card className="p-4 border-0 shadow-md">
          <p className="text-xs text-gray-500">Lowest month</p>
          <p className="font-semibold text-gray-900 mt-1">
            {overview.lowest_month?.label || "—"}
          </p>
          <p className="text-amber-700 font-bold">{money(overview.lowest_month?.total_raised)}</p>
        </Card>
        <Card className="p-4 border-0 shadow-md">
          <p className="text-xs text-gray-500">Top contributor</p>
          <p className="font-semibold text-gray-900 mt-1">
            {overview.top_contributor?.full_name || "—"}
          </p>
          <p className="text-emerald-700 font-bold">
            {money(overview.top_contributor?.total_amount)}
            {overview.top_contributor?.months_paid ? (
              <span className="text-xs font-normal text-gray-400 ml-1">
                · {overview.top_contributor.months_paid} mo
              </span>
            ) : null}
          </p>
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card className="p-5 border-0 shadow-md">
          <h3 className="font-semibold text-gray-900 mb-1">Raised vs commitments by month</h3>
          <p className="text-xs text-gray-400 mb-4">Cash in vs equipment spend planned each month</p>
          {monthTrend.length === 0 ? (
            <EmptyChart />
          ) : (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={monthTrend} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${Math.round(v / 1000)}k`} />
                  <Tooltip content={<ChartTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="raised" name="Raised" fill={CHART.raised} radius={[4, 4, 0, 0]} />
                  <Bar dataKey="commitments" name="Commitments" fill={CHART.commitments} radius={[4, 4, 0, 0]} />
                  <Line
                    type="monotone"
                    dataKey="balance"
                    name="Balance"
                    stroke={CHART.balance}
                    strokeWidth={2}
                    dot={{ r: 3 }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>

        <Card className="p-5 border-0 shadow-md">
          <h3 className="font-semibold text-gray-900 mb-1">Months ranked (highest → lowest)</h3>
          <p className="text-xs text-gray-400 mb-4">Compare which months pulled the most support</p>
          {rankedBars.length === 0 ? (
            <EmptyChart />
          ) : (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  layout="vertical"
                  data={rankedBars}
                  margin={{ top: 8, right: 16, left: 8, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={(v) => `${Math.round(v / 1000)}k`} />
                  <YAxis type="category" dataKey="name" width={64} tick={{ fontSize: 11 }} />
                  <Tooltip content={<ChartTooltip />} />
                  <Bar dataKey="raised" name="Raised" fill={CHART.raised} radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card className="p-5 border-0 shadow-md">
          <h3 className="font-semibold text-gray-900 mb-1">How payments were made</h3>
          <p className="text-xs text-gray-400 mb-4">Share of amount by entry channel</p>
          {sourceChart.length === 0 ? (
            <EmptyChart />
          ) : (
            <div className="h-64 flex items-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={sourceChart}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={90}
                    paddingAngle={2}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {sourceChart.map((entry) => (
                      <Cell key={entry.key} fill={SOURCE_COLORS[entry.key] || "#94a3b8"} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value, _n, item) => [
                      `${moneyExact(value)} (${item?.payload?.count || 0} payments)`,
                      item?.payload?.name,
                    ]}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>

        <Card className="p-5 border-0 shadow-md">
          <h3 className="font-semibold text-gray-900 mb-1">Payment activity over time</h3>
          <p className="text-xs text-gray-400 mb-4">Daily totals by payment date</p>
          {timelineChart.length === 0 ? (
            <EmptyChart />
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={timelineChart} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="payFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={CHART.timeline} stopOpacity={0.35} />
                      <stop offset="100%" stopColor={CHART.timeline} stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${Math.round(v / 1000)}k`} />
                  <Tooltip content={<ChartTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="amount"
                    name="Amount"
                    stroke={CHART.timeline}
                    fill="url(#payFill)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card className="p-5 border-0 shadow-md">
          <h3 className="font-semibold text-gray-900 mb-1">Commitment analysis by month</h3>
          <p className="text-xs text-gray-400 mb-4">Planned / purchased / achieved spend vs raised</p>
          {commitStack.length === 0 ? (
            <EmptyChart message="No equipment commitments yet." />
          ) : (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={commitStack} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${Math.round(v / 1000)}k`} />
                  <Tooltip content={<ChartTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="planned" name="Planned" stackId="c" fill={CHART.planned} />
                  <Bar dataKey="purchased" name="Purchased" stackId="c" fill={CHART.purchased} />
                  <Bar dataKey="achieved" name="Achieved" stackId="c" fill={CHART.achieved} radius={[4, 4, 0, 0]} />
                  <Line type="monotone" dataKey="raised" name="Raised" stroke={CHART.raised} strokeWidth={2} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>

        <Card className="p-5 border-0 shadow-md">
          <h3 className="font-semibold text-gray-900 mb-1">Commitment status mix</h3>
          <p className="text-xs text-gray-400 mb-4">All-time equipment budget by status</p>
          {statusChart.length === 0 ? (
            <EmptyChart message="No equipment commitments yet." />
          ) : (
            <div className="h-72 flex items-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusChart}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={90}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {statusChart.map((entry) => (
                      <Cell key={entry.key} fill={STATUS_COLORS[entry.key] || "#94a3b8"} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value, _n, item) => [
                      `${moneyExact(value)} (${item?.payload?.count || 0} items)`,
                      item?.payload?.name,
                    ]}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>
      </div>

      <Card className="p-5 border-0 shadow-md">
        <h3 className="font-semibold text-gray-900 mb-1">Top members by total contributed</h3>
        <p className="text-xs text-gray-400 mb-4">Lifetime totals across all months</p>
        {topMembers.length === 0 ? (
          <EmptyChart />
        ) : (
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                layout="vertical"
                data={topMembers}
                margin={{ top: 8, right: 16, left: 8, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={(v) => `${Math.round(v / 1000)}k`} />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={120}
                  tick={{ fontSize: 11 }}
                />
                <Tooltip
                  formatter={(value, _n, item) => [
                    `${moneyExact(value)} · ${item?.payload?.months || 0} month(s)`,
                    "Total",
                  ]}
                />
                <Bar dataKey="total" name="Total" fill={CHART.balance} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </Card>

      <Card className="p-5 border-0 shadow-md overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
          <div>
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <Activity className="h-4 w-4 text-red-600" /> Member contributions per month
            </h3>
            <p className="text-xs text-gray-400 mt-0.5">
              Heatmap of each member’s payment by month (darker = higher amount)
            </p>
          </div>
          <Badge variant="outline" className="text-gray-500">
            {memberHeatRows.length} members · {monthKeys.length} months
          </Badge>
        </div>

        {monthKeys.length === 0 || memberHeatRows.length === 0 ? (
          <EmptyChart />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse min-w-[640px]">
              <thead>
                <tr>
                  <th className="text-left text-xs font-medium text-gray-500 py-2 pr-3 sticky left-0 bg-white">
                    Member
                  </th>
                  {monthKeys.map((mk) => (
                    <th key={mk.id} className="text-center text-xs font-medium text-gray-500 px-1 py-2 whitespace-nowrap">
                      {mk.label}
                    </th>
                  ))}
                  <th className="text-right text-xs font-medium text-gray-500 py-2 pl-3">Total</th>
                </tr>
              </thead>
              <tbody>
                {memberHeatRows.map((row) => (
                  <tr key={row.id} className="border-t border-gray-50">
                    <td className="py-1.5 pr-3 sticky left-0 bg-white">
                      <p className="font-medium text-gray-900 truncate max-w-[10rem]">{row.name}</p>
                      <p className="text-[10px] text-gray-400">{row.monthsPaid} paid</p>
                    </td>
                    {row.cells.map((cell) => (
                      <td key={cell.monthId} className="px-1 py-1.5 text-center">
                        <span
                          className={`inline-flex min-w-[3.25rem] justify-center rounded-md px-1.5 py-1 text-[10px] font-medium ${cellColor(cell.amount)}`}
                          title={cell.amount ? `${row.name} · ${cell.label}: ${moneyExact(cell.amount)}` : "No payment"}
                        >
                          {cell.amount ? money(cell.amount).replace("₦", "") : "—"}
                        </span>
                      </td>
                    ))}
                    <td className="text-right py-1.5 pl-3 font-semibold text-gray-900 whitespace-nowrap">
                      {money(row.total)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {months.length > 0 ? (
        <Card className="p-5 border-0 shadow-md">
          <h3 className="font-semibold text-gray-900 mb-3">Month snapshot table</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-500 border-b">
                  <th className="py-2 pr-3">Month</th>
                  <th className="py-2 pr-3">Raised</th>
                  <th className="py-2 pr-3">Commitments</th>
                  <th className="py-2 pr-3">Balance</th>
                  <th className="py-2 pr-3">Paid</th>
                  <th className="py-2 pr-3">Completion</th>
                  <th className="py-2">Channels</th>
                </tr>
              </thead>
              <tbody>
                {[...months].reverse().map((m) => (
                  <tr key={m.id} className="border-b border-gray-50">
                    <td className="py-2.5 pr-3 font-medium text-gray-900">{m.label}</td>
                    <td className="py-2.5 pr-3 text-red-700 font-semibold">{money(m.total_raised)}</td>
                    <td className="py-2.5 pr-3">{money(m.commitments_total)}</td>
                    <td className="py-2.5 pr-3 text-emerald-700">{money(m.balance)}</td>
                    <td className="py-2.5 pr-3">
                      {m.paid_roster_count}/{m.active_roster_count}
                    </td>
                    <td className="py-2.5 pr-3">{m.completion_pct}%</td>
                    <td className="py-2.5 text-xs text-gray-500">
                      Link {m.public_count} · Admin {m.admin_count}
                      {m.with_receipt_count ? ` · ${m.with_receipt_count} receipts` : ""}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ) : null}
    </div>
  );
}
