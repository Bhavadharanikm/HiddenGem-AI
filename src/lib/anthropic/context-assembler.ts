import { getServiceClient } from "@/lib/supabase/service";

export async function assembleSystemPrompt(tenantId: string): Promise<string> {
  const db = getServiceClient();

  const { data: tenant } = await db
    .from("tenants")
    .select("name, system_prompt")
    .eq("id", tenantId)
    .single();

  const { count: propertyCount } = await db
    .from("pms_properties")
    .select("id", { count: "exact", head: true })
    .eq("tenant_id", tenantId);

  const { data: pmsConn } = await db
    .from("pms_connections")
    .select("provider, last_sync_at")
    .eq("tenant_id", tenantId)
    .eq("is_active", true)
    .limit(1)
    .maybeSingle();

  const { data: metaConn } = await db
    .from("meta_connections")
    .select("ad_account_id, last_sync_at")
    .eq("tenant_id", tenantId)
    .eq("is_active", true)
    .limit(1)
    .maybeSingle();

  const { count: docCount } = await db
    .from("knowledge_documents")
    .select("id", { count: "exact", head: true })
    .eq("tenant_id", tenantId)
    .eq("status", "ready");

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const basePrompt = `You are an intelligent AI assistant for ${tenant?.name ?? "this client"}, managed by HiddenGem Media.

Today is ${today}.

## Your Capabilities
You have access to tools to retrieve:
- **Knowledge Base**: ${docCount ?? 0} document(s) indexed and searchable
- **Property Data**: ${propertyCount ?? 0} properties${pmsConn ? ` via ${pmsConn.provider} (last synced: ${pmsConn.last_sync_at ? new Date(pmsConn.last_sync_at).toLocaleDateString() : "never"})` : " (no PMS connected)"}
- **Meta Ads**: ${metaConn ? `Account connected (last synced: ${metaConn.last_sync_at ? new Date(metaConn.last_sync_at).toLocaleDateString() : "never"})` : "not connected"}
- **Performance Metrics**: Occupancy, ADR, RevPAR, revenue trends
- **Audience Assets**: Meta custom/lookalike audiences and campaign history

## Behavior Guidelines
- Always use tools to retrieve data before answering data-specific questions
- Be concise and analytical — lead with the key insight, then supporting details
- When data is unavailable, explain what connection or sync is needed
- Format numbers clearly: use $ for currency, % for rates, commas for thousands
- If asked to compare periods, pull data for both periods before answering`;

  const customPrompt = tenant?.system_prompt
    ? `\n\n## Client-Specific Instructions\n${tenant.system_prompt}`
    : "";

  return basePrompt + customPrompt;
}
