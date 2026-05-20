import { NextRequest } from "next/server";
import { validateApiKey } from "@/lib/api/auth";
import { error, ok } from "@/lib/api/response";
import { getServiceClient } from "@/lib/supabase/service";
import { createPMSAdapter } from "@/lib/pms/factory";
import { dispatchWebhook } from "@/lib/webhooks/dispatcher";
import type { PMSProvider } from "@/lib/pms/adapter";
import type { Json } from "@/types/database";

export async function POST(req: NextRequest) {
  const auth = await validateApiKey(req);
  if (!auth) return error("UNAUTHORIZED", "Invalid or missing API key");

  const db = getServiceClient();

  const { data: connections } = await db
    .from("pms_connections")
    .select("id, provider, credentials, last_sync_at")
    .eq("tenant_id", auth.tenantId)
    .eq("is_active", true);

  if (!connections?.length) {
    return ok({ synced: 0, message: "No active PMS connections" });
  }

  let totalProperties = 0;
  let totalBookings = 0;

  for (const conn of connections) {
    try {
      await db
        .from("pms_connections")
        .update({ sync_status: "running" })
        .eq("id", conn.id);

      const adapter = createPMSAdapter(
        conn.provider as PMSProvider,
        conn.credentials as Record<string, string>
      );

      // Fetch and upsert properties
      const properties = await adapter.fetchProperties();
      for (const prop of properties) {
        const { data: upserted } = await db
          .from("pms_properties")
          .upsert(
            {
              tenant_id: auth.tenantId,
              connection_id: conn.id,
              external_id: prop.externalId,
              name: prop.name,
              address: prop.address as Json,
              bedrooms: prop.bedrooms,
              bathrooms: prop.bathrooms,
              amenities: prop.amenities,
              base_price: prop.basePrice,
              currency: prop.currency,
              raw_data: prop.rawData as Json,
            },
            { onConflict: "connection_id,external_id" }
          )
          .select("id")
          .single();
        totalProperties++;

        // Fetch reviews per property
        const reviews = await adapter.fetchReviews(prop.externalId).catch(() => []);
        for (const rev of reviews) {
          await db.from("pms_reviews").upsert(
            {
              tenant_id: auth.tenantId,
              property_id: (upserted as { id: string }).id,
              external_id: rev.externalId,
              rating: rev.rating,
              reviewer_name: rev.reviewerName,
              review_text: rev.reviewText,
              response_text: rev.responseText,
              review_date: rev.reviewDate,
              raw_data: rev.rawData as Json,
            },
            { onConflict: "property_id,external_id" }
          );
        }
      }

      // Fetch delta bookings
      const bookings = await adapter.fetchBookings({
        since: conn.last_sync_at ?? undefined,
      });

      for (const booking of bookings) {
        const { data: propRow } = await db
          .from("pms_properties")
          .select("id")
          .eq("tenant_id", auth.tenantId)
          .eq("external_id", booking.propertyExternalId)
          .maybeSingle();

        if (!propRow) continue;

        await db.from("pms_bookings").upsert(
          {
            tenant_id: auth.tenantId,
            property_id: (propRow as { id: string }).id,
            external_id: booking.externalId,
            status: booking.status,
            check_in: booking.checkIn,
            check_out: booking.checkOut,
            guests: booking.guests,
            total_revenue: booking.totalRevenue,
            platform: booking.platform,
            raw_data: booking.rawData as Json,
          },
          { onConflict: "property_id,external_id" }
        );
        totalBookings++;
      }

      await db
        .from("pms_connections")
        .update({ sync_status: "idle", last_sync_at: new Date().toISOString() })
        .eq("id", conn.id);
    } catch (err) {
      console.error(`[pms/sync] connection ${conn.id}:`, err);
      await db
        .from("pms_connections")
        .update({ sync_status: "error" })
        .eq("id", conn.id);
    }
  }

  await dispatchWebhook(auth.tenantId, "sync.pms.finished", {
    properties: totalProperties,
    bookings: totalBookings,
  }).catch(() => {});

  return ok({ properties: totalProperties, bookings: totalBookings });
}
