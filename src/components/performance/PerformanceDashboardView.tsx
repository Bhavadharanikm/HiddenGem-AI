"use client";

import dynamic from "next/dynamic";

const Chart = dynamic(() => import("react-apexcharts"), { ssr: false });

type Series = { name: string; data: number[] }[];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const chartBase = (type: string): ApexCharts.ApexOptions => ({
  chart: { type: type as any, toolbar: { show: false }, fontFamily: "inherit", animations: { enabled: false }, background: "transparent" },
  dataLabels: { enabled: false },
  grid: { show: false },
  tooltip: { theme: "light" },
  xaxis: { axisBorder: { show: false }, axisTicks: { show: false }, labels: { style: { fontSize: "11px", colors: "#94a3b8", fontWeight: "600" } } },
  yaxis: { labels: { style: { fontSize: "10px", colors: "#94a3b8" } } },
});

// ── data ──────────────────────────────────────────────────────────────────
const summaryStats = [
  { label: "Total Revenue", value: "$264.8K", note: "April 2026" },
  { label: "Direct Revenue", value: "$73.1K", note: "April 2026" },
  { label: "Direct Split", value: "28%", note: "April 2026" },
  { label: "New Leads", value: "196", note: "As of April 2026" },
  { label: "New Followers", value: "615", note: "April 2026" },
  { label: "Views", value: "318.6K", note: "April 2026" },
];

const funnelRows = [
  { label: "Content Views", value: "318.6K", width: "100%", color: "bg-[#f5a332]" },
  { label: "Total Followers", value: "7.4K", width: "78%", color: "bg-[#4b8df1]" },
  { label: "Sessions", value: "4.3K", width: "55%", color: "bg-[#75c3f7]" },
  { label: "New Leads", value: "196", width: "34%", color: "bg-[#63d26d]" },
  { label: "Revenue", value: "$73.1K", width: "14%", color: "bg-[#b260f4]" },
];

const takeaways = [
  "April 2026 delivered the strongest visibility with 318,640 total views.",
  "Social following grew from 6,280 to 7,410, adding 1,130 net new followers.",
  "The selected range generated 465 new leads with an average cost per lead of $18.77.",
  "Website traffic totaled 11,063 sessions while ad spend reached $8,802.",
  "Direct booking revenue totaled $179,220, representing a 27% direct split.",
  "April 2026 was the top revenue month at $264,780.",
];

const audienceCards = [
  { label: "Total Followers", sub: "(April 2026)", value: "7,410", badge: "▲ 18%", footerA: "Started", footerB: "Net New", valueA: "6,280", valueB: "+1,130", badgeColor: "text-[#2563eb] bg-[rgba(37,99,235,0.12)]" },
  { label: "Instagram", sub: "(April 2026)", value: "4,890", badge: "▲ 16%", footerA: "Start", footerB: "Net New", valueA: "4,200", valueB: "+690", badgeColor: "text-[#7c3aed] bg-[rgba(124,58,237,0.12)]" },
  { label: "Facebook", sub: "(April 2026)", value: "2,230", badge: "▲ 17%", footerA: "Start", footerB: "Net New", valueA: "1,900", valueB: "+330", badgeColor: "text-[#2563eb] bg-[rgba(37,99,235,0.12)]" },
  { label: "TikTok", sub: "(April 2026)", value: "290", badge: "▲ 61%", footerA: "Started", footerB: "Net New", valueA: "180", valueB: "+110", badgeColor: "text-[#14b8a6] bg-[rgba(20,184,166,0.12)]" },
];

const leadCards = [
  { label: "New Leads", value: "465", note: "↑ 20% growth" },
  { label: "Total Pipeline", value: "1189", note: "April 2026 pipeline total" },
  { label: "Current Lead", value: "196", note: "▲ 69%" },
];

const revenueCards = [
  { label: "Total Booking Revenue", value: "$675.5K", badge: "Period total", leftLabel: "Period Avg", leftValue: "$225.2K", rightLabel: "Current Month", rightValue: "$264.8K" },
  { label: "Direct Booking Revenue", value: "$179.2K", badge: "27% direct split", leftLabel: "Period Share", leftValue: "27%", rightLabel: "Current Month", rightValue: "$73.1K" },
  { label: "Direct Split Avg", value: "26%", badge: "Apr peak 28%", leftLabel: "Direct Revenue", leftValue: "$179.2K", rightLabel: "Current Month", rightValue: "28%" },
];

