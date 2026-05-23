import { createClient } from "@supabase/supabase-js";

const db = createClient(
  "https://ahpzvyhrnvzetpygujws.supabase.co",
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

const { data, error } = await db
  .from("pms_connections")
  .select("id, provider, sync_status, last_sync_at, is_active")
  .order("created_at", { ascending: false });

console.log("PMS Connections:");
console.log(JSON.stringify(data, null, 2));
if (error) console.log("Error:", error);
