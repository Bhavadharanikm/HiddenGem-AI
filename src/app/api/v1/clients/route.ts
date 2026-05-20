import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase/service";

const AGENCY_ID = process.env.AGENCY_ID ?? "00000000-0000-0000-0000-000000000001";

function isDashboard(req: NextRequest) {
  return req.headers.get("X-Dashboard-Session") === "1";
}

export async function GET(req: NextRequest) {
  if (!isDashboard(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = getServiceClient();
  const { data, error } = await db
    .from("tenants")
    .select("id, name, slug, system_prompt, is_active, created_at")
    .order("name");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ clients: data });
}

export async function POST(req: NextRequest) {
  if (!isDashboard(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { name, slug, system_prompt } = await req.json();

  if (!name?.trim() || !slug?.trim()) {
    return NextResponse.json({ error: "Name and slug are required" }, { status: 400 });
  }

  const db = getServiceClient();
  const { data, error } = await db
    .from("tenants")
    .insert({
      name: name.trim(),
      slug: slug.trim(),
      agency_id: AGENCY_ID,
      system_prompt: system_prompt?.trim() || null,
    })
    .select("id, name, slug, system_prompt, is_active, created_at")
    .single();

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json({ error: "A client with that slug already exists" }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ client: data }, { status: 201 });
}
