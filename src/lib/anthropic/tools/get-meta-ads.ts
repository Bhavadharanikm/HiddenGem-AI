import { getServiceClient } from "@/lib/supabase/service";

export const getMetaAdsTool = {
  name: "query_meta_ads",
  description:
    "Query Meta Ads performance data, campaign details, and audience assets. Use for questions about ad spend, ROAS, click-through rates, campaign performance, or audience targeting.",
  input_schema: {
    type: "object" as const,
    properties: {
      data_type: {
        type: "string",
        enum: ["campaigns", "insights", "audiences", "performance_summary"],
        description: "Type of Meta Ads data to retrieve",
      },
      date_range: {
        type: "object",
        properties: {
          start: { type: "string", description: "Start date (YYYY-MM-DD)" },
          end: { type: "string", description: "End date (YYYY-MM-DD)" },
        },
      },
      limit: { type: "number" },
    },
    required: ["data_type"],
  },
};

export async function executeGetMetaAds(
  tenantId: string,
  input: {
    data_type: "campaigns" | "insights" | "audiences" | "performance_summary";
    date_range?: { start: string; end: string };
    limit?: number;
  }
) {
  const db = getServiceClient();
  const limit = input.limit ?? 20;

  switch (input.data_type) {
    case "campaigns": {
      const { data, error } = await db
        .from("meta_campaigns")
        .select("external_id, name, status, objective")
        .eq("tenant_id", tenantId)
        .order("synced_at", { ascending: false })
        .limit(limit);

      if (error) throw new Error(error.message);
      return { campaigns: data ?? [] };
    }

    case "insights": {
      let query = db
        .from("meta_ad_insights")
        .select("date_start, date_stop, impressions, clicks, spend, roas, ctr")
        .eq("tenant_id", tenantId)
        .order("date_start", { ascending: false })
        .limit(limit);

      if (input.date_range) {
        query = query
          .gte("date_start", input.date_range.start)
          .lte("date_stop", input.date_range.end);
      }

      const { data, error } = await query;
      if (error) throw new Error(error.message);
      return { insights: data ?? [] };
    }

    case "audiences": {
      const { data, error } = await db
        .from("meta_audiences")
        .select("name, type, approximate_count, subtype, description")
        .eq("tenant_id", tenantId)
        .order("approximate_count", { ascending: false })
        .limit(limit);

      if (error) throw new Error(error.message);
      return { audiences: data ?? [] };
    }

    case "performance_summary": {
      const start = input.date_range?.start ?? new Date(Date.now() - 30 * 86400000).toISOString().split("T")[0];
      const end = input.date_range?.end ?? new Date().toISOString().split("T")[0];

      const { data, error } = await db
        .from("meta_ad_insights")
        .select("impressions, clicks, spend, roas, ctr")
        .eq("tenant_id", tenantId)
        .gte("date_start", start)
        .lte("date_stop", end);

      if (error) throw new Error(error.message);
      const rows = data ?? [];

      const totalSpend = rows.reduce((s, r) => s + (r.spend ?? 0), 0);
      const totalClicks = rows.reduce((s, r) => s + (r.clicks ?? 0), 0);
      const totalImpressions = rows.reduce((s, r) => s + (r.impressions ?? 0), 0);
      const avgRoas = rows.length
        ? rows.reduce((s, r) => s + (r.roas ?? 0), 0) / rows.filter((r) => r.roas).length
        : 0;

      return {
        period: { start, end },
        total_spend: Math.round(totalSpend * 100) / 100,
        total_clicks: totalClicks,
        total_impressions: totalImpressions,
        avg_roas: Math.round(avgRoas * 100) / 100,
        avg_ctr:
          totalImpressions > 0
            ? Math.round((totalClicks / totalImpressions) * 10000) / 100
            : 0,
      };
    }

    default:
      return { error: "Unknown data_type" };
  }
}
