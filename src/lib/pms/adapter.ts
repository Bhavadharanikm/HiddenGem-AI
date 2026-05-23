export type PMSProvider =
  | "guesty" | "hostaway" | "lodgify" | "hostfully"
  | "ownerrez" | "igms" | "smoobu" | "beds24"
  | "streamline" | "liverez" | "track" | "custom";

export interface PMSAddress {
  street?: string;
  city?: string;
  state?: string;
  country?: string;
  lat?: number;
  lng?: number;
}

export interface PMSProperty {
  externalId: string;
  name: string;
  address: PMSAddress;
  bedrooms: number;
  bathrooms: number;
  amenities: string[];
  basePrice: number;
  currency: string;
  rawData: Record<string, unknown>;
}

export interface PMSBooking {
  externalId: string;
  propertyExternalId: string;
  status: string;
  checkIn: string; // ISO date
  checkOut: string;
  guests: number;
  totalRevenue: number;
  platform: string;
  rawData: Record<string, unknown>;
}

export interface PMSReview {
  externalId: string;
  propertyExternalId: string;
  rating: number;
  reviewerName?: string;
  reviewText?: string;
  responseText?: string;
  reviewDate: string;
  rawData: Record<string, unknown>;
}

export interface BookingQueryParams {
  since?: string; // ISO date — for delta sync
  from?: string;  // ISO date — window start (full sync)
  to?: string;    // ISO date — window end (full sync)
  limit?: number;
}

export interface PMSAdapter {
  readonly provider: PMSProvider;
  testConnection(): Promise<{ ok: boolean; error?: string }>;
  fetchProperties(): Promise<PMSProperty[]>;
  fetchBookings(params?: BookingQueryParams): Promise<PMSBooking[]>;
  fetchReviews(propertyId: string): Promise<PMSReview[]>;
}
