import { getServiceClient } from "@/lib/supabase/service";
import type { Json } from "@/types/database";

const API_VERSION = "v19.0";
const GRAPH_URL = `https://graph.facebook.com/${API_VERSION}`;

async function graphGet<T>(
  path: string,
  params: Record<string, string>,
  accessToken: string
): Promise<T> {
  const url = new URL(`${GRAPH_URL}${path}`);
  url.searchParams.set("access_token", accessToken);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));

  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`Meta API error ${res.status}: ${path}`);
  return res.json();
}

export async function syncMetaAds(tenantId: string): Promise<{
  campaigns: number;
  insights: number;
  audiences: number;
}> {
  const db = getServiceClient();

  const { data: conn } = await db
    .from("meta_connections")
    .select("id, ad_account_id, access_token, last_sync_at")
    .eq("tenant_id", tenantId)
    .eq("is_active", true)
    .maybeSingle();

  if (!conn) return { campaigns: 0, insights: 0, audiences: 0 };

  const c = conn as {
    id: string;
    ad_account_id: string;
    access_token: string;
    last_sync_at: string | null;
  };

  // Sync campaigns
  const campaignData = await graphGet<{ data: unknown[] }>(
    `/act_${c.ad_account_id}/campaigns`,
    {
      fields:
        "id,name,status,objective,budget_remaining,daily_budget,lifetime_budget,start_time,stop_time",
      limit: "100",
    },
    c.access_token
  );

  let campaigns = 0;
  for (const campaign of campaignData.data ?? []) {
    const ca = campaign as Record<string, unknown>;
    await db.from("meta_campaigns").upsert(
      {
        tenant_id: tenantId,
        connection_id: c.id,
        external_id: String(ca.id ?? ""),
        name: String(ca.name ?? ""),
        status: String(ca.status ?? ""),
        objective: String(ca.objective ?? ""),
        raw_data: ca as Json,
      },
      { onConflict: "connection_id,external_id" }
    );
    campaigns++;
  }

  // Sync last 8 days of insights (data settles after 48h)
  const insightStart = new Date(Date.now() - 8 * 86400000)
    .toISOString()
    .split("T")[0];
  const insightEnd = new Date().toISOString().split("T")[0];

  const insightData = await graphGet<{ data: unknown[] }>(
    `/act_${c.ad_account_id}/insights`,
    {
      fields:
        "campaign_id,impressions,reach,clicks,spend,actions,action_values,cpm,cpc,ctr",
      time_range: JSON.stringify({ since: insightStart, until: insightEnd }),
      time_increment: "1",
      level: "campaign",
      limit: "500",
    },
    c.access_token
  );

  let insights = 0;
  for (const row of insightData.data ?? []) {
    const r = row as Record<string, unknown>;
    const { data: campaignRow } = await db
      .from("meta_campaigns")
      .select("id")
      .eq("tenant_id", tenantId)
      .eq("external_id", String(r.campaign_id ?? ""))
      .maybeSingle();

    if (!campaignRow) continue;

    const conversions = (
      (r.actions as Array<{ action_type: string; value: string }>) ?? []
    ).filter((a) => a.action_type === "offsite_conversion.fb_pixel_purchase")
      .reduce((s, a) => s + Number(a.value ?? 0), 0);

    const revenue = (
      (r.action_values as Array<{ action_type: string; value: string }>) ?? []
    ).filter((a) => a.action_type === "offsite_conversion.fb_pixel_purchase")
      .reduce((s, a) => s + Number(a.value ?? 0), 0);

    const spend = Number(r.spend ?? 0);
    const roas = spend > 0 ? revenue / spend : 0;

    await db.from("meta_ad_insights").upsert(
      {
        tenant_id: tenantId,
        campaign_id: campaignRow.id,
        date_start: String(r.date_start ?? ""),
        date_stop: String(r.date_stop ?? ""),
        impressions: Number(r.impressions ?? 0),
        reach: Number(r.reach ?? 0),
        clicks: Number(r.clicks ?? 0),
        spend,
        conversions,
        revenue,
        cpm: Number(r.cpm ?? 0),
        cpc: Number(r.cpc ?? 0),
        ctr: Number(r.ctr ?? 0),
        roas,
        raw_data: r as Json,
      },
      { onConflict: "campaign_id,date_start,date_stop" }
    );
    insights++;
  }

  // Sync audiences
  const audienceData = await graphGet<{ data: unknown[] }>(
    `/act_${c.ad_account_id}/customaudiences`,
    {
      fields:
        "id,name,subtype,description,approximate_count_lower_bound",
      limit: "100",
    },
    c.access_token
  );

  let audiences = 0;
  for (const aud of audienceData.data ?? []) {
    const a = aud as Record<string, unknown>;
    await db.from("meta_audiences").upsert(
      {
        tenant_id: tenantId,
        connection_id: c.id,
        external_id: String(a.id ?? ""),
        name: String(a.name ?? ""),
        type: "custom",
        subtype: String(a.subtype ?? ""),
        description: String(a.description ?? ""),
        approximate_count: Number(a.approximate_count_lower_bound ?? 0),
        raw_data: a as Json,
      },
      { onConflict: "connection_id,external_id" }
    );
    audiences++;
  }

  // Update last_sync_at
  await db
    .from("meta_connections")
    .update({ last_sync_at: new Date().toISOString() })
    .eq("id", c.id);

  return { campaigns, insights, audiences };
}
