import type {
  PMSAdapter,
  PMSProperty,
  PMSBooking,
  PMSReview,
  BookingQueryParams,
} from "./adapter";

type HostfullyCredentials = {
  api_key: string;
  agency_uid: string;
};

const BASE_URL = "https://platformapi.hostfully.com/v2";

// Hostfully "lead" status → normalised status
const STATUS_MAP: Record<string, string> = {
  NEW_INQUIRY:        "inquiry",
  BOOKED:             "confirmed",
  CANCELLED:          "cancelled",
  DECLINED:           "cancelled",
  EXPIRED:            "cancelled",
  REQUEST_TO_BOOK:    "inquiry",
  CHECKED_IN:         "confirmed",
  CHECKED_OUT:        "confirmed",
};

export class HostfullyAdapter implements PMSAdapter {
  readonly provider = "hostfully" as const;

  constructor(private credentials: HostfullyCredentials) {}

  private async get<T>(path: string, params: Record<string, string> = {}): Promise<T> {
    const url = new URL(`${BASE_URL}${path}`);
    url.searchParams.set("agencyUid", this.credentials.agency_uid);
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));

    const res = await fetch(url.toString(), {
      headers: {
        "X-HOSTFULLY-APIKEY": this.credentials.api_key,
        Accept: "application/json",
      },
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`Hostfully API error ${res.status}: ${path} — ${text.slice(0, 200)}`);
    }
    return res.json();
  }

  private async getAll<T>(
    path: string,
    listKey: string,
    params: Record<string, string> = {}
  ): Promise<T[]> {
    const LIMIT = 50;
    let offset = 0;
    const all: T[] = [];

    while (true) {
      const data = await this.get<Record<string, unknown>>(path, {
        ...params,
        limit: String(LIMIT),
        offset: String(offset),
      });

      const page = (data[listKey] ?? []) as T[];
      all.push(...page);

      const total = Number(data.total ?? data.count ?? 0);
      if (page.length < LIMIT || (total > 0 && all.length >= total)) break;
      offset += LIMIT;
      await new Promise((r) => setTimeout(r, 200));
    }

    return all;
  }

  async testConnection() {
    try {
      await this.get("/properties", { limit: "1" });
      return { ok: true };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : "Unknown" };
    }
  }

  async fetchProperties(): Promise<PMSProperty[]> {
    const results = await this.getAll<unknown>("/properties", "propertiesList");

    return results.map((l: unknown) => {
      const p = l as Record<string, unknown>;
      const amenities = Array.isArray(p.amenities)
        ? p.amenities.map((a: unknown) => {
            if (typeof a === "string") return a;
            const ao = a as Record<string, unknown>;
            return String(ao.amenityType ?? ao.name ?? a);
          })
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
    const query: Record<string, string> = {};
    if (params?.since) {
      // Hostfully: filter by last-updated date
      query.lastUpdateFilter = params.since;
    }

    const results = await this.getAll<unknown>("/leads", "leadsList", query);

    return results.map((r: unknown) => {
      const lead = r as Record<string, unknown>;
      const status = STATUS_MAP[String(lead.status ?? "")] ?? String(lead.status ?? "");

      const channelRaw = lead.source ?? lead.bookingSource;
      const platform = channelRaw == null
        ? "direct"
        : typeof channelRaw === "object"
          ? String((channelRaw as Record<string, unknown>).name ?? "direct")
          : String(channelRaw || "direct");

      return {
        externalId: String(lead.uid ?? lead.id ?? ""),
        propertyExternalId: String(lead.propertyUid ?? lead.propertyId ?? ""),
        status,
        checkIn: String(lead.checkInDate ?? ""),
        checkOut: String(lead.checkOutDate ?? ""),
        guests: Number(lead.numberOfGuests ?? lead.guestCount ?? 0),
        totalRevenue: Number(lead.totalPrice ?? lead.price ?? 0),
        platform,
        rawData: lead,
      };
    });
  }

  async fetchReviews(_propertyId: string): Promise<PMSReview[]> {
    return [];
  }
}
