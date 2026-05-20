import { NextRequest } from "next/server";
import { validateApiKey } from "@/lib/api/auth";
import { error, ok } from "@/lib/api/response";
import { getServiceClient } from "@/lib/supabase/service";

export async function GET(req: NextRequest) {
  const auth = await validateApiKey(req);
  if (!auth) return error("UNAUTHORIZED", "Invalid or missing API key");

  const periodDays = Number(req.nextUrl.searchParams.get("period")?.replace("d", "") ?? "30");
  const since = new Date(Date.now() - periodDays * 86400000).toISOString();

  const db = getServiceClient();
  const { data, error: dbErr } = await db
    .from("messages")
    .select("input_tokens, output_tokens, created_at")
    .eq("tenant_id", auth.tenantId)
    .eq("role", "assistant")
    .gte("created_at", since);

  if (dbErr) return error("INTERNAL_ERROR", dbErr.message);

  const rows = data ?? [];
  const inputTokens = rows.reduce((s, r) => s + (r.input_tokens ?? 0), 0);
  const outputTokens = rows.reduce((s, r) => s + (r.output_tokens ?? 0), 0);

  // Estimate cost: claude-sonnet-4-6 pricing
  const inputCost = (inputTokens / 1_000_000) * 3.0;
  const outputCost = (outputTokens / 1_000_000) * 15.0;

  return ok({
    period_days: periodDays,
    messages_count: rows.length,
    input_tokens: inputTokens,
    output_tokens: outputTokens,
    estimated_cost_usd: Math.round((inputCost + outputCost) * 100) / 100,
  });
}
