export const dynamic = "force-dynamic";

import ChatInterface from "@/components/chat/ChatInterface";
import { getServiceClient } from "@/lib/supabase/service";

export default async function Home() {
  let clients: { id: string; name: string; slug: string }[] = [];

  try {
    const db = getServiceClient();
    const { data: tenants } = await db
      .from("tenants")
      .select("id, name, slug")
      .eq("is_active", true)
      .order("name");

    clients = (tenants ?? []).map((t) => ({
      id: t.id,
      name: t.name,
      slug: t.slug,
    }));
  } catch {
    // Supabase not configured yet — render UI without clients
  }

  return <ChatInterface initialClients={clients} />;
}
