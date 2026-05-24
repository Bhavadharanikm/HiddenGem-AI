import type { Config } from "@netlify/functions";
import { createClient } from "@supabase/supabase-js";
import { createPMSAdapter } from "../../src/lib/pms/factory";
import type { PMSProvider } from "../../src/lib/pms/adapter";
import { decryptCredentials } from "../../src/lib/crypto/credentials";

function getDb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

export default async function handler(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  let body: { tenant_id: string; connection_ids: string[] };
  try {
    body = await req.json();
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  const { tenant_id: tenantId, connection_ids: connectionIds } = body;
  if (!tenantId || !connectionIds?.length) {
    return new Response("Missing tenant_id or connection_ids", { status: 400 });
  }

  const db = getDb();

  const { data: connections } = await db
    .from("pms_connections")
    .select("id, provider, credentials, last_sync_at, sync_status")
    .in("id", connectionIds);

  if (!connections?.length) return new Response("No connections found", { status: 404 });

  for (const conn of connections) {
    try {
      const credentials = await decryptCredentials(conn.credentials);
      const adapter = createPMSAdapter(conn.provider as PMSProvider, credentials);

      // ── Properties ────────────────────────────────────────────────
      const properties = await adapter.fetchProperties();
      if (properties.length > 0) {
        const propRows = properties.map((p) => ({
          tenant_id: tenantId,
          connection_id: conn.id,
          external_id: p.externalId,
          name: p.name,
          address: p.address as unknown as import("../../src/types/database").Json,
          bedrooms: p.bedrooms,
          bathrooms: p.bathrooms,
          amenities: p.amenities,
          base_price: p.basePrice,
          currency: p.currency,
          raw_data: p.rawData as unknown as import("../../src/types/database").Json,
          synced_at: new Date().toISOString(),
        }));
        for (let i = 0; i < propRows.length; i += 100) {
          await db
            .from("pms_properties")
            .upsert(propRows.slice(i, i + 100), { onConflict: "connection_id,external_id" });
        }
      }

      // Build external_id → internal UUID map in one query
      const { data: storedProps } = await db
        .from("pms_properties")
        .select("id, external_id")
        .eq("tenant_id", tenantId);
      const propIdMap: Record<string, string> = Object.fromEntries(
        (storedProps ?? []).map((p: { id: string; external_id: string }) => [p.external_id, p.id])
      );

      // ── Bookings ───────────────────────────────────────────────────
      const bgSyncNow = new Date();
      const from3m = new Date(bgSyncNow); from3m.setMonth(from3m.getMonth() - 3);
      const to3m   = new Date(bgSyncNow); to3m.setMonth(to3m.getMonth() + 3);
      const bookings = await adapter.fetchBookings(
        conn.last_sync_at
          ? { since: conn.last_sync_at }
          : { from: from3m.toISOString().split("T")[0], to: to3m.toISOString().split("T")[0] }
      );
      console.log(`[pms-sync-bg] ${conn.provider} ${conn.id} — fetched ${bookings.length} bookings`);

      if (bookings.length > 0) {
        const bookingRows = bookings
          .filter((b) => propIdMap[b.propertyExternalId])
          .map((b) => ({
            tenant_id: tenantId,
            property_id: propIdMap[b.propertyExternalId],
            external_id: b.externalId,
            status: b.status,
            check_in: b.checkIn || null,
            check_out: b.checkOut || null,
            guests: b.guests,
            total_revenue: b.totalRevenue,
            platform: b.platform,
            raw_data: b.rawData as unknown as import("../../src/types/database").Json,
            synced_at: new Date().toISOString(),
          }));
        for (let i = 0; i < bookingRows.length; i += 100) {
          await db
            .from("pms_bookings")
            .upsert(bookingRows.slice(i, i + 100), { onConflict: "property_id,external_id" });
        }
      }

      // ── Derived metrics: daily for last 90 days, monthly for historical context ─
      // Batched conservatively (10 concurrent) to avoid overwhelming the DB connection pool.
      try {
        const metricsNow = new Date();
        const metricDates: string[] = [];
        // Daily — last 90 days (covers the AI's default 90-day analytics window)
        for (let d = 0; d < 90; d++) {
          const dt = new Date(metricsNow);
          dt.setDate(dt.getDate() - d);
          metricDates.push(dt.toISOString().split("T")[0]);
        }
        // Monthly — months 4–48 ago (bridge from 90-day daily window back 4 years)
        for (let m = 4; m <= 48; m++) {
          const dt = new Date(metricsNow.getFullYear(), metricsNow.getMonth() - m, 1);
          metricDates.push(dt.toISOString().split("T")[0]);
        }
        let metricErrors = 0;
        for (let i = 0; i < metricDates.length; i += 10) {
          await Promise.all(
            metricDates.slice(i, i + 10).map((date) =>
              db
                .rpc("upsert_pms_derived_metrics", { p_tenant_id: tenantId, p_date: date })
                .then(
                  () => {},
                  (err) => { metricErrors++; if (metricErrors <= 3) console.error("[pms-sync-bg] metric RPC failed for", date, err); }
                )
            )
          );
        }
        if (metricErrors > 0) console.warn(`[pms-sync-bg] ${metricErrors} metric dates failed for tenant ${tenantId}`);
      } catch (metricErr) {
        console.error("[pms-sync-bg] metric loop threw unexpectedly:", metricErr);
      }

      await db
        .from("pms_connections")
        .update({ sync_status: "idle", last_sync_at: new Date().toISOString() })
        .eq("id", conn.id);

      console.log(`[pms-sync-bg] ${conn.provider} connection ${conn.id} — OK`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[pms-sync-bg] ${conn.provider} connection ${conn.id} — FAILED:`, msg);
      await db
        .from("pms_connections")
        .update({ sync_status: "error" })
        .eq("id", conn.id);
    }
  }

  return new Response("OK");
}

export const config: Config = {};
