"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";

const Chart = dynamic(() => import("react-apexcharts"), { ssr: false });

type Series = { name: string; data: number[] }[];

const chartBase = (
  type: NonNullable<ApexCharts.ApexChart["type"]>
): ApexCharts.ApexOptions => ({
  chart: {
    type,
    toolbar: { show: false },
    fontFamily: "inherit",
    animations: { enabled: false },
    background: "transparent",
  },
  dataLabels: { enabled: false },
  grid: {
    show: true,
    borderColor: "#e2e8f0",
    strokeDashArray: 0,
    xaxis: { lines: { show: false } },
    yaxis: { lines: { show: true } },
    padding: { left: 10, right: 14, top: 8, bottom: 0 },
  },
  tooltip: { theme: "light" },
  xaxis: {
    axisBorder: { show: true, color: "#e2e8f0" },
    axisTicks: { show: true, color: "#e2e8f0" },
    labels: {
      style: { fontSize: "12px", colors: "#64748b", fontWeight: "700" },
      offsetY: 6,
    },
  },
  yaxis: {
    labels: {
      style: { fontSize: "12px", colors: "#94a3b8", fontWeight: "700" },
    },
  },
});

const revenueAxisLabel = {
  fontSize: "12px",
  colors: "#94a3b8",
  fontWeight: 700,
} as const;

const CHART_BLUE = "#2f66e5";
const CHART_BLUE_DARK = "#2558cf";

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
  { label: "Total Followers", value: "7.4K", width: "78%", color: "bg-[#2f66e5]" },
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
      <span className="text-[12px] font-semibold uppercase tracking-[0.14em] text-slate-500">{number}</span>
      <span className="text-[12px] font-semibold uppercase tracking-[0.14em] text-slate-500">{title}</span>
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
    plotOptions: { bar: { borderRadius: 8, borderRadiusApplication: "end", columnWidth: "58%" } },
    colors,
    xaxis: { ...(chartBase("bar").xaxis as object), categories },
    yaxis: {
      labels: {
        style: { fontSize: "12px", colors: "#94a3b8", fontWeight: "700" },
        formatter: yFormatter ?? ((v) => String(v)),
      },
    },
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
    stroke: { curve, width: 3.25, lineCap: "round" },
    markers: {
      size: markers ? 4.5 : 0,
      strokeWidth: 3,
      strokeColors: "#ffffff",
      hover: { size: markers ? 6 : 0 },
    },
    colors,
    xaxis: { ...(chartBase("line").xaxis as object), categories },
    yaxis: {
      labels: {
        style: { fontSize: "12px", colors: "#94a3b8", fontWeight: "700" },
        formatter: yFormatter ?? ((v) => String(v)),
      },
    },
    legend: { show: false },
  };
  return <Chart type="line" options={options} series={series} height={height} width="100%" />;
}

function TrafficTrendChart() {
  const options: ApexCharts.ApexOptions = {
    chart: {
      type: "line",
      toolbar: { show: false },
      fontFamily: "inherit",
      animations: { enabled: false },
      background: "transparent",
    },
    dataLabels: { enabled: false },
    stroke: {
      curve: "smooth",
      width: 4,
      lineCap: "round",
    },
    colors: [CHART_BLUE],
    markers: {
      size: 5.5,
      strokeWidth: 3,
      strokeColors: "#ffffff",
      hover: { size: 6.5 },
    },
    grid: {
      show: true,
      borderColor: "#e2e8f0",
      strokeDashArray: 0,
      xaxis: { lines: { show: false } },
      yaxis: { lines: { show: true } },
      padding: { left: 10, right: 12, top: 6, bottom: 0 },
    },
    legend: { show: false },
    tooltip: { theme: "light" },
    xaxis: {
      categories: ["Feb '26", "Mar '26", "Apr '26"],
      axisBorder: { show: true, color: "#e2e8f0" },
      axisTicks: { show: true, color: "#e2e8f0" },
      labels: {
        style: {
          fontSize: "12px",
          colors: "#64748b",
          fontWeight: 700,
        },
        offsetY: 6,
      },
    },
    yaxis: {
      min: 3000,
      max: 4400,
      tickAmount: 7,
      labels: {
        style: {
          fontSize: "12px",
          colors: "#94a3b8",
          fontWeight: 700,
        },
        formatter: (value) => `${(value / 1000).toFixed(1)}K`,
      },
    },
  };

  return (
    <Chart
      type="line"
      options={options}
      series={[{ name: "Sessions", data: [3100, 3660, 4288] }]}
      height={250}
      width="100%"
    />
  );
}

