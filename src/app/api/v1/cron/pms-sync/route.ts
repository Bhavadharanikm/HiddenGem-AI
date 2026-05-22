import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase/service";
import { createPMSAdapter } from "@/lib/pms/factory";
import type { PMSProvider } from "@/lib/pms/adapter";
import type { Json } from "@/types/database";

export const maxDuration = 300; // 5 min — Netlify scheduled functions allow up to 15 min

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const authHeader = req.headers.get("authorization");

  if (!secret || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getServiceClient();

  const { data: connections, error: fetchError } = await db
    .from("pms_connections")
    .select("id, tenant_id, provider, credentials, last_sync_at")
    .eq("is_active", true);

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 });
  }

  if (!connections?.length) {
    return NextResponse.json({ synced: 0, message: "No active PMS connections" });
  }

  let totalProperties = 0;
  let totalBookings = 0;
  const tenantsSynced = new Set<string>();

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

      // Properties + reviews
      const properties = await adapter.fetchProperties();
      for (const prop of properties) {
        const { data: upserted } = await db
          .from("pms_properties")
          .upsert(
            {
              tenant_id: conn.tenant_id,
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

        const reviews = await adapter.fetchReviews(prop.externalId).catch(() => []);
        for (const rev of reviews) {
          await db.from("pms_reviews").upsert(
            {
              tenant_id: conn.tenant_id,
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

      // Delta bookings since last sync
      const bookings = await adapter.fetchBookings({
        since: conn.last_sync_at ?? undefined,
      });

      for (const booking of bookings) {
        const { data: propRow } = await db
          .from("pms_properties")
          .select("id")
          .eq("tenant_id", conn.tenant_id)
          .eq("external_id", booking.propertyExternalId)
          .maybeSingle();

        if (!propRow) continue;

        await db.from("pms_bookings").upsert(
          {
            tenant_id: conn.tenant_id,
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

      tenantsSynced.add(conn.tenant_id);
    } catch (err) {
      console.error(`[cron/pms-sync] connection ${conn.id}:`, err);
      await db
        .from("pms_connections")
        .update({ sync_status: "error" })
        .eq("id", conn.id);
    }
  }

  // Recompute derived metrics (occupancy, ADR, revenue) for the last 90 days
  const today = new Date();
  for (const tenantId of tenantsSynced) {
    for (let i = 0; i < 90; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split("T")[0];
      await db
        .rpc("upsert_pms_derived_metrics", { p_tenant_id: tenantId, p_date: dateStr })
        .catch(() => {});
    }
  }

  console.log(
    `[cron/pms-sync] done — tenants: ${tenantsSynced.size}, properties: ${totalProperties}, bookings: ${totalBookings}`
  );

  return NextResponse.json({
    tenants: tenantsSynced.size,
    properties: totalProperties,
    bookings: totalBookings,
  });
}
