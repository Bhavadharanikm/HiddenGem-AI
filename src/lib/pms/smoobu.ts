import type { PMSAdapter, PMSProperty, PMSBooking, PMSReview, BookingQueryParams } from "./adapter";

const BASE_URL = "https://login.smoobu.com/api";

export class SmoobuAdapter implements PMSAdapter {
  readonly provider = "smoobu" as const;
  constructor(private credentials: { api_key: string }) {}

  private async get<T>(path: string, params: Record<string, string> = {}): Promise<T> {
    const url = new URL(`${BASE_URL}${path}`);
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
    const res = await fetch(url.toString(), {
      headers: { "Api-Key": this.credentials.api_key, Accept: "application/json" },
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`Smoobu API error ${res.status}: ${path} — ${text.slice(0, 200)}`);
    }
    return res.json();
  }

  private async getAll<T>(
    path: string,
    listKey: string,
    params: Record<string, string> = {}
  ): Promise<T[]> {
    const PAGE_SIZE = 100;
    let page = 1;
    const all: T[] = [];
    while (true) {
      const data = await this.get<Record<string, unknown>>(path, {
        ...params, pageSize: String(PAGE_SIZE), page: String(page),
      });
      const items = (data[listKey] ?? []) as T[];
      all.push(...items);
      const total = Number(data.total ?? data.totalItems ?? 0);
      if (items.length < PAGE_SIZE || (total > 0 && all.length >= total)) break;
      page++;
      await new Promise((r) => setTimeout(r, 200));
    }
    return all;
  }

  async testConnection() {
    try { await this.get("/apartments", { pageSize: "1" }); return { ok: true }; }
    catch (err) { return { ok: false, error: err instanceof Error ? err.message : "Unknown" }; }
  }

  async fetchProperties(): Promise<PMSProperty[]> {
    const results = await this.getAll<unknown>("/apartments", "apartments");
    return results.map((l: unknown) => {
      const p = l as Record<string, unknown>;
      const loc = (p.location ?? {}) as Record<string, unknown>;
      return {
        externalId: String(p.id ?? ""),
        name: String(p.name ?? ""),
        address: {
          street: String(loc.address ?? p.address ?? ""),
          city: String(loc.city ?? p.city ?? ""),
          state: String(loc.state ?? p.state ?? ""),
          country: String(loc.country ?? p.country ?? ""),
          lat: Number(loc.latitude ?? 0),
          lng: Number(loc.longitude ?? 0),
        },
        bedrooms: Number(p.bedrooms ?? p.rooms ?? 0),
        bathrooms: Number(p.bathrooms ?? 0),
        amenities: Array.isArray(p.amenities) ? p.amenities.map(String) : [],
        basePrice: Number((p.price as Record<string, unknown>)?.price ?? p.basePrice ?? 0),
        currency: String((p.price as Record<string, unknown>)?.currency ?? "USD"),
        rawData: p,
      };
    });
  }

  async fetchBookings(params?: BookingQueryParams): Promise<PMSBooking[]> {
    const query: Record<string, string> = { showCancellation: "1" };
    if (params?.since) query.modifiedFrom = params.since;
    const results = await this.getAll<unknown>("/reservations", "bookings", query);
    return results.map((r: unknown) => {
      const res = r as Record<string, unknown>;
      const type = String(res.type ?? "");
      const status = type === "cancellation" ? "cancelled"
        : type === "blocked" ? "blocked" : "confirmed";
      const channelRaw = res.channel ?? res.channelName ?? res.source;
      const platform = channelRaw && typeof channelRaw === "object"
        ? String((channelRaw as Record<string, unknown>).name ?? "direct")
        : String(channelRaw ?? "direct");
      return {
        externalId: String(res.id ?? ""),
        propertyExternalId: String(res.apartmentId ?? res.propertyId ?? ""),
        status,
        checkIn: String(res.arrival ?? res.checkIn ?? ""),
        checkOut: String(res.departure ?? res.checkOut ?? ""),
        guests: Number(res.adults ?? 0) + Number(res.children ?? 0),
        totalRevenue: Number(res.price ?? res.totalPrice ?? 0),
        platform,
        rawData: res,
      };
    });
  }

  async fetchReviews(_propertyId: string): Promise<PMSReview[]> { return []; }
}
