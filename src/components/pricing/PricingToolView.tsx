"use client";

import { useMemo, useState } from "react";

type WindowKey = "30" | "60" | "90";

type Recommendation = {
  date: string;
  currentPrice: number;
  recommendedPrice: number;
  changePercent: number;
  reason: string;
};

type WindowData = {
  totalDays: number;
  bookedDays: number;
  availableDays: number;
  occupancyRate: number;
  potentialRevenue: number;
  recommendations: Recommendation[];
};

type Listing = {
  id: string;
  nickname: string;
  city: string;
  state: string;
  windows: Record<WindowKey, WindowData>;
  totalPotentialRevenue: number;
};

const WINDOW_KEYS: WindowKey[] = ["30", "60", "90"];

const LISTINGS: Listing[] = [
  {
    id: "palm-house",
    nickname: "Palm House Retreat",
    city: "Miami Beach",
    state: "FL",
    totalPotentialRevenue: 18420,
    windows: {
      "30": {
        totalDays: 30,
        bookedDays: 25,
        availableDays: 5,
        occupancyRate: 83,
        potentialRevenue: 18420,
        recommendations: [
          { date: "2026-06-06", currentPrice: 389, recommendedPrice: 422, changePercent: 8, reason: "Weekend demand is pacing ahead of target with limited remaining nights." },
          { date: "2026-06-13", currentPrice: 395, recommendedPrice: 431, changePercent: 9, reason: "Compression is building and neighboring inventory is nearly sold through." },
        ],
      },
      "60": {
        totalDays: 60,
        bookedDays: 42,
        availableDays: 18,
        occupancyRate: 70,
        potentialRevenue: 31240,
        recommendations: [
          { date: "2026-07-03", currentPrice: 405, recommendedPrice: 438, changePercent: 8, reason: "Holiday shoulder nights are filling with stronger lead time than last month." },
        ],
      },
      "90": {
        totalDays: 90,
        bookedDays: 56,
        availableDays: 34,
        occupancyRate: 62,
        potentialRevenue: 46180,
        recommendations: [
          { date: "2026-08-01", currentPrice: 372, recommendedPrice: 396, changePercent: 6, reason: "Long-range leisure demand supports modest ADR growth on peak dates." },
        ],
      },
    },
  },
  {
    id: "canyon-glass",
    nickname: "Canyon Glass Villa",
    city: "Scottsdale",
    state: "AZ",
    totalPotentialRevenue: 14230,
    windows: {
      "30": {
        totalDays: 30,
        bookedDays: 18,
        availableDays: 12,
        occupancyRate: 60,
        potentialRevenue: 14230,
        recommendations: [
          { date: "2026-06-10", currentPrice: 366, recommendedPrice: 366, changePercent: 0, reason: "Current rate is well positioned against market and pace is on target." },
        ],
      },
      "60": {
        totalDays: 60,
        bookedDays: 31,
        availableDays: 29,
        occupancyRate: 52,
        potentialRevenue: 22100,
        recommendations: [
          { date: "2026-07-12", currentPrice: 342, recommendedPrice: 356, changePercent: 4, reason: "Mid-week demand is stabilizing enough for a light upward test." },
        ],
      },
      "90": {
        totalDays: 90,
        bookedDays: 40,
        availableDays: 50,
        occupancyRate: 44,
        potentialRevenue: 29840,
        recommendations: [],
      },
    },
  },
  {
    id: "lakeview-hideaway",
    nickname: "Lakeview Hideaway",
    city: "Muskoka",
    state: "ON",
    totalPotentialRevenue: 11880,
    windows: {
      "30": {
        totalDays: 30,
        bookedDays: 10,
        availableDays: 20,
        occupancyRate: 33,
        potentialRevenue: 11880,
        recommendations: [
          { date: "2026-06-08", currentPrice: 289, recommendedPrice: 275, changePercent: -5, reason: "Shoulder-night conversion remains soft and pace trails target." },
          { date: "2026-06-22", currentPrice: 295, recommendedPrice: 281, changePercent: -5, reason: "A tactical rate move should improve fill without broadly discounting prime nights." },
        ],
      },
      "60": {
        totalDays: 60,
        bookedDays: 24,
        availableDays: 36,
        occupancyRate: 40,
        potentialRevenue: 20440,
        recommendations: [
          { date: "2026-07-19", currentPrice: 318, recommendedPrice: 305, changePercent: -4, reason: "Lead times are lengthening and demand softness is showing on Sunday arrivals." },
        ],
      },
      "90": {
        totalDays: 90,
        bookedDays: 38,
        availableDays: 52,
        occupancyRate: 42,
        potentialRevenue: 28680,
        recommendations: [],
      },
    },
  },
  {
    id: "bluebird-cabin",
    nickname: "Bluebird Cabin",
    city: "Asheville",
    state: "NC",
    totalPotentialRevenue: 16540,
    windows: {
      "30": {
        totalDays: 30,
        bookedDays: 28,
        availableDays: 2,
        occupancyRate: 93,
        potentialRevenue: 16540,
        recommendations: [
          { date: "2026-06-14", currentPrice: 341, recommendedPrice: 368, changePercent: 8, reason: "Inventory is nearly sold out and nearby comparable cabins are materially higher." },
        ],
      },
      "60": {
        totalDays: 60,
        bookedDays: 47,
        availableDays: 13,
        occupancyRate: 78,
        potentialRevenue: 28770,
        recommendations: [
          { date: "2026-07-04", currentPrice: 352, recommendedPrice: 381, changePercent: 8, reason: "Holiday compression justifies pushing ADR while protecting premium weekends." },
        ],
      },
      "90": {
        totalDays: 90,
        bookedDays: 61,
        availableDays: 29,
        occupancyRate: 68,
        potentialRevenue: 41220,
        recommendations: [
          { date: "2026-08-16", currentPrice: 332, recommendedPrice: 349, changePercent: 5, reason: "Long-range pace is healthy enough to support measured price growth." },
        ],
      },
    },
  },
];

const moneyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

const shortDateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
});

function formatMoney(value: number) {
  return moneyFormatter.format(value || 0);
}

function formatPercent(value: number) {
  return `${Math.round(value || 0)}%`;
}

function formatShortDate(value: string) {
  const parsed = new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return value;
  return shortDateFormatter.format(parsed);
}

function occupancyClass(value: number) {
  if (value >= 90) return "full";
  if (value >= 60) return "high";
  if (value >= 40) return "mid";
  return "low";
}

function occupancyTone(value: number) {
  const level = occupancyClass(value);
  if (level === "full") return "text-[#16a34a] border-[rgba(22,163,74,0.35)]";
  if (level === "high") return "text-[#2f66e5] border-[rgba(47,102,229,0.35)]";
  if (level === "mid") return "text-[#e8920a] border-[rgba(232,146,10,0.35)]";
  return "text-[#e05252] border-[rgba(224,82,82,0.35)]";
}

function occupancyColor(value: number) {
  const level = occupancyClass(value);
  if (level === "full") return "#22c55e";
  if (level === "high") return "#3367e8";
  if (level === "mid") return "#f59e0b";
  return "#f87171";
}

function directionClass(value: number) {
  if (value > 0) return "up";
  if (value < 0) return "dn";
  return "flat";
}

function topRecommendation(listing: Listing, windowKey: WindowKey) {
  const primary = listing.windows[windowKey].recommendations[0];
  if (primary) return primary;
  for (const key of WINDOW_KEYS) {
    const fallback = listing.windows[key].recommendations[0];
    if (fallback) return fallback;
  }
  return null;
}

function sparkHeight(value: number) {
  return Math.max(4, Math.round((value / 100) * 22));
}

function summaryForWindow(listings: Listing[], windowKey: WindowKey) {
  return listings.reduce(
    (summary, listing) => {
      const row = listing.windows[windowKey];
      summary.totalOccupancy += row.occupancyRate;
      summary.openValue += row.potentialRevenue;
      if (row.availableDays <= 5) summary.nearingFull += 1;
      if (row.recommendations.length) summary.actionable += 1;
      return summary;
    },
    { totalOccupancy: 0, openValue: 0, nearingFull: 0, actionable: 0 }
  );
}

