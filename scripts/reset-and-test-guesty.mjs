import { createClient } from "@supabase/supabase-js";

const db = createClient(
  "https://ahpzvyhrnvzetpygujws.supabase.co",
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

// Reset the stuck connection
const { error: resetErr } = await db
  .from("pms_connections")
  .update({ sync_status: "idle" })
  .eq("provider", "guesty");
console.log("Reset result:", resetErr ?? "OK - status set to idle");

const { data: conn } = await db
  .from("pms_connections")
  .select("id, credentials, last_sync_at")
  .eq("provider", "guesty")
  .eq("is_active", true)
  .maybeSingle();

const creds = conn.credentials;
const clientId = creds.clientId ?? creds.client_id;
const clientSecret = creds.clientSecret ?? creds.client_secret;
console.log("Credentials keys:", Object.keys(creds));

// Auth
console.log("\nAuthenticating...");
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
  console.error("Auth failed:", authRes.status, t.slice(0, 200));
  console.log("\nTIP: Set GUESTY_TOKEN env var to skip auth.");
  process.exit(1);
}
const authData = await authRes.json();
const token = process.env.GUESTY_TOKEN ?? authData.access_token;
console.log("Auth OK\n");

// Test 1: checkOut >= 2yr filter (full sync path)
const fromDate = new Date(Date.now() - 2 * 365 * 86400000).toISOString().split("T")[0];
console.log("TEST 1: checkOut >= " + fromDate + " (full sync filter)");
const url1 = new URL("https://open-api.guesty.com/v1/reservations");
url1.searchParams.set("limit", "5");
url1.searchParams.set("skip", "0");
url1.searchParams.set("filters[0][field]", "checkOut");
url1.searchParams.set("filters[0][operator]", "gte");
url1.searchParams.set("filters[0][value]", fromDate);
url1.searchParams.set("fields", "_id status checkOut");

const r1 = await fetch(url1.toString(), { headers: { Authorization: `Bearer ${token}` } });
console.log("Status:", r1.status);
const d1 = await r1.json().catch(() => r1.text());
if (typeof d1 === 'string') {
  console.log("Response (text):", d1.slice(0, 300));
} else {
  console.log("Total:", d1.count, "| First result:", d1.results?.[0]?._id ?? "none");
}

// Test 2: lastUpdatedAt filter (delta sync path)
const since = conn.last_sync_at;
console.log("\nTEST 2: lastUpdatedAt >= " + since + " (delta filter)");
const url2 = new URL("https://open-api.guesty.com/v1/reservations");
url2.searchParams.set("limit", "5");
url2.searchParams.set("skip", "0");
url2.searchParams.set("filters[0][field]", "lastUpdatedAt");
url2.searchParams.set("filters[0][operator]", "gte");
url2.searchParams.set("filters[0][value]", since);
url2.searchParams.set("fields", "_id status lastUpdatedAt");

const r2 = await fetch(url2.toString(), { headers: { Authorization: `Bearer ${token}` } });
console.log("Status:", r2.status);
const d2 = await r2.json().catch(() => r2.text());
if (typeof d2 === 'string') {
  console.log("Response (text):", d2.slice(0, 300));
} else {
  console.log("Total:", d2.count, "| First result:", d2.results?.[0]?._id ?? "none");
  if (d2.results?.[0]) {
    console.log("First lastUpdatedAt:", d2.results[0].lastUpdatedAt);
  }
}
