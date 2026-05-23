import type {
  PMSAdapter,
  PMSProperty,
  PMSBooking,
  PMSReview,
  BookingQueryParams,
} from "./adapter";

type GuestyCredentials = {
  clientId?: string;
  clientSecret?: string;
  client_id?: string;
  client_secret?: string;
};

const HOSTS = [
  { auth: "https://open-api.guesty.com/oauth2/token", base: "https://open-api.guesty.com/v1", scope: "open-api" },
  { auth: "https://booking.guesty.com/oauth2/token",  base: "https://booking.guesty.com/v1",  scope: null },
];

const STATUS_MAP: Record<string, string> = {
  inquiry:     "inquiry",
  pending:     "inquiry",
  reserved:    "confirmed",
  confirmed:   "confirmed",
  checked_in:  "confirmed",
  checked_out: "confirmed",
  canceled:    "cancelled",
  cancelled:   "cancelled",
  declined:    "cancelled",
  expired:     "cancelled",
  blocked:     "blocked",
};

// Fields we request from /listings — Guesty omits most without explicit fields param
const LISTING_FIELDS = [
  "_id title nickname accommodates bedrooms bathrooms",
  "address prices amenities pictures",
  "publicDescription tags active isListed",
  "type cleaningFee defaultCheckInTime defaultCheckOutTime",
].join(" ");

// Fields we request from /reservations — without this Guesty returns only minimal data
const RESERVATION_FIELDS = [
  "_id status checkInDateLocalized checkOutDateLocalized checkIn checkOut",
  "guestsCount numberOfGuests nightsCount confirmationCode",
  "guest listing listingId money source channel integration",
  "lastUpdatedAt plannedArrival plannedDeparture notes",
].join(" ");

export class GuestyAdapter implements PMSAdapter {
  readonly provider = "guesty" as const;
  private accessToken: string | null = null;
  private tokenExpiry = 0;
  private hostIdx = 0; // resolved during first successful auth

  constructor(private credentials: GuestyCredentials) {}

  private async getToken(signal?: AbortSignal): Promise<string> {
    if (this.accessToken && Date.now() < this.tokenExpiry) return this.accessToken;

    // Try each host in order; on a 4xx auth failure, move on to the next
    for (let h = 0; h < HOSTS.length; h++) {
      const host = HOSTS[h];
      const bodyParams: Record<string, string> = {
        grant_type: "client_credentials",
        client_id: this.credentials.clientId ?? this.credentials.client_id ?? "",
        client_secret: this.credentials.clientSecret ?? this.credentials.client_secret ?? "",
      };
      if (host.scope) bodyParams.scope = host.scope;
      const body = new URLSearchParams(bodyParams);
      let delay = 3000;
      for (let attempt = 0; attempt <= 5; attempt++) {
        let res: Response;
        try {
          res = await fetch(host.auth, {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body,
            signal,
          });
        } catch (err) {
          const cause = err instanceof Error && err.cause instanceof Error ? `: ${err.cause.message}` : "";
          throw new Error(`Guesty auth network error${cause}`);
        }
        if (res.status === 429) {
          if (attempt === 5) throw new Error("Guesty auth rate limited after 5 retries");
          const retryAfter = Number(res.headers.get("Retry-After") ?? 0) * 1000;
          await new Promise((r) => setTimeout(r, retryAfter || delay));
          delay *= 2;
          continue;
        }
        if (!res.ok) {
          const text = await res.text().catch(() => "");
          // On any 4xx (wrong host or invalid scope), try the next host
          if (res.status < 500 && h < HOSTS.length - 1) break;
          throw new Error(`Guesty auth failed (${res.status}): ${text.slice(0, 200)}`);
        }
        const data = await res.json();
        this.hostIdx = h;
        this.accessToken = data.access_token;
        this.tokenExpiry = Date.now() + (data.expires_in - 60) * 1000;
        return this.accessToken!;
      }
    }
    throw new Error("Guesty auth failed: credentials rejected on all endpoints");
  }

  private get baseUrl() { return HOSTS[this.hostIdx].base; }