// ── reusable UI ────────────────────────────────────────────────────────────
function SectionRail({ number, title, accent }: { number: string; title: string; accent: string }) {
  return (
    <div className="mb-4 flex items-center gap-3">
      <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">{number}</span>
      <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">{title}</span>
      <div className="h-px flex-1 bg-[rgba(211,223,244,0.92)]" />
      <div className={`h-1 w-6 rounded-full ${accent}`} />
    </div>
  );
}

function Surface({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-[22px] border border-[#dbe6f3] bg-white shadow-[0_8px_22px_rgba(15,23,42,0.04)] ${className}`}>
      {children}
    </div>
  );
}

// ── chart helpers ──────────────────────────────────────────────────────────
function BarChart({ series, categories, colors, height = 160, yFormatter }: {
  series: Series;
  categories: string[];
  colors: string[];
  height?: number;
  yFormatter?: (v: number) => string;
}) {
  const options: ApexCharts.ApexOptions = {
    ...chartBase("bar"),
    plotOptions: { bar: { borderRadius: 6, borderRadiusApplication: "end", columnWidth: "52%" } },
    colors,
    xaxis: { ...(chartBase("bar").xaxis as object), categories },
    yaxis: { labels: { style: { fontSize: "10px", colors: "#94a3b8" }, formatter: yFormatter ?? ((v) => String(v)) } },
    legend: { show: false },
  };
  return <Chart type="bar" options={options} series={series} height={height} width="100%" />;
}

function LineAreaChart({ series, categories, colors, height = 160, yFormatter, curve = "smooth", markers = true }: {
  series: Series;
  categories: string[];
  colors: string[];
  height?: number;
  yFormatter?: (v: number) => string;
  curve?: "smooth" | "straight" | "stepline";
  markers?: boolean;
}) {
  const options: ApexCharts.ApexOptions = {
    ...chartBase("line"),
    stroke: { curve, width: 2.5 },
    markers: { size: markers ? 4 : 0, strokeWidth: 0, hover: { size: markers ? 6 : 0 } },
    colors,
    xaxis: { ...(chartBase("line").xaxis as object), categories },
    yaxis: { labels: { style: { fontSize: "10px", colors: "#94a3b8" }, formatter: yFormatter ?? ((v) => String(v)) } },
    legend: { show: false },
  };
  return <Chart type="line" options={options} series={series} height={height} width="100%" />;
}

function DonutChart({ series, labels, colors, height = 220 }: {
  series: number[];
  labels: string[];
  colors: string[];
  height?: number;
}) {
  const options: ApexCharts.ApexOptions = {
    ...chartBase("donut"),
    colors,
    labels,
    plotOptions: { pie: { donut: { size: "62%", labels: { show: true, total: { show: true, label: "Apr Followers", fontSize: "11px", color: "#64748b", formatter: () => "7,410" } } } } },
    legend: { show: false },
    dataLabels: { enabled: false },
  };
  return <Chart type="donut" options={options} series={series} height={height} width="100%" />;
}

// ── page ───────────────────────────────────────────────────────────────────
export default function PerformanceDashboardView({ clientName }: { clientName: string }) {
  const months3 = ["Feb '26", "Mar '26", "Apr '26"];
  const months4 = ["Jan '26", "Feb '26", "Mar '26", "Apr '26"];
  const kFmt = (v: number) => v >= 1000 ? (v / 1000).toFixed(1) + "K" : String(v);
  const $kFmt = (v: number) => "$" + (v >= 1000 ? Math.round(v / 1000) + "K" : String(v));
  const pctFmt = (v: number) => v + "%";

  return (
    <div
      className="relative min-h-full overflow-y-auto"
      style={{
        background: `
          radial-gradient(circle at top right, rgba(41, 151, 255, 0.12), transparent 32%),
          radial-gradient(circle at bottom left, rgba(191, 90, 242, 0.09), transparent 28%),
          radial-gradient(circle at 72% 76%, rgba(255, 159, 10, 0.07), transparent 24%),
          #eef4fd
        `,
      }}
    >

      <div className="relative z-10 mx-auto max-w-[1500px] px-[72px] py-8">

        {/* Header */}
        <header className="mb-8 text-center">
          <div className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-[rgba(255,159,10,0.3)] bg-[rgba(255,159,10,0.1)] px-3 py-1 text-[11px] font-semibold text-[#d97706]">
            <span className="h-1.5 w-1.5 rounded-full bg-[#d97706]" />
            Sample data — connect your accounts in Settings
          </div>
          <h1 className="text-[clamp(1.8rem,3vw,2.8rem)] font-semibold tracking-[-0.05em] text-slate-900">HGM Client</h1>
          <div className="mt-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#2997ff]">Social • February 2026 – April 2026</div>
          <div className="mt-1.5 text-[12px] text-slate-500">Performance Overview</div>
        </header>

        {/* Summary strip */}
        <Surface className="mb-8 overflow-hidden">
          <div className="grid md:grid-cols-2 xl:grid-cols-6">
            {summaryStats.map((item, index) => (
              <div key={item.label} className={`px-5 py-5 text-center ${index > 0 ? "border-t border-[rgba(226,232,240,0.92)] xl:border-l xl:border-t-0 md:[&:nth-child(n+3)]:border-t" : ""}`}>
                <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">{item.label}</div>
                <div className="mt-2 text-[15px] font-semibold text-slate-900">{item.value}</div>
                <div className="mt-1 text-[11px] font-medium text-slate-500">{item.note}</div>
              </div>
            ))}
          </div>
        </Surface>

        {/* 01 Funnel */}
        <section className="mb-6">
          <SectionRail number="01" title="Full Funnel Summary" accent="bg-[#4b8df1]" />
          <div className="grid gap-4 xl:grid-cols-[1.08fr_1fr]">
            <Surface className="p-3">
              <h2 className="text-[13px] font-semibold text-slate-900">Conversion Funnel</h2>
              <div className="mt-4 space-y-3">
                {funnelRows.map((row, index) => (
                  <div key={row.label}>
                    <div className="grid items-center gap-3 md:grid-cols-[130px_1fr_72px]">
                      <div className="text-right text-[12px] font-semibold text-slate-500">{row.label}</div>
                      <div className="h-2.5 overflow-hidden rounded-full bg-slate-200/60">
                        <div className={`h-full rounded-full ${row.color}`} style={{ width: row.width }} />
                      </div>
                      <div className={`text-right text-[13px] font-semibold ${index === funnelRows.length - 1 ? "text-[#63d26d]" : "text-slate-500"}`}>{row.value}</div>
                    </div>
                    {index < funnelRows.length - 1 && (
                      <div className="pt-1.5 text-center text-[10px] font-semibold text-slate-400">
                        {index === 0 ? "↓ 2.3% to followers" : index === 1 ? "↓ 57.9% to website sessions" : index === 2 ? "↓ 4.6% to leads" : "↓ revenue"}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </Surface>
            <div className="rounded-[22px] border border-[rgba(207,220,247,0.9)] bg-[rgba(231,238,255,0.62)] p-5 shadow-[0_8px_22px_rgba(15,23,42,0.04)]">
              <h2 className="text-[13px] font-semibold text-slate-900">Key Takeaways</h2>
              <div className="mt-3">
                {takeaways.map((item) => (
                  <div key={item} className="border-b border-[rgba(211,223,244,0.92)] py-2.5 text-[12px] leading-5 text-slate-500 last:border-b-0">{item}</div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* 02 Awareness */}
        <section className="mb-6">
          <SectionRail number="02" title="Awareness" accent="bg-[#f5a332]" />
          {/* Shell: hero left + side stack right */}
          <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1.6fr)_minmax(260px,0.75fr)]">
            {/* Hero tile */}
            <Surface className="p-3">
              <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Total Content Views</div>
              <div className="mt-2 text-[4.5rem] font-bold leading-none tracking-[-0.05em] text-slate-900">318.6K</div>
              <div className="mt-2 text-[13px] text-slate-500">Across all platforms, April 2026</div>
              {/* Thin platform bars */}
              <div className="mt-6 space-y-4">
                {[
                  { label: "Instagram", pct: 54, color: "#7c3aed" },
                  { label: "Facebook", pct: 43, color: "#f5a332" },
                  { label: "TikTok", pct: 3, color: "#14b8a6" },
                ].map((p) => (
                  <div key={p.label}>
                    <div className="mb-1.5 flex items-center justify-between">
                      <span className="text-[12px] text-slate-500">{p.label}</span>
                      <span className="text-[12px] text-slate-400">{p.pct}%</span>
                    </div>
                    <div className="h-[2px] overflow-hidden rounded-full bg-[#e8eef6]">
                      <div className="h-full rounded-full" style={{ width: `${p.pct}%`, backgroundColor: p.color }} />
                    </div>
                  </div>
                ))}
              </div>
              {/* Bottom badge */}
              <div className="mt-6 flex items-center gap-3">
                <span className="inline-flex rounded-full bg-[rgba(245,163,50,0.14)] px-3 py-1 text-[11px] font-semibold text-[#f5a332]">
                  Apr current 318.6K
                </span>
                <span className="text-[12px] text-slate-400">Current month visibility</span>
              </div>
            </Surface>
            {/* Side cards */}
            <div className="space-y-3">
              <Surface className="p-3">
                <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">IG Views</div>
                <div className="mt-2 text-[15px] font-bold text-slate-900">171,320</div>
                <span className="mt-2 inline-flex rounded-full bg-[rgba(124,58,237,0.10)] px-2.5 py-1 text-[11px] font-semibold text-[#7c3aed]">54% of total</span>
              </Surface>
              <Surface className="p-3">
                <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">FB Views</div>
                <div className="mt-2 text-[15px] font-bold text-slate-900">136,420</div>
                <span className="mt-2 inline-flex rounded-full bg-[rgba(245,163,50,0.14)] px-2.5 py-1 text-[11px] font-semibold text-[#f5a332]">43% of total</span>
              </Surface>
              <Surface className="p-3">
                <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">TikTok Views</div>
                <div className="mt-2 text-[15px] font-bold text-slate-900">10,900</div>
                <div className="mt-2 text-[12px] text-slate-400">April 2026 current</div>
              </Surface>
            </div>
          </div>
          {/* Full-width chart below */}
          <Surface className="mt-4 p-5">
            <div className="text-[13px] font-semibold text-slate-900">Monthly Content Views</div>
            <div className="text-[11px] text-slate-500">Platform breakdown · Apr 2026</div>
            <BarChart
              series={[
                { name: "Instagram", data: [195000, 148000, 171320] },
                { name: "Facebook", data: [158000, 124000, 136420] },
                { name: "TikTok", data: [8200, 9400, 10900] },
              ]}
              categories={months3}
              colors={["#7c3aed", "#f5a332", "#14b8a6"]}
              yFormatter={(v) => v >= 1000 ? Math.round(v / 1000) + "K" : String(v)}
              height={200}
            />
            <div className="mt-2 flex flex-wrap gap-4 text-[11px] font-semibold text-slate-500">
              <span className="inline-flex items-center gap-1.5"><span className="h-3 w-3 rounded-sm bg-[#7c3aed]" />Instagram</span>
              <span className="inline-flex items-center gap-1.5"><span className="h-3 w-3 rounded-sm bg-[#f5a332]" />Facebook</span>
              <span className="inline-flex items-center gap-1.5"><span className="h-3 w-3 rounded-sm bg-[#14b8a6]" />TikTok</span>
            </div>
          </Surface>
        </section>

        {/* 03 Audience */}
        <section className="mb-6">
          <SectionRail number="03" title="Audience" accent="bg-[#4b8df1]" />
          <div className="grid gap-3 xl:grid-cols-4">
            {audienceCards.map((item) => (
              <Surface key={item.label} className="min-h-[178px] p-5">
                <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">{item.label}</div>
                <div className="text-[11px] font-medium text-slate-400">{item.sub}</div>
                <div className="mt-3 text-[20px] font-semibold tracking-[-0.04em] text-slate-900">{item.value}</div>
                <span className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${item.badgeColor}`}>{item.badge}</span>
                <div className="my-3 h-px bg-[rgba(226,232,240,0.92)]" />
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <div className="text-[11px] font-semibold text-slate-400">{item.footerA}</div>
                    <div className="mt-1 text-[13px] font-semibold text-slate-500">{item.valueA}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-[11px] font-semibold text-slate-400">{item.footerB}</div>
                    <div className="mt-1 text-[13px] font-semibold text-[#63d26d]">{item.valueB}</div>
                  </div>
                </div>
              </Surface>
            ))}
          </div>
          <div className="mt-3 grid gap-3 xl:grid-cols-2">
            <Surface className="p-3">
              <div className="text-[13px] font-semibold text-slate-900">Follower Growth</div>
              <div className="text-[11px] text-slate-500">Monthly cumulative · all platforms</div>
              <BarChart
                series={[
                  { name: "Instagram", data: [5100, 5500, 4890] },
                  { name: "Facebook", data: [1900, 2060, 2230] },
                  { name: "TikTok", data: [180, 235, 290] },
                ]}
                categories={months3}
                colors={["#355de1", "#f1b34d", "#5abf84"]}
                yFormatter={kFmt}
              />
              <div className="mt-2 flex flex-wrap gap-4 text-[11px] font-semibold text-slate-500">
                <span className="inline-flex items-center gap-1.5"><span className="h-3 w-3 rounded-sm bg-[#355de1]" />Instagram</span>
                <span className="inline-flex items-center gap-1.5"><span className="h-3 w-3 rounded-sm bg-[#f1b34d]" />Facebook</span>
                <span className="inline-flex items-center gap-1.5"><span className="h-3 w-3 rounded-sm bg-[#5abf84]" />TikTok</span>
              </div>
            </Surface>
            <Surface className="p-3">
              <div className="text-[13px] font-semibold text-slate-900">Platform Distribution</div>
              <div className="text-[11px] text-slate-500">April 2026 snapshot</div>
              <DonutChart
                series={[4890, 2230, 290]}
                labels={["Instagram", "Facebook", "TikTok"]}
                colors={["#355de1", "#f1b34d", "#5abf84"]}
              />
              <div className="flex flex-wrap justify-center gap-4 text-[11px] font-semibold text-slate-500">
                <span className="inline-flex items-center gap-1.5"><span className="h-3 w-3 rounded-full bg-[#355de1]" />Instagram</span>
                <span className="inline-flex items-center gap-1.5"><span className="h-3 w-3 rounded-full bg-[#f1b34d]" />Facebook</span>
                <span className="inline-flex items-center gap-1.5"><span className="h-3 w-3 rounded-full bg-[#5abf84]" />TikTok</span>
              </div>
            </Surface>
          </div>
        </section>

        {/* 04 Lead Generation */}
        <section className="mb-6">
          <SectionRail number="04" title="Lead Generation" accent="bg-[#63d26d]" />
          <div className="grid gap-3 xl:grid-cols-3">
            {leadCards.map((item) => (
              <Surface key={item.label} className="p-3">
                <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">{item.label}</div>
                <div className="mt-2 text-[20px] font-semibold tracking-[-0.04em] text-slate-900">{item.value}</div>
                <div className="mt-2 inline-flex rounded-full bg-[rgba(99,210,109,0.16)] px-2.5 py-1 text-[11px] font-semibold text-[#63d26d]">{item.note}</div>
              </Surface>
            ))}
          </div>
          <div className="mt-3 grid gap-3 xl:grid-cols-2">
            <Surface className="p-3">
              <div className="text-[13px] font-semibold text-slate-900">New Leads per Month</div>
              <div className="text-[11px] text-slate-500">April 2026 peak · 196 leads</div>
              <BarChart
                series={[{ name: "New Leads", data: [100, 169, 196] }]}
                categories={months3}
                colors={["#f1b34d"]}
              />
            </Surface>
            <Surface className="p-3">
              <div className="text-[13px] font-semibold text-slate-900">Pipeline Growth</div>
              <div className="text-[11px] text-slate-500">Cumulative leads · 840 → 1,189</div>
              <LineAreaChart
                series={[{ name: "Pipeline", data: [840, 993, 1189] }]}
                categories={months3}
                colors={["#56b983"]}
              />
            </Surface>
          </div>
        </section>

        {/* 05 Website Traffic */}
        <section className="mb-6">
          <SectionRail number="05" title="Website Traffic" accent="bg-[#75c3f7]" />
          <div className="grid gap-3 xl:grid-cols-[minmax(260px,0.64fr)_minmax(0,1.36fr)]">
            <div className="space-y-3">
              <Surface className="p-3">
                <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#2563eb]">Total Sessions</div>
                <div className="mt-2 text-[20px] font-semibold tracking-[-0.04em] text-slate-900">11.1K</div>
                <div className="mt-1.5 text-[11px] font-medium text-slate-400">Selected-month range total</div>
              </Surface>
              <Surface className="p-3">
                <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#16a34a]">Apr 2026 Peak</div>
                <div className="mt-2 text-[20px] font-semibold tracking-[-0.04em] text-slate-900">4,288</div>
                <div className="mt-2 inline-flex rounded-full bg-[rgba(99,210,109,0.16)] px-2.5 py-1 text-[11px] font-semibold text-[#63d26d]">Highest month</div>
              </Surface>
              <Surface className="p-3">
                <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#7c3aed]">Total Ad Spend</div>
                <div className="mt-2 text-[20px] font-semibold tracking-[-0.04em] text-slate-900">$8,802</div>
                <div className="mt-1.5 text-[11px] font-medium text-slate-400">Full selected period</div>
              </Surface>
            </div>
            <Surface className="p-3">
              <div className="text-[13px] font-semibold text-slate-900">Traffic Trend</div>
              <div className="text-[11px] text-slate-500">Monthly sessions · peaking Apr 2026</div>
              <LineAreaChart
                series={[{ name: "Sessions", data: [3100, 3712, 4288] }]}
                categories={months3}
                colors={["#416be7"]}
                height={180}
                yFormatter={kFmt}
              />
            </Surface>
          </div>
        </section>

        {/* 06 Revenue */}
        <section>
          <SectionRail number="06" title="Revenue & Bookings" accent="bg-[#b260f4]" />
          <div className="grid gap-3 xl:grid-cols-3">
            {revenueCards.map((item) => (
              <Surface key={item.label} className="p-3">
                <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">{item.label}</div>
                <div className="mt-2 text-[20px] font-semibold tracking-[-0.04em] text-slate-900">{item.value}</div>
                <div className="mt-2 inline-flex rounded-full bg-[rgba(99,210,109,0.16)] px-2.5 py-1 text-[11px] font-semibold text-[#63d26d]">{item.badge}</div>
                <div className="my-3 h-px bg-[rgba(226,232,240,0.92)]" />
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <div className="text-[11px] font-semibold text-slate-400">{item.leftLabel}</div>
                    <div className="mt-1 text-[13px] font-semibold text-slate-500">{item.leftValue}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-[11px] font-semibold text-slate-400">{item.rightLabel}</div>
                    <div className="mt-1 text-[13px] font-semibold text-slate-500">{item.rightValue}</div>
                  </div>
                </div>
              </Surface>
            ))}
          </div>
          <div className="mt-3 grid gap-3 xl:grid-cols-2">
            <Surface className="p-3">
              <div className="text-[13px] font-semibold text-slate-900">Total vs Direct Revenue</div>
              <div className="text-[11px] text-slate-500">Feb – Apr 2026</div>
              <LineAreaChart
                series={[
                  { name: "Total Revenue", data: [180000, 230000, 264800] },
                  { name: "Direct Revenue", data: [45000, 61100, 73100] },
                ]}
                categories={months3}
                colors={["#416be7", "#8a56f0"]}
                yFormatter={$kFmt}
              />
              <div className="mt-2 flex flex-wrap gap-4 text-[11px] font-semibold text-slate-500">
                <span className="inline-flex items-center gap-1.5"><span className="h-3 w-3 rounded-full bg-[#416be7]" />Total Revenue</span>
                <span className="inline-flex items-center gap-1.5"><span className="h-3 w-3 rounded-full bg-[#8a56f0]" />Direct Revenue</span>
              </div>
            </Surface>
            <Surface className="p-3">
              <div className="text-[13px] font-semibold text-slate-900">Direct Booking Split</div>
              <div className="text-[11px] text-slate-500">Monthly % · direct bookings</div>
              <BarChart
                series={[{ name: "Direct %", data: [24, 26, 28] }]}
                categories={months3}
                colors={["#5a78df"]}
                yFormatter={pctFmt}
              />
            </Surface>
          </div>
          <Surface className="mt-3 p-5">
            <div className="text-[13px] font-semibold text-slate-900">Monthly Revenue Performance</div>
            <div className="text-[11px] text-slate-500">Total, direct booking, and last year&apos;s revenue across all available months</div>
            <LineAreaChart
              series={[
                { name: "Total Revenue", data: [150000, 180000, 230000, 264800] },
                { name: "Direct Revenue", data: [38000, 45000, 61100, 73100] },
                { name: "LY Revenue", data: [140000, 165000, 200000, 230000] },
              ]}
              categories={months4}
              colors={["#416be7", "#8a56f0", "#b7bdc9"]}
              height={180}
              yFormatter={$kFmt}
            />
            <div className="mt-2 flex flex-wrap justify-center gap-4 text-[11px] font-semibold text-slate-500">
              <span className="inline-flex items-center gap-1.5"><span className="h-3 w-3 rounded-full bg-[#416be7]" />Total Revenue</span>
              <span className="inline-flex items-center gap-1.5"><span className="h-3 w-3 rounded-full bg-[#8a56f0]" />Direct Booking Revenue</span>
              <span className="inline-flex items-center gap-1.5"><span className="h-3 w-3 rounded-full bg-[#b7bdc9]" />LY Revenue</span>
            </div>
          </Surface>
        </section>

        <div className="mt-8 text-center text-[11px] text-slate-400">Performance dashboard for {clientName}</div>
      </div>
    </div>
  );
}
