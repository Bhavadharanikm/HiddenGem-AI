import { getServiceClient } from "@/lib/supabase/service";

export const getAudienceAssetsTool = {
  name: "get_audience_assets",
  description:
    "Retrieve Meta audience assets (custom, lookalike, saved audiences) and past campaign history. Use when discussing targeting strategy, audience building, or reviewing past campaign creative and results.",
  input_schema: {
    type: "object" as const,
    properties: {
      audience_type: {
        type: "string",
        enum: ["custom", "lookalike", "saved", "all"],
        description: "Filter by audience type",
      },
      include_campaign_history: {
        type: "boolean",
        description: "Also include past campaign history records",
      },
    },
  },
};

export async function executeGetAudienceAssets(
  tenantId: string,
  input: {
    audience_type?: "custom" | "lookalike" | "saved" | "all";
    include_campaign_history?: boolean;
  }
) {
  const db = getServiceClient();

  let audienceQuery = db
    .from("meta_audiences")
    .select("name, type, subtype, description, approximate_count")
    .eq("tenant_id", tenantId)
    .order("approximate_count", { ascending: false });

  if (input.audience_type && input.audience_type !== "all") {
    audienceQuery = audienceQuery.eq("type", input.audience_type);
  }

  const { data: audiences, error: audErr } = await audienceQuery;
  if (audErr) throw new Error(audErr.message);

  if (!input.include_campaign_history) {
    return { audiences: audiences ?? [] };
  }

  const { data: history, error: histErr } = await db
    .from("campaign_history")
    .select(
      "campaign_name, campaign_type, start_date, end_date, budget, goals, results, notes"
    )
    .eq("tenant_id", tenantId)
    .order("start_date", { ascending: false })
    .limit(20);

  if (histErr) throw new Error(histErr.message);

  return {
    audiences: audiences ?? [],
    campaign_history: history ?? [],
  };
}