function leadTimeLine(windowKey: WindowKey, listings: Listing[]) {
  const gapCount = listings.filter((listing) => listing.windows[windowKey].availableDays > 0).length;
  const soldOutCount = listings.filter((listing) => listing.windows[windowKey].availableDays <= 0).length;
  const actionableCount = listings.filter((listing) => listing.windows[windowKey].recommendations.length > 0).length;
  const avgOccupancy = Math.round(summaryForWindow(listings, windowKey).totalOccupancy / listings.length);

  if (windowKey === "30") {
    return `${gapCount} of ${listings.length} cabins still have open nights, while ${soldOutCount} are already sold out. This window needs tactical fills more than broad discounting.`;
  }
  if (windowKey === "60") {
    return `Occupancy is averaging ${avgOccupancy}%, with ${actionableCount} cabins showing active pricing opportunities. The middle runway is where positioning can still reshape pace.`;
  }
  return `Portfolio occupancy sits at ${avgOccupancy}% with longer-range runway still open. Use this window to protect premium weekends while packaging softer stays more intentionally.`;
}

export default function PricingToolView({ clientName }: { clientName: string }) {
  const [activeWindow, setActiveWindow] = useState<WindowKey>("30");
  const [filterState, setFilterState] = useState<"ALL" | "HIGH" | "LOW">("ALL");
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<"name" | "window-value" | "30" | "90" | "opportunity">("name");
  const [openRowId, setOpenRowId] = useState<string>("");
  const [detailWindowByRow, setDetailWindowByRow] = useState<Record<string, WindowKey>>({});
  const [selectedMonth, setSelectedMonth] = useState("June 2026");
  const monthOptions = ["June 2026", "May 2026", "April 2026", "March 2026", "All"];
  void clientName;

  const averageOccupancy = Math.round(summaryForWindow(LISTINGS, activeWindow).totalOccupancy / LISTINGS.length);
  const summary = summaryForWindow(LISTINGS, activeWindow);

  const visibleListings = useMemo(() => {
    return [...LISTINGS]
      .filter((listing) => {
        const occupancy = listing.windows[activeWindow].occupancyRate;
        const matchesFilter =
          filterState === "ALL" ||
          (filterState === "HIGH" && occupancy >= 60) ||
          (filterState === "LOW" && occupancy < 40);
        const haystack = `${listing.nickname} ${listing.city} ${listing.state}`.toLowerCase();
        const matchesSearch = !search.trim() || haystack.includes(search.toLowerCase());
        return matchesFilter && matchesSearch;
      })
      .sort((left, right) => {
        if (sortKey === "name") return left.nickname.localeCompare(right.nickname);
        if (sortKey === "opportunity") return right.totalPotentialRevenue - left.totalPotentialRevenue;
        if (sortKey === "30") return right.windows["30"].occupancyRate - left.windows["30"].occupancyRate;
        if (sortKey === "90") return right.windows["90"].occupancyRate - left.windows["90"].occupancyRate;
        return right.windows[activeWindow].potentialRevenue - left.windows[activeWindow].potentialRevenue;
      });
  }, [activeWindow, filterState, search, sortKey]);

  return (
    <div
      className="relative min-h-full overflow-y-auto text-slate-900"
      style={{
        background: `
          radial-gradient(circle at top right, rgba(41, 151, 255, 0.12), transparent 32%),
          radial-gradient(circle at bottom left, rgba(191, 90, 242, 0.09), transparent 28%),
          radial-gradient(circle at 72% 76%, rgba(255, 159, 10, 0.07), transparent 24%),
          #eef4fd
        `,
      }}
    >
      <div className="mx-auto max-w-[1420px] px-[38px] pb-24 pt-6 sm:px-[48px] lg:px-[72px] xl:px-[88px]">
        <section className="pt-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <h1 className="text-[28px] font-semibold tracking-[-0.04em] text-slate-900 sm:text-[34px]">
                Revenue Intelligence
              </h1>
              <div className="mt-2">
                <span className="inline-flex items-center rounded-full bg-[rgba(47,102,229,0.1)] px-3 py-1 text-[13px] font-semibold tracking-[-0.01em] text-[var(--brand)]">
                  {selectedMonth}
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
        </section>

        <section className="mt-6 grid gap-[14px]">
          <article className="relative overflow-hidden rounded-[20px] border border-[rgba(199,216,239,0.9)] bg-white/90 px-[18px] py-[18px] pl-[26px] shadow-[0_16px_34px_rgba(15,23,42,0.06)]">
            <div className="absolute inset-y-[14px] left-0 w-1 rounded-full bg-[linear-gradient(180deg,#2563eb_0%,#60a5fa_100%)]" />
            <div className="mb-[10px] text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">
              Event Context This Window
            </div>
            <p className="text-[15px] leading-[1.6] tracking-[-0.01em] text-slate-600">
              Snapshot used: 2026-05-25.json. Live event coverage was unavailable in this run, so the demand read falls back to recurring drive-market and holiday patterns.
            </p>
          </article>
        </section>

        <section className="mt-[18px] rounded-[18px] border border-[#dbe6f3] bg-white px-6 py-7 shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center">
            <div className="flex shrink-0 gap-[10px]">
              {[
                { label: "Nearing Full", value: String(summary.nearingFull), tone: "text-slate-900" },
                { label: "Avg Occupancy", value: formatPercent(averageOccupancy), tone: "text-[#10b981]" },
                { label: "Open Value", value: formatMoney(summary.openValue), tone: "text-[#2563eb]" },
              ].map((item) => (
                <div key={item.label} className="min-w-[118px] rounded-[12px] border border-[#dbe6f3] bg-white px-4 py-[14px]">
                  <div className={`mb-1 text-[24px] font-bold tracking-[-0.04em] ${item.tone}`}>{item.value}</div>
                  <div className="text-[9px] font-bold uppercase tracking-[0.11em] text-slate-400">{item.label}</div>
                </div>
              ))}
            </div>

            <div className="hidden self-stretch xl:block xl:w-px xl:bg-[#dbe6f3]" />

            <div className="flex-1">
              <div className="inline-flex rounded-[8px] bg-[#eef4ff] p-[3px]">
                {WINDOW_KEYS.map((windowKey) => (
                  <button
                    key={windowKey}
                    type="button"
                    onClick={() => setActiveWindow(windowKey)}
                    className={`rounded-[6px] px-[14px] py-[7px] text-[11px] font-semibold uppercase tracking-[0.06em] ${
                      activeWindow === windowKey ? "bg-[#2563eb] text-white" : "text-slate-400"
                    }`}
                  >
                    {windowKey}D
                  </button>
                ))}
              </div>

              <div className="mt-3 min-w-0">
                <div className="mb-1 text-[12px] font-extrabold uppercase tracking-[0.16em] text-[#2563eb]">
                  Booking Lead Time
                </div>
                <p className="text-[14px] leading-[1.45] text-slate-600">{leadTimeLine(activeWindow, LISTINGS)}</p>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-6 rounded-[18px] border border-[#dbe6f3] bg-white/92 p-6 shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
          <div className="text-[22px] font-bold tracking-[-0.03em] text-slate-900">Portfolio Occupancy at a Glance</div>
          <div className="mt-1 text-[12px] text-slate-500">
            30D, 60D, 90D occupancy across all {LISTINGS.length} listings. Color intensity reflects booking density.
          </div>

          <div className="mt-[18px] flex flex-wrap gap-x-[18px] gap-y-[10px]">
            {[
              { label: "90%-100%", color: "#22c55e" },
              { label: "60%-89%", color: "#3367e8" },
              { label: "40%-59%", color: "#f59e0b" },
              { label: "Under 40%", color: "#f87171" },
            ].map((item) => (
              <span key={item.label} className="inline-flex items-center gap-2 text-[11px] font-bold text-slate-500">
                <span className="h-3 w-3 rounded-full" style={{ backgroundColor: item.color }} />
                {item.label}
              </span>
            ))}
          </div>

          <div className="mt-5 flex flex-col gap-[6px]">
            {LISTINGS.map((listing) => (
              <div key={listing.id} className="grid items-center gap-[14px] lg:grid-cols-[220px_minmax(0,1fr)]">
                <div className="truncate text-[12px] font-semibold text-[#1e3a8a]" title={listing.nickname}>
                  {listing.nickname}
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {WINDOW_KEYS.map((windowKey) => {
                    const value = listing.windows[windowKey].occupancyRate;
                    return (
                      <button
                        key={windowKey}
                        type="button"
                        onClick={() => {
                          setOpenRowId(listing.id);
                          setDetailWindowByRow((prev) => ({ ...prev, [listing.id]: windowKey }));
                        }}
                        className="rounded-[7px] px-[10px] py-[7px] text-center text-[11px] font-bold tracking-[0.04em]"
                        style={{ backgroundColor: occupancyColor(value), color: value >= 40 ? "#fff" : "#111827" }}
                        title={`${windowKey}D: ${formatPercent(value)}`}
                      >
                        {formatPercent(value)}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-7">
          <div className="mb-5 flex items-center gap-[14px]">
            <div className="h-px flex-1 bg-[#dbe6f3]" />
            <div className="whitespace-nowrap text-[10px] font-bold uppercase tracking-[0.24em] text-slate-500">
              All Listings · Click Any Row To Expand
            </div>
            <div className="h-px flex-1 bg-[#dbe6f3]" />
          </div>

          <div className="mb-[18px] flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
            <div className="flex flex-wrap items-center gap-[10px]">
              <span className="text-[12px] font-bold text-slate-500">Filter:</span>
              {[
                { key: "ALL", label: "All" },
                { key: "HIGH", label: "High Occupancy" },
                { key: "LOW", label: "Low Occupancy" },
              ].map((filter) => (
                <button
                  key={filter.key}
                  type="button"
                  onClick={() => {
                    setFilterState(filter.key as "ALL" | "HIGH" | "LOW");
                    setOpenRowId("");
                  }}
                  className={`rounded-full border px-[14px] py-2 text-[12px] font-bold ${
                    filterState === filter.key
                      ? "border-[#2563eb] bg-[#2563eb] text-white"
                      : "border-[#c7d8ef] bg-white text-slate-500"
                  }`}
                >
                  {filter.label}
                </button>
              ))}
            </div>

            <div className="flex w-full flex-col gap-3 xl:w-auto xl:flex-row xl:items-center">
              <input
                type="text"
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setOpenRowId("");
                }}
                placeholder="Search listings..."
                className="min-w-[300px] rounded-[14px] border border-[#cfe0f5] bg-white/95 px-[14px] py-[11px] text-[12px] text-slate-700 outline-none"
              />
              <div className="flex items-center gap-2">
                <label className="text-[11px] font-bold uppercase tracking-[0.08em] text-slate-500">Sort</label>
                <select
                  value={sortKey}
                  onChange={(event) => {
                    setSortKey(event.target.value as "name" | "window-value" | "30" | "90" | "opportunity");
                    setOpenRowId("");
                  }}
                  className="min-w-[180px] rounded-[14px] border border-[#cfe0f5] bg-white/95 px-[14px] py-[11px] text-[12px] text-slate-700 outline-none"
                >
                  <option value="name">A-Z</option>
                  <option value="window-value">Top opportunity</option>
                  <option value="30">Highest 30D occupancy</option>
                  <option value="90">Highest 90D occupancy</option>
                  <option value="opportunity">Highest total value</option>
                </select>
              </div>
            </div>
          </div>

          <div className="overflow-hidden rounded-[18px] border border-[#dbe6f3] bg-white/94 shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-[linear-gradient(180deg,rgba(239,246,255,0.98)_0%,rgba(245,249,255,1)_100%)]">
                  <th className="px-[18px] py-[13px] text-left text-[11px] font-semibold uppercase tracking-[0.06em] text-slate-400">Listing</th>
                  <th className="px-[18px] py-[13px] text-center text-[11px] font-semibold uppercase tracking-[0.06em] text-slate-400">30D</th>
                  <th className="px-[18px] py-[13px] text-center text-[11px] font-semibold uppercase tracking-[0.06em] text-slate-400">60D</th>
                  <th className="px-[18px] py-[13px] text-center text-[11px] font-semibold uppercase tracking-[0.06em] text-slate-400">90D</th>
                  <th className="px-[18px] py-[13px] text-left text-[11px] font-semibold uppercase tracking-[0.06em] text-slate-400">Trend</th>
                  <th className="px-[18px] py-[13px] text-center text-[11px] font-semibold uppercase tracking-[0.06em] text-slate-400">Top Recommendation</th>
                  <th className="px-[18px] py-[13px]" />
                </tr>
              </thead>
              <tbody>
                {visibleListings.length ? (
                  visibleListings.map((listing) => {
                    const recommendation = topRecommendation(listing, activeWindow);
                    const isOpen = openRowId === listing.id;
                    const detailWindow = detailWindowByRow[listing.id] ?? activeWindow;
                    const detailData = listing.windows[detailWindow];

                    return (
                      <>
                        <tr
                          key={`${listing.id}-row`}
                          className={`cursor-pointer border-t border-[#dbe6f3] align-top transition-colors ${
                            isOpen ? "bg-[#eef4ff]" : "hover:bg-[#f8fbff]"
                          }`}
                          onClick={() => {
                            setOpenRowId((current) => (current === listing.id ? "" : listing.id));
                            setDetailWindowByRow((prev) =>
                              prev[listing.id] ? prev : { ...prev, [listing.id]: activeWindow }
                            );
                          }}
                        >
                          <td className="px-[18px] py-[11px]">
                            <div className="text-[13px] font-bold text-slate-900">{listing.nickname}</div>
                            <div className="mt-0.5 text-[11px] text-slate-400">{listing.city}, {listing.state}</div>
                          </td>
                          {WINDOW_KEYS.map((windowKey) => {
                            const value = listing.windows[windowKey].occupancyRate;
                            const activePill = isOpen && detailWindow === windowKey;
                            return (
                              <td key={windowKey} className="px-[18px] py-[11px] text-center">
                                <button
                                  type="button"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    setOpenRowId((current) => (current === listing.id && detailWindow === windowKey ? "" : listing.id));
                                    setDetailWindowByRow((prev) => ({ ...prev, [listing.id]: windowKey }));
                                  }}
                                  className={`inline-flex min-w-[68px] justify-center rounded-[10px] border bg-white px-4 py-2 text-[13px] font-extrabold ${occupancyTone(value)} ${
                                    activePill ? "rounded-b-none border-transparent pb-5" : ""
                                  }`}
                                >
                                  {formatPercent(value)}
                                </button>
                              </td>
                            );
                          })}
                          <td className="px-[18px] py-[11px]">
                            <div className="flex h-[22px] items-end justify-center gap-0.5">
                              {WINDOW_KEYS.map((windowKey) => {
                                const value = listing.windows[windowKey].occupancyRate;
                                return (
                                  <div
                                    key={windowKey}
                                    className="w-2 rounded-[2px]"
                                    style={{
                                      height: `${sparkHeight(value)}px`,
                                      backgroundColor: occupancyColor(value),
                                    }}
                                    title={`${windowKey}D: ${formatPercent(value)}`}
                                  />
                                );
                              })}
                            </div>
                          </td>
                          <td className="px-[18px] py-[11px] text-center">
                            {recommendation ? (
                              <span className={`text-[11px] font-bold ${directionClass(recommendation.changePercent) === "up" ? "text-slate-900" : directionClass(recommendation.changePercent) === "dn" ? "text-slate-900" : "text-slate-900"}`}>
                                {`${recommendation.changePercent > 0 ? "+" : ""}${Math.round(recommendation.changePercent)}% ${formatShortDate(recommendation.date)} -> ${formatMoney(recommendation.recommendedPrice)}`}
                              </span>
                            ) : (
                              <span className="text-[11px] font-bold text-slate-900">No open opportunities</span>
                            )}
                          </td>
                          <td className="px-[18px] py-[11px] text-right text-slate-500">
                            <span className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-[#c7d8ef] bg-white text-[12px]">
                              {isOpen ? "−" : "+"}
                            </span>
                          </td>
                        </tr>

                        {isOpen ? (
                          <tr key={`${listing.id}-detail`} className="border-t-0">
                            <td colSpan={7} className="border-b-2 border-[#1d4ed8] bg-white p-0">
                              <div className="grid gap-4 p-6 xl:grid-cols-[30%_1fr]">
                                <div className="rounded-[12px] border border-[#dbe6f3] bg-white p-4 shadow-[0_12px_28px_rgba(15,23,42,0.06)]">
                                  <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">Occupancy Rate</div>
                                  <div className="mt-3 flex items-center gap-3 border-b border-[#e8eef6] pb-3">
                                    <div
                                      className="h-12 w-12 rounded-full"
                                      style={{
                                        background: `radial-gradient(circle at center, #ffffff 62%, transparent 63%), conic-gradient(${occupancyColor(detailData.occupancyRate)} 0 ${detailData.occupancyRate}%, #e7dfd3 ${detailData.occupancyRate}% 100%)`,
                                      }}
                                    />
                                    <div className="grid gap-1">
                                      <span className={`text-[30px] font-semibold leading-[0.92] ${occupancyClass(detailData.occupancyRate) === "full" ? "text-[#22c55e]" : occupancyClass(detailData.occupancyRate) === "high" ? "text-[#3367e8]" : occupancyClass(detailData.occupancyRate) === "mid" ? "text-[#f59e0b]" : "text-[#f87171]"}`}>
                                        {formatPercent(detailData.occupancyRate)}
                                      </span>
                                      <span className="text-[12px] font-semibold text-slate-500">
                                        {detailData.bookedDays}/{detailData.totalDays} booked
                                      </span>
                                    </div>
                                  </div>

                                  <div className="mb-1 mt-4 flex items-center justify-between">
                                    <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">Night Fill</span>
                                    <span className="rounded-full border border-[rgba(100,116,139,0.2)] bg-[rgba(100,116,139,0.1)] px-[7px] py-[2px] text-[9px] font-bold uppercase tracking-[0.08em] text-slate-500">
                                      {detailData.availableDays} Open
                                    </span>
                                  </div>

                                  <div className="mt-2 flex flex-wrap gap-[3px]">
                                    {Array.from({ length: detailData.totalDays }).map((_, index) => (
                                      <div
                                        key={index}
                                        className="h-2 w-2 rounded-[2px]"
                                        style={{
                                          backgroundColor:
                                            index < detailData.bookedDays
                                              ? occupancyColor(detailData.occupancyRate)
                                              : occupancyClass(detailData.occupancyRate) === "full"
                                                ? "rgba(34,197,94,0.18)"
                                                : occupancyClass(detailData.occupancyRate) === "high"
                                                  ? "rgba(51,103,232,0.18)"
                                                  : occupancyClass(detailData.occupancyRate) === "mid"
                                                    ? "rgba(245,158,11,0.18)"
                                                    : "rgba(248,113,113,0.18)",
                                        }}
                                      />
                                    ))}
                                  </div>

                                  <div className="mt-4 w-fit rounded-[12px] border border-[rgba(34,197,94,0.22)] bg-[rgba(34,197,94,0.06)] px-3 py-2">
                                    <div className="text-[18px] font-semibold tracking-[-0.03em] text-[#1f7f47]">
                                      {formatMoney(detailData.potentialRevenue)}
                                    </div>
                                    <div className="mt-1 text-[9px] font-bold uppercase tracking-[0.08em] text-[#5d9b73]">
                                      Potential Revenue · {detailWindow}D Window
                                    </div>
                                  </div>
                                </div>

                                <div className="rounded-[12px] border border-[#dbe6f3] bg-white p-4 shadow-[0_12px_28px_rgba(15,23,42,0.06)]">
                                  {detailData.recommendations.length ? (
                                    <>
                                      <div className="mb-1 grid grid-cols-[74px_66px_82px_minmax(0,1fr)] gap-2 border-b border-[#e2e8f0] pb-[9px] text-[11px] font-semibold uppercase tracking-[0.06em] text-slate-400">
                                        <div>Date</div>
                                        <div>Current</div>
                                        <div>Suggested</div>
                                        <div>Why</div>
                                      </div>
                                      {detailData.recommendations.slice(0, 4).map((row) => (
                                        <div key={`${listing.id}-${row.date}`} className="grid grid-cols-[74px_66px_82px_minmax(0,1fr)] gap-2 border-b border-[#eef2f7] py-[7px] last:border-b-0">
                                          <div className="text-[12px] font-bold text-slate-900">{formatShortDate(row.date)}</div>
                                          <div className="text-[12px] text-slate-400 line-through">{formatMoney(row.currentPrice)}</div>
                                          <div className={`text-[13px] font-extrabold tracking-[-0.02em] ${directionClass(row.changePercent) === "up" ? "text-[#6abf92]" : directionClass(row.changePercent) === "dn" ? "text-[#e07060]" : "text-slate-900"}`}>
                                            {formatMoney(row.recommendedPrice)}
                                            <br />
                                            <span className={`text-[9px] font-bold ${directionClass(row.changePercent) === "up" ? "text-[#6abf92]" : directionClass(row.changePercent) === "dn" ? "text-[#e07060]" : "text-slate-500"}`}>
                                              {row.changePercent > 0 ? "+" : ""}{Math.round(row.changePercent)}%
                                            </span>
                                          </div>
                                          <div className="text-[12px] leading-[1.4] text-slate-500">{row.reason}</div>
                                        </div>
                                      ))}
                                    </>
                                  ) : (
                                    <div className="text-[12px] text-slate-500">No price moves recommended in this window.</div>
                                  )}
                                </div>
                              </div>
                            </td>
                          </tr>
                        ) : null}
                      </>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={7}>
                      <div className="p-[18px] text-[12px] text-slate-500">No listings match this filter.</div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
