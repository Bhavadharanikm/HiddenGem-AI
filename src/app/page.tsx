import ChatInterface from "@/components/chat/ChatInterface";
import { getServiceClient } from "@/lib/supabase/service";

export default async function Home() {
  const db = getServiceClient();

  const { data: tenants } = await db
    .from("tenants")
    .select("id, name, slug")
    .eq("is_active", true)
    .order("name");

  const clients = (tenants ?? []).map((t) => ({
    id: t.id,
    name: t.name,
    slug: t.slug,
  }));

  return <ChatInterface initialClients={clients} />;
}
