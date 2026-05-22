import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase/service";

function isDashboard(req: NextRequest) {
  return req.headers.get("X-Dashboard-Session") === "1";
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isDashboard(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const db = getServiceClient();

  const { data, error } = await db
    .from("conversations")
    .select("id, title, created_at, updated_at")
    .eq("tenant_id", id)
    .order("updated_at", { ascending: false })
    .limit(50);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ conversations: data ?? [] });
}
