// Show current state of pms_properties and pms_bookings.
// Run: SUPABASE_SERVICE_ROLE_KEY=... node scripts/check-pms-data.mjs

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://ahpzvyhrnvzetpygujws.supabase.co";
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_KEY) { console.error("Set SUPABASE_SERVICE_ROLE_KEY"); process.exit(1); }

const db = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } });

// ── Properties ────────────────────────────────────────────────────────────────
const { data: props } = await db
  .from("pms_properties")
  .select("external_id, name, bedrooms, bathrooms, base_price, currency, amenities, address, raw_data, synced_at")
  .order("synced_at", { ascending: false })
  .limit(5);

console.log(`\n${"═".repeat(60)}`);
console.log(`PROPERTIES (${props?.length ?? 0} shown)`);
console.log("═".repeat(60));
for (const p of props ?? []) {
  const pics = Array.isArray(p.raw_data?.pictures) ? p.raw_data.pictures.length : 0;
  const desc = p.raw_data?.publicDescription?.summary?.slice(0, 80) ?? "(none)";
  console.log(`\nName:      ${p.name}`);
  console.log(`ID:        ${p.external_id}`);
  console.log(`Beds/Bath: ${p.bedrooms} bed / ${p.bathrooms} bath`);
  console.log(`Price:     $${p.base_price} ${p.currency}`);
  console.log(`City:      ${p.address?.city ?? "(none)"}`);
  console.log(`Amenities: ${(p.amenities ?? []).length} items`);
  console.log(`Pictures:  ${pics}`);
  console.log(`Desc:      ${desc}`);
  console.log(`Synced:    ${p.synced_at ?? "never"}`);
  console.log(`raw_data keys: ${Object.keys(p.raw_data ?? {}).join(", ")}`);
}

// ── Bookings ──────────────────────────────────────────────────────────────────
const { data: bookings } = await db
  .from("pms_bookings")
  .select("external_id, status, check_in, check_out, guests, total_revenue, platform, synced_at")
  .order("check_in", { ascending: false })
  .limit(5);

console.log(`\n${"═".repeat(60)}`);
console.log(`BOOKINGS (${bookings?.length ?? 0} shown)`);
console.log("═".repeat(60));
for (const b of bookings ?? []) {
  console.log(`\nID:       ${b.external_id}`);
  console.log(`Status:   ${b.status || "(empty)"}`);
  console.log(`Dates:    ${b.check_in} → ${b.check_out}`);
  console.log(`Guests:   ${b.guests}`);
  console.log(`Revenue:  $${b.total_revenue}`);
  console.log(`Platform: ${b.platform}`);
  console.log(`Synced:   ${b.synced_at ?? "never"}`);
}

// ── Connection ────────────────────────────────────────────────────────────────
const { data: conn } = await db
  .from("pms_connections")
  .select("provider, sync_status, last_sync_at")
  .eq("provider", "guesty")
  .maybeSingle();

console.log(`\n${"═".repeat(60)}`);
console.log(`CONNECTION: ${conn?.provider}  |  status: ${conn?.sync_status}  |  last sync: ${conn?.last_sync_at ?? "never"}`);
