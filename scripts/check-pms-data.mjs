// Show what's currently stored in pms_bookings to assess sync quality.
// Run: node scripts/check-pms-data.mjs

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://ahpzvyhrnvzetpygujws.supabase.co";
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_KEY) { console.error("Set SUPABASE_SERVICE_ROLE_KEY"); process.exit(1); }

const db = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } });

const { data: bookings, error } = await db
  .from("pms_bookings")
  .select("external_id, status, check_in, check_out, guests, total_revenue, platform, raw_data")
  .order("check_in", { ascending: false })
  .limit(10);

if (error) { console.error("DB error:", error.message); process.exit(1); }

console.log(`\nFound ${bookings.length} bookings (showing up to 10):\n`);
for (const b of bookings) {
  const hasRaw = b.raw_data && Object.keys(b.raw_data).length > 0;
  console.log("─".repeat(60));
  console.log(`ID:       ${b.external_id}`);
  console.log(`Status:   ${b.status || "(empty)"}`);
  console.log(`Check-in: ${b.check_in || "(empty)"}`);
  console.log(`Guests:   ${b.guests ?? "(null)"}`);
  console.log(`Revenue:  $${b.total_revenue ?? "(null)"}`);
  console.log(`Platform: ${b.platform || "(empty)"}`);
  console.log(`raw_data: ${hasRaw ? `${Object.keys(b.raw_data).join(", ")}` : "(empty)"}`);
}

// Also show the last_sync_at
const { data: conn } = await db
  .from("pms_connections")
  .select("provider, last_sync_at, sync_status")
  .eq("provider", "guesty")
  .maybeSingle();

console.log("\n─".repeat(60));
console.log(`\nPMS Connection: ${conn?.provider}`);
console.log(`Last sync:      ${conn?.last_sync_at ?? "Never"}`);
console.log(`Sync status:    ${conn?.sync_status}`);
