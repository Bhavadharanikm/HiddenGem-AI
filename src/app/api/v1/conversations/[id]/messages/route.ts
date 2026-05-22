import { NextRequest } from "next/server";
import { validateApiKey } from "@/lib/api/auth";
import { error, paginated } from "@/lib/api/response";
import { getServiceClient } from "@/lib/supabase/service";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const isDashboard = req.headers.get("X-Dashboard-Session") === "1";
  let tenantId: string;

  if (isDashboard) {
    const t = req.nextUrl.searchParams.get("tenant_id");
    if (!t) return error("UNAUTHORIZED", "tenant_id required for dashboard session");
    tenantId = t;
  } else {
    const auth = await validateApiKey(req);
    if (!auth) return error("UNAUTHORIZED", "Invalid or missing API key");
    tenantId = auth.tenantId;
  }

  const { id: conversationId } = await params;
  const db = getServiceClient();

  const { data: conv } = await db
    .from("conversations")
    .select("id")
    .eq("id", conversationId)
    .eq("tenant_id", tenantId)
    .maybeSingle();

  if (!conv) return error("NOT_FOUND", "Conversation not found");

  const limit = Number(req.nextUrl.searchParams.get("limit") ?? "50");
  const cursor = req.nextUrl.searchParams.get("cursor");

  let query = db
    .from("messages")
    .select("id, role, content, input_tokens, output_tokens, created_at")
    .eq("conversation_id", conversationId)
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: true })
    .limit(limit + 1);

  if (cursor) query = query.gt("created_at", cursor);

  const { data, error: dbErr } = await query;
  if (dbErr) return error("INTERNAL_ERROR", dbErr.message);

  const items = data ?? [];
  const hasMore = items.length > limit;
  const rows = hasMore ? items.slice(0, limit) : items;

  return paginated(
    rows,
    hasMore ? rows[rows.length - 1].created_at : null,
    hasMore
  );
}
