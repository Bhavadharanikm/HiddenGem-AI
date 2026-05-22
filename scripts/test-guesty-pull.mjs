// Quick test: fetch one page of Guesty reservations with the new fields param
// and show the raw shape of the first result.
// Run: node scripts/test-guesty-pull.mjs

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://ahpzvyhrnvzetpygujws.supabase.co";
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const PMS_ENCRYPTION_KEY = process.env.PMS_ENCRYPTION_KEY;

if (!SUPABASE_KEY) {
  console.error("Set SUPABASE_SERVICE_ROLE_KEY env var");
  process.exit(1);
}

// ── Crypto (mirrors src/lib/crypto/credentials.ts) ──────────────────────────
async function decryptCredentials(stored) {
  if (!stored || typeof stored !== "object") return {};
  if (stored.v === 1 && stored.iv && stored.ct) {
    if (!PMS_ENCRYPTION_KEY || PMS_ENCRYPTION_KEY.length !== 64) {
      throw new Error("PMS_ENCRYPTION_KEY not set or invalid (need 64-char hex)");
    }
    const bytes = new Uint8Array(32);
    for (let i = 0; i < 32; i++)
      bytes[i] = parseInt(PMS_ENCRYPTION_KEY.slice(i * 2, i * 2 + 2), 16);
    const key = await crypto.subtle.importKey(
      "raw", bytes, { name: "AES-GCM" }, false, ["decrypt"]
    );
    const iv = Uint8Array.from(atob(stored.iv), (c) => c.charCodeAt(0)).buffer.slice(0);
    const ct = Uint8Array.from(atob(stored.ct), (c) => c.charCodeAt(0)).buffer.slice(0);
    const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ct);
    return JSON.parse(new TextDecoder().decode(plain));
  }
  return stored; // plaintext
}

// ── Main ─────────────────────────────────────────────────────────────────────
const db = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } });

const { data: conn, error } = await db
  .from("pms_connections")
  .select("id, provider, credentials")
  .eq("provider", "guesty")
  .eq("is_active", true)
  .maybeSingle();

if (error || !conn) {
  console.error("No active Guesty connection found:", error?.message);
  process.exit(1);
}

console.log(`\nUsing Guesty connection: ${conn.id}`);

const creds = await decryptCredentials(conn.credentials);
// Accept both camelCase and snake_case key names
const clientId = creds.clientId ?? creds.client_id;
const clientSecret = creds.clientSecret ?? creds.client_secret;

if (!clientId || !clientSecret) {
  console.error("Credentials missing clientId / clientSecret. Got:", Object.keys(creds));
  process.exit(1);
}

// ── Auth — honour GUESTY_TOKEN env var to skip re-auth when rate-limited ───
let token = process.env.GUESTY_TOKEN;
if (token) {
  console.log("Using GUESTY_TOKEN from env (skipping auth).\n");
} else {
  console.log("Authenticating with Guesty...");
  const authRes = await fetch("https://open-api.guesty.com/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: clientId,
      client_secret: clientSecret,
      scope: "open-api",
    }),
  });
  if (!authRes.ok) {
    const t = await authRes.text();
    console.error("Auth failed:", authRes.status, t.slice(0, 300));
    console.error("\nHint: if you hit a 429, wait 5+ minutes then retry,");
    console.error("or set GUESTY_TOKEN=<token> to skip auth entirely.");
    process.exit(1);
  }
  const data = await authRes.json();
  token = data.access_token;
  console.log("Auth OK. Token (save for reuse):", token.slice(0, 40) + "…\n");
}

// ── Fetch first page with fields param ────────────────────────────────────────
const fields = "_id status checkInDateLocalized checkOutDateLocalized checkIn checkOut guestsCount listing listingId money source channel integration lastUpdatedAt";
const url = new URL("https://open-api.guesty.com/v1/reservations");
url.searchParams.set("limit", "3");
url.searchParams.set("skip", "0");
url.searchParams.set("fields", fields);

console.log("Fetching /v1/reservations with fields param...");
const res = await fetch(url.toString(), {
  headers: { Authorization: `Bearer ${token}` },
});
if (!res.ok) {
  const t = await res.text();
  console.error("API error:", res.status, t.slice(0, 300));
  process.exit(1);
}

const data = await res.json();
const results = data.results ?? [];
console.log(`Total reservations: ${data.count}  |  Returned: ${results.length}\n`);

if (results.length === 0) {
  console.log("No reservations returned.");
  process.exit(0);
}

// Show key fields for each result
for (const r of results) {
  const money = r.money ?? {};
  const channel = r.channel ?? r.source ?? r.integration;
  const channelName = channel == null
    ? "(null)"
    : typeof channel === "object"
      ? (channel.name ?? channel._id ?? JSON.stringify(channel))
      : channel;

  console.log("─".repeat(60));
  console.log(`ID:           ${r._id}`);
  console.log(`Status:       ${r.status ?? "(missing)"}`);
  console.log(`Check-in:     ${r.checkInDateLocalized ?? r.checkIn ?? "(missing)"}`);
  console.log(`Check-out:    ${r.checkOutDateLocalized ?? r.checkOut ?? "(missing)"}`);
  console.log(`Guests:       ${r.guestsCount ?? "(missing)"}`);
  console.log(`ListingId:    ${r.listingId ?? r.listing?._id ?? "(missing)"}`);
  console.log(`Platform:     ${channelName}`);
  console.log(`Revenue:      ${money.totalPaid ?? money.netIncome ?? money.fareAccommodation ?? money.hostPayout ?? "(missing)"}`);
  console.log(`Money keys:   ${Object.keys(money).join(", ") || "(none)"}`);
}

console.log("\n─".repeat(60));
console.log("\nFull first result (raw):");
console.log(JSON.stringify(results[0], null, 2));
