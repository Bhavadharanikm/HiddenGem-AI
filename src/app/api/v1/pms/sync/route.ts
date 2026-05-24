import { NextRequest } from "next/server";
import { validateApiKey } from "@/lib/api/auth";
import { error, ok } from "@/lib/api/response";
import { getServiceClient } from "@/lib/supabase/service";

export async function POST(req: NextRequest) {
  const isDashboard = req.headers.get("X-Dashboard-Session") === "1";
  let tenantId: string;

  if (isDashboard) {
    let body: { tenant_id?: string };
    try { body = await req.json(); } catch { body = {}; }
    if (!body.tenant_id) return error("UNAUTHORIZED", "tenant_id required for dashboard session");
    tenantId = body.tenant_id;
  } else {
    const auth = await validateApiKey(req);
    if (!auth) return error("UNAUTHORIZED", "Invalid or missing API key");
    tenantId = auth.tenantId;
  }

  const db = getServiceClient();

  const { data: connections } = await db
    .from("pms_connections")
    .select("id, provider, credentials, last_sync_at, sync_status")
    .eq("tenant_id", tenantId)
    .eq("is_active", true);

  if (!connections?.length) {
    return ok({ started: false, message: "No active PMS connections" });
  }

  // Skip if a sync started within the last 20 minutes to prevent concurrent runs
  const LOCK_WINDOW_MS = 20 * 60 * 1000;
  const alreadyRunning = connections.some(
    (c) => c.sync_status === "running" && c.last_sync_at &&
      Date.now() - new Date(c.last_sync_at).getTime() < LOCK_WINDOW_MS
  );
  if (alreadyRunning) {
    return ok({ started: false, message: "Sync already in progress" });
  }

  // Mark all connections as running immediately
  await db
    .from("pms_connections")
    .update({ sync_status: "running" })
    .in("id", connections.map((c) => c.id));

  // Fire the Netlify background function — runs up to 15 min, not subject to serverless timeout
  const siteUrl = process.env.URL ?? process.env.NEXT_PUBLIC_SITE_URL;
  const cronSecret = process.env.CRON_SECRET;

  if (siteUrl && cronSecret) {
    const connIds = connections.map((c) => c.id);
    fetch(`${siteUrl}/.netlify/functions/pms-sync-bg-background`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${cronSecret}`,
      },
      body: JSON.stringify({ tenant_id: tenantId, connection_ids: connIds }),
    }).then(async (bgRes) => {
      if (!bgRes.ok) {
        const text = await bgRes.text().catch(() => "");
        console.error(`[pms/sync] Background function returned ${bgRes.status}: ${text.slice(0, 200)}`);
        await db.from("pms_connections").update({ sync_status: "error" }).in("id", connIds);
      }
    }).catch(async (err) => {
      console.error("[pms/sync] Failed to invoke background function:", err);
      await db.from("pms_connections").update({ sync_status: "error" }).in("id", connIds);
    });
  } else {
    // Local dev fallback — runs inline (no 15-min limit needed locally)
    const { after } = await import("next/server");
    const { createPMSAdapter } = await import("@/lib/pms/factory");
    const { dispatchWebhook } = await import("@/lib/webhooks/dispatcher");
    const { decryptCredentials } = await import("@/lib/crypto/credentials");
    type PMSProvider = import("@/lib/pms/adapter").PMSProvider;

    after(async () => {
      let totalProperties = 0, totalBookings = 0;
      for (const conn of connections) {
        try {
          const credentials = await decryptCredentials(conn.credentials);
          const adapter = createPMSAdapter(conn.provider as PMSProvider, credentials);
          const properties = await adapter.fetchProperties();
          if (properties.length > 0) {
            const propRows = properties.map((p) => ({
              tenant_id: tenantId, connection_id: conn.id, external_id: p.externalId,
              name: p.name, address: p.address as unknown as import("@/types/database").Json, bedrooms: p.bedrooms, bathrooms: p.bathrooms,
              amenities: p.amenities, base_price: p.basePrice, currency: p.currency,
              raw_data: p.rawData as unknown as import("@/types/database").Json,
              synced_at: new Date().toISOString(),
            }));
            for (let i = 0; i < propRows.length; i += 100) {
              await db.from("pms_properties").upsert(propRows.slice(i, i + 100), { onConflict: "connection_id,external_id" });
            }
            totalProperties += properties.length;
          }
          const { data: storedProps } = await db.from("pms_properties").select("id, external_id").eq("tenant_id", tenantId);
          const propIdMap: Record<string, string> = Object.fromEntries((storedProps ?? []).map((p) => [p.external_id, p.id]));
          const syncNow = new Date();
          const from3m = new Date(syncNow); from3m.setMonth(from3m.getMonth() - 3);
          const to3m   = new Date(syncNow); to3m.setMonth(to3m.getMonth() + 3);
          const bookings = await adapter.fetchBookings(
            conn.last_sync_at
              ? { since: conn.last_sync_at }
              : { from: from3m.toISOString().split("T")[0], to: to3m.toISOString().split("T")[0] }
          );
          if (bookings.length > 0) {
            const bookingRows = bookings.filter((b) => propIdMap[b.propertyExternalId]).map((b) => ({
              tenant_id: tenantId, property_id: propIdMap[b.propertyExternalId], external_id: b.externalId,
              status: b.status, check_in: b.checkIn || null, check_out: b.checkOut || null,
              guests: b.guests, total_revenue: b.totalRevenue, platform: b.platform,
              raw_data: b.rawData as unknown as import("@/types/database").Json,
              synced_at: new Date().toISOString(),
            }));
            for (let i = 0; i < bookingRows.length; i += 100) {
              await db.from("pms_bookings").upsert(bookingRows.slice(i, i + 100), { onConflict: "property_id,external_id" });
            }
            totalBookings += bookingRows.length;
          }
          // Derived metrics: daily for last 90 days, monthly for historical context
          try {
            const metricsNow = new Date();
            const metricDates: string[] = [];
            for (let d = 0; d < 90; d++) {
              const dt = new Date(metricsNow);
              dt.setDate(dt.getDate() - d);
              metricDates.push(dt.toISOString().split("T")[0]);
            }
            for (let m = 4; m <= 48; m++) {
              const dt = new Date(metricsNow.getFullYear(), metricsNow.getMonth() - m, 1);
              metricDates.push(dt.toISOString().split("T")[0]);
            }
            for (let i = 0; i < metricDates.length; i += 10) {
              await Promise.all(
                metricDates.slice(i, i + 10).map((date) =>
                  db.rpc("upsert_pms_derived_metrics", { p_tenant_id: tenantId, p_date: date }).then(() => {}, () => {})
                )
              );
            }
          } catch { /* metric errors don't fail the sync */ }
          await db.from("pms_connections").update({ sync_status: "idle", last_sync_at: new Date().toISOString() }).eq("id", conn.id);
        } catch (err) {
          console.error(`[pms/sync] connection ${conn.id}:`, err);
          await db.from("pms_connections").update({ sync_status: "error" }).eq("id", conn.id);
        }
      }
      await dispatchWebhook(tenantId, "sync.pms.finished", { properties: totalProperties, bookings: totalBookings }).catch(() => {});
    });
  }

  return ok({ started: true });
}