  // Single-shot auth + fetch used only for testConnection — no retries, respects AbortSignal
  private async getWithSignal<T>(path: string, params: Record<string, string>, signal: AbortSignal): Promise<T> {
    // Try each host with a single auth attempt (no retry loops)
    let lastErr = "Unknown";
    for (let h = 0; h < HOSTS.length; h++) {
      const host = HOSTS[h];
      const bodyParams: Record<string, string> = {
        grant_type: "client_credentials",
        client_id: this.credentials.clientId ?? this.credentials.client_id ?? "",
        client_secret: this.credentials.clientSecret ?? this.credentials.client_secret ?? "",
      };
      if (host.scope) bodyParams.scope = host.scope;

      let authRes: Response;
      try {
        authRes = await fetch(host.auth, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams(bodyParams),
          signal,
        });
      } catch (err) {
        throw err; // network error or abort — stop immediately
      }

      if (!authRes.ok) {
        const text = await authRes.text().catch(() => "");
        lastErr = `Guesty auth failed (${authRes.status}): ${text.slice(0, 200)}`;
        if (authRes.status < 500 && h < HOSTS.length - 1) continue; // try next host
        throw new Error(lastErr);
      }

      const { access_token } = await authRes.json();
      const url = new URL(`${host.base}${path}`);
      Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));

      const apiRes = await fetch(url.toString(), {
        headers: { Authorization: `Bearer ${access_token}` },
        signal,
      });

      if (!apiRes.ok) {
        const text = await apiRes.text().catch(() => "");
        throw new Error(`Guesty API error ${apiRes.status}: ${path} — ${text.slice(0, 200)}`);
      }

      // Cache the resolved token and host for subsequent calls
      this.hostIdx = h;
      this.accessToken = access_token;
      this.tokenExpiry = Date.now() + 3500 * 1000;

      return apiRes.json();
    }
    throw new Error(lastErr);
  }

  private async get<T>(path: string, params?: Record<string, string>): Promise<T> {
    const token = await this.getToken();
    const url = new URL(`${this.baseUrl}${path}`);
    if (params) Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));

    let delay = 2000;
    for (let attempt = 0; attempt <= 5; attempt++) {
      const res = await fetch(url.toString(), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 429) {
        if (attempt === 5) throw new Error(`Guesty API rate limited: ${path}`);
        const retryAfter = Number(res.headers.get("Retry-After") ?? 0) * 1000;
        await new Promise((r) => setTimeout(r, retryAfter || delay));
        delay *= 2;
        continue;
      }
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`Guesty API error ${res.status}: ${path} — ${text.slice(0, 200)}`);
      }
      return res.json();
    }
    throw new Error(`Guesty API error: ${path}`);
  }

  private async getAll<T>(path: string, params: Record<string, string> = {}): Promise<T[]> {
    const PAGE = 100;
    let skip = 0;
    const all: T[] = [];
    while (true) {
      const data = await this.get<{ results: T[]; count: number }>(path, {
        ...params,
        limit: String(PAGE),
        skip: String(skip),
      });
      const results = data.results ?? [];
      all.push(...results);
      if (all.length >= data.count || results.length < PAGE) break;
      skip += PAGE;
      await new Promise((r) => setTimeout(r, 150));
    }
    return all;
  }

  async testConnection() {
    // Use a 8-second hard timeout so the serverless function never hangs
    const abort = new AbortController();
    const timer = setTimeout(() => abort.abort(), 8000);
    try {
      await this.getWithSignal("/listings", { limit: "1", skip: "0" }, abort.signal);
      return { ok: true };
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown";
      if (abort.signal.aborted) {
        return { ok: false, error: "Connection timed out — Guesty did not respond within 8 seconds. Check your credentials and try again." };
      }
      const hint = msg.includes("404")
        ? `${msg} — Make sure you're using Open API credentials (Settings → Integrations → API in Guesty), not Booking Engine credentials.`
        : msg;
      return { ok: false, error: hint };
    } finally {
      clearTimeout(timer);
    }
  }

  async fetchProperties(): Promise<PMSProperty[]> {
    const results = await this.getAll<unknown>("/listings", { fields: LISTING_FIELDS });
    return results.map((l: unknown) => {
      const listing = l as Record<string, unknown>;
      const address = (listing.address ?? {}) as Record<string, unknown>;
      const prices = (listing.prices ?? listing.pricing ?? {}) as Record<string, unknown>;
      return {
        externalId: String(listing._id ?? ""),
        name: String(listing.nickname ?? listing.title ?? listing.name ?? ""),
        address: {
          street: String(address.street ?? address.full ?? ""),
          city: String(address.city ?? ""),
          state: String(address.state ?? ""),
          country: String(address.country ?? ""),
        },
        bedrooms: Number(listing.bedrooms ?? listing.bedroomsCount ?? 0),
        bathrooms: Number(listing.bathrooms ?? listing.bathroomsCount ?? 0),
        amenities: Array.isArray(listing.amenities) ? listing.amenities.map(String) : [],
        basePrice: Number(prices.basePrice ?? prices.base ?? 0),
        currency: String(prices.currency ?? "USD"),
        rawData: listing,
      };
    });
  }

  async fetchBookings(params?: BookingQueryParams): Promise<PMSBooking[]> {
    const query: Record<string, string> = { fields: RESERVATION_FIELDS };

    if (params?.since) {
      // Delta sync — only reservations updated since last sync
      query["filters[0][field]"] = "lastUpdatedAt";
      query["filters[0][operator]"] = "$gte";
      query["filters[0][value]"] = params.since;
    } else {
      // Full sync — 3 months back to 3 months forward
      const from = params?.from ?? new Date(Date.now() - 90 * 86400000).toISOString().split("T")[0];
      const to   = params?.to   ?? new Date(Date.now() + 90 * 86400000).toISOString().split("T")[0];
      query["filters[0][field]"]    = "checkIn";
      query["filters[0][operator]"] = "$gte";
      query["filters[0][value]"]    = from;
      query["filters[1][field]"]    = "checkIn";
      query["filters[1][operator]"] = "$lte";
      query["filters[1][value]"]    = to;
    }

    const results = await this.getAll<unknown>("/reservations", query);
    return results.map((r: unknown) => {
      const res = r as Record<string, unknown>;
      const money = (res.money ?? {}) as Record<string, unknown>;
      const listing = (res.listing ?? {}) as Record<string, unknown>;
      const guest = (res.guest ?? {}) as Record<string, unknown>;
      const guestsField = (res.guests ?? {}) as Record<string, unknown>;

      const propertyExternalId = String(
        res.listingId ?? listing._id ?? listing.id ?? ""
      );

      // Revenue: prefer host payout, fall back through other money fields
      const totalRevenue = Number(
        money.hostPayout ?? money.ownerRevenue ?? money.totalPaid ?? money.netIncome ??
        money.fareAccommodation ?? money.totalRevenue ?? 0
      );

      const guestCount = Number(
        res.guestsCount ?? res.numberOfGuests ?? res.guestCount ??
        guestsField.count ?? guestsField.total ??
        ((guestsField.adults !== undefined)
          ? Number(guestsField.adults ?? 0) + Number(guestsField.children ?? 0)
          : undefined) ?? 0
      );

      const checkIn = String(
        res.checkInDateLocalized ?? res.checkIn ?? res.checkInDate ?? ""
      ).slice(0, 10);
      const checkOut = String(
        res.checkOutDateLocalized ?? res.checkOut ?? res.checkOutDate ?? ""
      ).slice(0, 10);

      // Platform/channel: Guesty returns channel as an object { _id, name }
      const channelRaw = res.source ?? res.channel ?? res.integration;
      const platform = channelRaw == null
        ? "direct"
        : typeof channelRaw === "object"
          ? String((channelRaw as Record<string, unknown>).name ?? (channelRaw as Record<string, unknown>)._id ?? "direct")
          : String(channelRaw || "direct");

      const rawStatus = String(res.status ?? res.reservationStatus ?? "").toLowerCase();
      const status = STATUS_MAP[rawStatus] ?? rawStatus;

      // Merge guest name into rawData for AI context
      const guestName = [guest.firstName, guest.lastName].filter(Boolean).join(" ") || undefined;
      const enrichedRawData: Record<string, unknown> = { ...res };
      if (guestName) enrichedRawData._guestName = guestName;
      if (res.confirmationCode) enrichedRawData._confirmationCode = res.confirmationCode;
      if (res.nightsCount) enrichedRawData._nights = res.nightsCount;

      return {
        externalId: String(res._id ?? res.id ?? ""),
        propertyExternalId,
        status,
        checkIn,
        checkOut,
        guests: guestCount,
        totalRevenue,
        platform,
        rawData: enrichedRawData,
      };
    });
  }

  async fetchReviews(propertyId: string): Promise<PMSReview[]> {
    const data = await this.get<{ results: unknown[] }>("/reviews", {
      listingId: propertyId,
    });
    return (data.results ?? []).map((r: unknown) => {
      const review = r as Record<string, unknown>;
      return {
        externalId: String(review._id ?? ""),
        propertyExternalId: propertyId,
        rating: Number(review.rating ?? 0),
        reviewerName: String(review.reviewerName ?? ""),
        reviewText: String(review.publicReview ?? ""),
        responseText: String(review.response ?? ""),
        reviewDate: String(review.createdAt ?? ""),
        rawData: review,
      };
    });
  }
}