function RevenueComparisonChart() {
  const options: ApexCharts.ApexOptions = {
    chart: {
      type: "line",
      toolbar: { show: false },
      fontFamily: "inherit",
      animations: { enabled: false },
      background: "transparent",
    },
    dataLabels: { enabled: false },
    stroke: {
      curve: "smooth",
      width: [3.5, 3.5],
      dashArray: [0, 8],
      lineCap: "round",
    },
    colors: [CHART_BLUE, "#7c4df3"],
    markers: {
      size: 5,
      strokeWidth: 3,
      strokeColors: "#ffffff",
      hover: { size: 6 },
    },
    grid: {
      show: true,
      borderColor: "#e2e8f0",
      strokeDashArray: 0,
      xaxis: { lines: { show: false } },
      yaxis: { lines: { show: true } },
      padding: { left: 14, right: 18, top: 10, bottom: 0 },
    },
    legend: { show: false },
    tooltip: { theme: "light" },
    xaxis: {
      categories: ["Feb 2026", "Mar 2026", "Apr 2026"],
      axisBorder: { show: true, color: "#e2e8f0" },
      axisTicks: { show: true, color: "#e2e8f0" },
      labels: {
        style: {
          fontSize: "12px",
          colors: "#64748b",
          fontWeight: 700,
        },
        offsetY: 6,
      },
    },
    yaxis: {
      min: 0,
      max: 300000,
      tickAmount: 3,
      labels: {
        style: revenueAxisLabel,
        formatter: (value) => {
          if (value === 0) return "$0";
          return `$${Math.round(value / 1000)}K`;
        },
      },
    },
    series: [
      { name: "Total Revenue", data: [180000, 230000, 264800] },
      { name: "Direct Revenue", data: [45000, 61100, 73100] },
    ],
  };

  return <Chart type="line" options={options} series={options.series ?? []} height={250} width="100%" />;
}

function RevenueSplitChart() {
  const options: ApexCharts.ApexOptions = {
    chart: {
      type: "bar",
      toolbar: { show: false },
      fontFamily: "inherit",
      animations: { enabled: false },
      background: "transparent",
    },
    dataLabels: { enabled: false },
    colors: [CHART_BLUE],
    plotOptions: {
      bar: {
        borderRadius: 8,
        borderRadiusApplication: "end",
        columnWidth: "44%",
      },
    },
    grid: {
      show: true,
      borderColor: "#e2e8f0",
      strokeDashArray: 0,
      xaxis: { lines: { show: false } },
      yaxis: { lines: { show: true } },
      padding: { left: 16, right: 24, top: 8, bottom: 4 },
    },
    legend: { show: false },
    tooltip: { theme: "light" },
    xaxis: {
      categories: ["Feb '26", "Mar '26", "Apr '26"],
      axisBorder: { show: true, color: "#e2e8f0" },
      axisTicks: { show: true, color: "#e2e8f0" },
      labels: {
        style: {
          fontSize: "12px",
          colors: "#64748b",
          fontWeight: 700,
        },
        offsetY: 6,
      },
    },
    yaxis: {
      min: 0,
      max: 30,
      tickAmount: 3,
      labels: {
        style: revenueAxisLabel,
        formatter: (value) => `${Math.round(value)}%`,
      },
    },
  };

  return (
    <Chart
      type="bar"
      options={options}
      series={[{ name: "Direct %", data: [24, 26, 28] }]}
      height={250}
      width="100%"
    />
  );
}

