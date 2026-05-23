import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase/service";

function isDashboard(req: NextRequest) {
  return req.headers.get("X-Dashboard-Session") === "1";
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isDashboard(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { name, slug, system_prompt, is_active } = await req.json();

  const db = getServiceClient();
  const { data, error } = await db
    .from("tenants")
    .update({ name, slug, system_prompt, is_active })
    .eq("id", id)
    .select("id, name, slug, system_prompt, is_active, created_at")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ client: data });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isDashboard(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const db = getServiceClient();

  // Delete child records first to respect FK constraints, then the tenant itself
  await db.from("client_memories").delete().eq("tenant_id", id);
  await db.from("performance_metrics").delete().eq("tenant_id", id);
  await db.from("meta_ad_insights").delete().eq("tenant_id", id);
  await db.from("meta_campaigns").delete().eq("tenant_id", id);
  await db.from("meta_client_assignments").delete().eq("tenant_id", id);

  // PMS: bookings reference properties, properties reference connections
  const { data: props } = await db.from("pms_properties").select("id").eq("tenant_id", id);
  if (props?.length) {
    await db.from("pms_bookings").delete().in("property_id", props.map((p) => p.id));
    await db.from("pms_reviews").delete().in("property_external_id", props.map((p) => p.id)).eq("tenant_id", id);
  }
  await db.from("pms_bookings").delete().eq("tenant_id", id);
  await db.from("pms_reviews").delete().eq("tenant_id", id);
  await db.from("pms_properties").delete().eq("tenant_id", id);
  await db.from("pms_connections").delete().eq("tenant_id", id);

  // Knowledge docs
  const { data: knowledgeDocs } = await db.from("knowledge_documents").select("id").eq("tenant_id", id);
  if (knowledgeDocs?.length) {
    await db.from("knowledge_chunks").delete().in("document_id", knowledgeDocs.map((d) => d.id));
  }
  await db.from("knowledge_documents").delete().eq("tenant_id", id);

  // Conversations and messages
  const { data: convs } = await db.from("conversations").select("id").eq("tenant_id", id);
  if (convs?.length) {
    await db.from("messages").delete().in("conversation_id", convs.map((c) => c.id));
  }
  await db.from("conversations").delete().eq("tenant_id", id);

  // Finally delete the tenant
  const { error } = await db.from("tenants").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return new NextResponse(null, { status: 204 });
}
