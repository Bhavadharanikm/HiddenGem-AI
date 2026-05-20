import { NextRequest } from "next/server";
import { validateApiKey } from "@/lib/api/auth";
import { error, ok } from "@/lib/api/response";
import { getMetaAuthUrl } from "@/lib/meta/oauth";
import { nanoid } from "nanoid";

export async function GET(req: NextRequest) {
  const auth = await validateApiKey(req);
  if (!auth) return error("UNAUTHORIZED", "Invalid or missing API key");

  const state = Buffer.from(
    JSON.stringify({ tenantId: auth.tenantId, nonce: nanoid(16) })
  ).toString("base64url");

  const authUrl = getMetaAuthUrl(state);
  return ok({ auth_url: authUrl });
}