function MonthlyRevenuePerformanceChart() {
  const options: ApexCharts.ApexOptions = {
    chart: {
      type: "line",
      toolbar: { show: false },
      fontFamily: "inherit",
      animations: { enabled: false },
      background: "transparent",
    },
    dataLabels: { enabled: false },
    stroke: {
      curve: "smooth",
      width: [3.5, 3.5, 3],
      dashArray: [0, 0, 8],
      lineCap: "round",
    },
    colors: [CHART_BLUE, "#8a56f0", "#b7bdc9"],
    markers: {
      size: 4,
      strokeWidth: 3,
      strokeColors: "#ffffff",
      hover: { size: 5 },
    },
    grid: {
      show: true,
      borderColor: "#e2e8f0",
      strokeDashArray: 0,
      xaxis: { lines: { show: false } },
      yaxis: { lines: { show: true } },
      padding: { left: 14, right: 18, top: 8, bottom: 0 },
    },
    legend: { show: false },
    tooltip: { theme: "light" },
    xaxis: {
      categories: ["Jan 2026", "Feb 2026", "Mar 2026", "Apr 2026"],
      axisBorder: { show: true, color: "#e2e8f0" },
      axisTicks: { show: true, color: "#e2e8f0" },
      labels: {
        style: {
          fontSize: "12px",
          colors: "#64748b",
          fontWeight: 700,
        },
        offsetY: 6,
      },
    },
    yaxis: {
      min: 0,
      max: 300000,
      tickAmount: 4,
      labels: {
        style: revenueAxisLabel,
        formatter: (value) => {
          if (value === 0) return "$0";
          return `$${Math.round(value / 1000)}K`;
        },
      },
    },
  };

  return (
    <Chart
      type="line"
      options={options}
      series={[
        { name: "Total Revenue", data: [150000, 180000, 230000, 264800] },
        { name: "Direct Revenue", data: [38000, 45000, 61100, 73100] },
        { name: "LY Revenue", data: [140000, 165000, 200000, 230000] },
      ]}
      height={260}
      width="100%"
    />
  );
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
    stroke: { colors: ["#ffffff"], width: 5 },
    plotOptions: {
      pie: {
        donut: {
          size: "70%",
          labels: {
            show: true,
            value: {
              show: true,
              fontSize: "30px",
              fontWeight: "700",
              color: "#0f172a",
              offsetY: 10,
            },
            total: {
              show: true,
              label: "Apr Followers",
              fontSize: "16px",
              fontWeight: "700",
              color: "#64748b",
              formatter: () => "7,410",
            },
          },
        },
      },
    },
    legend: { show: false },
    dataLabels: { enabled: false },
  };
  return <Chart type="donut" options={options} series={series} height={height} width="100%" />;
}

