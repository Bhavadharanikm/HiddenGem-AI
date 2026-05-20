import { NextRequest, NextResponse } from "next/server";
import { validateApiKey } from "@/lib/api/auth";
import { error } from "@/lib/api/response";
import { getAuthUrl } from "@/lib/google-drive/oauth";
import { nanoid } from "nanoid";

export async function POST(req: NextRequest) {
  const auth = await validateApiKey(req);
  if (!auth) return error("UNAUTHORIZED", "Invalid or missing API key");

  const state = Buffer.from(JSON.stringify({
    tenantId: auth.tenantId,
    nonce: nanoid(16),
  })).toString("base64url");

  const authUrl = getAuthUrl(state);
  return NextResponse.redirect(authUrl);
}

export async function GET(req: NextRequest) {
  const auth = await validateApiKey(req);
  if (!auth) return error("UNAUTHORIZED", "Invalid or missing API key");

  const state = Buffer.from(JSON.stringify({
    tenantId: auth.tenantId,
    nonce: nanoid(16),
  })).toString("base64url");

  const authUrl = getAuthUrl(state);
  return NextResponse.json({ auth_url: authUrl });
}
