import { NextRequest } from "next/server";
import { validateApiKey } from "@/lib/api/auth";
import { error, ok } from "@/lib/api/response";
import { getMetaAuthUrl } from "@/lib/meta/oauth";
import { nanoid } from "nanoid";

export async function GET(req: NextRequest) {
  const isDashboard = req.headers.get("X-Dashboard-Session") === "1";

  if (!isDashboard) {
    const auth = await validateApiKey(req);
    if (!auth) return error("UNAUTHORIZED", "Invalid or missing API key");
  }

  const appId = process.env.META_APP_ID;
  if (!appId || appId === "your-meta-app-id") {
    return error("BAD_REQUEST", "META_APP_ID is not configured. Set it in your Netlify environment variables.");
  }

  // State carries only a CSRF nonce — this is now an agency-level connection,
  // not tied to any specific tenant.
  const state = Buffer.from(
    JSON.stringify({ nonce: nanoid(16) })
  ).toString("base64url");

  const authUrl = getMetaAuthUrl(state);
  return ok({ auth_url: authUrl });
}