// ── page ───────────────────────────────────────────────────────────────────
export default function PerformanceDashboardView({ clientName }: { clientName: string }) {
  const months3 = ["Feb '26", "Mar '26", "Apr '26"];
  const monthOptions = ["All", "February 2026", "March 2026", "April 2026"];
  const kFmt = (v: number) => v >= 1000 ? (v / 1000).toFixed(1) + "K" : String(v);
  const [selectedMonth, setSelectedMonth] = useState("All");
  void clientName;

  const comparisonLabel = useMemo(() => {
    if (selectedMonth === "February 2026") return "December 2025 - February 2026";
    if (selectedMonth === "March 2026") return "January 2026 - March 2026";
    if (selectedMonth === "April 2026") return "February 2026 - April 2026";
    return "February 2026 - April 2026";
  }, [selectedMonth]);

  return (
    <div
      className="relative min-h-full overflow-y-auto"
      style={{
        background: `
          radial-gradient(circle at top right, rgba(47, 102, 229, 0.12), transparent 32%),
          radial-gradient(circle at bottom left, rgba(191, 90, 242, 0.09), transparent 28%),
          radial-gradient(circle at 72% 76%, rgba(255, 159, 10, 0.07), transparent 24%),
          #eef4fd
        `,
      }}
    >

      <div className="relative z-10 mx-auto max-w-[1420px] px-[38px] pb-24 pt-6 sm:px-[48px] lg:px-[72px] xl:px-[88px]">
        <header className="mb-8 pt-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <h1 className="text-[28px] font-semibold tracking-[-0.04em] text-slate-900 sm:text-[34px]">
                Performance Report
              </h1>
              <div className="mt-2">
                <span className="inline-flex items-center rounded-full bg-[rgba(47,102,229,0.1)] px-3 py-1 text-[13px] font-semibold tracking-[-0.01em] text-[var(--brand)]">
                  {comparisonLabel}
                </span>
              </div>
            </div>

            <div className="flex flex-col items-start gap-1 sm:items-end">
              <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                Month
              </span>
              <select
                value={selectedMonth}
                onChange={(event) => setSelectedMonth(event.target.value)}
                className="min-w-[180px] rounded-full border border-[rgba(47,102,229,0.16)] bg-white px-4 py-2.5 text-[13px] font-semibold text-slate-700 outline-none transition focus:border-[var(--brand)]"
              >
                {monthOptions.map((month) => (
                  <option key={month} value={month}>
                    {month}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </header>

        <Surface className="mb-10 overflow-hidden rounded-[32px] border-[rgba(211,223,244,0.92)] shadow-[0_10px_24px_rgba(15,23,42,0.04)]">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            {summaryStats.map((item, index) => (
              <div
                key={item.label}
                className={`flex min-h-[136px] flex-col justify-center px-5 py-6 text-center ${
                  index > 0 ? "border-t border-[rgba(211,223,244,0.92)] xl:border-l xl:border-t-0 md:[&:nth-child(n+3)]:border-t" : ""
                }`}
              >
                <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">{item.label}</div>
                <div className="mt-4 text-[clamp(28px,2.1vw,42px)] font-semibold leading-none tracking-[-0.03em] text-slate-900">{item.value}</div>
                <div className="mt-4 text-[12px] font-medium tracking-[-0.01em] text-slate-500">{item.note}</div>
              </div>
            ))}
          </div>
        </Surface>

        <section className="mb-8">
          <SectionRail number="01" title="Full Funnel Summary" accent="bg-[#2f66e5]" />
          <div className="grid gap-3 lg:grid-cols-2">
            <Surface className="rounded-[28px] px-9 pb-9 pt-9">
              <h2 className="text-[22px] font-bold tracking-[-0.03em] text-slate-900">Conversion Funnel</h2>
              <div className="mt-10 space-y-5">
                {funnelRows.map((row, index) => (
                  <div key={row.label}>
                    <div className="grid items-center gap-4 grid-cols-[124px_1fr_72px] sm:grid-cols-[160px_1fr_80px]">
                      <div className="text-right text-[13px] font-medium text-slate-500">{row.label}</div>
                      <div className="h-[10px] overflow-hidden rounded-full bg-[rgba(148,163,184,0.14)] shadow-[inset_0_0_0_1px_rgba(148,163,184,0.08)]">
                        <div className={`h-full rounded-full ${row.color}`} style={{ width: row.width }} />
                      </div>
                      <div className={`text-right text-[14px] font-semibold ${index === funnelRows.length - 1 ? "text-[#63d26d]" : "text-slate-500"}`}>{row.value}</div>
                    </div>
                    {index < funnelRows.length - 1 && (
                      <div className="pb-1 pt-2 text-center text-[12px] font-semibold text-slate-400">
                        {index === 0 ? "↓ 2.3% to followers" : index === 1 ? "↓ 57.9% to website sessions" : index === 2 ? "↓ 4.6% to leads" : "↓ revenue"}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </Surface>
            <div className="rounded-[28px] border border-[rgba(41,151,255,0.2)] bg-[linear-gradient(145deg,rgba(41,151,255,0.12)_0%,rgba(191,90,242,0.08)_100%)] px-9 pb-8 pt-8 shadow-[0_10px_26px_rgba(15,23,42,0.04)]">
              <h2 className="text-[22px] font-bold tracking-[-0.03em] text-slate-900">Key Takeaways</h2>
              <div className="mt-4">
                {takeaways.map((item) => (
                  <div key={item} className="border-b border-[rgba(211,223,244,0.92)] py-4 text-[14px] leading-[1.5] text-slate-500 last:border-b-0">
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="mb-8">
          <SectionRail number="02" title="Awareness" accent="bg-[#ff9f0a]" />
          <div className="space-y-[10px]">
            <Surface className="grid items-end gap-5 px-[26px] py-[22px] md:grid-cols-[minmax(0,1fr)_auto]">
              <div>
                <div className="text-[13px] font-medium uppercase tracking-[0.04em] text-slate-400">Total Content Views</div>
                <div className="mt-2 text-[clamp(48px,8vw,88px)] font-normal leading-none tracking-[-0.04em] text-slate-900">318.6K</div>
              </div>
              <div className="text-right">
                <div className="mt-2 text-[17px] font-normal tracking-[-0.01em] text-slate-500">Across all platforms, April 2026</div>
                <div className="mt-3 flex justify-end">
                  <span className="inline-flex rounded-full bg-[rgba(255,159,10,0.15)] px-[9px] py-[3px] text-[12px] font-semibold text-[#ff9f0a]">
                    Apr current 318.6K
                  </span>
                </div>
              </div>
            </Surface>
            <div className="grid gap-[10px] md:grid-cols-3">
              <Surface className="px-7 py-6">
                <div className="text-[12px] font-medium uppercase tracking-[0.04em] text-slate-400">IG Views</div>
                <div className="mt-3 text-[28px] font-[450] leading-none tracking-[-0.03em] text-slate-900">171,320</div>
                <div className="mt-3">
                  <span className="inline-flex rounded-full bg-[rgba(41,151,255,0.15)] px-[9px] py-[3px] text-[12px] font-semibold text-[#2997ff]">54% of total</span>
                </div>
              </Surface>
              <Surface className="px-7 py-6">
                <div className="text-[12px] font-medium uppercase tracking-[0.04em] text-slate-400">FB Views</div>
                <div className="mt-3 text-[28px] font-[450] leading-none tracking-[-0.03em] text-slate-900">136,420</div>
                <div className="mt-3">
                  <span className="inline-flex rounded-full bg-[rgba(255,159,10,0.15)] px-[9px] py-[3px] text-[12px] font-semibold text-[#ff9f0a]">43% of total</span>
                </div>
              </Surface>
              <Surface className="px-7 py-6">
                <div className="text-[12px] font-medium uppercase tracking-[0.04em] text-slate-400">TikTok Views</div>
                <div className="mt-3 text-[28px] font-[450] leading-none tracking-[-0.03em] text-slate-900">10,900</div>
                <div className="mt-3 text-[13px] text-slate-500">April 2026 current</div>
              </Surface>
            </div>
          </div>
        </section>

        <section className="mb-8">
          <SectionRail number="03" title="Audience" accent="bg-[#2f66e5]" />
          <div className="grid gap-[12px] md:grid-cols-2 xl:grid-cols-4">
            {audienceCards.map((item) => (
              <Surface key={item.label} className="min-h-[178px] rounded-[28px] px-6 pb-[22px] pt-[22px]">
                <div className="text-[12px] font-medium uppercase tracking-[0.04em] text-slate-400">{item.label}</div>
                <div className="mt-[3px] text-[10px] font-medium tracking-[0.02em] text-[#a3b1c6]">{item.sub}</div>
                <div className="mt-4 text-[33px] font-[450] leading-none tracking-[-0.03em] text-slate-900">{item.value}</div>
                <span className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-[12px] font-semibold ${item.badgeColor}`}>{item.badge}</span>
                <div className="my-3 h-px bg-[rgba(211,223,244,0.92)]" />
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <div className="text-[11px] font-medium text-slate-400">{item.footerA}</div>
                    <div className="mt-1 text-[15px] font-semibold text-slate-500">{item.valueA}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-[11px] font-medium text-slate-400">{item.footerB}</div>
                    <div className="mt-1 text-[15px] font-semibold text-[#63d26d]">{item.valueB}</div>
                  </div>
                </div>
              </Surface>
            ))}
          </div>
          <div className="mt-[12px] grid gap-[12px] lg:grid-cols-2">
            <Surface className="rounded-[28px] px-7 pb-6 pt-7">
              <div className="text-[16px] font-semibold tracking-[-0.02em] text-slate-900">Follower Growth</div>
              <div className="mt-1 text-[12px] font-normal text-slate-500">Monthly cumulative · all platforms</div>
              <BarChart
                series={[
                  { name: "Instagram", data: [5100, 5500, 4890] },
                  { name: "Facebook", data: [1900, 2060, 2230] },
                  { name: "TikTok", data: [180, 235, 290] },
                ]}
                categories={months3}
                colors={[CHART_BLUE, "#f1b34d", "#5abf84"]}
                yFormatter={kFmt}
                height={250}
              />
              <div className="mt-4 flex flex-wrap justify-center gap-6 text-[12px] font-bold text-slate-500">
                <span className="inline-flex items-center gap-2"><span className="h-5 w-5 rounded-[2px] bg-[#2f66e5]" />Instagram</span>
                <span className="inline-flex items-center gap-2"><span className="h-5 w-5 rounded-[2px] bg-[#f1b34d]" />Facebook</span>
                <span className="inline-flex items-center gap-2"><span className="h-5 w-5 rounded-[2px] bg-[#5abf84]" />TikTok</span>
              </div>
            </Surface>
            <Surface className="rounded-[28px] px-7 pb-6 pt-7">
              <div className="text-[16px] font-semibold tracking-[-0.02em] text-slate-900">Platform Distribution</div>
              <div className="mt-1 text-[12px] font-normal text-slate-500">April 2026 snapshot</div>
              <DonutChart
                series={[4890, 2230, 290]}
                labels={["Instagram", "Facebook", "TikTok"]}
                colors={[CHART_BLUE, "#f1b34d", "#5abf84"]}
                height={310}
              />
              <div className="mt-3 flex flex-wrap justify-center gap-5 text-[12px] font-bold text-slate-500">
                <span className="inline-flex items-center gap-2"><span className="h-5 w-5 rounded-full bg-[#2f66e5]" />Instagram</span>
                <span className="inline-flex items-center gap-2"><span className="h-5 w-5 rounded-full bg-[#f1b34d]" />Facebook</span>
                <span className="inline-flex items-center gap-2"><span className="h-5 w-5 rounded-full bg-[#5abf84]" />TikTok</span>
              </div>
            </Surface>
          </div>
        </section>

        <section className="mb-8">
          <SectionRail number="04" title="Lead Generation" accent="bg-[#63d26d]" />
          <div className="grid gap-[12px] lg:grid-cols-3">
            {leadCards.map((item) => (
              <Surface key={item.label} className="rounded-[28px] px-6 pb-5 pt-5">
                <div className="text-[12px] font-medium uppercase tracking-[0.04em] text-slate-400">{item.label}</div>
                <div className="mt-2.5 text-[33px] font-[450] leading-none tracking-[-0.03em] text-slate-900">{item.value}</div>
                <div className="mt-2.5 inline-flex rounded-full bg-[rgba(99,210,109,0.16)] px-[9px] py-[3px] text-[12px] font-semibold text-[#63d26d]">{item.note}</div>
              </Surface>
            ))}
          </div>
          <div className="mt-[12px] grid gap-[12px] lg:grid-cols-2">
            <Surface className="rounded-[28px] px-7 pb-6 pt-7">
              <div className="text-[16px] font-semibold tracking-[-0.02em] text-slate-900">New Leads per Month</div>
              <div className="mt-1 text-[12px] font-normal text-slate-500">April 2026 peak · 196 leads</div>
              <BarChart
                series={[{ name: "New Leads", data: [100, 169, 196] }]}
                categories={months3}
                colors={["#f1b34d"]}
              />
            </Surface>
            <Surface className="rounded-[28px] px-7 pb-6 pt-7">
              <div className="text-[16px] font-semibold tracking-[-0.02em] text-slate-900">Pipeline Growth</div>
              <div className="mt-1 text-[12px] font-normal text-slate-500">Cumulative leads · 840 → 1,189</div>
              <LineAreaChart
                series={[{ name: "Pipeline", data: [840, 993, 1189] }]}
                categories={months3}
                colors={["#56b983"]}
              />
            </Surface>
          </div>
        </section>

        <section className="mb-8">
          <SectionRail number="05" title="Website Traffic" accent="bg-[#75c3f7]" />
          <div className="grid gap-[12px] lg:grid-cols-[1fr_2fr]">
            <div className="space-y-3">
              <Surface className="rounded-[28px] px-6 pb-5 pt-5">
                <div className="text-[12px] font-medium uppercase tracking-[0.04em] text-slate-400">Total Sessions</div>
                <div className="mt-2.5 text-[33px] font-[450] leading-none tracking-[-0.03em] text-slate-900">11.1K</div>
                <div className="mt-2.5 text-[13px] text-slate-400">Selected-month range total</div>
              </Surface>
              <Surface className="rounded-[28px] px-6 pb-5 pt-5">
                <div className="text-[12px] font-medium uppercase tracking-[0.04em] text-slate-400">Apr 2026 Peak</div>
                <div className="mt-2.5 text-[33px] font-[450] leading-none tracking-[-0.03em] text-slate-900">4,288</div>
                <div className="mt-2.5 inline-flex rounded-full bg-[rgba(99,210,109,0.16)] px-[9px] py-[3px] text-[12px] font-semibold text-[#63d26d]">Highest month</div>
              </Surface>
              <Surface className="rounded-[28px] px-6 pb-5 pt-5">
                <div className="text-[12px] font-medium uppercase tracking-[0.04em] text-slate-400">Total Ad Spend</div>
                <div className="mt-2.5 text-[33px] font-[450] leading-none tracking-[-0.03em] text-slate-900">$8,802</div>
                <div className="mt-2.5 text-[13px] text-slate-400">Full selected period</div>
              </Surface>
            </div>
            <Surface className="rounded-[28px] px-7 pb-6 pt-7">
              <div className="text-[16px] font-semibold tracking-[-0.02em] text-slate-900">Traffic Trend</div>
              <div className="mt-1 text-[12px] font-normal text-slate-500">Monthly sessions · bell curve peaking Apr 2026</div>
              <TrafficTrendChart />
            </Surface>
          </div>
        </section>

        <section>
          <SectionRail number="06" title="Revenue & Bookings" accent="bg-[#b260f4]" />
          <div className="grid gap-[12px] lg:grid-cols-3">
            {revenueCards.map((item) => (
              <Surface key={item.label} className="rounded-[28px] px-6 pb-5 pt-5">
                <div className="text-[12px] font-medium uppercase tracking-[0.04em] text-slate-400">{item.label}</div>
                <div className="mt-3 text-[33px] font-[450] leading-none tracking-[-0.03em] text-slate-900">{item.value}</div>
                <div className="mt-3 inline-flex rounded-full bg-[rgba(99,210,109,0.16)] px-[9px] py-[3px] text-[12px] font-semibold text-[#63d26d]">{item.badge}</div>
                <div className="my-3 h-px bg-[rgba(211,223,244,0.92)]" />
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <div className="text-[11px] font-medium text-slate-400">{item.leftLabel}</div>
                    <div className="mt-1 text-[15px] font-semibold text-slate-500">{item.leftValue}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-[11px] font-medium text-slate-400">{item.rightLabel}</div>
                    <div className="mt-1 text-[15px] font-semibold text-slate-500">{item.rightValue}</div>
                  </div>
                </div>
              </Surface>
            ))}
          </div>
          <div className="mt-[12px] grid gap-[12px] lg:grid-cols-2">
            <Surface className="rounded-[28px] px-7 pb-6 pt-7">
              <div className="text-[15px] font-extrabold text-slate-900">Total vs Direct Revenue</div>
              <div className="mt-1 text-[12px] font-medium text-slate-500">April 2026 peak · $264,780</div>
              <RevenueComparisonChart />
              <div className="mt-4 flex flex-wrap justify-center gap-6 text-[12px] font-bold text-slate-600">
                <span className="inline-flex items-center gap-2"><span className="h-3.5 w-3.5 rounded-full bg-[#2f66e5]" />Total Revenue</span>
                <span className="inline-flex items-center gap-2"><span className="h-3.5 w-3.5 rounded-full bg-[#7c4df3]" />Direct Revenue</span>
              </div>
            </Surface>
            <Surface className="rounded-[28px] px-7 pb-6 pt-7">
              <div className="text-[15px] font-extrabold text-slate-900">Direct Booking Split</div>
              <div className="mt-1 text-[12px] font-medium text-slate-500">Monthly % · direct bookings</div>
              <RevenueSplitChart />
            </Surface>
          </div>
          <Surface className="mt-[12px] rounded-[28px] px-7 pb-6 pt-7">
            <div className="text-[15px] font-extrabold text-slate-900">Monthly Revenue Performance</div>
            <div className="mt-1 text-[12px] font-medium text-slate-500">Compares total revenue, direct booking revenue, and last year&apos;s total revenue across all available client months</div>
            <MonthlyRevenuePerformanceChart />
            <div className="mt-4 flex flex-wrap justify-center gap-6 text-[12px] font-bold text-slate-600">
              <span className="inline-flex items-center gap-2"><span className="h-3.5 w-3.5 rounded-full bg-[#2f66e5]" />Total Revenue</span>
              <span className="inline-flex items-center gap-2"><span className="h-3.5 w-3.5 rounded-full bg-[#8a56f0]" />Direct Booking Revenue</span>
              <span className="inline-flex items-center gap-2"><span className="h-3.5 w-3.5 rounded-full bg-[#b7bdc9]" />LY Revenue</span>
            </div>
          </Surface>
        </section>
      </div>
    </div>
  );
}
