import type { PMSAdapter, PMSProperty, PMSBooking, PMSReview, BookingQueryParams } from "./adapter";

type HostfullyCredentials = { api_key: string; agency_uid: string };

const BASE_URL = "https://platform.hostfully.com/api/v3.3";

const STATUS_MAP: Record<string, string> = {
  NEW: "inquiry", NEW_INQUIRY: "inquiry", REQUEST_TO_BOOK: "inquiry",
  BOOKED: "confirmed", CHECKED_IN: "confirmed", CHECKED_OUT: "confirmed",
  CANCELLED: "cancelled", DECLINED: "cancelled", EXPIRED: "cancelled",
  BLOCKED: "blocked",
};

export class HostfullyAdapter implements PMSAdapter {
  readonly provider = "hostfully" as const;
  constructor(private credentials: HostfullyCredentials) {}

  private async get<T>(path: string, params: Record<string, string> = {}): Promise<T> {
    const url = new URL(`${BASE_URL}${path}`);
    url.searchParams.set("agencyUid", this.credentials.agency_uid);
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
    const res = await fetch(url.toString(), {
      headers: { "X-HOSTFULLY-APIKEY": this.credentials.api_key, Accept: "application/json" },
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`Hostfully API error ${res.status}: ${path} — ${text.slice(0, 200)}`);
    }
    return res.json();
  }

  // Hostfully uses cursor-based pagination with _limit / _cursor
  private async getAll<T>(path: string, listKey: string, params: Record<string, string> = {}): Promise<T[]> {
    const all: T[] = [];
    let cursor: string | null = null;
    while (true) {
      const reqParams: Record<string, string> = { ...params, _limit: "100" };
      if (cursor) reqParams._cursor = cursor;
      const data = await this.get<Record<string, unknown>>(path, reqParams);
      const page = (data[listKey] ?? []) as T[];
      all.push(...page);
      cursor = (data._paging as Record<string, unknown>)?._nextCursor as string ?? null;
      if (!cursor || page.length === 0) break;
      await new Promise((r) => setTimeout(r, 150));
    }
    return all;
  }

  async testConnection() {
    try { await this.get("/properties", { _limit: "1" }); return { ok: true }; }
    catch (err) { return { ok: false, error: err instanceof Error ? err.message : "Unknown" }; }
  }

  async fetchProperties(): Promise<PMSProperty[]> {
    const results = await this.getAll<unknown>("/properties", "properties");
    return results.map((l: unknown) => {
      const p = l as Record<string, unknown>;
      const amenities = Array.isArray(p.amenities)
        ? p.amenities.map((a: unknown) =>
            typeof a === "string" ? a : String((a as Record<string, unknown>).amenityType ?? (a as Record<string, unknown>).name ?? a))
        : [];
      return {
        externalId: String(p.uid ?? p.id ?? ""),
        name: String(p.name ?? ""),
        address: {
          street: String(p.address ?? ""),
          city: String(p.city ?? ""),
          state: String(p.state ?? ""),
          country: String(p.country ?? ""),
        },
        bedrooms: Number(p.bedrooms ?? 0),
        bathrooms: Number(p.bathrooms ?? 0),
        amenities,
        basePrice: Number(p.baseGuestNbPricePerNight ?? p.basePrice ?? 0),
        currency: String(p.currencyCode ?? p.currency ?? "USD"),
        rawData: p,
      };
    });
  }

  async fetchBookings(params?: BookingQueryParams): Promise<PMSBooking[]> {
    // Hostfully leads require a date range; use since→5 years out, or 5yr window for full sync
    const fromDate = params?.since
      ? params.since.split("T")[0]
      : new Date(Date.now() - 2 * 365 * 86400000).toISOString().split("T")[0];
    const toDate = new Date(Date.now() + 3 * 365 * 86400000).toISOString().split("T")[0];

    const results = await this.getAll<unknown>("/leads", "leads", { fromDate, toDate });
    return results.map((r: unknown) => {
      const lead = r as Record<string, unknown>;
      const status = STATUS_MAP[String(lead.status ?? "")] ?? String(lead.status ?? "").toLowerCase();
      const channelRaw = lead.source ?? lead.bookingSource;
      const platform = channelRaw == null ? "direct"
        : typeof channelRaw === "object"
          ? String((channelRaw as Record<string, unknown>).name ?? "direct")
          : String(channelRaw || "direct");
      // Dates come as "2024-01-15 15:00:00" — take date portion only
      const checkIn = String(lead.checkInLocalDateTime ?? lead.checkInDate ?? "").slice(0, 10);
      const checkOut = String(lead.checkOutLocalDateTime ?? lead.checkOutDate ?? "").slice(0, 10);
      return {
        externalId: String(lead.uid ?? lead.id ?? ""),
        propertyExternalId: String(lead.propertyUid ?? lead.propertyId ?? ""),
        status,
        checkIn,
        checkOut,
        guests: Number(lead.numberOfGuests ?? lead.guestCount ?? 0),
        totalRevenue: Number(lead.totalPrice ?? lead.price ?? 0),
        platform,
        rawData: lead,
      };
    });
  }

  async fetchReviews(_propertyId: string): Promise<PMSReview[]> { return []; }
}
